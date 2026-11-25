// infra/lib/constructs/queues.ts — Phase 27 §27g. The reusable queue layer: one SQS queue + DLQ (redrive after
// 3 receives) + a DLQ-depth alarm per logical queue, all fronted by a single in-VPC consumer Lambda (the
// Dockerfile.jobs image, CMD overridden to lambda/queueConsumer.handler) with each queue wired as an event
// source (partial-batch failures reported). Producers (the API + jobs tiers) are granted send + the queue URLs
// by the stack. Nothing here is deployed yet — verified by `cdk synth`.
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";
import { Network } from "./network";
import { Database } from "./database";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export interface QueuesProps {
  config: EnvConfig;
  network: Network;
  database: Database;
  appSecret: secretsmanager.ISecret;
  alertTopic: sns.ITopic;
}

// Logical queue name → the env var the backend reads its URL from (config/env.js QUEUE_URLS).
const QUEUE_ENV = {
  email: "SQS_EMAIL_QUEUE_URL",
  data_export: "SQS_DATA_EXPORT_QUEUE_URL",
  person_delete: "SQS_PERSON_DELETE_QUEUE_URL",
  statement_parse: "SQS_STATEMENT_PARSE_QUEUE_URL",
  og_image: "SQS_OG_IMAGE_QUEUE_URL",
} as const;

export class Queues extends Construct {
  /** { SQS_EMAIL_QUEUE_URL: <url>, … } — the stack injects these as env on the API container + jobs Lambda. */
  public readonly queueUrlEnv: Record<string, string> = {};
  private readonly queues: sqs.Queue[] = [];

  constructor(scope: Construct, id: string, props: QueuesProps) {
    super(scope, id);
    const { config, network, database, appSecret, alertTopic } = props;

    const consumerSecurityGroup = new ec2.SecurityGroup(this, "ConsumerSecurityGroup", {
      vpc: network.vpc,
      description: "Bonza queue-consumer Lambda",
      allowAllOutbound: true,
    });
    database.proxy.connections.allowFrom(consumerSecurityGroup, ec2.Port.tcp(5432), "Queue consumer → RDS Proxy");

    const databaseUrl = database.databaseUrlFor(2);

    const consumer = new lambda.DockerImageFunction(this, "ConsumerFunction", {
      code: lambda.DockerImageCode.fromImageAsset("../", {
        file: "Dockerfile.jobs",
        platform: Platform.LINUX_ARM64,
        cmd: ["src/backend/lambda/queueConsumer.handler"], // same image, different entry than the scheduled jobs
      }),
      architecture: lambda.Architecture.ARM_64,
      memorySize: config.jobs.memoryMb,
      timeout: Duration.seconds(config.jobs.timeoutSeconds),
      vpc: network.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [consumerSecurityGroup],
      environment: {
        NODE_ENV: config.envName === "production" ? "production" : "staging",
        DATABASE_URL: databaseUrl,
        APP_SECRETS_ARN: appSecret.secretArn, // the consumer needs app secrets (e.g. RESEND_API_KEY) to send
      },
      description: "Bonza queue consumer — email / data export / analytics person-delete (§27g)",
    });
    appSecret.grantRead(consumer);
    database.secret.grantRead(consumer);

    // One queue + DLQ + alarm per logical queue; wire each as an event source of the single consumer.
    for (const [name, envVar] of Object.entries(QUEUE_ENV)) {
      const dlq = new sqs.Queue(this, `${name}Dlq`, {
        queueName: `bonza-${config.envName}-${name}-dlq`,
        retentionPeriod: Duration.days(14),
      });
      const queue = new sqs.Queue(this, `${name}Queue`, {
        queueName: `bonza-${config.envName}-${name}`,
        // Hold a message invisible for ~6× the Lambda timeout while it processes (SQS best practice).
        visibilityTimeout: Duration.seconds(config.jobs.timeoutSeconds * 6),
        deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
      });

      consumer.addEventSource(new SqsEventSource(queue, { batchSize: 10, reportBatchItemFailures: true }));

      // Anything landing in a DLQ is a message that failed 3× — alarm immediately.
      const alarm = new cloudwatch.Alarm(this, `${name}DlqAlarm`, {
        metric: dlq.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(5), statistic: "Maximum" }),
        threshold: 0,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Messages in the ${name} dead-letter queue — a consumer is failing repeatedly`,
      });
      alarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

      this.queues.push(queue);
      this.queueUrlEnv[envVar] = queue.queueUrl;
    }
  }

  /** Grant a producer (API task role / jobs Lambda) permission to send to every queue. */
  public grantSend(grantee: iam.IGrantable) {
    for (const q of this.queues) q.grantSendMessages(grantee);
  }
}

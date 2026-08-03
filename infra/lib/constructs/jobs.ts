// infra/lib/constructs/jobs.ts — jobs Lambda (Dockerfile.jobs) in-VPC + EventBridge schedules.
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";
import { Network } from "./network";
import { Database } from "./database";

export interface JobsProps {
  config: EnvConfig;
  network: Network;
  database: Database;
  appSecret: secretsmanager.ISecret;
}

export class Jobs extends Construct {
  constructor(scope: Construct, id: string, props: JobsProps) {
    super(scope, id);

    const { config, network, database, appSecret } = props;

    const jobsSecurityGroup = new ec2.SecurityGroup(this, "JobsSecurityGroup", {
      vpc: network.vpc,
      description: "Bonza background-jobs Lambda",
      allowAllOutbound: true,
    });
    network.dbSecurityGroup.addIngressRule(
      jobsSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow jobs Lambda access to RDS",
    );

    const databaseUrl =
      `postgresql://bonza:${database.secret.secretValueFromJson("password").unsafeUnwrap()}` +
      `@${database.instance.dbInstanceEndpointAddress}:5432/bonza`;

    const jobsFunction = new lambda.DockerImageFunction(this, "JobsFunction", {
      code: lambda.DockerImageCode.fromImageAsset("../", { file: "Dockerfile.jobs" }),
      memorySize: config.jobs.memoryMb,
      timeout: Duration.seconds(config.jobs.timeoutSeconds),
      vpc: network.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [jobsSecurityGroup],
      environment: {
        NODE_ENV: config.envName === "production" ? "production" : "staging",
        DATABASE_URL: databaseUrl,
      },
      description: "Bonza background jobs — personalisation + monthly summaries",
    });

    appSecret.grantRead(jobsFunction);
    database.secret.grantRead(jobsFunction);

    new events.Rule(this, "NightlyPersonalisationRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "2" }),
      description: "Trigger the nightly personalisation job",
      targets: [
        new targets.LambdaFunction(jobsFunction, {
          event: events.RuleTargetInput.fromObject({ jobType: "nightly_personalisation" }),
          retryAttempts: 2,
        }),
      ],
    });

    new events.Rule(this, "MonthlySummaryRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "9", day: "1" }),
      description: "Trigger the monthly loyalty summary emails",
      targets: [
        new targets.LambdaFunction(jobsFunction, {
          event: events.RuleTargetInput.fromObject({ jobType: "monthly_summary" }),
          retryAttempts: 2,
        }),
      ],
    });
  }
}

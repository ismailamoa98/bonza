// infra/lib/constructs/api.ts — ECS Fargate API service (from the root Dockerfile) behind a public ALB.
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";
import { Network } from "./network";
import { Database } from "./database";

export interface ApiProps {
  config: EnvConfig;
  network: Network;
  database: Database;
  appSecret: secretsmanager.ISecret;
}

export class Api extends Construct {
  public readonly loadBalancer: elbv2.IApplicationLoadBalancer;
  public readonly service: ecs_patterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    const { config, network, database, appSecret } = props;

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: network.vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // Build DATABASE_URL from the RDS-generated secret (mirrors the jobs Lambda).
    const databaseUrl =
      `postgresql://bonza:${database.secret.secretValueFromJson("password").unsafeUnwrap()}` +
      `@${database.instance.dbInstanceEndpointAddress}:5432/bonza`;

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: config.api.minInstances,
      publicLoadBalancer: true,
      healthCheckGracePeriod: Duration.seconds(120),
      minHealthyPercent: 100,
      // Fail (and roll back) fast if tasks can't stay healthy, instead of hanging for hours.
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset("../", { file: "Dockerfile", target: "runner" }),
        containerPort: 8080,
        environment: {
          NODE_ENV: config.envName === "production" ? "production" : "staging",
          PORT: "8080",
          AWS_REGION: config.region,
          APP_SECRETS_ARN: appSecret.secretArn,
          DATABASE_URL: databaseUrl,
        },
        enableLogging: true,
      },
    });

    service.targetGroup.configureHealthCheck({
      path: "/health",
      healthyHttpCodes: "200",
      interval: Duration.seconds(30),
      timeout: Duration.seconds(10),
    });

    // Let the Fargate tasks reach RDS, and read the secrets they need at boot.
    database.instance.connections.allowDefaultPortFrom(service.service, "API Fargate tasks");
    appSecret.grantRead(service.taskDefinition.taskRole);
    database.secret.grantRead(service.taskDefinition.taskRole);

    const scaling = service.service.autoScaleTaskCount({
      minCapacity: config.api.minInstances,
      maxCapacity: config.api.maxInstances,
    });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(120),
      scaleOutCooldown: Duration.seconds(60),
    });

    this.service = service;
    this.loadBalancer = service.loadBalancer;

    new CfnOutput(this, "ApiLoadBalancerDns", {
      value: service.loadBalancer.loadBalancerDnsName,
      description: "API ALB DNS name (CloudFront proxies /api/* here)",
    });
  }
}

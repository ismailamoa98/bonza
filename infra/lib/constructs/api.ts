// infra/lib/constructs/api.ts — ECS Fargate API service (from the root Dockerfile) behind a public ALB.
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { Duration, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
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
  /** §27i — the app's structured (pino JSON) log group, exposed so the Monitoring construct can attach
   *  metric filters to the `[metric] …` lines the app emits (dependency health, spend, job outcomes). */
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    const { config, network, database, appSecret } = props;
    const production = config.envName === "production";

    // §27i — an explicit log group (ApplicationLoadBalancedFargateService would otherwise auto-create an
    // unexposed one), so metric filters can read the app logs. Retained in prod, destroyed in lower envs.
    const logGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/bonza/${config.envName}/api`,
      retention: production ? logs.RetentionDays.SIX_MONTHS : logs.RetentionDays.ONE_MONTH,
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: network.vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // §27h — connect through the RDS Proxy (not the instance) with a bounded per-task connection_limit, so a
    // scale-out of Fargate tasks multiplexes onto the proxy pool instead of exhausting Postgres max_connections.
    // Role is the master user until the go-live cutover to bonza_app (`-c dbRole=bonza_app`) — see docs/DB_ROLES.md.
    const databaseUrl = database.databaseUrlFor(5);

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
      // Graviton: the image is built for ARM64 (see fromAsset platform) so the task must run ARM64.
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset("../", {
          file: "Dockerfile",
          target: "runner",
          platform: Platform.LINUX_ARM64,
        }),
        containerPort: 8080,
        environment: {
          NODE_ENV: config.envName === "production" ? "production" : "staging",
          PORT: "8080",
          AWS_REGION: config.region,
          APP_SECRETS_ARN: appSecret.secretArn,
          DATABASE_URL: databaseUrl,
        },
        logDriver: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: "bonza-api" }),
      },
    });

    service.targetGroup.configureHealthCheck({
      path: "/health",
      healthyHttpCodes: "200",
      interval: Duration.seconds(30),
      timeout: Duration.seconds(10),
    });

    // Let the Fargate tasks reach the RDS Proxy, and read the secrets they need at boot.
    database.proxy.connections.allowFrom(service.service, ec2.Port.tcp(5432), "API Fargate tasks → RDS Proxy");
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
    this.logGroup = logGroup;

    new CfnOutput(this, "ApiLoadBalancerDns", {
      value: service.loadBalancer.loadBalancerDnsName,
      description: "API ALB DNS name (CloudFront proxies /api/* here)",
    });
  }
}

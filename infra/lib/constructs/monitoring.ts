// infra/lib/constructs/monitoring.ts — SNS alerts + CloudWatch alarms + dashboard.
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";
import { Database } from "./database";

export interface MonitoringProps {
  config: EnvConfig;
  database: Database;
  /** Where alarm notifications go. Overridable per deploy via `-c alertEmail=...`. */
  alertEmail: string;
}

const ALB_NAMESPACE = "AWS/ApplicationELB";
const LAMBDA_NAMESPACE = "AWS/Lambda";

export class Monitoring extends Construct {
  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    const { config, database, alertEmail } = props;
    const dbInstance = database.instance;

    const alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `bonza-${config.envName}-alerts`,
      displayName: `Bonza ${config.envName} Alerts`,
    });
    alertTopic.addSubscription(new sns_subscriptions.EmailSubscription(alertEmail));

    const alarm = (
      alarmId: string,
      metric: cloudwatch.IMetric,
      opts: {
        threshold: number;
        evaluationPeriods: number;
        comparisonOperator?: cloudwatch.ComparisonOperator;
        alarmDescription: string;
      },
    ) => {
      const a = new cloudwatch.Alarm(this, alarmId, {
        metric,
        threshold: opts.threshold,
        evaluationPeriods: opts.evaluationPeriods,
        comparisonOperator:
          opts.comparisonOperator ?? cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: opts.alarmDescription,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      a.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
      return a;
    };

    alarm(
      "RdsCpuAlarm",
      dbInstance.metricCPUUtilization({ period: Duration.minutes(5), statistic: "Average" }),
      {
        threshold: 80,
        evaluationPeriods: 3, // 15 minutes sustained
        alarmDescription: "RDS CPU > 80% for 15 minutes - check for slow queries",
      },
    );

    alarm(
      "RdsConnectionsAlarm",
      dbInstance.metricDatabaseConnections({ period: Duration.minutes(5), statistic: "Maximum" }),
      {
        threshold: 80, // t3.micro max_connections = 100
        evaluationPeriods: 2,
        alarmDescription: "RDS connections > 80 - connection pool exhaustion risk",
      },
    );

    alarm(
      "RdsFreeStorageAlarm",
      dbInstance.metricFreeStorageSpace({ period: Duration.hours(1), statistic: "Minimum" }),
      {
        threshold: 5 * 1024 * 1024 * 1024, // 5 GB remaining
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        alarmDescription: "RDS free storage < 5GB - provision more storage",
      },
    );

    alarm(
      "RdsFreeMemoryAlarm",
      dbInstance.metricFreeableMemory({ period: Duration.minutes(10), statistic: "Average" }),
      {
        threshold: 100 * 1024 * 1024, // 100 MB remaining
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        alarmDescription: "RDS freeable memory < 100MB - instance may need upgrading",
      },
    );

    alarm(
      "Alb5xxAlarm",
      new cloudwatch.Metric({
        namespace: ALB_NAMESPACE,
        metricName: "HTTPCode_ELB_5XX_Count",
        statistic: "Sum",
        period: Duration.minutes(5),
      }),
      {
        threshold: 10,
        evaluationPeriods: 2,
        alarmDescription: "ALB 5xx errors > 10 - application errors spiking",
      },
    );

    alarm(
      "Alb4xxAlarm",
      new cloudwatch.Metric({
        namespace: ALB_NAMESPACE,
        metricName: "HTTPCode_ELB_4XX_Count",
        statistic: "Sum",
        period: Duration.minutes(5),
      }),
      {
        threshold: 100,
        evaluationPeriods: 2,
        alarmDescription: "ALB 4xx errors > 100 - possible auth issue or bad deploy",
      },
    );

    alarm(
      "AlbLatencyAlarm",
      new cloudwatch.Metric({
        namespace: ALB_NAMESPACE,
        metricName: "TargetResponseTime",
        statistic: "p95",
        period: Duration.minutes(5),
      }),
      {
        threshold: 3, // p95 > 3 seconds
        evaluationPeriods: 3,
        alarmDescription: "API p95 latency > 3s - performance degradation",
      },
    );

    alarm(
      "LambdaErrorAlarm",
      new cloudwatch.Metric({
        namespace: LAMBDA_NAMESPACE,
        metricName: "Errors",
        statistic: "Sum",
        period: Duration.hours(1),
      }),
      {
        threshold: 3,
        evaluationPeriods: 1,
        alarmDescription: "Lambda background job errors > 3 in 1 hour",
      },
    );

    alarm(
      "LambdaThrottleAlarm",
      new cloudwatch.Metric({
        namespace: LAMBDA_NAMESPACE,
        metricName: "Throttles",
        statistic: "Sum",
        period: Duration.minutes(30),
      }),
      {
        threshold: 5,
        evaluationPeriods: 1,
        alarmDescription: "Lambda throttled > 5 times - concurrent execution limit hit",
      },
    );

    new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `bonza-${config.envName}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: "API Response Times (p50/p95)",
            left: [
              new cloudwatch.Metric({
                namespace: ALB_NAMESPACE,
                metricName: "TargetResponseTime",
                statistic: "p50",
                period: Duration.minutes(5),
              }),
              new cloudwatch.Metric({
                namespace: ALB_NAMESPACE,
                metricName: "TargetResponseTime",
                statistic: "p95",
                period: Duration.minutes(5),
              }),
            ],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: "HTTP Error Rates",
            left: [
              new cloudwatch.Metric({
                namespace: ALB_NAMESPACE,
                metricName: "HTTPCode_ELB_5XX_Count",
                statistic: "Sum",
                period: Duration.minutes(5),
              }),
              new cloudwatch.Metric({
                namespace: ALB_NAMESPACE,
                metricName: "HTTPCode_ELB_4XX_Count",
                statistic: "Sum",
                period: Duration.minutes(5),
              }),
            ],
            width: 12,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: "RDS CPU + Connections",
            left: [dbInstance.metricCPUUtilization({ period: Duration.minutes(5) })],
            right: [dbInstance.metricDatabaseConnections({ period: Duration.minutes(5) })],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: "RDS Storage + Memory",
            left: [dbInstance.metricFreeStorageSpace({ period: Duration.hours(1) })],
            right: [dbInstance.metricFreeableMemory({ period: Duration.minutes(10) })],
            width: 12,
          }),
        ],
      ],
    });
  }
}

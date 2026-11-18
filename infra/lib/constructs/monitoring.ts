// infra/lib/constructs/monitoring.ts — SNS alerts + CloudWatch alarms + dashboard.
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as logs from "aws-cdk-lib/aws-logs";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";
import { Database } from "./database";
import { Api } from "./api";

export interface MonitoringProps {
  config: EnvConfig;
  database: Database;
  /** §27i — the API construct, for its log group (metric filters) + ALB-derived SLO alarms. */
  api: Api;
  /** Where alarm notifications go. Overridable per deploy via `-c alertEmail=...`. */
  alertEmail: string;
}

const ALB_NAMESPACE = "AWS/ApplicationELB";
const LAMBDA_NAMESPACE = "AWS/Lambda";

export class Monitoring extends Construct {
  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    const { config, database, api, alertEmail } = props;
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
        threshold: 70, // §27h — 70% of max_connections (100); the RDS Proxy should keep us well under this
        evaluationPeriods: 2,
        alarmDescription: "RDS connections > 70% of max - check RDS Proxy pooling / for a connection leak",
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

    // ── §27i — SLO burn-rate alarms ─────────────────────────────────────────────────────────────────
    // Availability SLO: 99.5% of requests non-5xx ⇒ a 0.5% error budget. Multi-window multi-burn-rate — we
    // page only when a short AND a long window both show the budget burning, which cuts false pages while still
    // catching both a sudden outage (fast) and a slow bleed (slow). (Google SRE workbook thresholds: 14.4× / 6×.)
    const AVAILABILITY_SLO = 0.995;
    const ERROR_BUDGET = 1 - AVAILABILITY_SLO; // 0.005

    const albErrorRatePct = (window: Duration, suffix: string) =>
      new cloudwatch.MathExpression({
        expression: "100 * errors / requests",
        usingMetrics: {
          errors: new cloudwatch.Metric({
            namespace: ALB_NAMESPACE,
            metricName: "HTTPCode_ELB_5XX_Count",
            statistic: "Sum",
            period: window,
          }),
          requests: new cloudwatch.Metric({
            namespace: ALB_NAMESPACE,
            metricName: "RequestCount",
            statistic: "Sum",
            period: window,
          }),
        },
        label: `ALB 5xx rate (${suffix})`,
        period: window,
      });

    const burnAlarm = (suffix: string, window: Duration, burnRate: number) =>
      new cloudwatch.Alarm(this, `Slo5xxBurn${suffix}`, {
        metric: albErrorRatePct(window, suffix),
        threshold: burnRate * ERROR_BUDGET * 100, // as a percentage
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        // No requests ⇒ the expression is missing, which must not page.
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Availability SLO burning ${burnRate}x over ${suffix}`,
      });

    const inAlarm = (a: cloudwatch.Alarm) => cloudwatch.AlarmRule.fromAlarm(a, cloudwatch.AlarmState.ALARM);

    const fastBurn = new cloudwatch.CompositeAlarm(this, "SloFastBurn", {
      compositeAlarmName: `bonza-${config.envName}-slo-fast-burn`,
      alarmRule: cloudwatch.AlarmRule.allOf(
        inAlarm(burnAlarm("1h", Duration.hours(1), 14.4)),
        inAlarm(burnAlarm("5m", Duration.minutes(5), 14.4)),
      ),
      alarmDescription: "Availability error budget burning FAST (14.4x, 1h+5m) — page now",
    });
    fastBurn.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    const slowBurn = new cloudwatch.CompositeAlarm(this, "SloSlowBurn", {
      compositeAlarmName: `bonza-${config.envName}-slo-slow-burn`,
      alarmRule: cloudwatch.AlarmRule.allOf(
        inAlarm(burnAlarm("6h", Duration.hours(6), 6)),
        inAlarm(burnAlarm("30m", Duration.minutes(30), 6)),
      ),
      alarmDescription: "Availability error budget burning slowly (6x, 6h+30m) — investigate today",
    });
    slowBurn.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    // Latency SLO — p95 < 4s (the SLO line, distinct from the 3s perf-warning alarm above).
    alarm(
      "ApiLatencySloAlarm",
      new cloudwatch.Metric({
        namespace: ALB_NAMESPACE,
        metricName: "TargetResponseTime",
        statistic: "p95",
        period: Duration.minutes(5),
      }),
      {
        threshold: 4,
        evaluationPeriods: 3,
        alarmDescription: "API p95 > 4s — latency SLO breached (search availability objective)",
      },
    );

    // ── §27i — dependency / spend / job metrics from the app's structured `[metric] …` log lines ──────
    // The app (serviceHealth, spendLedger, jobRunner) emits pino JSON lines carrying { metric, service?, value }.
    // These log-metric filters turn them into CloudWatch metrics so upstream health, spend exhaustion, and job
    // failures are alarmable + dashboarded — without the app needing the CloudWatch SDK in the request path.
    const DEP_NS = `Bonza/${config.envName}`;
    const depMetric = (metricName: string, statistic: string, period: Duration) =>
      new cloudwatch.Metric({ namespace: DEP_NS, metricName, statistic, period });

    new logs.MetricFilter(this, "ServiceDegradedFilter", {
      logGroup: api.logGroup,
      metricNamespace: DEP_NS,
      metricName: "ServiceDegraded",
      filterPattern: logs.FilterPattern.stringValue("$.metric", "=", "BonzaServiceDegraded"),
      metricValue: "$.value",
      defaultValue: 0,
    });
    new logs.MetricFilter(this, "SpendExhaustedFilter", {
      logGroup: api.logGroup,
      metricNamespace: DEP_NS,
      metricName: "SpendExhausted",
      filterPattern: logs.FilterPattern.stringValue("$.metric", "=", "BonzaSpendExhausted"),
      metricValue: "1",
      defaultValue: 0,
    });
    new logs.MetricFilter(this, "JobFailureFilter", {
      logGroup: api.logGroup,
      metricNamespace: DEP_NS,
      metricName: "JobFailure",
      filterPattern: logs.FilterPattern.all(
        logs.FilterPattern.stringValue("$.metric", "=", "BonzaJobOutcome"),
        logs.FilterPattern.numberValue("$.value", "=", 0),
      ),
      metricValue: "1",
      defaultValue: 0,
    });
    new logs.MetricFilter(this, "JobSuccessFilter", {
      logGroup: api.logGroup,
      metricNamespace: DEP_NS,
      metricName: "JobSuccess",
      filterPattern: logs.FilterPattern.all(
        logs.FilterPattern.stringValue("$.metric", "=", "BonzaJobOutcome"),
        logs.FilterPattern.numberValue("$.value", "=", 1),
      ),
      metricValue: "1",
      defaultValue: 0,
    });

    alarm("DependencyDegradedAlarm", depMetric("ServiceDegraded", "Maximum", Duration.minutes(5)), {
      threshold: 0,
      evaluationPeriods: 3, // a dependency stuck degraded for ~15 min
      alarmDescription: "An upstream dependency (Duffel/Seats.aero/Stripe/Claude) is degraded",
    });
    alarm("SpendExhaustedAlarm", depMetric("SpendExhausted", "Sum", Duration.hours(1)), {
      threshold: 0,
      evaluationPeriods: 1,
      alarmDescription: "An external-spend daily budget was exhausted — scraper or runaway usage",
    });
    alarm("NightlyJobFailureAlarm", depMetric("JobFailure", "Sum", Duration.hours(1)), {
      threshold: 0,
      evaluationPeriods: 1,
      alarmDescription: "A background job finished with an error outcome",
    });

    // Dependency-health dashboard — one at-a-glance upstream view beside availability + latency.
    new cloudwatch.Dashboard(this, "DependencyDashboard", {
      dashboardName: `bonza-${config.envName}-dependencies`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: "Availability — ALB 5xx rate (%)",
            left: [albErrorRatePct(Duration.minutes(5), "5m")],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: "API p95 latency (SLO 4s)",
            left: [
              new cloudwatch.Metric({
                namespace: ALB_NAMESPACE,
                metricName: "TargetResponseTime",
                statistic: "p95",
                period: Duration.minutes(5),
              }),
            ],
            width: 12,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: "Dependency degraded (max)",
            left: [depMetric("ServiceDegraded", "Maximum", Duration.minutes(5))],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: "External spend exhausted (count/day)",
            left: [depMetric("SpendExhausted", "Sum", Duration.hours(24))],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: "Background jobs (success / failure)",
            left: [
              depMetric("JobSuccess", "Sum", Duration.hours(24)),
              depMetric("JobFailure", "Sum", Duration.hours(24)),
            ],
            width: 8,
          }),
        ],
      ],
    });

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

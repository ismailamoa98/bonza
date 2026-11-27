// infra/lib/bonza-stack.ts — the single Bonza stack, instantiated once per environment.
import { Stack, StackProps, Tags, SecretValue, CfnOutput } from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { EnvConfig } from "./config";
import { Network } from "./constructs/network";
import { Database } from "./constructs/database";
import { Api } from "./constructs/api";
import { Frontend } from "./constructs/frontend";
import { Jobs } from "./constructs/jobs";
import { Monitoring } from "./constructs/monitoring";
import { Queues } from "./constructs/queues";
import { DeployRole } from "./constructs/deploy-role";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_subscriptions from "aws-cdk-lib/aws-sns-subscriptions";

export interface BonzaStackProps extends StackProps {
  config: EnvConfig;
}

export class BonzaStack extends Stack {
  constructor(scope: Construct, id: string, props: BonzaStackProps) {
    super(scope, id, props);

    const { config } = props;

    Tags.of(this).add("Project", "Bonza");
    Tags.of(this).add("Environment", config.envName);

    const network = new Network(this, "Network", { config });

    const database = new Database(this, "Database", { config, network });

    const appSecrets = new secretsmanager.Secret(this, "AppSecrets", {
      secretName: `/bonza/${config.envName}/app-secrets`,
      description: "Bonza application secrets (populate after first deploy)",
      secretStringValue: SecretValue.unsafePlainText(
        JSON.stringify({
          CLERK_SECRET_KEY: "REPLACE_ME",
          CLERK_WEBHOOK_SECRET: "REPLACE_ME",
          STRIPE_SECRET_KEY: "REPLACE_ME",
          STRIPE_WEBHOOK_SECRET: "REPLACE_ME",
          STRIPE_PRO_ANNUAL_PRICE_ID: "REPLACE_ME",
          RESEND_API_KEY: "REPLACE_ME",
          DUFFEL_API_KEY: "REPLACE_ME",
          SEATS_AERO_API_KEY: "REPLACE_ME",
          TRAVELPAYOUTS_TOKEN: "REPLACE_ME",
          AWIN_AFFILIATE_ID: "REPLACE_ME",
          GMAIL_CLIENT_SECRET: "REPLACE_ME",
          ANTHROPIC_API_KEY: "REPLACE_ME",
          SENTRY_DSN: "REPLACE_ME",
        }),
      ),
    });

    const api = new Api(this, "Api", { config, network, database, appSecret: appSecrets });

    const jobs = new Jobs(this, "Jobs", { config, network, database, appSecret: appSecrets });

    new Frontend(this, "Frontend", {
      config,
      certificateArn: this.node.tryGetContext("certificateArn"),
      apiLoadBalancer: api.loadBalancer,
    });

    // §27g — a shared alert topic so the Monitoring + Queues alarms all notify the same place.
    const alertEmail = this.node.tryGetContext("alertEmail") ?? "ismail@bonza.app";
    const alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `bonza-${config.envName}-alerts`,
      displayName: `Bonza ${config.envName} Alerts`,
    });
    alertTopic.addSubscription(new sns_subscriptions.EmailSubscription(alertEmail));

    new Monitoring(this, "Monitoring", { config, database, api, alertEmail, alertTopic });

    // §27g — the queue layer, and wiring the producers (API + jobs) to send + know the queue URLs.
    const queues = new Queues(this, "Queues", { config, network, database, appSecret: appSecrets, alertTopic });
    const apiContainer = api.service.taskDefinition.defaultContainer!;
    for (const [key, url] of Object.entries(queues.queueUrlEnv)) {
      apiContainer.addEnvironment(key, url);
      jobs.fn.addEnvironment(key, url);
    }
    queues.grantSend(api.service.taskDefinition.taskRole);
    queues.grantSend(jobs.fn);

    if (config.envName !== "development") {
      new DeployRole(this, "DeployRole", {
        config,
        githubOwner: "ismailamoa98",
        githubRepo: "bonza",
        oidcProviderArn: this.node.tryGetContext("githubOidcProviderArn"),
      });
    }

    new CfnOutput(this, "DatabaseEndpoint", {
      value: database.instance.dbInstanceEndpointAddress,
      description: "RDS endpoint — used to build DATABASE_URL",
    });
    new CfnOutput(this, "AppSecretsArn", {
      value: appSecrets.secretArn,
      description: "Secrets Manager ARN — populate with real values after deploy",
    });
  }
}

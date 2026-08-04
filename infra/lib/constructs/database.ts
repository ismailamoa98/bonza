// infra/lib/constructs/database.ts — RDS Postgres in isolated subnets with Secrets Manager creds.
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";
import { Network } from "./network";

export interface DatabaseProps {
  config: EnvConfig;
  network: Network;
}

const PG_VERSION = rds.PostgresEngineVersion.VER_16;

export class Database extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly secret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const { config, network } = props;

    this.secret = new secretsmanager.Secret(this, "DbCredentials", {
      secretName: `/bonza/${config.envName}/db-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "bonza" }),
        generateStringKey: "password",
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    this.instance = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: PG_VERSION }),
      instanceType: new ec2.InstanceType(config.database.instanceClass),
      vpc: network.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [network.dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.secret),
      databaseName: "bonza",

      multiAz: config.database.multiAz,
      allocatedStorage: config.database.allocatedStorageGb,
      maxAllocatedStorage: config.database.allocatedStorageGb * 2,
      storageEncrypted: true,

      backupRetention: Duration.days(config.database.backupRetentionDays),
      deleteAutomatedBackups: false,
      preferredBackupWindow: "02:00-03:00", // 2am UTC — before the nightly jobs
      preferredMaintenanceWindow: "sun:03:00-sun:04:00",

      deletionProtection: config.database.deletionProtection,
      removalPolicy: config.database.removalPolicy,

      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      monitoringInterval: Duration.seconds(60),

      parameterGroup: new rds.ParameterGroup(this, "ParameterGroup", {
        engine: rds.DatabaseInstanceEngine.postgres({ version: PG_VERSION }),
        parameters: {
          shared_preload_libraries: "pg_stat_statements",
          log_min_duration_statement: "1000", // log queries slower than 1s
          log_connections: "1",
          max_connections: "100",
        },
      }),
    });
  }
}

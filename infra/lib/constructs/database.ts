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
  /** §27h — RDS Proxy: every app/job consumer connects here, not directly to the instance, so a burst of
   *  Fargate tasks / Lambda invocations multiplexes onto a bounded pool instead of exhausting max_connections. */
  public readonly proxy: rds.DatabaseProxy;
  public readonly proxyEndpoint: string;
  /** §27h — per-role credential secrets (the credential store for the bonza_app/bonza_migrate/bonza_readonly
   *  roles created by the roles migration). Passwords are applied to the roles + switched on at go-live. */
  public readonly appRoleSecret: secretsmanager.Secret;
  public readonly migrateRoleSecret: secretsmanager.Secret;
  public readonly readonlyRoleSecret: secretsmanager.Secret;

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

    // §27h — point-in-time recovery: RDS automated backups (backupRetention > 0, deleteAutomatedBackups=false
    // above) give PITR to any second within the retention window. RTO/RPO targets are documented in
    // docs/DB_ROLES.md. Nothing more to enable here — this comment records the intent next to the config.

    // ── §27h — per-role credential store (passwords applied to the roles + cut over at go-live) ──
    const roleSecret = (roleName: string) =>
      new secretsmanager.Secret(this, `${roleName}Credentials`, {
        secretName: `/bonza/${config.envName}/db-${roleName}`,
        description: `Bonza ${roleName} DB role credentials (${config.envName})`,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: roleName }),
          generateStringKey: "password",
          excludePunctuation: true,
          passwordLength: 32,
        },
      });
    this.appRoleSecret = roleSecret("bonza_app");
    this.migrateRoleSecret = roleSecret("bonza_migrate");
    this.readonlyRoleSecret = roleSecret("bonza_readonly");

    // ── §27h — RDS Proxy (connection pooling / multiplexing in front of the instance) ──
    const proxySecurityGroup = new ec2.SecurityGroup(this, "ProxySecurityGroup", {
      vpc: network.vpc,
      description: "RDS Proxy — fronts Postgres for the API/jobs tiers",
      allowAllOutbound: true,
    });
    // The proxy itself must reach the instance.
    network.dbSecurityGroup.addIngressRule(proxySecurityGroup, ec2.Port.tcp(5432), "Allow RDS Proxy to reach RDS");

    this.proxy = this.instance.addProxy("Proxy", {
      dbProxyName: `bonza-${config.envName}-proxy`,
      vpc: network.vpc,
      securityGroups: [proxySecurityGroup],
      // The master + each role secret, so the proxy can authenticate any of them once passwords are applied.
      secrets: [this.secret, this.appRoleSecret, this.migrateRoleSecret, this.readonlyRoleSecret],
      requireTLS: true,
      maxConnectionsPercent: 90, // leave headroom under max_connections for admin/rotation sessions
      maxIdleConnectionsPercent: 50,
      borrowTimeout: Duration.seconds(30),
      idleClientTimeout: Duration.minutes(30),
    });
    this.proxyEndpoint = this.proxy.endpoint;
  }

  /**
   * §27h/§27g/§27j — build the app's Prisma DATABASE_URL (through the RDS Proxy, TLS required, bounded
   * connection_limit). The connecting role is chosen by the `dbRole` context flag: default `"bonza"` (the master
   * user, pre-cutover) or `"bonza_app"` (the least-privilege app role, after `scripts/set-db-role-passwords.js`
   * has set its password and this flag is flipped at deploy — see docs/DB_ROLES.md). The proxy already holds all
   * role secrets, so only the credential in the URL changes.
   */
  public databaseUrlFor(connectionLimit: number): string {
    const useAppRole = this.node.tryGetContext("dbRole") === "bonza_app";
    const user = useAppRole ? "bonza_app" : "bonza";
    const secret = useAppRole ? this.appRoleSecret : this.secret;
    return (
      `postgresql://${user}:${secret.secretValueFromJson("password").unsafeUnwrap()}` +
      `@${this.proxyEndpoint}:5432/bonza?connection_limit=${connectionLimit}&pool_timeout=20&sslmode=require`
    );
  }
}

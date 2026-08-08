// infra/lib/config.ts — per-environment sizing (dev/staging/production) read by every construct.
import { RemovalPolicy } from "aws-cdk-lib";

export type EnvName = "development" | "staging" | "production";

export interface EnvConfig {
  /** Logical environment name — used in stack ids, tags, and resource naming. */
  envName: EnvName;
  /** AWS account/region the stack deploys into (undefined => resolved from the CLI/env at deploy time). */
  account?: string;
  region: string;

  /** Public DNS. `domainName` is the apex (e.g. bonza.app); the API/app use subdomains. */
  domainName: string;
  apiSubdomain: string; // e.g. api.staging.bonza.app
  appSubdomain: string; // e.g. staging.bonza.app (production uses the apex)

  /** VPC layout. Multiple NAT gateways only in production for AZ-redundant egress. */
  network: {
    maxAzs: number;
    natGateways: number;
  };

  /** RDS PostgreSQL sizing. Multi-AZ + deletion protection only in production. */
  database: {
    instanceClass: string; // e.g. "t3.micro" | "t3.small" | "m5.large"
    allocatedStorageGb: number;
    multiAz: boolean;
    backupRetentionDays: number;
    deletionProtection: boolean;
    removalPolicy: RemovalPolicy;
  };

  /** Elastic Beanstalk API tier auto-scaling bounds + instance size. */
  api: {
    instanceType: string; // e.g. "t3.small"
    minInstances: number;
    maxInstances: number;
  };

  /** Lambda background jobs (nightly personalisation, monthly emails). */
  jobs: {
    memoryMb: number;
    timeoutSeconds: number;
  };
}

const DOMAIN = "bonza.app";

export const ENVIRONMENTS: Record<EnvName, EnvConfig> = {
  development: {
    envName: "development",
    region: "eu-west-2",
    domainName: DOMAIN,
    apiSubdomain: `api.dev.${DOMAIN}`,
    appSubdomain: `dev.${DOMAIN}`,
    network: { maxAzs: 2, natGateways: 1 },
    database: {
      instanceClass: "t3.micro",
      allocatedStorageGb: 20,
      multiAz: false,
      backupRetentionDays: 1,
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
    },
    api: { instanceType: "t3.micro", minInstances: 1, maxInstances: 1 },
    jobs: { memoryMb: 512, timeoutSeconds: 300 },
  },

  staging: {
    envName: "staging",
    region: "eu-west-2",
    domainName: DOMAIN,
    apiSubdomain: `api.staging.${DOMAIN}`,
    appSubdomain: `staging.${DOMAIN}`,
    network: { maxAzs: 2, natGateways: 1 },
    database: {
      instanceClass: "t3.micro",
      allocatedStorageGb: 20,
      multiAz: false,
      backupRetentionDays: 7,
      deletionProtection: false,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    },
    api: { instanceType: "t3.micro", minInstances: 1, maxInstances: 2 },
    jobs: { memoryMb: 512, timeoutSeconds: 600 },
  },

  production: {
    envName: "production",
    region: "eu-west-2",
    domainName: DOMAIN,
    apiSubdomain: `api.${DOMAIN}`,
    appSubdomain: DOMAIN,
    network: { maxAzs: 3, natGateways: 2 },
    database: {
      instanceClass: "t3.small",
      allocatedStorageGb: 50,
      multiAz: true,
      backupRetentionDays: 30,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    },
    api: { instanceType: "t3.small", minInstances: 1, maxInstances: 4 },
    jobs: { memoryMb: 1024, timeoutSeconds: 900 },
  },
};

/** Resolve an EnvConfig from a CDK context value, defaulting to development. */
export function resolveEnv(value: string | undefined): EnvConfig {
  const name = (value ?? "development") as EnvName;
  const config = ENVIRONMENTS[name];
  if (!config) {
    throw new Error(
      `Unknown env "${value}". Use -c env=development | staging | production.`,
    );
  }
  return config;
}

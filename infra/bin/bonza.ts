#!/usr/bin/env node
// infra/bin/bonza.ts — CDK entry: selects an environment via -c env=<name> and synthesizes one stack.
import { App } from "aws-cdk-lib";
import { BonzaStack } from "../lib/bonza-stack";
import { resolveEnv } from "../lib/config";

const app = new App();

const config = resolveEnv(app.node.tryGetContext("env"));

new BonzaStack(app, `Bonza-${config.envName}`, {
  config,
  env: {
    account: config.account ?? process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region ?? process.env.CDK_DEFAULT_REGION,
  },
  description: `Bonza ${config.envName} infrastructure (Phase 11).`,
});

app.synth();

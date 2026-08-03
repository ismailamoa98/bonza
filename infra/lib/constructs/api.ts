// infra/lib/constructs/api.ts — Elastic Beanstalk API tier (stub until the compute section).
import { Construct } from "constructs";
import { EnvConfig } from "../config";
import { Network } from "./network";
import { Database } from "./database";

export interface ApiProps {
  config: EnvConfig;
  network: Network;
  database: Database;
}

export class Api extends Construct {
  constructor(scope: Construct, id: string, _props: ApiProps) {
    super(scope, id);
  }
}

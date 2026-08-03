// infra/lib/constructs/network.ts — VPC with public/private-egress/isolated subnets + security groups.
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EnvConfig } from "../config";

export interface NetworkProps {
  config: EnvConfig;
}

export class Network extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly apiSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id);

    const { config } = props;

    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: config.network.maxAzs,
      natGateways: config.network.natGateways,
      subnetConfiguration: [
        { name: "Public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: "Private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        { name: "Isolated", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    this.dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: this.vpc,
      description: "RDS PostgreSQL - only accessible from the API/jobs tier",
      allowAllOutbound: false,
    });

    this.apiSecurityGroup = new ec2.SecurityGroup(this, "ApiSecurityGroup", {
      vpc: this.vpc,
      description: "Beanstalk API instances",
      allowAllOutbound: true,
    });

    this.dbSecurityGroup.addIngressRule(
      this.apiSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow API access to RDS",
    );
  }
}

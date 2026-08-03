// infra/lib/constructs/deploy-role.ts — GitHub OIDC provider + per-env deploy role (ECR/S3/CloudFront/EB).
import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { EnvConfig } from "../config";

const GITHUB_OIDC_URL = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUD = "sts.amazonaws.com";

export interface DeployRoleProps {
  config: EnvConfig;
  /** GitHub repository owner + name the role trusts (e.g. "ismailamoa98" / "bonza"). */
  githubOwner: string;
  githubRepo: string;
  /**
   * ARN of an existing GitHub OIDC provider. When set it is imported; when omitted a new
   * provider is created. Because the provider is account-global, create it in exactly one
   * environment and pass its ARN via `-c githubOidcProviderArn=...` for the others.
   */
  oidcProviderArn?: string;
}

export class DeployRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: DeployRoleProps) {
    super(scope, id);
    const { config, githubOwner, githubRepo, oidcProviderArn } = props;
    const stack = Stack.of(this);
    const { account, region } = stack;
    const repo = `${githubOwner}/${githubRepo}`;

    const provider = oidcProviderArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, "GithubOidcProvider", oidcProviderArn)
      : new iam.OpenIdConnectProvider(this, "GithubOidcProvider", {
          url: GITHUB_OIDC_URL,
          clientIds: [GITHUB_OIDC_AUD],
        });

    const sub =
      config.envName === "production"
        ? `repo:${repo}:environment:production`
        : `repo:${repo}:ref:refs/heads/main`;

    const principal = new iam.OpenIdConnectPrincipal(provider, {
      StringEquals: {
        "token.actions.githubusercontent.com:aud": GITHUB_OIDC_AUD,
        "token.actions.githubusercontent.com:sub": sub,
      },
    });

    this.role = new iam.Role(this, "Role", {
      roleName: `bonza-${config.envName}-github-deploy`,
      description: `GitHub Actions OIDC deploy role for Bonza ${config.envName}`,
      assumedBy: principal,
      maxSessionDuration: Duration.hours(1),
    });

    const frontendBucket = `bonza-${config.envName}-frontend`;
    const deployBucket = "bonza-deployments";

    this.role.addToPolicy(
      new iam.PolicyStatement({ actions: ["ecr:GetAuthorizationToken"], resources: ["*"] })
    );
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ],
        resources: [`arn:aws:ecr:${region}:${account}:repository/bonza-api`],
      })
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket", "s3:GetBucketLocation"],
        resources: [`arn:aws:s3:::${frontendBucket}`, `arn:aws:s3:::${deployBucket}`],
      })
    );
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
        resources: [`arn:aws:s3:::${frontendBucket}/*`, `arn:aws:s3:::${deployBucket}/*`],
      })
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudfront:CreateInvalidation"],
        resources: [`arn:aws:cloudfront::${account}:distribution/*`],
      })
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "elasticbeanstalk:CreateApplicationVersion",
          "elasticbeanstalk:UpdateEnvironment",
          "elasticbeanstalk:DescribeApplicationVersions",
          "elasticbeanstalk:DescribeEnvironments",
          "elasticbeanstalk:DescribeEvents",
        ],
        resources: ["*"],
      })
    );
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [
          `arn:aws:iam::${account}:role/bonza-${config.envName}-*`,
          `arn:aws:iam::${account}:role/aws-elasticbeanstalk-*`,
        ],
      })
    );

    new CfnOutput(this, "DeployRoleArn", {
      value: this.role.roleArn,
      description: `GitHub OIDC deploy role ARN — set as the ${
        config.envName === "production" ? "PRODUCTION" : "STAGING"
      }_AWS_DEPLOY_ROLE_ARN GitHub secret`,
    });
  }
}

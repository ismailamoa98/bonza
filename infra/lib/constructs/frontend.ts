// infra/lib/constructs/frontend.ts — private S3 + CloudFront (OAC) SPA hosting; proxies /api/* to the ALB.
import * as fs from "fs";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";

export interface FrontendProps {
  config: EnvConfig;
  /** ACM certificate ARN (must be in us-east-1 for CloudFront). Absent => default domain. */
  certificateArn?: string;
  /** API load balancer — when set, CloudFront proxies /api/* to it so the SPA and API share an origin. */
  apiLoadBalancer?: elbv2.IApplicationLoadBalancer;
}

const PLACEHOLDER_ARN = "REPLACE_WITH_ACM_ARN";
// Built SPA assets, relative to infra/. Deployed when present (build the frontend before `cdk deploy`).
const DIST_PATH = path.resolve(__dirname, "../../../src/frontend/dist");

export class Frontend extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    const { config, certificateArn, apiLoadBalancer } = props;
    const production = config.envName === "production";

    const bucket = new s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !production,
    });

    const useCustomDomain = !!certificateArn && certificateArn !== PLACEHOLDER_ARN;
    const certificate = useCustomDomain
      ? acm.Certificate.fromCertificateArn(this, "Certificate", certificateArn!)
      : undefined;

    const additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {};
    if (apiLoadBalancer) {
      additionalBehaviors["/api/*"] = {
        origin: new origins.LoadBalancerV2Origin(apiLoadBalancer, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      };
    }

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors,
      ...(useCustomDomain
        ? { domainNames: [config.appSubdomain], certificate }
        : {}),
      defaultRootObject: "index.html",

      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
      ],
    });

    if (fs.existsSync(DIST_PATH)) {
      new s3deploy.BucketDeployment(this, "DeployAssets", {
        sources: [s3deploy.Source.asset(DIST_PATH)],
        destinationBucket: bucket,
        distribution: this.distribution,
        distributionPaths: ["/*"],
      });
    }

    new CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront domain — serves the SPA and proxies /api/* to the API",
    });
  }
}

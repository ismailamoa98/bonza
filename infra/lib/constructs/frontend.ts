// infra/lib/constructs/frontend.ts — private S3 + CloudFront (OAC) SPA hosting.
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";

export interface FrontendProps {
  config: EnvConfig;
  /** ACM certificate ARN (must be in us-east-1 for CloudFront). Absent => default domain. */
  certificateArn?: string;
}

const PLACEHOLDER_ARN = "REPLACE_WITH_ACM_ARN";

export class Frontend extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    const { config, certificateArn } = props;

    const bucket = new s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const useCustomDomain = !!certificateArn && certificateArn !== PLACEHOLDER_ARN;
    const certificate = useCustomDomain
      ? acm.Certificate.fromCertificateArn(this, "Certificate", certificateArn!)
      : undefined;

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      ...(useCustomDomain
        ? { domainNames: [config.appSubdomain], certificate }
        : {}),
      defaultRootObject: "index.html",

      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
      ],
    });

    new CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront domain — add a CNAME in Cloudflare pointing to this",
    });
  }
}

// infra/lib/constructs/frontend.ts — private S3 + CloudFront (OAC) SPA hosting; proxies /api/* to the ALB.
import * as fs from "fs";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { RemovalPolicy, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvConfig } from "../config";

// §27j — the SPA's Content-Security-Policy. MUST mirror src/backend/config/csp.js (the TS infra can't import
// that CJS module at synth time). Shipped REPORT-ONLY first (Content-Security-Policy-Report-Only below) so
// violations surface before enforcing. No nonce: the built SPA has only an external hashed module script.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.bonza.app",
  "script-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.bonza.app https://js.stripe.com https://api.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.bonza.app https://js.stripe.com https://api.stripe.com https://hooks.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://api.unsplash.com",
  "frame-src 'self' https://js.stripe.com https://api.stripe.com https://hooks.stripe.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.bonza.app https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
  "report-uri /api/v1/security/csp-report",
].join("; ");

const PERMISSIONS_POLICY =
  'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), usb=(), payment=(self "https://js.stripe.com")';

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
      // Phase 18 — forward all viewer headers (auth etc.) PLUS the CloudFront-generated geo headers the
      // origin resolver reads (services/originResolver.js). OriginRequestHeaderBehavior.all(...cloudfrontHeaders)
      // keeps the existing all-viewer behaviour and adds the geo headers; they are NOT in the cache key
      // (caching is disabled on /api/*), so they never fragment the cache. (Renamed from the removed
      // allViewerAndWhitelistCloudFront() in newer aws-cdk-lib.)
      const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, "ApiGeoHeadersPolicy", {
        originRequestPolicyName: "bonza-api-geo-headers",
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.all(
          "CloudFront-Viewer-Latitude",
          "CloudFront-Viewer-Longitude",
          "CloudFront-Viewer-Country",
          "CloudFront-Viewer-City"
        ),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      });

      additionalBehaviors["/api/*"] = {
        origin: new origins.LoadBalancerV2Origin(apiLoadBalancer, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: apiOriginRequestPolicy,
      };
    }

    // §27j — security headers for every SPA response. CSP is ENFORCED by default (go-live cutover); deploy with
    // `-c cspReportOnly=true` to drop back to the report-only header while widening a directive.
    const cspReportOnly = this.node.tryGetContext("cspReportOnly") === true || this.node.tryGetContext("cspReportOnly") === "true";
    const cspHeader = cspReportOnly ? "content-security-policy-report-only" : "content-security-policy";
    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, "SecurityHeaders", {
      responseHeadersPolicyName: `bonza-${config.envName}-security-headers`,
      securityHeadersBehavior: {
        strictTransportSecurity: { accessControlMaxAge: Duration.days(730), includeSubdomains: true, preload: true, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
      customHeadersBehavior: {
        customHeaders: [
          { header: cspHeader, value: CSP, override: true },
          { header: "permissions-policy", value: PERMISSIONS_POLICY, override: true },
        ],
      },
    });

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
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

# Bonza — Deployment & DNS Runbook

How Bonza is deployed to AWS and wired up in Cloudflare, plus the Phase 11 acceptance checklist.
See [ENVIRONMENT.md](ENVIRONMENT.md) for the variables/secrets referenced here and [CLAUDE.md](CLAUDE.md)
for the working spec.

Region: **eu-west-2**. Apex domain: **bonza.app**.

---

## 1. Deploy order

1. **Infrastructure** — from `infra/`: `npm ci` then `npx cdk deploy -c env=staging` (or
   `-c env=production`). This provisions the VPC, RDS, jobs Lambda, S3 + CloudFront, monitoring, and the
   app-secrets placeholder. Read the resulting `CfnOutput`s — they feed the DNS records below:
   - `DatabaseEndpoint` — used to build the app's `DATABASE_URL`.
   - `AppSecretsArn` — set as `APP_SECRETS_ARN` on the compute; populate the real secret values in the
     AWS console/CLI after the first deploy.
   - `DeployRoleArn` — the GitHub OIDC deploy role for this env; copy into the
     `STAGING_`/`PRODUCTION_AWS_DEPLOY_ROLE_ARN` GitHub secret (`deploy-role.ts`). The OIDC provider is
     account-global — the first env deployed creates it; deploy the second with
     `-c githubOidcProviderArn=<arn>` to import it instead of creating a duplicate.
   - CloudFront distribution domain — the target for the apex/app DNS records.
2. **Secrets** — fill the `/bonza/<env>/app-secrets` bundle in Secrets Manager (see ENVIRONMENT.md §2).
3. **App deploy** — push to `main` (staging) or a `v*` tag (production, manual approval) triggers the
   GitHub Actions workflows (`.github/workflows/`), which build+push the API image to ECR, ship the
   frontend to S3 + invalidate CloudFront, and deploy the image to Elastic Beanstalk.
4. **DNS** — add the Cloudflare records below once the CloudFront/Beanstalk endpoints exist.

> **Forward references (not live yet):** the API compute tier (**Elastic Beanstalk**) construct is still
> a **stub**, so the `api.*` records and the ECR/EB steps in CI don't resolve until it lands. CloudFront
> attaches a **custom domain only when an ACM cert ARN** is supplied (`-c certificateArn=…`, cert must be
> in **us-east-1**); without it, CloudFront serves the default `*.cloudfront.net` domain.

---

## 2. Cloudflare DNS records

Add after the CDK deploy. **Proxy OFF** for every CNAME that points at AWS — ACM needs to validate and
AWS terminates TLS itself; Cloudflare proxying in front of that breaks the cert/SSL handshake.

| Type  | Name                    | Value                                | Proxy |
|-------|-------------------------|--------------------------------------|-------|
| CNAME | `bonza.app` (apex)      | CloudFront distribution domain       | OFF   |
| CNAME | `www`                   | `bonza.app`                          | ON    |
| CNAME | `api.bonza.app`         | Beanstalk environment CNAME          | OFF   |
| CNAME | `staging.bonza.app`     | staging CloudFront distribution      | OFF   |
| CNAME | `api.staging.bonza.app` | staging Beanstalk CNAME              | OFF   |
| MX    | `bonza.app`             | Resend MX records (email)            | OFF   |
| TXT   | `bonza.app`             | Resend SPF + DKIM verification       | OFF   |

Notes:
- The CloudFront domain and Beanstalk CNAME come from the CDK outputs / EB environment once created.
- **Resend** MX/TXT values are in the Resend dashboard → Domains → bonza.app (needed for transactional
  email, Phase 9).
- A CNAME for `www` does not itself redirect — add a **Cloudflare redirect rule** (`www.bonza.app` →
  `https://bonza.app`) for the apex redirect. It's the one record kept **Proxy ON** (Cloudflare serves
  the redirect).

---

## 3. Phase 11 acceptance checklist

Reconciled to what was actually built (differs from the original spec where noted).

**Docker**
- [ ] `docker compose up` starts Postgres + API + frontend locally with no manual setup
- [ ] `docker build .` produces a working production image (verified in 11f/11g)
- [ ] `GET /health` returns `200` with `{ status: "ok", ... }`

**CDK**
- [ ] `cdk deploy -c env=staging` creates all staging resources from scratch
- [ ] `cdk deploy -c env=production` creates all production resources
- [ ] Both environments share one architecture, differing only in instance sizes (`infra/lib/config.ts`)
- [ ] `cdk destroy -c env=staging` tears staging down — **RDS retained** (removalPolicy RETAIN)

**Database**
- [ ] RDS runs in an **isolated subnet** — not publicly accessible
- [ ] Automated backups enabled (retention from config, 7-day default)
- [ ] `prisma migrate deploy` runs on app startup (11j; no-op until a baseline is committed at cutover)
- [ ] Restore tested: a snapshot restores to a new RDS instance

**Monitoring**
- [ ] CloudWatch dashboard `bonza-<env>` visible in the console
- [ ] **All 9 alarms** created and OK after deploy — 4 RDS (CPU, connections, free storage, free
      memory), 3 ALB (5XX, 4XX, p95 latency), 2 Lambda (errors, throttles). *(Spec said "six"; the
      monitoring construct ships 9.)*
- [ ] SNS alarm email subscription confirmed; a test alarm fires and email is received

**Sentry**
- [ ] Unhandled Express errors appear in Sentry with stack trace + user context (11f)
- [ ] Frontend React errors appear with session replay (11f)
- [ ] Each GitHub Actions deploy notifies Sentry of the release
- [ ] `logger.error` calls captured in both CloudWatch (stdout JSON) and Sentry

**CI/CD**
- [ ] Push to `main` triggers the staging deploy automatically
- [ ] A `v*` tag triggers the production deploy behind the manual-approval gate (`environment: production`)
- [ ] Each deploy notifies Sentry; the frontend deploy invalidates CloudFront
- [ ] AWS auth via **per-env OIDC roles** (`STAGING_`/`PRODUCTION_AWS_DEPLOY_ROLE_ARN`, created by
      `deploy-role.ts`), no static keys; staging trusts `ref:refs/heads/main`, prod trusts
      `environment:production`

**Secrets**
- [ ] No secrets in `.env` committed to git; none in Docker images
- [ ] Production secrets fetched from Secrets Manager at startup (11g)
- [ ] Beanstalk env vars limited to **`APP_SECRETS_ARN`** + **`DATABASE_URL`** (the latter injected from
      the RDS secret) *(spec said APP_SECRETS_ARN alone)*

**Rate limiting**
- [ ] All 5 new endpoints rate-limited (loyalty sync, recommendations, onboarding-complete, manual
      loyalty, bookings) — 11h
- [ ] Returns `429` with a descriptive message when the limit is exceeded
- [ ] Limits keyed by `userId` (IP fallback) for authenticated endpoints

**DNS**
- [ ] `bonza.app` resolves to the CloudFront distribution
- [ ] `api.bonza.app` resolves to the Beanstalk load balancer *(pending the EB compute construct)*
- [ ] HTTPS works on all domains via ACM certificates
- [ ] `www.bonza.app` redirects to `bonza.app`

# 0004 — AWS CDK (TypeScript) for infrastructure

**Status:** Accepted

## Context
Bonza's infra (VPC, RDS + proxy, ECS Fargate API, jobs + queue-consumer Lambdas, SQS, CloudFront + S3, CloudWatch
alarms/dashboards, Secrets Manager, IAM roles) needs to be codified and reproducible across dev/staging/prod. The
realistic options were Terraform (HCL, multi-cloud, huge ecosystem) and AWS CDK (real code — here, TypeScript —
synthesising CloudFormation).

## Decision
Use **AWS CDK** in TypeScript (`infra/`), one stack instantiated per environment (`cdk synth -c env=...`). Verify
with `cdk synth` in CI; we are AWS-only, so multi-cloud portability isn't a requirement.

## Consequences
- **+** Real language: loops, types, shared constructs (`infra/lib/constructs/*`), and composition without HCL
  gymnastics. The §27g queue layer and §27h RDS Proxy are reusable constructs.
- **+** `cdk synth` is a fast, offline correctness gate — every Phase-27 infra change is synth-verified across all
  three envs without deploying.
- **+** First-class AWS coverage and sane defaults (least-privilege IAM generated from `grant*` calls).
- **−** CloudFormation underneath means some operations are slow/awkward (drift, stuck stacks) vs. Terraform's
  plan/apply. Accept it.
- **−** TypeScript in `infra/` while the app frontend is deliberately JSX (ADR 0005) — a small inconsistency, but
  infra benefits from types where UI iteration speed matters more.
- Revisit only if we go multi-cloud (we won't soon) or CloudFormation becomes a genuine operational blocker.

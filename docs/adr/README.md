# Architecture Decision Records

Phase 27 §27l. Short records of the decisions a new engineer would otherwise have to reverse-engineer or
re-litigate. Format: Context → Decision → Consequences. An ADR is immutable once accepted; if we change our
mind, we add a new ADR that supersedes it.

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-duffel-over-amadeus.md) | Duffel for flight/hotel inventory (not Amadeus/Sabre direct) | Accepted |
| [0002](0002-statement-authoritative-balances.md) | Loyalty balances are statement-authoritative, never invented | Accepted |
| [0003](0003-deep-link-agency-model.md) | Points bookings are deep-link handoffs, not in-app bookings | Accepted |
| [0004](0004-cdk-over-terraform.md) | AWS CDK (TypeScript) for infra, not Terraform | Accepted |
| [0005](0005-no-typescript-frontend.md) | Frontend is JSX (no TypeScript) | Accepted |

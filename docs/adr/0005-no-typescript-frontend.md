# 0005 — Frontend in JSX (no TypeScript)

**Status:** Accepted

## Context
The React frontend (`src/frontend/`, Vite + Tailwind + Zustand) could be authored in TypeScript or plain JSX. The
backend is CommonJS JavaScript; infra is TypeScript (ADR 0004).

## Decision
The **frontend stays JSX — no TypeScript**. Type safety at the UI boundary is handled by keeping the API
contract thin and well-tested (integration tests on the backend, Testing Library on components) rather than by a
TS type layer in the client.

## Consequences
- **+** Faster UI iteration, no build-time type friction on a surface that changes shape often (pages, props,
  copy). Lower barrier for contributors.
- **+** One fewer toolchain concern in the frontend; the shared money formatter (`src/shared/format.js`, §27b) is
  authored CJS and consumed by both tiers without a TS bridge.
- **−** No compile-time guarantees on props/API shapes in the client — mitigated by tests and by keeping the
  API responses simple (e.g. money as `{ amount, currency }` minor units).
- **−** Inconsistent with `infra/` being TypeScript; accepted (different surfaces, different trade-offs).
- Not a statement that TS is bad — a deliberate scope choice for *this* frontend. Revisit if the client grows
  complex enough that runtime type bugs outweigh the iteration speed.

// test/setup/unit.js — Phase 23. Per-worker setup for the no-DB backend unit project. A setupFile is
// required for the project's module mocker to be active (see vitest.config.mjs). We register the Anthropic
// mock purely as a NETWORK GUARD and deliberately leave ANTHROPIC_API_KEY unset: with no real key,
// claudeOptimizer takes its offline deterministic path (what runs in dev by default) and never calls out.
// NOTE: this harness does not intercept a module's own lazy in-function require(), so unit tests assert the
// offline contract rather than the live-parse branch; the live branch is exercised end-to-end in E2E.
import { vi } from "vitest";
import { anthropicMockControlled } from "../mocks/anthropic.js";

delete process.env.ANTHROPIC_API_KEY; // force the offline path; no network, ever

vi.mock("@anthropic-ai/sdk", () => anthropicMockControlled());

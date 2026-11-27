// utils/requestContext.js — Phase 27 §27i. One AsyncLocalStorage holding the per-request (or per-job)
// correlation context, so a single request_id reaches every log line (via the logger mixin), the Sentry
// scope, outbound third-party call headers, and the JobRun — without threading an argument through every
// function. The stored object is MUTABLE on purpose: the requestId is set when the context opens (before
// auth), and userId is filled in later by the auth middleware within the same context.
//
// Everything degrades cleanly outside a context (boot, scripts, tests that call a service directly):
// get() returns undefined and getRequestId() returns undefined — never throws.
const { AsyncLocalStorage } = require("node:async_hooks");

const als = new AsyncLocalStorage();

// Run `fn` with a fresh context seeded from `seed` (e.g. { requestId }). Anything awaited inside `fn`
// inherits the same store, so async work keeps the id.
function run(seed, fn) {
  return als.run({ ...seed }, fn);
}

// The live context object (mutable), or undefined if we're not inside run().
function get() {
  return als.getStore();
}

// Set a single field on the current context (no-op if there's no context).
function set(key, value) {
  const store = als.getStore();
  if (store) store[key] = value;
}

function getRequestId() {
  const store = als.getStore();
  return store ? store.requestId : undefined;
}

module.exports = { run, get, set, getRequestId, als };

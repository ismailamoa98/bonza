#!/usr/bin/env node
// scripts/check-no-float.js — Phase 27 §27b CI guard. Money must never be a Float in the schema (Floats drift —
// lost pennies, torn totals). Fails the build if any `Float` scalar remains in schema.prisma. Money is `Int`
// (minor units); non-money measures are `Decimal`. Run via `npm run check:no-float` (wired into pretest/CI).
const fs = require("fs");
const path = require("path");

const SCHEMA = path.join(__dirname, "..", "src", "backend", "db", "schema.prisma");

function main() {
  const src = fs.readFileSync(SCHEMA, "utf8");
  const offenders = [];
  src.split("\n").forEach((line, i) => {
    // Match a `Float` scalar type token (field type or list `Float[]`), not substrings in names/comments.
    const code = line.split("//")[0];
    if (/(^|\s)Float(\?|\[\])?(\s|$)/.test(code)) {
      offenders.push({ line: i + 1, text: line.trim() });
    }
  });

  if (offenders.length > 0) {
    console.error(`\n✖ check-no-float: ${offenders.length} Float field(s) found in schema.prisma.`);
    console.error("  Money → Int (minor units); non-money measures → Decimal. (§27b)\n");
    offenders.forEach((o) => console.error(`  ${SCHEMA}:${o.line}  ${o.text}`));
    console.error("");
    process.exit(1);
  }

  console.log("✓ check-no-float: no Float fields in schema.prisma.");
}

main();

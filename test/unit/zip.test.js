// test/unit/zip.test.js — Phase 25 §25e. The dependency-free ZIP writer must produce a well-formed archive
// (local-file + central-directory + end-of-central-directory signatures) that round-trips every file.
import { describe, it, expect } from "vitest";

const { createZip, crc32 } = require("../../src/backend/utils/zip");

describe("utils/zip — createZip", () => {
  it("writes the three ZIP signatures and every named file", () => {
    const buf = createZip({ "profile.json": '{"a":1}', "legal.csv": "document,version\nterms,2026-11-01\n" });
    // Local file header signature at the start.
    expect(buf.readUInt32LE(0)).toBe(0x04034b50);
    // End-of-central-directory signature at the tail, recording 2 entries.
    expect(buf.readUInt32LE(buf.length - 22)).toBe(0x06054b50);
    expect(buf.readUInt16LE(buf.length - 22 + 10)).toBe(2); // total central-directory records
    // Both file names appear in the byte stream.
    const asStr = buf.toString("latin1");
    expect(asStr).toContain("profile.json");
    expect(asStr).toContain("legal.csv");
  });

  it("computes a stable CRC32", () => {
    expect(crc32(Buffer.from("hello world"))).toBe(0x0d4a1185);
  });

  it("handles an empty file set", () => {
    const buf = createZip({});
    expect(buf.readUInt32LE(buf.length - 22)).toBe(0x06054b50);
    expect(buf.readUInt16LE(buf.length - 22 + 10)).toBe(0);
  });
});

// utils/frontmatter.js — Phase 25 §25c. Minimal frontmatter splitter for the legal Markdown docs. Parses a
// leading `---` block of `key: value` lines (strings only — no nested YAML) and returns { meta, body }.
export function parseFrontmatter(raw = "") {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) meta[key] = val;
  }
  return { meta, body: m[2] };
}

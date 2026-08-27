#!/usr/bin/env node
/**
 * list-external-contributors.mjs
 *
 * Enumerate every contributor to this repo's git history, filter out the
 * project owner accounts + known bots, and emit:
 *
 *   --format json  → JSON array on stdout
 *   --format md    → Markdown table on stdout (also: --write writes to
 *                    docs/legal/historical-contributors.md)
 *
 * Default format is `md`.
 *
 * USE CASE (Phase 2 of the dual-license model):
 *   The CLA covers FUTURE contributions. Anyone who landed code before
 *   the CLA bot went live retains their copyright. Without retroactive
 *   assignment, the dual-license model is legally shaky — see
 *   docs/legal/historical-contributors-outreach.md for the followup.
 *
 * Owner/bot filtering:
 *   - Owner emails come from package.json `author` (parsed best-effort)
 *     PLUS the OWNER_EMAILS allowlist below.
 *   - Bot logins are filtered by substring match against BOT_PATTERNS.
 *
 * No external deps — uses node:child_process + node:fs only.
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ──────────────────────────────────────────────────────────────────────
// Owner / bot allowlists — extend as needed.
// ──────────────────────────────────────────────────────────────────────
const OWNER_EMAILS = new Set([
  "hello@nebutra.com",
  "tsekaluk@nebutra.com",
  "CleopatraDownsgwk@geologist.com", // current project-owner email
]);

const OWNER_NAME_FRAGMENTS = ["nebutra", "tseka", "cleopatra"];

const BOT_PATTERNS = [
  /\[bot\]/i,
  /dependabot/i,
  /renovate/i,
  /github-actions/i,
  /^noreply@github\.com$/i,
  /lefthook-bot/i,
  /^bot@/i,
];

// ──────────────────────────────────────────────────────────────────────
// CLI flag parsing (tiny, no deps)
// ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const format = args.includes("--format")
  ? args[args.indexOf("--format") + 1]
  : args.includes("--json")
    ? "json"
    : "md";
const writeFile = args.includes("--write");
const outputPath = args.includes("--out")
  ? args[args.indexOf("--out") + 1]
  : join(ROOT, "docs/legal/historical-contributors.md");

// ──────────────────────────────────────────────────────────────────────
// Pull author info from package.json (best-effort)
// ──────────────────────────────────────────────────────────────────────
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  const authorString = typeof pkg.author === "string" ? pkg.author : (pkg.author?.email ?? "");
  const emailMatch = authorString.match(/<([^>]+)>/);
  if (emailMatch) OWNER_EMAILS.add(emailMatch[1].toLowerCase());
  if (pkg.author?.email) OWNER_EMAILS.add(pkg.author.email.toLowerCase());
} catch {
  // ignore — package.json read is best-effort
}

// ──────────────────────────────────────────────────────────────────────
// Run git shortlog to enumerate contributors
// ──────────────────────────────────────────────────────────────────────
function git(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
}

function isOwner(name, email) {
  const e = (email ?? "").toLowerCase();
  if (OWNER_EMAILS.has(e)) return true;
  const n = (name ?? "").toLowerCase();
  return OWNER_NAME_FRAGMENTS.some((frag) => n.includes(frag) || e.includes(frag));
}

function isBot(name, email) {
  return BOT_PATTERNS.some((re) => re.test(name) || re.test(email));
}

const shortlog = git("git shortlog -sne --no-merges HEAD");

// Each line looks like: "    42  Alice Example <alice@example.com>"
const rows = [];
for (const raw of shortlog.split("\n")) {
  const line = raw.trim();
  if (!line) continue;
  const m = line.match(/^(\d+)\s+(.+?)\s+<([^>]+)>$/);
  if (!m) continue;
  const commits = Number.parseInt(m[1], 10);
  const name = m[2].trim();
  const email = m[3].trim();
  if (isOwner(name, email)) continue;
  if (isBot(name, email)) continue;
  rows.push({ name, email, commits });
}

// ──────────────────────────────────────────────────────────────────────
// Enrich: firstCommit, lastCommit, filesTouched (best-effort)
// We batch one `git log` per author — fine for a small N. For very large
// histories this is the bottleneck; swap to a single `git log` + JS
// grouping if it gets slow.
// ──────────────────────────────────────────────────────────────────────
for (const row of rows) {
  try {
    // Use --author with literal email match
    const log = git(`git log --author="${row.email}" --format="%H|%aI" --no-merges`).trim();
    const lines = log.split("\n").filter(Boolean);
    if (lines.length === 0) {
      row.firstCommit = null;
      row.lastCommit = null;
    } else {
      // git log is newest-first by default
      row.firstCommit = lines[lines.length - 1].split("|")[1];
      row.lastCommit = lines[0].split("|")[1];
    }
    const files = git(`git log --author="${row.email}" --name-only --pretty=format: --no-merges`)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    row.filesTouched = new Set(files).size;
  } catch {
    row.firstCommit = null;
    row.lastCommit = null;
    row.filesTouched = null;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Output
// ──────────────────────────────────────────────────────────────────────
if (format === "json") {
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  process.exit(0);
}

// Markdown
const fmtDate = (iso) => (iso ? iso.split("T")[0] : "—");
const tableRows = rows
  .map(
    (r) =>
      `| ${escapeMd(r.name)} | \`${escapeMd(r.email)}\` | ${r.commits} | ${fmtDate(r.firstCommit)} | ${fmtDate(r.lastCommit)} | ${r.filesTouched ?? "—"} | ☐ |`,
  )
  .join("\n");

function escapeMd(s) {
  return String(s).replace(/\|/g, "\\|");
}

const md = `# Historical Contributors

> Auto-generated by \`scripts/list-external-contributors.mjs\` on ${new Date().toISOString()}.
> Re-run with \`pnpm legal:contributors --write\`.

This file lists every external contributor to \`Nebutra-Sailor\` *before*
the CLA bot was wired up. These contributors retain copyright in their
commits — see [\`historical-contributors-outreach.md\`](./historical-contributors-outreach.md)
for the retroactive-assignment workflow.

**Total external contributors:** ${rows.length}

| Name | Email | Commits | First | Last | Files touched | CLA signed? |
|------|-------|---------|-------|------|---------------|-------------|
${tableRows || "| _(no external contributors found)_ | | | | | | |"}

## How to update this file

\`\`\`bash
pnpm legal:contributors --write
\`\`\`

The \`☐\` in the "CLA signed?" column is a TODO marker. Replace with \`☑\`
once the contributor has signed (or with \`—\` if their contributions
were removed under the AGPL-fallback path).

## Filters applied

- **Owner emails (skipped):** ${[...OWNER_EMAILS]
  .sort()
  .map((e) => `\`${e}\``)
  .join(", ")}
- **Owner name fragments (skipped):** ${OWNER_NAME_FRAGMENTS.map((s) => `\`${s}\``).join(", ")}
- **Bot patterns (skipped):** \`[bot]\`, \`dependabot\`, \`renovate\`, \`github-actions\`, \`lefthook-bot\`, \`noreply@github.com\`

If a contributor in the list above is actually an owner or bot, add them
to the appropriate allowlist in \`scripts/list-external-contributors.mjs\`.
`;

if (writeFile) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, md, "utf-8");
  process.stderr.write(`Wrote ${outputPath} (${rows.length} contributors)\n`);
} else {
  process.stdout.write(md);
}

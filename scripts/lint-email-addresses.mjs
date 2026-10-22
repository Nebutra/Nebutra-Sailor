#!/usr/bin/env node
// CI guard: every @nebutra.com address in the repository exists.
//
// Public pages, legal policies and SECURITY.md name addresses such as
// legal@, dpo@ and security@. On 2026-10-22 most of them had never been
// created in Aliyun Qiye, so mail to them bounced. infra/ops/email/addresses.json
// is now the list of addresses that exist (mailbox, group or send-only); an
// address in a tracked file that is not listed there fails this check.
//
// Fix: create the mailbox or group in qiye.aliyun.com/admin (or the sender in
// Resend), then add it to addresses.json. Test fixtures go in `placeholders`.
//
// Run: node scripts/lint-email-addresses.mjs

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ADDRESS = /([A-Za-z0-9._+-]+)@nebutra\.com(?![A-Za-z0-9-]|\.[A-Za-z])/gi;

export function extractAddresses(text) {
  return [...text.matchAll(ADDRESS)].map((m) => m[1].toLowerCase());
}

// found: Map<local, string[] files>. Returns the unlisted addresses.
export function checkAddresses(manifest, found) {
  const known = new Set([
    ...manifest.addresses.map((a) => a.local),
    ...(manifest.placeholders ?? []),
  ]);
  return [...found]
    .filter(([local]) => !known.has(local))
    .map(([local, files]) => ({ address: `${local}@${manifest.domain}`, files }));
}

function main() {
  const root = new URL("..", import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(join(root, "infra/ops/email/addresses.json"), "utf8"));
  // -I skips binaries; only tracked files that mention the domain at all.
  const files = execFileSync("git", ["grep", "-Ili", "-F", "@nebutra.com"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const found = new Map();
  for (const file of files) {
    for (const local of extractAddresses(readFileSync(join(root, file), "utf8"))) {
      if (!found.has(local)) found.set(local, []);
      if (!found.get(local).includes(file)) found.get(local).push(file);
    }
  }
  const missing = checkAddresses(manifest, found);
  if (missing.length === 0) return;
  console.error("Email addresses not in infra/ops/email/addresses.json:");
  for (const { address, files } of missing) console.error(`  ${address}  (${files.join(", ")})`);
  console.error(
    "Create the mailbox/group in qiye.aliyun.com/admin (or the sender in Resend), then list it.",
  );
  process.exit(1);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();

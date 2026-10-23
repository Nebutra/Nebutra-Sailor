#!/usr/bin/env node
// CI guard: every company email address in the repository exists.
//
// Public pages, legal policies and SECURITY.md name addresses such as legal@,
// dpo@ and security@. On 2026-10-22 most of them had never been created at
// the mail provider, so mail to them bounced. infra/ops/email/addresses.json
// lists the addresses that exist (mailbox, group or send-only) under its
// `domain`; an address on that domain in the repository that is not listed
// there fails this check. Projects without the manifest skip the check.
//
// Fix: create the mailbox or group at the mail provider (or the sender in
// Resend), then add it to addresses.json. Test fixtures go in `placeholders`.
//
// Run: node scripts/lint-email-addresses.mjs

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MANIFEST = "infra/ops/email/addresses.json";

const ADDRESS = /([A-Za-z0-9._+-]+)@([A-Za-z0-9.-]+)/g;

export function extractAddresses(text, domain) {
  const want = domain.toLowerCase();
  return [...text.matchAll(ADDRESS)]
    .filter((m) => m[2].replace(/\.+$/, "").toLowerCase() === want)
    .map((m) => m[1].toLowerCase());
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
  if (!existsSync(join(root, MANIFEST))) return;
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), "utf8"));
  // -I skips binaries; --untracked also reads new, not-yet-added files.
  const files = execFileSync("git", ["grep", "--untracked", "-Ili", "-F", `@${manifest.domain}`], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const found = new Map();
  for (const file of files) {
    for (const local of extractAddresses(readFileSync(join(root, file), "utf8"), manifest.domain)) {
      if (!found.has(local)) found.set(local, []);
      if (!found.get(local).includes(file)) found.get(local).push(file);
    }
  }
  const missing = checkAddresses(manifest, found);
  if (missing.length === 0) return;
  console.error(`Email addresses not in ${MANIFEST}:`);
  for (const { address, files } of missing) console.error(`  ${address}  (${files.join(", ")})`);
  console.error(
    "Create the mailbox/group at the mail provider (or the sender in Resend), then list it.",
  );
  process.exit(1);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();

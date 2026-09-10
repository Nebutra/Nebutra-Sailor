#!/usr/bin/env tsx

/**
 * Issue a Router consume key in *our* key store.
 *
 * The old `seed-kuanlan-router-key.sh` minted a New-API user token, which
 * worked only while `/v1` still reached New-API directly. The edge now has one
 * credential source — the shared `APIKey` table — so a New-API token is
 * rejected with `invalid_api_key`, and every consumer needs a key issued here
 * before the legacy bypass can be removed.
 *
 * The plaintext key is printed once, on its own line, prefixed with `KEY=` so a
 * caller can capture it into a secret store without it appearing in any other
 * output. Nothing else ever prints it; the row stores only its SHA-256.
 *
 * Usage:
 *   TENANT_ID=... NAME="kuanlan image2" tsx issue-customer-key.mts
 *   NAME="kuanlan image2" GRANT_USD=25 tsx issue-customer-key.mts   # makes a tenant
 *
 * Env: DATABASE_URL. Optional TENANT_ID (reuse), GRANT_USD (top up to at least
 * this balance), DRY_RUN=1.
 */

import { createHash, randomBytes } from "node:crypto";
import { getSystemDb } from "../../../packages/platform/db/src/index";

const KEY_PREFIX = "sk-nebutra-";

function newKey(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

function hash(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Never print a key: show only enough to match it against a secret store. */
function masked(key: string): string {
  return `${key.slice(0, KEY_PREFIX.length + 4)}…${key.slice(-4)}`;
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const name = (process.env.NAME ?? "").trim();
  if (!name) throw new Error("NAME is required — it is what the key is called in the console.");
  const grantUsd = Number(process.env.GRANT_USD ?? "0");
  const db = getSystemDb();

  let tenantId = (process.env.TENANT_ID ?? "").trim();
  if (tenantId) {
    const found = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!found) throw new Error(`No tenant ${tenantId}.`);
  } else {
    if (dryRun) {
      process.stdout.write("would create a machine tenant\n");
      tenantId = "(new)";
    } else {
      const created = await db.tenant.create({
        data: { kind: "machine", lifecycleState: "active" },
        select: { id: true },
      });
      tenantId = created.id;
      process.stdout.write(`tenant created ${tenantId}\n`);
    }
  }

  const key = newKey();
  if (dryRun) {
    process.stdout.write(`would issue ${masked(key)} for tenant ${tenantId} as "${name}"\n`);
    return;
  }

  await db.aPIKey.create({
    data: {
      name: name.slice(0, 64),
      keyHash: hash(key),
      keyPrefix: key.slice(0, 16),
      tenantId,
      scopes: [],
    },
  });

  // A key with no balance is refused at admission, so an issued key that cannot
  // buy anything is not a working key. Top up to the floor rather than adding to
  // it, so re-running this never silently doubles a grant.
  if (grantUsd > 0) {
    const existing = await db.creditBalance.findUnique({
      where: { tenantId },
      select: { balance: true },
    });
    const current = existing ? Number(existing.balance) : 0;
    if (current < grantUsd) {
      await db.creditBalance.upsert({
        where: { tenantId },
        create: { tenantId, balance: grantUsd, currency: "USD" },
        update: { balance: grantUsd },
      });
      process.stdout.write(`balance set to ${grantUsd} USD (was ${current})\n`);
    } else {
      process.stdout.write(`balance already ${current} USD, left alone\n`);
    }
  }

  process.stdout.write(`issued ${masked(key)} for tenant ${tenantId}\n`);
  // The one line that carries the secret. Capture it; do not echo it.
  process.stdout.write(`KEY=${key}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });

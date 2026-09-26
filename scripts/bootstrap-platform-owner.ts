#!/usr/bin/env tsx

/**
 * Creates the first platform owner: a `users` row and a PLATFORM_OWNER grant.
 *
 * WHY THIS HAS TO EXIST AT ALL
 *
 * `users` rows are now written by Better Auth's `user.create.after` hook via
 * `UserRepository.ensureFromIdentity` (keyed by `id`, the auth provider's own
 * user id). Before that bridge existed, the only writer was the
 * `clerk/user.created` Inngest handler — production never ran Clerk, so the
 * table stayed empty and `PlatformStaff.userId`, a foreign key into it, made
 * the first staff grant unissuable: nobody could be made an operator because
 * nobody existed. This script is the reviewable, idempotent way out of that,
 * and it still matters for bootstrapping an owner before anyone has signed in
 * through Better Auth.
 *
 * ABOUT clerkId
 *
 * The column is `UNIQUE` and named for a provider this deployment does not
 * use. Rather than change a many-model FK hub to fix a name, non-Clerk rows
 * get a namespaced value — `bootstrap:<email>` here. Nothing validates the
 * format; it is an opaque external identity key. If the column is ever
 * renamed to something provider-neutral, this convention is what makes that
 * a rename rather than a migration.
 *
 * Idempotent: re-running converges rather than duplicating, and it will not
 * silently downgrade an existing higher grant.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/bootstrap-platform-owner.ts \
 *     --email you@example.com [--name "Your Name"] [--dry-run]
 */

import { getSystemDb } from "@nebutra/db";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const EMAIL = arg("email")?.trim().toLowerCase();
const NAME = arg("name")?.trim();
const DRY_RUN = process.argv.includes("--dry-run");

if (!EMAIL || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(EMAIL)) {
  process.stderr.write("Required: --email <address>   Optional: --name, --dry-run\n");
  process.exit(1);
}

async function main() {
  const clerkId = `bootstrap:${EMAIL}`;

  if (DRY_RUN) {
    process.stdout.write(
      `would ensure users row  email=${EMAIL} clerk_id=${clerkId}\n` +
        "would ensure platform_staff role=PLATFORM_OWNER for that user\n",
    );
    return;
  }

  const prisma = getSystemDb();

  // Match on email first: if Clerk (or any other path) already created this
  // person, adopt that row rather than colliding on the unique email.
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  const user =
    existing ??
    (await prisma.user.create({
      data: { email: EMAIL, clerkId, ...(NAME ? { name: NAME } : {}) },
    }));

  process.stdout.write(
    `${existing ? "found" : "created"} user ${user.id}\n` +
      `  email:    ${user.email}\n` +
      `  clerk_id: ${user.clerkId}\n`,
  );

  const grant = await prisma.platformStaff.findUnique({ where: { userId: user.id } });

  if (grant && grant.revokedAt === null && grant.role === "PLATFORM_OWNER") {
    process.stdout.write("platform_staff: already PLATFORM_OWNER and active — nothing to do\n");
    return;
  }

  // Re-granting clears any tombstone: a revoked row must not keep denying after
  // the grant is deliberately reissued.
  const staff = await prisma.platformStaff.upsert({
    where: { userId: user.id },
    create: { userId: user.id, role: "PLATFORM_OWNER", note: "bootstrap: first platform owner" },
    update: { role: "PLATFORM_OWNER", revokedAt: null },
  });

  process.stdout.write(
    `${grant ? "updated" : "created"} platform_staff\n` +
      `  role:       ${staff.role}\n` +
      `  revoked_at: ${staff.revokedAt ?? "null (active)"}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});

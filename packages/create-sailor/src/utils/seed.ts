import fs from "node:fs";
import path from "node:path";

/**
 * Seed data generator for create-sailor.
 *
 * Writes an auth-provider-aware `prisma/seed.ts` into the scaffolded
 * project. The seed creates:
 *  - 3 example tenants (free / startup / pro plans)
 *  - 1 admin user (auth-aware: Clerk id / BetterAuth email+password / skipped)
 *  - 2 sample projects per tenant
 *
 * The generated seed wraps each block in try/catch so that projects with
 * a narrower schema (e.g. no Project model yet) still partially succeed
 * — this is "graceful degradation" per the task spec.
 *
 * Target resolution order (first match wins):
 *  1. `packages/db/prisma/schema.prisma`  (monorepo convention)
 *  2. `apps/web/prisma/schema.prisma`     (flat Next.js app)
 *
 * When `packages/db/package.json` exists we also ensure it declares a
 * `db:seed` script and the Prisma `seed` key so `prisma db seed` Just
 * Works. For an `apps/web` layout we update `apps/web/package.json`
 * instead.
 */

export type AuthChoice = "clerk" | "betterauth" | "none" | string;

interface PrismaTarget {
  /** Directory that contains `prisma/schema.prisma`. */
  packageDir: string;
  /** Full path to `prisma/seed.ts`. */
  seedPath: string;
  /** Full path to the owning `package.json`. */
  packageJsonPath: string;
}

function resolvePrismaTarget(targetDir: string): PrismaTarget | null {
  const candidates = [path.join(targetDir, "packages", "db"), path.join(targetDir, "apps", "web")];
  for (const candidate of candidates) {
    const schemaPath = path.join(candidate, "prisma", "schema.prisma");
    if (fs.existsSync(schemaPath)) {
      return {
        packageDir: candidate,
        seedPath: path.join(candidate, "prisma", "seed.ts"),
        packageJsonPath: path.join(candidate, "package.json"),
      };
    }
  }
  return null;
}

/**
 * Cheap schema probe: we scan `schema.prisma` for `model Foo` tokens.
 * This avoids pulling in a full Prisma schema parser. Good enough for
 * "does this model exist at scaffold time" — the generated seed still
 * try/catches each block as a runtime safety net.
 */
function detectModels(schemaPath: string): Set<string> {
  try {
    const raw = fs.readFileSync(schemaPath, "utf8");
    const found = new Set<string>();
    const regex = /^\s*model\s+(\w+)\s*\{/gm;
    let match = regex.exec(raw);
    while (match) {
      found.add(match[1]);
      match = regex.exec(raw);
    }
    return found;
  } catch {
    return new Set<string>();
  }
}

function renderAdminUserBlock(auth: AuthChoice, hasUserModel: boolean): string {
  if (!hasUserModel || auth === "none") {
    return `    // Skipping admin user — auth=${JSON.stringify(auth)} (or no User model).`;
  }

  if (auth === "clerk") {
    return `    try {
      const admin = await prisma.user.create({
        data: {
          clerkId: "user_mock_admin",
          email: "admin@example.com",
          name: "Admin",
        },
      });
      console.log("\\u2713 Created admin user:", admin.email);
    } catch (err) {
      console.warn("\\u26A0 Admin user creation skipped:", (err as Error).message);
    }`;
  }

  if (auth === "betterauth") {
    return `    try {
      // NOTE: in production hash passwords with the project's password hasher
      // (e.g. argon2id via @nebutra/auth). This is a scaffold placeholder.
      const admin = await prisma.user.create({
        data: {
          email: "admin@example.com",
          name: "Admin",
          hashedPassword: "CHANGE_ME_scaffold_placeholder",
        },
      });
      console.log("\\u2713 Created admin user:", admin.email);
    } catch (err) {
      console.warn("\\u26A0 Admin user creation skipped:", (err as Error).message);
    }`;
  }

  // Unknown provider — best-effort email-only record.
  return `    try {
      const admin = await prisma.user.create({
        data: { email: "admin@example.com", name: "Admin" },
      });
      console.log("\\u2713 Created admin user:", admin.email);
    } catch (err) {
      console.warn("\\u26A0 Admin user creation skipped:", (err as Error).message);
    }`;
}

function renderSeedFile(auth: AuthChoice, models: Set<string>): string {
  const hasTenant = models.has("Tenant");
  const hasUser = models.has("User");
  const hasProject = models.has("Project");

  const adminBlock = renderAdminUserBlock(auth, hasUser);

  const tenantBlock = hasTenant
    ? `  let tenants: Array<{ id: string; name: string }> = [];
  try {
    tenants = await Promise.all([
      prisma.tenant.create({
        data: { name: "Acme Corp", slug: "acme", plan: "pro" },
      }),
      prisma.tenant.create({
        data: { name: "Widget Co", slug: "widget", plan: "free" },
      }),
      prisma.tenant.create({
        data: { name: "Startup Inc", slug: "startup", plan: "startup" },
      }),
    ]);
    console.log(\`\\u2713 Created \${tenants.length} tenants\`);
  } catch (err) {
    console.warn("\\u26A0 Tenant creation skipped:", (err as Error).message);
  }`
    : `  const tenants: Array<{ id: string; name: string }> = [];
  console.log("\\u2139 No Tenant model in schema — skipping tenant seed.");`;

  const projectBlock =
    hasProject && hasTenant
      ? `  for (const tenant of tenants) {
    try {
      await prisma.project.createMany({
        data: [
          { name: \`\${tenant.name} - Sample Project 1\`, tenantId: tenant.id },
          { name: \`\${tenant.name} - Sample Project 2\`, tenantId: tenant.id },
        ],
      });
    } catch (err) {
      console.warn(
        \`\\u26A0 Project seed skipped for \${tenant.name}:\`,
        (err as Error).message,
      );
    }
  }`
      : `  console.log("\\u2139 No Project model (or no tenants) — skipping project seed.");`;

  return `/**
 * Database seed — generated by create-sailor.
 *
 * Run with:  pnpm db:seed
 *
 * Auth provider: ${auth}
 * Detected models at scaffold time: ${[...models].sort().join(", ") || "(none)"}
 *
 * Each block is wrapped in try/catch so evolving the schema does not
 * break the seed — missing models log a warning and move on.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("\\uD83C\\uDF31 Seeding database...");

  // --- Tenants ---------------------------------------------------------
${tenantBlock}

  // --- Admin user ------------------------------------------------------
${adminBlock}

  // --- Sample projects per tenant --------------------------------------
${projectBlock}

  console.log("\\u2713 Seed complete");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;
}

function ensurePackageJsonScripts(packageJsonPath: string): void {
  if (!fs.existsSync(packageJsonPath)) return;

  try {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
    let mutated = false;

    if (!scripts["db:seed"]) {
      scripts["db:seed"] = "prisma db seed";
      mutated = true;
    }

    const prisma = (pkg.prisma as Record<string, unknown> | undefined) ?? {};
    if (!prisma.seed) {
      prisma.seed = "tsx prisma/seed.ts";
      mutated = true;
    }

    if (!mutated) return;

    const next = { ...pkg, scripts, prisma };
    fs.writeFileSync(packageJsonPath, JSON.stringify(next, null, 2) + "\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[create-sailor] Failed to patch seed scripts in ${packageJsonPath}: ${message}`);
  }
}

export async function generateSeedData(targetDir: string, auth: AuthChoice): Promise<void> {
  const target = resolvePrismaTarget(targetDir);
  if (!target) {
    // No Prisma schema found — likely `--db=none` or a variant template.
    // Silent-skip; the scaffolder logs its own events around this step.
    return;
  }

  try {
    const schemaPath = path.join(target.packageDir, "prisma", "schema.prisma");
    const models = detectModels(schemaPath);

    const seedSource = renderSeedFile(auth, models);

    const seedDir = path.dirname(target.seedPath);
    if (!fs.existsSync(seedDir)) {
      fs.mkdirSync(seedDir, { recursive: true });
    }

    // Overwrite an existing seed — we own this file under create-sailor.
    fs.writeFileSync(target.seedPath, seedSource);

    ensurePackageJsonScripts(target.packageJsonPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[create-sailor] Failed to generate seed data: ${message}`);
    throw new Error(`Unable to write prisma/seed.ts: ${message}`);
  }
}

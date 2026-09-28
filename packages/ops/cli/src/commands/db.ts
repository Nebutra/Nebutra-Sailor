import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import { findMonorepoRootOrExit, prismaRun } from "../utils/delegate";
import { configError } from "../utils/errors";
import { ExitCode } from "../utils/exit-codes";
import { debug, status } from "../utils/output";

interface DbCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "plain";
}

/** Any command that talks to a real database gets killed after this long. */
const DB_COMMAND_TIMEOUT_MS = 20_000;

/**
 * Best-effort check for a configured `DATABASE_URL` — process env first (the
 * source of truth at runtime), then `.env.local`/`.env` in the project root
 * (what a freshly scaffolded project actually has before `pnpm dev` loads
 * them). We don't validate the URL is reachable here — Prisma will do that —
 * we only want to fail fast with a clear message on the common "never
 * configured it" case instead of letting `npx prisma` hang or print a wall
 * of a stack trace.
 */
function hasDatabaseUrlConfigured(root: string): boolean {
  if (process.env.DATABASE_URL) return true;

  for (const file of [".env.local", ".env"]) {
    const filePath = resolve(root, file);
    if (!existsSync(filePath)) continue;
    try {
      const content = readFileSync(filePath, "utf-8");
      if (/^DATABASE_URL\s*=\s*\S+/m.test(content)) return true;
    } catch {
      // ignore unreadable env files — fall through to "not configured"
    }
  }

  return false;
}

function requireDatabaseUrl(): void {
  const root = findMonorepoRootOrExit();
  if (!hasDatabaseUrlConfigured(root)) {
    configError(
      "DATABASE_URL is not set (checked the environment, .env.local, and .env).",
      "Set DATABASE_URL, or run `pnpm infra:up` for a local Postgres and add it to .env.local.",
    );
  }
}

/**
 * `nebutra db generate` — Generate Prisma client
 * Delegates to: pnpm db:generate
 */
async function handleGenerate(options: DbCommandOptions): Promise<void> {
  const label = "Generating Prisma client";
  status(label + "...", "info");

  const result = await prismaRun("generate", {
    dryRun: options.dryRun,
    interactive: !options.dryRun,
  });

  if (result.exitCode === 0) {
    status("Prisma client generated successfully", "success");
  } else {
    status("Failed to generate Prisma client", "error");
    process.exit(result.exitCode || 1);
  }
}

/**
 * `nebutra db migrate` — Run pending migrations
 * Delegates to: pnpm db:migrate (with optional --name for creation)
 */
async function handleMigrate(name?: string, options?: DbCommandOptions): Promise<void> {
  const opts = options || {};
  if (!opts.dryRun) requireDatabaseUrl();

  if (name) {
    // Create new migration
    status(`Creating migration: ${name}`, "info");

    const result = await prismaRun("migrate", {
      args: ["dev", "--name", name],
      dryRun: opts.dryRun,
      interactive: !opts.dryRun,
      timeoutMs: opts.dryRun ? undefined : DB_COMMAND_TIMEOUT_MS,
    });

    if (result.timedOut) {
      configError(
        `Creating migration '${name}' timed out after ${DB_COMMAND_TIMEOUT_MS}ms.`,
        "Check that DATABASE_URL points to a reachable database.",
      );
    }

    if (result.exitCode === 0) {
      status(`Migration '${name}' created successfully`, "success");
    } else {
      status(`Failed to create migration '${name}'`, "error");
      process.exit(result.exitCode || 1);
    }
  } else {
    // Run all pending migrations
    status("Running pending migrations...", "info");

    const result = await prismaRun("migrate", {
      args: ["deploy"],
      dryRun: opts.dryRun,
      interactive: !opts.dryRun,
      timeoutMs: opts.dryRun ? undefined : DB_COMMAND_TIMEOUT_MS,
    });

    if (result.timedOut) {
      configError(
        `Migration deploy timed out after ${DB_COMMAND_TIMEOUT_MS}ms.`,
        "Check that DATABASE_URL points to a reachable database.",
      );
    }

    if (result.exitCode === 0) {
      status("All pending migrations completed", "success");
    } else {
      status("Migration deployment failed", "error");
      process.exit(result.exitCode || 1);
    }
  }
}

/**
 * `nebutra db push` — Push schema to DB without migrations
 * Delegates to: pnpm db:push
 */
async function handlePush(options: DbCommandOptions): Promise<void> {
  if (!options.dryRun) requireDatabaseUrl();
  status("Pushing schema to database...", "info");

  const result = await prismaRun("db", {
    args: ["push"],
    dryRun: options.dryRun,
    interactive: !options.dryRun,
    timeoutMs: options.dryRun ? undefined : DB_COMMAND_TIMEOUT_MS,
  });

  if (result.timedOut) {
    configError(
      `Schema push timed out after ${DB_COMMAND_TIMEOUT_MS}ms.`,
      "Check that DATABASE_URL points to a reachable database.",
    );
  }

  if (result.exitCode === 0) {
    status("Schema pushed successfully", "success");
  } else {
    status("Failed to push schema", "error");
    process.exit(result.exitCode || 1);
  }
}

/**
 * `nebutra db seed` — Populate test data
 * Delegates to: pnpm db:seed
 */
async function handleSeed(options: DbCommandOptions): Promise<void> {
  if (!options.dryRun) requireDatabaseUrl();
  status("Seeding database...", "info");

  const result = await prismaRun("db", {
    args: ["seed"],
    dryRun: options.dryRun,
    interactive: !options.dryRun,
    timeoutMs: options.dryRun ? undefined : DB_COMMAND_TIMEOUT_MS,
  });

  if (result.timedOut) {
    configError(
      `Seeding timed out after ${DB_COMMAND_TIMEOUT_MS}ms.`,
      "Check that DATABASE_URL points to a reachable database.",
    );
  }

  if (result.exitCode === 0) {
    status("Database seeded successfully", "success");
  } else {
    status("Failed to seed database", "error");
    process.exit(result.exitCode || 1);
  }
}

/**
 * `nebutra db studio` — Launch Prisma Studio GUI
 * Delegates to: pnpm db:studio
 */
async function handleStudio(options: DbCommandOptions): Promise<void> {
  if (!options.dryRun) requireDatabaseUrl();
  status("Launching Prisma Studio...", "info");

  const result = await prismaRun("studio", {
    dryRun: options.dryRun,
    interactive: true, // Always interactive for studio
  });

  if (result.exitCode !== 0) {
    status("Failed to launch Prisma Studio", "error");
    process.exit(result.exitCode || 1);
  }
}

/**
 * `nebutra db reset` — Reset database (DANGEROUS)
 * Requires --yes or interactive confirmation
 * Delegates to: pnpm db:migrate -- --reset
 */
async function handleReset(options: DbCommandOptions): Promise<void> {
  const isInteractive = process.stdin.isTTY === true && process.stdout.isTTY === true;

  // Check for explicit confirmation
  if (!options.yes && !options.dryRun) {
    if (isInteractive) {
      // Prompt for confirmation in interactive mode
      const confirmed = await p.confirm({
        message: "Reset database? This will delete all data.",
        initialValue: false,
      });

      if (p.isCancel(confirmed) || !confirmed) {
        status("Reset cancelled", "warn");
        process.exit(ExitCode.CANCELLED);
      }
    } else {
      // Non-interactive without --yes is not allowed
      status(
        "Database reset requires explicit --yes confirmation (use: nebutra db reset --yes)",
        "error",
      );
      process.exit(ExitCode.INVALID_ARGS);
    }
  }

  if (!options.dryRun) requireDatabaseUrl();
  status("Resetting database...", "warn");

  const result = await prismaRun("migrate", {
    args: ["reset", ...(options.yes ? ["--force"] : [])],
    dryRun: options.dryRun,
    interactive: !options.dryRun,
    timeoutMs: options.dryRun ? undefined : DB_COMMAND_TIMEOUT_MS,
  });

  if (result.timedOut) {
    configError(
      `Database reset timed out after ${DB_COMMAND_TIMEOUT_MS}ms.`,
      "Check that DATABASE_URL points to a reachable database.",
    );
  }

  if (result.exitCode === 0) {
    status("Database reset successfully", "success");
  } else {
    status("Failed to reset database", "error");
    process.exit(result.exitCode || 1);
  }
}

/**
 * `nebutra db status` — Show migration status
 * Delegates to: npx prisma migrate status
 */
async function handleStatus(options: DbCommandOptions): Promise<void> {
  if (!options.dryRun) requireDatabaseUrl();
  status("Checking migration status...", "info");

  const result = await prismaRun("migrate", {
    args: ["status"],
    dryRun: options.dryRun,
    // Always capture output for `db status`: interactive mode (stdio:
    // "inherit") never populates `result.stdout`, so `--format json` was
    // silently returning nothing. Non-interactive also means `npx` never
    // tries an interactive "ok to proceed with install?" prompt against a
    // non-TTY stdin, which is how this used to hang forever.
    interactive: false,
    timeoutMs: options.dryRun ? undefined : DB_COMMAND_TIMEOUT_MS,
  });

  if (result.timedOut) {
    configError(
      `\`db status\` timed out after ${DB_COMMAND_TIMEOUT_MS}ms waiting on the database.`,
      "Check that DATABASE_URL points to a reachable database.",
    );
  }

  if (result.exitCode === 0) {
    if (options.format === "json") {
      // `prisma migrate status` prints human-readable text, not JSON — fall
      // back to emitting it as-is rather than pretending we have structure.
      try {
        const parsed = JSON.parse(result.stdout);
        process.stdout.write(JSON.stringify(parsed, null, 2) + "\n");
      } catch {
        process.stdout.write(result.stdout);
      }
    } else if (!options.dryRun) {
      // We captured stdout/stderr above (interactive: false), so surface it —
      // it no longer streams straight to the terminal the way it used to.
      if (result.stdout.trim()) process.stdout.write(result.stdout);
      if (result.stderr.trim()) process.stderr.write(result.stderr);
    }
  } else {
    status("Failed to check migration status", "error");
    if (result.stderr.trim()) debug("Prisma stderr", { stderr: result.stderr });
    process.exit(result.exitCode || 1);
  }
}

/**
 * Register the `db` command group
 * Usage: nebutra db <subcommand> [args]
 */
export function registerDbCommand(program: Command): void {
  const dbCommand = program
    .command("db <verb> [args...]")
    .description("Manage database schema, migrations, and state")
    .option("--dry-run", "Show what would be run without executing")
    .option("--yes", "Skip confirmations (especially for reset)")
    .option("--format <type>", "Output format: json, plain", "plain")
    .action(async (verb: string, args: string[], options: DbCommandOptions, command: Command) => {
      // NOTE: `--format` is also declared as a GLOBAL option on the root
      // program (for every other top-level command). When both the root
      // and this subcommand declare the same flag, Commander binds a
      // user-supplied `--format json` to the ROOT's option, not this
      // subcommand's — `options.format` here would silently stay at its
      // local default ("plain") regardless of what the user typed. Read
      // through `command.optsWithGlobals()` (the Command instance, not the
      // plain `options` object — which has no such method) and prefer that
      // value over the never-actually-overridden local default.
      const globalOptions = command.optsWithGlobals?.() as DbCommandOptions | undefined;
      const mergedOptions: DbCommandOptions = {
        dryRun: options.dryRun || globalOptions?.dryRun,
        yes: options.yes || globalOptions?.yes,
        format: (globalOptions?.format || options.format) as "json" | "plain",
      };

      try {
        switch (verb) {
          case "generate":
            await handleGenerate(mergedOptions);
            break;

          case "migrate":
            if (args.length > 0) {
              // `nebutra db migrate create <name>`
              if (args[0] === "create" && args[1]) {
                await handleMigrate(args[1], mergedOptions);
              } else {
                // `nebutra db migrate <name>` shorthand
                await handleMigrate(args[0], mergedOptions);
              }
            } else {
              // `nebutra db migrate` — run all pending
              await handleMigrate(undefined, mergedOptions);
            }
            break;

          case "push":
            await handlePush(mergedOptions);
            break;

          case "seed":
            await handleSeed(mergedOptions);
            break;

          case "studio":
            await handleStudio(mergedOptions);
            break;

          case "reset":
            await handleReset(mergedOptions);
            break;

          case "status":
            await handleStatus(mergedOptions);
            break;

          default:
            status(
              `Unknown db subcommand: ${verb}. Valid commands: generate, migrate, migrate create, push, seed, studio, reset, status`,
              "error",
            );
            process.exit(ExitCode.INVALID_ARGS);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        status(`Database command failed: ${message}`, "error");
        debug("Full error", { error });
        process.exit(ExitCode.ERROR);
      }
    });

  // Add help text
  dbCommand.addHelpText(
    "after",
    `
Examples:
  nebutra db generate              Generate Prisma client
  nebutra db migrate               Run all pending migrations
  nebutra db migrate create user   Create a new migration named "user"
  nebutra db push                  Push schema to database
  nebutra db seed                  Populate test data
  nebutra db studio                Launch Prisma Studio GUI
  nebutra db reset --yes           Reset entire database (requires --yes)
  nebutra db status                Check migration status

Flags:
  --dry-run                        Show what would be run without executing
  --yes                            Skip confirmations
  --format <type>                  Output format: json, plain (default: plain)
    `,
  );
}

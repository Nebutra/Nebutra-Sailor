import * as p from "@clack/prompts";
import type { Command } from "commander";
import { prismaRun } from "../utils/delegate.js";
import { debug, status } from "../utils/output.js";

interface DbCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "plain";
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

  if (name) {
    // Create new migration
    status(`Creating migration: ${name}`, "info");

    const result = await prismaRun("migrate", {
      args: ["dev", "--name", name],
      dryRun: opts.dryRun,
      interactive: !opts.dryRun,
    });

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
    });

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
  status("Pushing schema to database...", "info");

  const result = await prismaRun("db", {
    args: ["push"],
    dryRun: options.dryRun,
    interactive: !options.dryRun,
  });

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
  status("Seeding database...", "info");

  const result = await prismaRun("db", {
    args: ["seed"],
    dryRun: options.dryRun,
    interactive: !options.dryRun,
  });

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
        process.exit(0);
      }
    } else {
      // Non-interactive without --yes is not allowed
      status(
        "Database reset requires explicit --yes confirmation (use: nebutra db reset --yes)",
        "error",
      );
      process.exit(1);
    }
  }

  status("Resetting database...", "warn");

  const result = await prismaRun("migrate", {
    args: ["reset", ...(options.yes ? ["--force"] : [])],
    dryRun: options.dryRun,
    interactive: !options.dryRun,
  });

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
  status("Checking migration status...", "info");

  const result = await prismaRun("migrate", {
    args: ["status"],
    dryRun: options.dryRun,
    interactive: !options.dryRun,
  });

  if (result.exitCode === 0) {
    if (options.format === "json") {
      // In JSON format, output the status directly
      try {
        const parsed = JSON.parse(result.stdout);
        process.stdout.write(JSON.stringify(parsed, null, 2) + "\n");
      } catch {
        // If output is not JSON, output as-is
        process.stdout.write(result.stdout);
      }
    }
  } else {
    status("Failed to check migration status", "error");
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
    .action(
      async (
        verb: string,
        args: string[],
        options: DbCommandOptions & { optsWithGlobals?: () => DbCommandOptions },
      ) => {
        const globalOptions = options.optsWithGlobals?.();
        const mergedOptions: DbCommandOptions = {
          dryRun: options.dryRun || globalOptions?.dryRun,
          yes: options.yes || globalOptions?.yes,
          format: (options.format || globalOptions?.format) as "json" | "plain",
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
              process.exit(1);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          status(`Database command failed: ${message}`, "error");
          debug("Full error", { error });
          process.exit(1);
        }
      },
    );

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

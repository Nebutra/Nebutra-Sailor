import { stdin as processStdin } from "node:process";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes";
import { debug, output, status } from "../utils/output";

interface SecretsCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "plain" | "table";
  tenant?: string;
  unmask?: boolean;
  description?: string;
  value?: string;
  since?: string;
  limit?: number;
}

/**
 * Emit an honest "not wired to a backend" response for a secrets subcommand.
 *
 * The `nebutra` CLI has no secrets API to call: the gateway exposes no
 * `/secrets` or `/vault` route, and `@nebutra/vault` only does encrypt/decrypt
 * (no list/get/rotate/audit/verify surface). These subcommands are therefore
 * previews — we report that honestly instead of fabricating secret data.
 */
function notWired(feature: string, options: SecretsCommandOptions, hint: string): never {
  if (options.format === "json") {
    output(
      {
        status: "not_implemented",
        feature,
        reason: "no vault backend configured",
      },
      { format: "json" },
    );
  } else {
    status(`\`secrets ${feature}\` is a preview — not wired to a backend in this build.`, "warn");
    status(hint, "info");
  }

  process.exit(ExitCode.INCOMPATIBLE);
}

/**
 * Read input from stdin (used for secret values)
 */
async function readStdinSecure(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    processStdin.setEncoding("utf8");
    processStdin.on("readable", () => {
      let chunk: string | null;
      while ((chunk = processStdin.read()) !== null) {
        data += chunk;
      }
    });
    processStdin.on("end", () => {
      resolve(data.trim());
    });
    processStdin.on("error", reject);
  });
}

/**
 * `nebutra secrets list` — List encrypted secrets (metadata only)
 */
async function handleList(options: SecretsCommandOptions): Promise<void> {
  notWired(
    "list",
    options,
    "Listing secrets requires a configured vault/secrets API (e.g. a NEBUTRA_SECRETS_API_URL backend) that is not available in this build.",
  );
}

/**
 * `nebutra secrets set <key>` — Encrypt and store a secret
 */
async function handleSet(key: string, options: SecretsCommandOptions): Promise<void> {
  if (!key) {
    status("Secret key is required: nebutra secrets set <key>", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  let value: string;

  if (options.value) {
    status("WARNING: Using --value flag exposes secret in shell history. Prefer stdin.", "warn");
    value = options.value;
  } else {
    status("Enter secret value (will not echo). Press Ctrl+D when done:", "info");
    try {
      value = await readStdinSecure();
    } catch (_error) {
      status("Failed to read secret from stdin", "error");
      process.exit(ExitCode.ERROR);
    }
  }

  if (!value) {
    status("Secret value cannot be empty", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  // Input has been read/validated above, but there is no backend to persist to.
  // Do NOT claim the secret was stored — report the honest not-wired status.
  notWired(
    "set",
    options,
    "Storing secrets requires a configured vault/secrets API (e.g. a NEBUTRA_SECRETS_API_URL backend) that is not available in this build. Nothing was persisted.",
  );
}

/**
 * `nebutra secrets get <key>` — Decrypt and output a secret
 */
async function handleGet(key: string, options: SecretsCommandOptions): Promise<void> {
  if (!key) {
    status("Secret key is required: nebutra secrets get <key>", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  notWired(
    "get",
    options,
    "Retrieving secrets requires a configured vault/secrets API (e.g. a NEBUTRA_SECRETS_API_URL backend) that is not available in this build.",
  );
}

/**
 * `nebutra secrets rotate <key>` — Re-encrypt with new key material
 */
async function handleRotate(key: string, options: SecretsCommandOptions): Promise<void> {
  if (!key) {
    status("Secret key is required: nebutra secrets rotate <key>", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  const isInteractive = process.stdin.isTTY === true && process.stdout.isTTY === true;

  if (!options.yes && !options.dryRun && isInteractive) {
    const confirmed = await p.confirm({
      message: `Rotate encryption key for ${pc.cyan(key)}? This will re-encrypt with new key material.`,
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      status("Rotation cancelled", "warn");
      process.exit(ExitCode.CANCELLED);
    }
  }

  if (!options.yes && !options.dryRun && !isInteractive) {
    status("Key rotation requires --yes confirmation", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  // Confirmation handled above, but there is no backend to rotate against.
  // Do NOT claim rotation succeeded — report the honest not-wired status.
  notWired(
    "rotate",
    options,
    "Rotating key material requires a configured vault/secrets API (e.g. a NEBUTRA_SECRETS_API_URL backend) that is not available in this build. Nothing was rotated.",
  );
}

/**
 * `nebutra secrets audit` — Secret access audit log
 */
async function handleAudit(options: SecretsCommandOptions): Promise<void> {
  notWired(
    "audit",
    options,
    "The secret-access audit log requires a configured vault/secrets API (e.g. a NEBUTRA_SECRETS_API_URL backend) that is not available in this build.",
  );
}

/**
 * `nebutra secrets verify` — Verify vault configuration
 */
async function handleVerify(options: SecretsCommandOptions): Promise<void> {
  notWired(
    "verify",
    options,
    "Verifying vault configuration (KMS, envelope encryption, storage backend) requires a configured vault/secrets API (e.g. a NEBUTRA_SECRETS_API_URL backend) that is not available in this build.",
  );
}

/**
 * Register the `secrets` command group
 * Usage: nebutra secrets <subcommand> [args]
 */
export function registerSecretsCommand(program: Command): void {
  const secretsCommand = program
    .command("secrets <verb> [args...]")
    .description("Manage encrypted secrets via @nebutra/vault (AWS KMS + HKDF envelope encryption)")
    .option("--dry-run", "Show what would be run without executing")
    .option("--yes", "Skip confirmations")
    .option("--format <type>", "Output format: json, plain, table", "plain")
    .option("--tenant <id>", "Tenant ID for multi-tenant access")
    .option("--unmask", "Unmask secret values (required to view)")
    .option("--description <text>", "Description for secret")
    .option("--value <text>", "Secret value (prefer stdin for security)")
    .option("--since <date>", "Audit log start date (ISO 8601)")
    .option("--limit <n>", "Maximum audit log entries (default: 50)")
    .action(
      async (
        verb: string,
        args: string[],
        options: SecretsCommandOptions & { optsWithGlobals?: () => SecretsCommandOptions },
      ) => {
        const globalOptions = options.optsWithGlobals?.();
        const mergedOptions: SecretsCommandOptions = {
          dryRun: options.dryRun || globalOptions?.dryRun,
          yes: options.yes || globalOptions?.yes,
          format: (options.format || globalOptions?.format) as "json" | "plain" | "table",
          tenant: options.tenant || globalOptions?.tenant,
          unmask: options.unmask || false,
          description: options.description,
          value: options.value,
          since: options.since,
          limit: options.limit ?? 50,
        };

        try {
          switch (verb) {
            case "list":
              await handleList(mergedOptions);
              break;

            case "set":
              if (args.length === 0) {
                status("set requires a secret key: nebutra secrets set <key>", "error");
                process.exit(ExitCode.INVALID_ARGS);
              }
              await handleSet(args[0], mergedOptions);
              break;

            case "get":
              if (args.length === 0) {
                status("get requires a secret key: nebutra secrets get <key>", "error");
                process.exit(ExitCode.INVALID_ARGS);
              }
              await handleGet(args[0], mergedOptions);
              break;

            case "rotate":
              if (args.length === 0) {
                status("rotate requires a secret key: nebutra secrets rotate <key>", "error");
                process.exit(ExitCode.INVALID_ARGS);
              }
              await handleRotate(args[0], mergedOptions);
              break;

            case "audit":
              await handleAudit(mergedOptions);
              break;

            case "verify":
              await handleVerify(mergedOptions);
              break;

            default:
              status(
                `Unknown secrets subcommand: ${verb}. Valid commands: list, set, get, rotate, audit, verify`,
                "error",
              );
              process.exit(ExitCode.ERROR);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          status(`Secrets command failed: ${message}`, "error");
          debug("Full error", { error });
          process.exit(ExitCode.ERROR);
        }
      },
    );

  // Add help text
  secretsCommand.addHelpText(
    "after",
    `
Examples:
  nebutra secrets list                           List all secrets (metadata only)
  nebutra secrets list --tenant org_456          List secrets for specific tenant
  nebutra secrets set openai_key                 Set secret via stdin (recommended)
  nebutra secrets set openai_key --value abc123  Set secret via flag (less secure)
  nebutra secrets get openai_key --unmask        Get secret unmasked value
  nebutra secrets get openai_key                 Get secret (masked by default)
  nebutra secrets rotate openai_key --yes        Rotate encryption key
  nebutra secrets audit                          Show access audit log
  nebutra secrets audit --limit 20               Show last 20 audit entries
  nebutra secrets verify                         Verify vault configuration (KMS, backend)

Secret Storage:
  Uses @nebutra/vault with envelope encryption
  - Master key: AWS KMS or local HKDF
  - Encryption: AES-256-GCM
  - Storage: PostgreSQL (encrypted at rest)

Flags:
  --dry-run                   Show what would be run without executing
  --yes                       Skip confirmations (for rotate, etc)
  --format <type>             Output format: json, plain, table (default: plain)
  --tenant <id>               Tenant ID (for multi-tenant setups)
  --unmask                    Show actual secret value (set requires confirmation)
  --description <text>        Add description to secret
  --value <text>              Secret value (INSECURE — prefer stdin via pipe)
  --since <date>              Audit log start date (ISO 8601)
  --limit <n>                 Audit log entry limit (default: 50)

Security Notes:
  - Use stdin (pipe) for secrets: echo "secret" | nebutra secrets set key
  - Never use --value in production (visible in shell history)
  - Always use --unmask when viewing secrets in scripts
  - Audit log tracks all access and modifications
    `,
  );
}

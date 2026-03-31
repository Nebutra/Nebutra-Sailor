import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve create-sailor binary from multiple sources:
 * 1. Sibling package in monorepo (development)
 * 2. Installed as dependency in node_modules
 * 3. Global system PATH
 */
function resolveCreateSailorBinary(): string {
  const strategies = [
    // Strategy 1: Monorepo sibling (pnpm/yarn workspace)
    () => {
      const siblingPath = resolve(__dirname, "../../../create-sailor/dist/index.js");
      return siblingPath;
    },
  ];

  for (const strategy of strategies) {
    try {
      const path = strategy();
      return path;
    } catch {}
  }

  // Fallback: try to find via 'which' or assume it's in PATH
  return "create-sailor";
}

interface SpawnError extends Error {
  code?: string;
  signal?: string;
}

function _isSpawnError(error: unknown): error is SpawnError {
  return error instanceof Error && "code" in error;
}

export function registerCreateCommand(program: any) {
  program
    .command("create [dir]")
    .description("Scaffold a new Nebutra-Sailor project")
    .allowUnknownOption(true)
    .action(async (dir: string | undefined, _options: any, cmd: any) => {
      p.intro(pc.bgCyan(pc.black(" nebutra create ")));

      try {
        const createSailorBin = resolveCreateSailorBinary();

        // Build arguments: if dir is provided, pass it; include any remaining args
        const args = dir ? [dir] : [];

        // Add any additional arguments passed to the command
        if (cmd.args && cmd.args.length > (dir ? 1 : 0)) {
          const additionalArgs = cmd.args.slice(dir ? 1 : 0);
          args.push(...additionalArgs);
        }

        const spinner = p.spinner();
        spinner.start(pc.cyan(`Launching create-sailor${dir ? ` in ${dir}` : ""}...`));

        const child = spawn(process.execPath, [createSailorBin, ...args], {
          stdio: "inherit",
          env: { ...process.env },
        });

        child.on("close", (code) => {
          spinner.stop();
          if (code === 0) {
            p.outro(
              pc.green(
                "Project created successfully! Run 'npm install && npm run dev' to get started.",
              ),
            );
          }
          process.exit(code ?? 0);
        });

        child.on("error", (err: SpawnError) => {
          spinner.stop();
          console.error(pc.red(`\nFailed to launch create-sailor: ${err.message}`));

          if (err.code === "ENOENT") {
            console.error(
              pc.yellow("\nTip: Ensure create-sailor is installed or available in your PATH."),
            );
            console.error(pc.cyan("  Install globally: npm install -g create-sailor"));
          }

          process.exit(1);
        });
      } catch (error: unknown) {
        p.log.error(
          pc.red("Error: Unable to start create-sailor. Ensure it is properly installed."),
        );

        if (error instanceof Error) {
          console.error(pc.dim(error.message));
        }

        process.exit(1);
      }
    });
}

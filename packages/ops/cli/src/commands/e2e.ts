import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { delegate, findMonorepoRoot } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

type E2ESuite = "smoke" | "golden" | "sleptons";

const VALID_SUITES: readonly E2ESuite[] = ["smoke", "golden", "sleptons"];

const SUITE_CONFIG: Record<E2ESuite, { config: string; suiteDir: string }> = {
  smoke: { config: "e2e/playwright.config.ts", suiteDir: "e2e/smoke" },
  golden: { config: "e2e/playwright.golden.config.ts", suiteDir: "e2e/golden" },
  sleptons: { config: "e2e/playwright.sleptons.config.ts", suiteDir: "e2e/sleptons" },
};

interface E2EOptions {
  dryRun?: boolean;
  quiet?: boolean;
}

export async function e2eCommand(suite: string, options: E2EOptions = {}): Promise<void> {
  if (!VALID_SUITES.includes(suite as E2ESuite)) {
    logger.error(`Invalid suite: ${pc.red(suite)}. Valid: ${VALID_SUITES.join(", ")}`);
    process.exit(ExitCode.INVALID_ARGS);
  }

  const root = findMonorepoRoot();
  const { config, suiteDir } = SUITE_CONFIG[suite as E2ESuite];
  const configAbs = path.join(root, config);
  const suiteDirAbs = path.join(root, suiteDir);

  if (!fs.existsSync(suiteDirAbs) || !fs.existsSync(configAbs)) {
    logger.error(
      `Suite ${pc.red(suite)} not found at ${suiteDir}.\n` +
        `  Expected config: ${config}\n` +
        `  Remediation: scaffold the suite (analogous to 'nebutra workflow init <provider>')\n` +
        `  or restore the directory from git.`,
    );
    process.exit(ExitCode.NOT_FOUND);
  }

  if (options.dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          mode: "dry-run",
          command: `e2e ${suite}`,
          task: `pnpm exec playwright test --config ${config}`,
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(ExitCode.DRY_RUN_OK);
  }

  if (!options.quiet) {
    logger.info(`Running Playwright suite: ${pc.bold(suite)}`);
  }

  const result = await delegate({
    command: "pnpm",
    args: ["exec", "playwright", "test", "--config", config],
    interactive: true,
    label: `playwright ${suite}`,
  });

  process.exit(result.exitCode);
}

export function registerE2eCommand(program: any) {
  program
    .command("e2e <suite>")
    .description(`Run a Playwright suite (${VALID_SUITES.join(" | ")})`)
    .option("--dry-run", "Preview the command that would run (exit code 10)")
    .action(async (suite: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await e2eCommand(suite, {
        dryRun: options.dryRun || false,
        quiet: globalOptions.quiet || false,
      });
    });
}

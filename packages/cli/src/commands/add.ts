import { execSync } from "node:child_process";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface AddOptions {
  "21st"?: string;
  v0?: string;
  dryRun?: boolean;
  yes?: boolean;
  ifNotExists?: boolean;
}

/**
 * Check if a component already exists in the project
 * Returns true if component is already installed
 */
function componentExists(componentName: string): boolean {
  try {
    // Check if component exists in node_modules
    execSync(`npm list ${componentName}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a dry-run preview of what would be installed
 */
function buildDryRunPreview(
  components: string[],
  options: AddOptions,
): Record<string, any> {
  const preview = {
    mode: "dry-run",
    timestamp: new Date().toISOString(),
    operations: [] as Array<{
      type: string;
      component: string;
      source: string;
      command?: string;
    }>,
  };

  if (options["21st"]) {
    const componentId = options["21st"];
    const resolvedUrl = componentId.startsWith("http")
      ? componentId
      : `https://21st.dev/r/${componentId}`;

    preview.operations.push({
      type: "install-shadcn-21st",
      component: componentId,
      source: resolvedUrl,
      command: `pnpm dlx shadcn@latest add "${resolvedUrl}"`,
    });
  }

  if (options.v0) {
    preview.operations.push({
      type: "install-shadcn-v0",
      component: "v0-component",
      source: options.v0,
      command: `pnpm dlx shadcn@latest add "${options.v0}"`,
    });
  }

  if (components.length > 0 && !options["21st"] && !options.v0) {
    for (const component of components) {
      preview.operations.push({
        type: "install-heroui",
        component,
        source: "heroui-cli",
        command: `npx heroui-cli@latest add ${component}`,
      });
    }
  }

  return preview;
}

export async function addCommand(components: string[], options: AddOptions) {
  p.intro(pc.bgCyan(pc.black(" nebutra add ")));

  // Determine if we should skip prompts
  const skipPrompts = options.yes || !process.stdin.isTTY;

  if (components.length === 0 && !options["21st"] && !options.v0) {
    if (!options.dryRun) {
      p.log.warn("No components specified.");
      p.outro("Operation aborted.");
    } else {
      logger.warn("No components specified.");
    }
    process.exit(ExitCode.INVALID_ARGS);
  }

  // Handle --dry-run flag
  if (options.dryRun) {
    const preview = buildDryRunPreview(components, options);
    logger.info("Dry-run preview:");
    console.log(JSON.stringify(preview, null, 2));
    process.exit(ExitCode.DRY_RUN_OK);
  }

  // Handle --if-not-exists flag
  if (options.ifNotExists) {
    const allComponentsExist =
      (options["21st"] && componentExists(options["21st"])) ||
      (options.v0 && componentExists("shadcn-component")) ||
      (components.length > 0 &&
        components.every((comp) => componentExists(comp)));

    if (allComponentsExist) {
      logger.info("Component(s) already exist. Skipping installation.");
      process.exit(ExitCode.SUCCESS);
    }
  }

  // Handle --21st option
  if (options["21st"]) {
    const shouldProceed =
      skipPrompts ||
      (await p.confirm({
        message: `Install 21st.dev component: ${options["21st"]}?`,
        initialValue: true,
      }));

    if (!shouldProceed || shouldProceed === false) {
      p.log.info("Installation cancelled.");
      process.exit(ExitCode.CANCELLED);
    }

    p.log.info(
      pc.cyan(
        `\nInvoking shadcn integration for 21st.dev component: ${options["21st"]}...`,
      ),
    );

    try {
      const componentId = options["21st"];
      const resolvedUrl = componentId.startsWith("http")
        ? componentId
        : `https://21st.dev/r/${componentId}`;

      const addCmd = `pnpm dlx shadcn@latest add "${resolvedUrl}"`;
      execSync(addCmd, { stdio: "inherit" });
      logger.success(`Successfully installed ${componentId}`);
      process.exit(ExitCode.SUCCESS);
    } catch (error: unknown) {
      logger.error(`Failed to install component: ${error instanceof Error ? error.message : "Unknown error"}`);
      process.exit(ExitCode.ERROR);
    }
  }

  // Handle --v0 option
  if (options.v0) {
    const shouldProceed =
      skipPrompts ||
      (await p.confirm({
        message: `Install v0 component from: ${options.v0}?`,
        initialValue: true,
      }));

    if (!shouldProceed || shouldProceed === false) {
      p.log.info("Installation cancelled.");
      process.exit(ExitCode.CANCELLED);
    }

    p.log.info(pc.cyan(`\nInvoking shadcn integration for v0 URL: ${options.v0}...`));

    try {
      const addCmd = `pnpm dlx shadcn@latest add "${options.v0}"`;
      execSync(addCmd, { stdio: "inherit" });
      logger.success("Successfully installed v0 component");
      process.exit(ExitCode.SUCCESS);
    } catch (error: unknown) {
      logger.error(
        `Failed to install component: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(ExitCode.ERROR);
    }
  }

  // Handle standard HeroUI components
  try {
    // Instead of a proprietary registry, Nebutra leverages HeroUI for base components.
    // If they want raw Tailwind/Radix, they use --21st or --v0.
    // Otherwise, standard `add` implies adding to the core design system (HeroUI).

    if (components.length > 0) {
      const shouldProceed =
        skipPrompts ||
        (await p.confirm({
          message: `Install ${components.length} component(s): ${components.join(", ")}?`,
          initialValue: true,
        }));

      if (!shouldProceed || shouldProceed === false) {
        p.log.info("Installation cancelled.");
        process.exit(ExitCode.CANCELLED);
      }

      const spinner = p.spinner();
      spinner.start(`Installing ${components.length} component(s)...`);

      for (const component of components) {
        const addCmd = `npx heroui-cli@latest add ${component}`;
        execSync(addCmd, { stdio: "pipe" });
      }

      spinner.stop(`Successfully installed ${components.length} component(s)`);
      logger.success(`Installed: ${components.join(", ")}`);
    }

    process.exit(ExitCode.SUCCESS);
  } catch (error: unknown) {
    logger.error(
      `Failed to install components: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(ExitCode.ERROR);
  }
}

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";
import {
  type FeatureDependency,
  type FeatureDescriptor,
  type FeatureEnv,
  type FeatureProviderDescriptor,
  getFeatureDescriptor,
} from "../utils/registry.js";

interface AddOptions {
  "21st"?: string;
  v0?: string;
  provider?: string;
  dryRun?: boolean;
  yes?: boolean;
  ifNotExists?: boolean;
}

type PackageSection = "dependencies" | "devDependencies";
type FileOpStatus = "create" | "skip" | "conflict";

interface SelectedFeature {
  name: string;
  descriptor: FeatureDescriptor;
  provider?: FeatureProviderDescriptor;
}

interface RunCommandOperation {
  type: "run-command";
  source: "21st" | "v0";
  component: string;
  command: string;
  resolvedUrl: string;
}

interface FileOperation {
  type: "write-file";
  feature: string;
  path: string;
  relativePath: string;
  status: FileOpStatus;
  reason: string;
  content: string;
}

interface EnvOperation {
  type: "merge-env";
  path: string;
  relativePath: string;
  created: boolean;
  add: FeatureEnv[];
  keep: FeatureEnv[];
}

interface DependencyChange {
  section: PackageSection;
  name: string;
  action: "add" | "update" | "keep";
  from?: string;
  to: string;
}

interface PackageJsonOperation {
  type: "update-package-json";
  path: string;
  relativePath: string;
  changes: DependencyChange[];
}

interface LocalInstallPlan {
  mode: "dry-run" | "apply";
  planType: "local-feature-install";
  cwd: string;
  timestamp: string;
  features: Array<{
    name: string;
    description: string;
    provider?: string;
    providerDescription?: string;
  }>;
  operations: Array<FileOperation | EnvOperation | PackageJsonOperation>;
  summary: {
    create: number;
    update: number;
    append: number;
    skip: number;
    conflict: number;
  };
}

function isExitSignal(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith("EXIT:");
}

function componentExists(componentName: string): boolean {
  try {
    execSync(`npm list ${componentName}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function outputJSON(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function buildExternalDryRunPreview(components: string[], options: AddOptions) {
  const operations: RunCommandOperation[] = [];

  if (options["21st"]) {
    const componentId = options["21st"];
    const resolvedUrl = componentId.startsWith("http")
      ? componentId
      : `https://21st.dev/r/${componentId}`;

    operations.push({
      type: "run-command",
      source: "21st",
      component: componentId,
      resolvedUrl,
      command: `pnpm dlx shadcn@latest add "${resolvedUrl}"`,
    });
  }

  if (options.v0) {
    operations.push({
      type: "run-command",
      source: "v0",
      component: "v0-component",
      resolvedUrl: options.v0,
      command: `pnpm dlx shadcn@latest add "${options.v0}"`,
    });
  }

  if (components.length > 0 && !options["21st"] && !options.v0) {
    logger.warn("Local feature installs are handled separately from external registry flows.");
  }

  return {
    mode: "dry-run" as const,
    planType: "external-add" as const,
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
    operations,
    summary: {
      execute: operations.length,
    },
  };
}

function normalizeDependencies(
  section: PackageSection,
  dependencies: FeatureDependency[] | undefined,
): FeatureDependency[] {
  if (!dependencies || dependencies.length === 0) {
    return [];
  }

  const deduped = new Map<string, FeatureDependency>();
  for (const dependency of dependencies) {
    deduped.set(`${section}:${dependency.name}`, dependency);
  }

  return Array.from(deduped.values());
}

function dedupeEnv(env: FeatureEnv[]): FeatureEnv[] {
  const deduped = new Map<string, FeatureEnv>();
  for (const entry of env) {
    if (!deduped.has(entry.key)) {
      deduped.set(entry.key, entry);
    }
  }
  return Array.from(deduped.values());
}

function renderTemplate(
  template: string,
  context: {
    feature: string;
    provider?: string;
    providerDescription?: string;
    envFile: string;
    envEntries: FeatureEnv[];
  },
): string {
  const envKeys = context.envEntries.map((entry) => entry.key);
  return template
    .replaceAll("{{feature}}", context.feature)
    .replaceAll("{{provider}}", context.provider ?? "default")
    .replaceAll("{{providerDescription}}", context.providerDescription ?? "No provider selected")
    .replaceAll("{{envFile}}", context.envFile)
    .replaceAll("{{envKeysCsv}}", envKeys.join(", "))
    .replaceAll("{{envKeysArray}}", JSON.stringify(envKeys));
}

async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function resolveEnvFilePath(cwd: string, preferred?: string): Promise<string> {
  if (preferred) {
    return path.join(cwd, preferred);
  }

  const candidates = [".env.local", ".env"];
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(cwd, candidate));
      return path.join(cwd, candidate);
    } catch {
      // keep looking
    }
  }

  return path.join(cwd, ".env.local");
}

function parseEnvKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const match of content.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
    if (match[1]) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function sortDependencies(
  dependencies: Record<string, string> | undefined,
): Record<string, string> {
  if (!dependencies) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function findProvider(
  descriptor: FeatureDescriptor,
  providerId: string | undefined,
): FeatureProviderDescriptor | undefined {
  if (!descriptor.providers || descriptor.providers.length === 0) {
    return undefined;
  }

  if (!providerId) {
    return descriptor.providers[0];
  }

  return descriptor.providers.find((provider) => provider.id === providerId);
}

async function buildLocalInstallPlan(
  selectedFeatures: SelectedFeature[],
  cwd: string,
  mode: "dry-run" | "apply",
): Promise<LocalInstallPlan> {
  const rootPackageJsonPath = path.join(cwd, "package.json");
  const rawPackageJson = await readTextIfExists(rootPackageJsonPath);

  if (!rawPackageJson) {
    throw new Error(`No package.json found in ${cwd}. Run this command from a project root.`);
  }

  const packageJson = JSON.parse(rawPackageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const allEnvEntries = dedupeEnv(
    selectedFeatures.flatMap((feature) => [
      ...(feature.descriptor.env ?? []),
      ...(feature.provider?.env ?? []),
    ]),
  );
  const envPath = await resolveEnvFilePath(cwd, selectedFeatures[0]?.descriptor.envFile);
  const rawEnv = (await readTextIfExists(envPath)) ?? "";
  const existingEnvKeys = parseEnvKeys(rawEnv);
  const envToAdd = allEnvEntries.filter((entry) => !existingEnvKeys.has(entry.key));
  const envToKeep = allEnvEntries.filter((entry) => existingEnvKeys.has(entry.key));

  const fileOperations: FileOperation[] = [];

  for (const feature of selectedFeatures) {
    const envEntries = dedupeEnv([
      ...(feature.descriptor.env ?? []),
      ...(feature.provider?.env ?? []),
    ]);
    const context = {
      feature: feature.name,
      provider: feature.provider?.id,
      providerDescription: feature.provider?.description,
      envFile: path.relative(cwd, envPath) || path.basename(envPath),
      envEntries,
    };

    for (const file of feature.descriptor.files ?? []) {
      const absolutePath = path.join(cwd, file.path);
      const relativePath = path.relative(cwd, absolutePath) || file.path;
      const rendered = renderTemplate(file.content, context);
      const existing = await readTextIfExists(absolutePath);

      let status: FileOpStatus;
      let reason: string;

      if (existing === null) {
        status = "create";
        reason = "file missing";
      } else if (existing === rendered) {
        status = "skip";
        reason = "already matches registry template";
      } else {
        status = "conflict";
        reason = "file exists with different content";
      }

      fileOperations.push({
        type: "write-file",
        feature: feature.name,
        path: absolutePath,
        relativePath,
        status,
        reason,
        content: rendered,
      });
    }
  }

  const dependencies = normalizeDependencies(
    "dependencies",
    selectedFeatures.flatMap((feature) => [
      ...(feature.descriptor.dependencies ?? []),
      ...(feature.provider?.dependencies ?? []),
    ]),
  );
  const devDependencies = normalizeDependencies(
    "devDependencies",
    selectedFeatures.flatMap((feature) => [
      ...(feature.descriptor.devDependencies ?? []),
      ...(feature.provider?.devDependencies ?? []),
    ]),
  );

  const dependencyChanges: DependencyChange[] = [];

  for (const dependency of dependencies) {
    const current = packageJson.dependencies?.[dependency.name];
    dependencyChanges.push({
      section: "dependencies",
      name: dependency.name,
      action: current ? (current === dependency.version ? "keep" : "update") : "add",
      from: current,
      to: dependency.version,
    });
  }

  for (const dependency of devDependencies) {
    const current = packageJson.devDependencies?.[dependency.name];
    dependencyChanges.push({
      section: "devDependencies",
      name: dependency.name,
      action: current ? (current === dependency.version ? "keep" : "update") : "add",
      from: current,
      to: dependency.version,
    });
  }

  const envOperation: EnvOperation = {
    type: "merge-env",
    path: envPath,
    relativePath: path.relative(cwd, envPath) || path.basename(envPath),
    created: rawEnv.length === 0,
    add: envToAdd,
    keep: envToKeep,
  };

  const packageJsonOperation: PackageJsonOperation = {
    type: "update-package-json",
    path: rootPackageJsonPath,
    relativePath: path.relative(cwd, rootPackageJsonPath) || "package.json",
    changes: dependencyChanges,
  };

  const summary = {
    create: fileOperations.filter((operation) => operation.status === "create").length,
    update: dependencyChanges.filter(
      (change) => change.action === "add" || change.action === "update",
    ).length,
    append: envToAdd.length,
    skip:
      fileOperations.filter((operation) => operation.status === "skip").length +
      dependencyChanges.filter((change) => change.action === "keep").length +
      envToKeep.length,
    conflict: fileOperations.filter((operation) => operation.status === "conflict").length,
  };

  return {
    mode,
    planType: "local-feature-install",
    cwd,
    timestamp: new Date().toISOString(),
    features: selectedFeatures.map((feature) => ({
      name: feature.name,
      description: feature.descriptor.description,
      provider: feature.provider?.id,
      providerDescription: feature.provider?.description,
    })),
    operations: [...fileOperations, envOperation, packageJsonOperation],
    summary,
  };
}

function planHasChanges(plan: LocalInstallPlan): boolean {
  return plan.summary.create > 0 || plan.summary.update > 0 || plan.summary.append > 0;
}

function planHasConflicts(plan: LocalInstallPlan): boolean {
  return plan.summary.conflict > 0;
}

async function applyLocalInstallPlan(plan: LocalInstallPlan): Promise<void> {
  const packageJsonOperation = plan.operations.find(
    (operation): operation is PackageJsonOperation => operation.type === "update-package-json",
  );
  const envOperation = plan.operations.find(
    (operation): operation is EnvOperation => operation.type === "merge-env",
  );
  const fileOperations = plan.operations.filter(
    (operation): operation is FileOperation => operation.type === "write-file",
  );

  for (const fileOperation of fileOperations) {
    if (fileOperation.status !== "create") {
      continue;
    }

    await fs.mkdir(path.dirname(fileOperation.path), { recursive: true });
    await fs.writeFile(fileOperation.path, fileOperation.content, "utf8");
  }

  if (envOperation && envOperation.add.length > 0) {
    const existing = (await readTextIfExists(envOperation.path)) ?? "";
    const blocks = envOperation.add.map((entry) => `# ${entry.description}\n${entry.key}=`);
    const separator = existing.trim().length > 0 ? "\n\n" : "";
    const nextContent = `${existing.replace(/\s+$/, "")}${separator}${blocks.join("\n\n")}\n`;
    await fs.writeFile(envOperation.path, nextContent, "utf8");
  }

  if (packageJsonOperation) {
    const rawPackageJson = await fs.readFile(packageJsonOperation.path, "utf8");
    const packageJson = JSON.parse(rawPackageJson) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    for (const change of packageJsonOperation.changes) {
      if (change.action === "keep") {
        continue;
      }

      const bucket = change.section === "dependencies" ? "dependencies" : "devDependencies";
      packageJson[bucket] = {
        ...(packageJson[bucket] ?? {}),
        [change.name]: change.to,
      };
      packageJson[bucket] = sortDependencies(packageJson[bucket]);
    }

    await fs.writeFile(
      packageJsonOperation.path,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      "utf8",
    );
  }
}

async function resolveSelectedFeatures(
  components: string[],
  options: AddOptions,
  skipPrompts: boolean,
): Promise<SelectedFeature[]> {
  const selectedFeatures: SelectedFeature[] = [];

  for (const component of components) {
    const descriptor = await getFeatureDescriptor(component);

    if (!descriptor) {
      logger.error(`Feature '${component}' not found in the local registry.`);
      logger.info(
        "Use one of the supported local features or choose --21st / --v0 for external UI installs.",
      );
      process.exit(ExitCode.INVALID_ARGS);
    }

    let provider = findProvider(descriptor, options.provider);
    if (options.provider && !provider) {
      logger.error(`Provider '${options.provider}' is not supported for feature '${component}'.`);
      process.exit(ExitCode.INVALID_ARGS);
    }

    if (!provider && descriptor.providers && descriptor.providers.length > 0) {
      if (skipPrompts) {
        provider = descriptor.providers[0];
      } else {
        const selectedProvider = await p.select({
          message: `Select a provider for ${component}`,
          options: descriptor.providers.map((entry) => ({
            value: entry.id,
            label: entry.id,
            hint: entry.description,
          })),
        });

        if (p.isCancel(selectedProvider)) {
          p.log.info("Installation cancelled.");
          process.exit(ExitCode.CANCELLED);
        }

        provider = findProvider(descriptor, String(selectedProvider));
      }
    }

    selectedFeatures.push({
      name: component,
      descriptor,
      provider,
    });
  }

  return selectedFeatures;
}

function logLocalPlanSummary(plan: LocalInstallPlan): void {
  p.log.info(pc.yellow("Planned local install:"));

  for (const feature of plan.features) {
    p.log.message(
      `  - ${feature.name}${feature.provider ? ` (${feature.provider})` : ""}: ${feature.description}`,
    );
  }

  for (const operation of plan.operations) {
    if (operation.type === "write-file") {
      p.log.message(`  - ${operation.status.toUpperCase()} ${operation.relativePath}`);
    }

    if (operation.type === "merge-env" && operation.add.length > 0) {
      p.log.message(
        `  - APPEND ${operation.add.map((entry) => entry.key).join(", ")} to ${operation.relativePath}`,
      );
    }

    if (operation.type === "update-package-json") {
      const changes = operation.changes.filter(
        (change) => change.action === "add" || change.action === "update",
      );
      if (changes.length > 0) {
        p.log.message(
          `  - UPDATE ${operation.relativePath}: ${changes
            .map((change) => `${change.name}@${change.to}`)
            .join(", ")}`,
        );
      }
    }
  }
}

export async function addCommand(components: string[], options: AddOptions) {
  if (!options.dryRun) {
    p.intro(pc.bgCyan(pc.black(" nebutra add ")));
  }

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

  if (options.dryRun && (options["21st"] || options.v0)) {
    outputJSON(buildExternalDryRunPreview(components, options));
    process.exit(ExitCode.DRY_RUN_OK);
  }

  if (options.ifNotExists && (options["21st"] || options.v0)) {
    const allComponentsExist =
      (options["21st"] && componentExists(options["21st"])) ||
      (options.v0 && componentExists("shadcn-component"));

    if (allComponentsExist) {
      logger.info("Component already exists. Skipping installation.");
      process.exit(ExitCode.SUCCESS);
    }
  }

  if (options["21st"]) {
    const shouldProceed =
      skipPrompts ||
      (await p.confirm({
        message: `Install 21st.dev component: ${options["21st"]}?`,
        initialValue: true,
      }));

    if (p.isCancel(shouldProceed) || !shouldProceed) {
      p.log.info("Installation cancelled.");
      process.exit(ExitCode.CANCELLED);
    }

    p.log.info(
      pc.cyan(`Invoking shadcn integration for 21st.dev component: ${options["21st"]}...`),
    );

    try {
      const componentId = options["21st"];
      const resolvedUrl = componentId.startsWith("http")
        ? componentId
        : `https://21st.dev/r/${componentId}`;

      execSync(`pnpm dlx shadcn@latest add "${resolvedUrl}"`, { stdio: "inherit" });
      logger.success(`Successfully installed ${componentId}`);
      process.exit(ExitCode.SUCCESS);
    } catch (error: unknown) {
      if (isExitSignal(error)) {
        throw error;
      }
      logger.error(
        `Failed to install component: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(ExitCode.ERROR);
    }
  }

  if (options.v0) {
    const shouldProceed =
      skipPrompts ||
      (await p.confirm({
        message: `Install v0 component from: ${options.v0}?`,
        initialValue: true,
      }));

    if (p.isCancel(shouldProceed) || !shouldProceed) {
      p.log.info("Installation cancelled.");
      process.exit(ExitCode.CANCELLED);
    }

    p.log.info(pc.cyan(`Invoking shadcn integration for v0 URL: ${options.v0}...`));

    try {
      execSync(`pnpm dlx shadcn@latest add "${options.v0}"`, { stdio: "inherit" });
      logger.success("Successfully installed v0 component");
      process.exit(ExitCode.SUCCESS);
    } catch (error: unknown) {
      if (isExitSignal(error)) {
        throw error;
      }
      logger.error(
        `Failed to install component: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(ExitCode.ERROR);
    }
  }

  try {
    const selectedFeatures = await resolveSelectedFeatures(components, options, skipPrompts);
    const plan = await buildLocalInstallPlan(
      selectedFeatures,
      process.cwd(),
      options.dryRun ? "dry-run" : "apply",
    );

    if (options.dryRun) {
      outputJSON(plan);
      process.exit(ExitCode.DRY_RUN_OK);
    }

    if (planHasConflicts(plan)) {
      const conflictingFiles = plan.operations
        .filter(
          (operation): operation is FileOperation =>
            operation.type === "write-file" && operation.status === "conflict",
        )
        .map((operation) => operation.relativePath);

      if (options.ifNotExists && !planHasChanges(plan)) {
        logger.info(
          "Feature already appears to be installed. Skipping because --if-not-exists was set.",
        );
        process.exit(ExitCode.SUCCESS);
      }

      logger.error(`Refusing to overwrite existing files: ${conflictingFiles.join(", ")}`);
      process.exit(ExitCode.CONFLICT);
    }

    if (!planHasChanges(plan)) {
      logger.info(
        "Feature install already satisfied. No files, env keys, or dependencies needed changes.",
      );
      process.exit(ExitCode.SUCCESS);
    }

    logLocalPlanSummary(plan);

    const shouldProceed =
      skipPrompts ||
      (await p.confirm({
        message: `Proceed with installing ${plan.features.map((feature) => feature.name).join(", ")}?`,
        initialValue: true,
      }));

    if (p.isCancel(shouldProceed) || !shouldProceed) {
      p.log.info("Installation cancelled.");
      process.exit(ExitCode.CANCELLED);
    }

    await applyLocalInstallPlan(plan);
    logger.success(
      `Installed ${plan.features.map((feature) => feature.name).join(", ")} into ${plan.cwd}`,
    );
    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    if (isExitSignal(error)) {
      throw error;
    }
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(ExitCode.CONFIG_ERROR);
  }
}

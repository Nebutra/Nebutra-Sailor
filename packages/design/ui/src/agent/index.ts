import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type AgentDocsStatus = "stable" | "beta" | "deprecated" | "experimental";
export type AgentDocsMaturity = "experimental" | "beta" | "stable" | "canonical";
export type AgentDocsLayer =
  | "foundation"
  | "primitive"
  | "composition"
  | "pattern"
  | "registry"
  | "api"
  | "guide";
export type AgentDocsSubstrate = "native" | "custom" | "mixed";

export interface AgentComponentSummary {
  name: string;
  title: string;
  description: string;
  status: AgentDocsStatus;
  maturity: AgentDocsMaturity;
  layer: AgentDocsLayer;
  source: string;
  href: string;
  tags: string[];
}

export interface AgentManifest {
  $schema: string;
  name: "nebutra-ui-agent";
  version: 1;
  generatedAt: string;
  homepage: string;
  registry: string;
  commands: Array<{
    name: "search" | "component" | "validate" | "template" | "migrate";
    status: "available" | "planned";
    description: string;
    json: boolean;
  }>;
  rules: {
    sourceOfTruth: string[];
    importPolicy: string;
    registryPolicy: string;
    tokenPolicy: string;
  };
  components: AgentComponentSummary[];
}

export interface AgentComponentContract extends AgentComponentSummary {
  package: "@nebutra/ui" | "@nebutra/tokens";
  substrate: AgentDocsSubstrate;
  imports: {
    package: string;
    registry: string;
  };
  dependencies: {
    npm: string[];
    registry: string[];
  };
  files: Array<{
    path: string;
    type: string;
    target?: string;
  }>;
  tokens: string[];
  evidence: {
    source: true;
    docs: boolean;
    storybook: boolean;
    registry: true;
    tokens: boolean;
  };
  docs: {
    source?: string;
    routes: string[];
    storybook?: string;
    lastVerified: string;
  };
  usage: {
    recommended: string;
    antiPatterns: string[];
  };
  migration: {
    requiredForBreakingChanges: true;
    codemods: string[];
    hints: string[];
  };
}

export interface AgentContractPaths {
  manifestPath: string;
  componentDir: string;
}

export interface LoadAgentContractOptions {
  root?: string;
  manifestPath?: string;
}

export interface SearchAgentComponentsOptions {
  limit?: number;
  offset?: number;
  tag?: string;
  status?: AgentDocsStatus;
  maturity?: AgentDocsMaturity;
}

export interface SearchAgentComponentsResult {
  query: string;
  total: number;
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset?: number;
  items: AgentComponentSummary[];
}

export interface AgentValidationResult {
  name: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  evidence: AgentComponentContract["evidence"];
  migration: AgentComponentContract["migration"];
}

export function resolveAgentContractPaths(
  options: LoadAgentContractOptions = {},
): AgentContractPaths {
  const manifestPath = options.manifestPath
    ? resolve(options.manifestPath)
    : join(
        resolve(options.root ?? process.cwd()),
        "apps",
        "design-docs",
        "public",
        "agent-manifest.json",
      );

  return {
    manifestPath,
    componentDir: join(manifestPath, "..", "agent", "components"),
  };
}

export function normalizeAgentComponentName(name: string): string {
  return name.trim().toLowerCase();
}

export function assertSafeAgentComponentName(name: string): string {
  const normalized = normalizeAgentComponentName(name);
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    throw new Error(
      `Invalid UI component name "${name}". Use a registry kebab-case id such as "button".`,
    );
  }
  return normalized;
}

export function loadAgentManifest(options: LoadAgentContractOptions = {}): AgentManifest {
  const { manifestPath } = resolveAgentContractPaths(options);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Missing Nebutra UI agent manifest at ${manifestPath}. Run pnpm --filter @nebutra/design-docs build:registry.`,
    );
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as AgentManifest;
}

export function loadAgentComponentContract(
  name: string,
  options: LoadAgentContractOptions = {},
): AgentComponentContract {
  const safeName = assertSafeAgentComponentName(name);
  const { componentDir } = resolveAgentContractPaths(options);
  const componentPath = join(componentDir, `${safeName}.json`);
  if (!existsSync(componentPath)) {
    throw new Error(`UI component contract not found: ${safeName}`);
  }
  return JSON.parse(readFileSync(componentPath, "utf8")) as AgentComponentContract;
}

export function findAgentComponent(
  manifest: AgentManifest,
  name: string,
): AgentComponentSummary | undefined {
  const safeName = normalizeAgentComponentName(name);
  return manifest.components.find((component) => component.name === safeName);
}

export function searchAgentComponents(
  manifest: AgentManifest,
  query = "",
  options: SearchAgentComponentsOptions = {},
): SearchAgentComponentsResult {
  const normalizedQuery = query.trim().toLowerCase();
  const limit = clampInteger(options.limit ?? 20, 1, 100);
  const offset = clampInteger(options.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
  const tag = options.tag?.trim().toLowerCase();

  const scored = manifest.components
    .filter((component) => {
      if (options.status && component.status !== options.status) return false;
      if (options.maturity && component.maturity !== options.maturity) return false;
      if (tag && !component.tags.includes(tag)) return false;
      if (!normalizedQuery) return true;

      return searchableText(component).includes(normalizedQuery);
    })
    .map((component) => ({ component, score: scoreComponent(component, normalizedQuery) }))
    .sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name))
    .map(({ component }) => component);

  const items = scored.slice(offset, offset + limit);
  const nextOffset = offset + items.length;

  return {
    query,
    total: scored.length,
    count: items.length,
    offset,
    limit,
    hasMore: nextOffset < scored.length,
    ...(nextOffset < scored.length && { nextOffset }),
    items,
  };
}

export function validateAgentComponent(contract: AgentComponentContract): AgentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!contract.evidence.source) errors.push("Missing source evidence.");
  if (!contract.evidence.docs) errors.push("Missing docs evidence.");
  if (!contract.evidence.registry) errors.push("Missing registry evidence.");

  if (
    (contract.status === "stable" || contract.maturity === "canonical") &&
    !contract.evidence.storybook
  ) {
    errors.push("Stable/canonical components must have Storybook evidence.");
  }

  if (!contract.evidence.tokens && contract.package === "@nebutra/ui") {
    warnings.push(
      "No token evidence was detected; confirm this primitive intentionally has no CSS variables.",
    );
  }

  if (contract.migration.requiredForBreakingChanges && contract.migration.hints.length === 0) {
    warnings.push(
      "Breaking-change migration policy is enabled but no migration hints are present.",
    );
  }

  return {
    name: contract.name,
    valid: errors.length === 0,
    errors,
    warnings,
    evidence: contract.evidence,
    migration: contract.migration,
  };
}

function searchableText(component: AgentComponentSummary): string {
  return [
    component.name,
    component.title,
    component.description,
    component.status,
    component.maturity,
    component.layer,
    component.source,
    ...component.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function scoreComponent(component: AgentComponentSummary, query: string): number {
  if (!query) return component.maturity === "canonical" ? 20 : 10;
  if (component.name === query) return 100;
  if (component.name.startsWith(query)) return 80;
  if (component.title.toLowerCase().startsWith(query)) return 70;
  if (component.tags.includes(query)) return 60;
  if (component.name.includes(query)) return 50;
  if (component.title.toLowerCase().includes(query)) return 40;
  if (component.description.toLowerCase().includes(query)) return 20;
  return 1;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

import {
  type AgentComponentSummary,
  type AgentDocsMaturity,
  type AgentDocsStatus,
  loadAgentComponentContract,
  loadAgentManifest,
  searchAgentComponents,
  validateAgentComponent,
} from "@nebutra/ui/agent";
import type { MCPServerConfig } from "../types";

function readContractOptions(args: Record<string, unknown>) {
  const options: { root: string; manifestPath?: string } = {
    root: typeof args.root === "string" ? args.root : process.cwd(),
  };
  if (typeof args.manifestPath === "string") {
    options.manifestPath = args.manifestPath;
  }
  return options;
}

function readName(args: Record<string, unknown>): string {
  const name = args.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error('Missing required component name. Pass a registry id such as "button".');
  }
  return name;
}

function validateAll(args: Record<string, unknown>) {
  const options = readContractOptions(args);
  const manifest = loadAgentManifest(options);
  const results = manifest.components.map((component: AgentComponentSummary) =>
    validateAgentComponent(loadAgentComponentContract(component.name, options)),
  );
  const invalid = results.filter((result) => !result.valid).length;

  return {
    valid: invalid === 0,
    total: results.length,
    invalid,
    results,
  };
}

export function createUiAgentMcpServer(): MCPServerConfig {
  return {
    id: "nebutra-ui-agent",
    name: "Nebutra UI Agent Contract",
    description:
      "Read-only tools for @nebutra/ui agent contracts, production evidence, and migration hints.",
    endpoint: "local://nebutra-ui-agent",
    transport: "local",
    manifest: {
      name: "nebutra-ui-agent",
      version: "1.0.0",
      scopes: ["ui:read"],
      homepage: "https://ui.nebutra.com",
    },
    tools: [
      {
        name: "nebutra_ui_search_components",
        description: "Search the Nebutra UI agent manifest by query, tag, status, or maturity.",
        parameters: {
          query: { type: "string", description: "Search text such as button, table, or chat" },
          limit: { type: "number", description: "Maximum results to return", default: 20 },
          offset: { type: "number", description: "Pagination offset", default: 0 },
          tag: { type: "string", description: "Optional generated tag filter" },
          status: { type: "string", description: "Optional status filter" },
          maturity: { type: "string", description: "Optional maturity filter" },
          root: { type: "string", description: "Optional Nebutra monorepo root override" },
          manifestPath: {
            type: "string",
            description: "Optional agent-manifest.json path override",
          },
        },
        returns: "Paginated component search results with stable component ids",
      },
      {
        name: "nebutra_ui_get_component",
        description: "Read one Nebutra UI component contract by registry id.",
        parameters: {
          name: { type: "string", description: "Component id, for example button", required: true },
          root: { type: "string", description: "Optional Nebutra monorepo root override" },
          manifestPath: {
            type: "string",
            description: "Optional agent-manifest.json path override",
          },
        },
        returns:
          "Full component contract with imports, evidence, tokens, docs, and migration policy",
      },
      {
        name: "nebutra_ui_validate_component",
        description: "Validate production evidence for one component or the full UI contract.",
        parameters: {
          name: { type: "string", description: "Optional component id; omit to validate all" },
          root: { type: "string", description: "Optional Nebutra monorepo root override" },
          manifestPath: {
            type: "string",
            description: "Optional agent-manifest.json path override",
          },
        },
        returns: "Validation result with errors and warnings",
      },
      {
        name: "nebutra_ui_get_migration_hints",
        description: "Read dry-run codemod and migration hints for one component.",
        parameters: {
          name: { type: "string", description: "Component id, for example button", required: true },
          root: { type: "string", description: "Optional Nebutra monorepo root override" },
          manifestPath: {
            type: "string",
            description: "Optional agent-manifest.json path override",
          },
        },
        returns: "Migration hints and registered codemod ids",
      },
    ],
    handlers: {
      nebutra_ui_search_components: async (args) => {
        const manifest = loadAgentManifest(readContractOptions(args));
        const searchOptions: {
          limit: number;
          offset: number;
          tag?: string;
          status?: AgentDocsStatus;
          maturity?: AgentDocsMaturity;
        } = {
          limit: typeof args.limit === "number" ? args.limit : 20,
          offset: typeof args.offset === "number" ? args.offset : 0,
        };
        if (typeof args.tag === "string") searchOptions.tag = args.tag;
        if (typeof args.status === "string") searchOptions.status = args.status as AgentDocsStatus;
        if (typeof args.maturity === "string") {
          searchOptions.maturity = args.maturity as AgentDocsMaturity;
        }
        return searchAgentComponents(
          manifest,
          typeof args.query === "string" ? args.query : "",
          searchOptions,
        );
      },
      nebutra_ui_get_component: async (args) =>
        loadAgentComponentContract(readName(args), readContractOptions(args)),
      nebutra_ui_validate_component: async (args) => {
        if (typeof args.name === "string" && args.name.trim().length > 0) {
          return validateAgentComponent(
            loadAgentComponentContract(args.name, readContractOptions(args)),
          );
        }
        return validateAll(args);
      },
      nebutra_ui_get_migration_hints: async (args) => {
        const contract = loadAgentComponentContract(readName(args), readContractOptions(args));
        return {
          component: contract.name,
          dryRun: true,
          codemods: contract.migration.codemods,
          hints: contract.migration.hints,
          requiredForBreakingChanges: contract.migration.requiredForBreakingChanges,
        };
      },
    },
    rateLimit: { maxRequests: 300, windowMs: 60000 },
  };
}

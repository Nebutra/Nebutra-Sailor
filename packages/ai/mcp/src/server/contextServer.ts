#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  encodePreset,
  presetArgument,
  presetJsonSchema,
  readPresetInput,
  studioReviewUrl,
} from "@nebutra/tokens/preset";
import { callStaffTool, isStaffTool, STAFF_TOOLS } from "./staffTools";

/**
 * Nebutra MCP Context Server
 * Exposes core project files and state to Cursor / Windsurf allowing AI Agents
 * to instantly understand the Nebutra-Sailor application structure and routing logic.
 */
class NebutraContextServer {
  private server: Server;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();

    this.server = new Server(
      {
        name: "@nebutra/context-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      },
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();

    this.server.onerror = (_error) => {};
  }

  private setupResourceHandlers() {
    const handlers = createContextServerHandlers(this.projectRoot);

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => handlers.listResources());

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return handlers.readResource(request.params);
    });
  }

  private setupToolHandlers() {
    const handlers = createContextServerHandlers(this.projectRoot);

    this.server.setRequestHandler(ListToolsRequestSchema, async () => handlers.listTools());

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return handlers.callTool(request.params);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const RESOURCE_MAP = {
  "file:///nebutra.config.json": {
    relativePath: "nebutra.config.json",
    name: "Nebutra Configuration",
    mimeType: "application/json",
    description:
      "Global configurations for the Nebutra template including enabled features (auth, payments, i18n, db).",
  },
  "file:///prisma/schema.prisma": {
    relativePath: "packages/platform/db/prisma/schema.prisma",
    name: "Database Schema Overview",
    mimeType: "text/plain",
    description: "The core Prisma schema defining the database tables and relationships.",
  },
} as const;

export function createContextServerHandlers(projectRoot: string) {
  return {
    async listResources() {
      return {
        resources: Object.entries(RESOURCE_MAP).map(([uri, resource]) => ({
          uri,
          name: resource.name,
          mimeType: resource.mimeType,
          description: resource.description,
        })),
      };
    },

    async readResource({ uri }: { uri: string }) {
      const resource = RESOURCE_MAP[uri as keyof typeof RESOURCE_MAP];
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }

      const filePath = path.join(projectRoot, resource.relativePath);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        return {
          contents: [
            {
              uri,
              mimeType: resource.mimeType,
              text: content,
            },
          ],
        };
      } catch {
        throw new Error(`Failed to read the requested resource file at ${filePath}`);
      }
    },

    async listTools() {
      return {
        tools: [
          {
            name: "get_project_structure",
            description: "Returns a bounded app/package routing tree for the current project.",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          ...STUDIO_TOOLS,
          ...STAFF_TOOLS,
        ],
      };
    },

    async callTool({
      name,
      arguments: args,
    }: {
      name: string;
      arguments?: Record<string, unknown> | undefined;
    }) {
      if (name.startsWith("studio_")) return callStudioTool(projectRoot, name, args ?? {});
      if (isStaffTool(name)) return callStaffTool(name, args ?? {});
      if (name !== "get_project_structure") {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        return {
          content: [
            {
              type: "text",
              text: getProjectStructure(projectRoot),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

/**
 * Sailor Studio for an agent (the same loop as `nebutra studio`): read the
 * preset schema, turn a preset into a Studio review link for the person, and
 * once they approve, write it onto the project.
 */
const PRESET_ARG = {
  preset: {
    description:
      "A preset object (see studio_preset_schema), its JSON text, a preset code, a base id, or a Studio link.",
  },
};

export const STUDIO_TOOLS = [
  {
    name: "studio_preset_schema",
    description:
      "JSON Schema for a Sailor Studio preset: the base design language and every knob with its allowed values.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "studio_preview",
    description:
      "Validate a preset and return the Sailor Studio link to show the person, plus the commands that apply it. Ask them to review the link before pulling.",
    inputSchema: {
      type: "object",
      properties: {
        ...PRESET_ARG,
      },
      required: ["preset"],
    },
  },
  {
    name: "studio_pull",
    description:
      "Write an approved preset onto this Sailor project (packages/design/tokens/project/preset). Run `pnpm --filter @nebutra/tokens build` afterwards, or use `nebutra studio pull`, which does both.",
    inputSchema: { type: "object", properties: PRESET_ARG, required: ["preset"] },
  },
];

const text = (value: unknown) => ({
  content: [
    { type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
  ],
});

export function callStudioTool(projectRoot: string, name: string, args: Record<string, unknown>) {
  try {
    if (name === "studio_preset_schema") return text(presetJsonSchema());
    const preset = readPresetInput(args.preset);
    const code = presetArgument(preset);
    if (name === "studio_preview") {
      return text({
        code,
        preset,
        reviewUrl: studioReviewUrl(preset),
        apply: `nebutra studio pull ${code}`,
        create: `npx create-sailor@latest my-app --preset ${code}`,
      });
    }
    if (name === "studio_pull") {
      const tokens = path.join(projectRoot, "packages", "design", "tokens");
      if (!fs.existsSync(path.join(tokens, "package.json"))) {
        throw new Error(`${projectRoot} is not a Sailor project (no packages/design/tokens).`);
      }
      const file = path.join(tokens, "project", "preset");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${encodePreset(preset)}\n`);
      return text({
        written: path.relative(projectRoot, file),
        code,
        next: "pnpm --filter @nebutra/tokens build",
      });
    }
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      ...text(`Error: ${error instanceof Error ? error.message : String(error)}`),
      isError: true,
    };
  }
}

function getProjectStructure(projectRoot: string): string {
  const roots = ["apps", "packages", "backends"].filter((segment) =>
    fs.existsSync(path.join(projectRoot, segment)),
  );
  if (roots.length === 0) return "No Nebutra workspace roots found.";

  const entries: string[] = [];
  for (const root of roots) {
    walkProjectTree(path.join(projectRoot, root), root, entries, 4);
  }
  return entries.length > 0 ? entries.join("\n") : "No project entries found.";
}

function walkProjectTree(
  absoluteDir: string,
  relativeDir: string,
  entries: string[],
  depthRemaining: number,
): void {
  if (depthRemaining < 0 || entries.length >= 200) return;

  entries.push(relativeDir);

  for (const dirent of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name === "node_modules" || dirent.name.startsWith(".")) continue;
    walkProjectTree(
      path.join(absoluteDir, dirent.name),
      path.join(relativeDir, dirent.name),
      entries,
      depthRemaining - 1,
    );
  }
}

// Export a factory or run directly if invoked as script
export const startContextServer = () => {
  const server = new NebutraContextServer();
  server.run().catch(console.error);
};

if (process.argv[1]?.endsWith("contextServer.js") || process.argv[1]?.endsWith("nebutra-mcp")) {
  startContextServer();
}

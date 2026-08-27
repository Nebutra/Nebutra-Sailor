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
        ],
      };
    },

    async callTool({ name }: { name: string; arguments?: Record<string, unknown> | undefined }) {
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

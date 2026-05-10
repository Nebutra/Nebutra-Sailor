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
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "file:///nebutra.config.json",
          name: "Nebutra Configuration",
          mimeType: "application/json",
          description:
            "Global configurations for the Nebutra template including enabled features (auth, payments, i18n, db).",
        },
        {
          uri: "file:///prisma/schema.prisma",
          name: "Database Schema Overview",
          mimeType: "text/plain",
          description: "The core Prisma schema defining the database tables and relationships.",
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      let filePath = "";
      if (uri === "file:///nebutra.config.json") {
        filePath = path.join(this.projectRoot, "nebutra.config.json");
      } else if (uri === "file:///prisma/schema.prisma") {
        filePath = path.join(this.projectRoot, "packages/platform/db/prisma/schema.prisma");
      } else {
        throw new Error(`Resource not found: ${uri}`);
      }

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        return {
          contents: [
            {
              uri,
              mimeType: uri.endsWith(".json") ? "application/json" : "text/plain",
              text: content,
            },
          ],
        };
      } catch {
        throw new Error(`Failed to read the requested resource file at ${filePath}`);
      }
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_project_structure",
          description: "Retrieves the core Next.js routing tree from the apps folder.",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "get_project_structure") {
        try {
          const appsDir = path.join(this.projectRoot, "apps");
          if (!fs.existsSync(appsDir))
            return { content: [{ type: "text", text: "Apps dir not found." }] };
          const dirs = fs.readdirSync(appsDir);
          return { content: [{ type: "text", text: `Apps: ${dirs.join(", ")}` }] };
        } catch (error) {
          return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
        }
      }
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
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

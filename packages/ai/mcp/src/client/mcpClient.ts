import type { MCPServerRegistry } from "../registry/serverRegistry";
import { serverRegistry } from "../registry/serverRegistry";
import type { MCPContext, MCPServerConfig, ToolExecutionResult } from "../types";

/**
 * MCP Client for executing tools across registered servers
 */
export class MCPClient {
  private requestCounter = 0;

  constructor(private readonly registry: MCPServerRegistry = serverRegistry) {}

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context: MCPContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // Find server for this tool
    const server = this.registry.findServerByTool(toolName);
    if (!server) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        duration: Date.now() - startTime,
      };
    }

    // Check access
    if (!this.registry.canAccessTool(toolName, context)) {
      return {
        success: false,
        error: `Access denied to tool: ${toolName}`,
        duration: Date.now() - startTime,
      };
    }

    // Execute based on transport
    try {
      const result = await this.executeOnServer(server, toolName, args, context);
      return {
        success: true,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute tool on a specific server
   */
  private async executeOnServer(
    server: MCPServerConfig,
    toolName: string,
    args: Record<string, unknown>,
    context: MCPContext,
  ): Promise<unknown> {
    const requestId = `${context.requestId}-${++this.requestCounter}`;

    switch (server.transport) {
      case "http":
        return this.executeHttp(server, toolName, args, requestId);
      case "websocket":
        return this.executeWebSocket(server, toolName, args, requestId);
      case "local":
        return this.executeLocal(server, toolName, args, context);
      case "stdio":
        throw new Error("stdio transport not supported in browser/serverless");
      default:
        throw new Error(`Unknown transport: ${server.transport}`);
    }
  }

  /**
   * Execute via HTTP transport
   */
  private async executeHttp(
    server: MCPServerConfig,
    toolName: string,
    args: Record<string, unknown>,
    requestId: string,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
    };

    // Add authentication if configured
    if (server.authentication?.type === "bearer") {
      // In production, get token from secure storage
      const token = process.env[`MCP_${server.id.toUpperCase()}_TOKEN`];
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } else if (server.authentication?.type === "api-key") {
      const apiKey = process.env[`MCP_${server.id.toUpperCase()}_KEY`];
      const headerName = server.authentication.headerName || "X-API-Key";
      if (apiKey) {
        headers[headerName] = apiKey;
      }
    }

    const response = await fetch(server.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Unknown MCP error");
    }

    return data.result;
  }

  /**
   * Execute via WebSocket transport
   */
  private async executeWebSocket(
    _server: MCPServerConfig,
    _toolName: string,
    _args: Record<string, unknown>,
    _requestId: string,
  ): Promise<unknown> {
    // WebSocket implementation would maintain persistent connections
    // For now, throw not implemented
    throw new Error("WebSocket transport not yet implemented");
  }

  private async executeLocal(
    server: MCPServerConfig,
    toolName: string,
    args: Record<string, unknown>,
    context: MCPContext,
  ): Promise<unknown> {
    const shortName = toolName.startsWith(`${server.id}:`)
      ? toolName.slice(server.id.length + 1)
      : toolName;
    const handler = server.handlers?.[shortName] ?? server.handlers?.[toolName];
    if (!handler) {
      throw new Error(`No local handler registered for tool: ${toolName}`);
    }
    return handler(args, context);
  }

  /**
   * List available tools for a context
   */
  listTools(context: MCPContext) {
    return this.registry.getAccessibleTools(context);
  }

  /**
   * Get tool definition
   */
  getTool(toolName: string, context: MCPContext) {
    const server = this.registry.findServerByTool(toolName);
    if (!server) return undefined;

    if (!this.registry.canAccessTool(toolName, context)) {
      return undefined;
    }

    return server.tools.find((t) => t.name === toolName || `${server.id}:${t.name}` === toolName);
  }
}

// Global client instance
export const mcpClient = new MCPClient();

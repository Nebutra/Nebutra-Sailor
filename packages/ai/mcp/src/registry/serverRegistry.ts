import type { MCPContext, MCPServerConfig, ToolDefinition } from "../types.js";

/**
 * Registry for MCP servers and their tools
 * Handles server registration, discovery, and access control
 */
export class MCPServerRegistry {
  private servers: Map<string, MCPServerConfig> = new Map();
  private toolIndex: Map<string, string> = new Map(); // tool name -> server id

  /**
   * Register an MCP server
   */
  register(config: MCPServerConfig): void {
    this.servers.set(config.id, config);

    // Index tools for quick lookup
    for (const tool of config.tools) {
      const qualifiedName = `${config.id}:${tool.name}`;
      this.toolIndex.set(qualifiedName, config.id);
      // Also allow short name if unique
      if (!this.toolIndex.has(tool.name)) {
        this.toolIndex.set(tool.name, config.id);
      }
    }
  }

  /**
   * Unregister an MCP server
   */
  unregister(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;

    // Remove tool index entries
    for (const tool of server.tools) {
      const qualifiedName = `${serverId}:${tool.name}`;
      this.toolIndex.delete(qualifiedName);
      // Only remove short name if it points to this server
      if (this.toolIndex.get(tool.name) === serverId) {
        this.toolIndex.delete(tool.name);
      }
    }

    this.servers.delete(serverId);
    return true;
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServerConfig | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Find server by tool name
   */
  findServerByTool(toolName: string): MCPServerConfig | undefined {
    const serverId = this.toolIndex.get(toolName);
    if (!serverId) return undefined;
    return this.servers.get(serverId);
  }

  /**
   * Get all registered servers
   */
  getAllServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get all available tools
   */
  getAllTools(): Array<ToolDefinition & { serverId: string }> {
    const tools: Array<ToolDefinition & { serverId: string }> = [];
    for (const server of this.servers.values()) {
      for (const tool of server.tools) {
        tools.push({ ...tool, serverId: server.id });
      }
    }
    return tools;
  }

  /**
   * Check if a context has access to a server
   */
  canAccess(serverId: string, context: MCPContext): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;

    // Check plan restrictions
    if (server.allowedPlans && server.allowedPlans.length > 0) {
      if (!context.plan || !server.allowedPlans.includes(context.plan)) {
        return false;
      }
    }

    // Check tenant restrictions
    if (server.allowedTenants && server.allowedTenants.length > 0) {
      if (!context.tenantId || !server.allowedTenants.includes(context.tenantId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get tools accessible by a context
   */
  getAccessibleTools(context: MCPContext): Array<ToolDefinition & { serverId: string }> {
    const tools: Array<ToolDefinition & { serverId: string }> = [];

    for (const server of this.servers.values()) {
      if (this.canAccess(server.id, context)) {
        for (const tool of server.tools) {
          tools.push({ ...tool, serverId: server.id });
        }
      }
    }

    return tools;
  }
}

// Global registry instance
export const serverRegistry = new MCPServerRegistry();

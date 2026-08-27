import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CapabilityError } from "@nebutra/errors";
import type { EventLog } from "@nebutra/event-log";
import type { TraceStore } from "@nebutra/trace-store";
import { MCPClient } from "./client/mcpClient";
import { InMemoryToolConsentStore, type ToolConsentStore } from "./consent";
import { appendToolDebug, readToolDebug } from "./debug";
import { MCPServerRegistry } from "./registry/serverRegistry";
import type {
  MCPContext,
  MCPServerConfig,
  MCPServerManifest,
  MCPToolHandler,
  ToolDefinition,
  ToolExecutionResult,
} from "./types";

export interface McpHostOptions {
  readonly registry?: MCPServerRegistry;
  readonly consent?: ToolConsentStore;
  readonly traceStore?: TraceStore;
  readonly eventLog?: EventLog;
}

export interface LocalMcpServerConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly manifest?: MCPServerManifest;
  readonly tools: readonly ToolDefinition[];
  readonly handlers: Record<string, MCPToolHandler>;
  readonly allowedPlans?: readonly string[];
  readonly allowedTenants?: readonly string[];
}

export interface RemoteMcpConnectOptions {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly manifest: MCPServerManifest;
  readonly headers?: Record<string, string>;
}

function shortToolName(serverId: string, toolName: string): string {
  return toolName.startsWith(`${serverId}:`) ? toolName.slice(serverId.length + 1) : toolName;
}

function requireManifest(
  serverId: string,
  manifest: MCPServerManifest | undefined,
): MCPServerManifest {
  if (!manifest || manifest.scopes.length === 0 || manifest.version.length === 0) {
    throw new CapabilityError("tool-protocol", "MCP server manifest is required", {
      suggestion: "Register every connected server with name, version, and declared scopes.",
      metadata: { serverId },
      statusCode: 400,
    });
  }
  return manifest;
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };
}

export class McpHost {
  readonly #registry: MCPServerRegistry;
  readonly #client: MCPClient;
  readonly #consent: ToolConsentStore;
  readonly #traceStore: TraceStore | undefined;
  readonly #eventLog: EventLog | undefined;
  readonly #sdkClients = new Map<string, Client>();

  constructor(options: McpHostOptions = {}) {
    this.#registry = options.registry ?? new MCPServerRegistry();
    this.#client = new MCPClient(this.#registry);
    this.#consent = options.consent ?? new InMemoryToolConsentStore();
    this.#traceStore = options.traceStore;
    this.#eventLog = options.eventLog;
  }

  get registry(): MCPServerRegistry {
    return this.#registry;
  }

  connectLocal(config: LocalMcpServerConfig): void {
    const manifest = requireManifest(config.id, config.manifest);
    this.#registry.register({
      id: config.id,
      name: config.name,
      description: config.description,
      endpoint: `local://${config.id}`,
      transport: "local",
      manifest,
      tools: [...config.tools],
      handlers: config.handlers,
      ...(config.allowedPlans !== undefined && { allowedPlans: [...config.allowedPlans] }),
      ...(config.allowedTenants !== undefined && { allowedTenants: [...config.allowedTenants] }),
    });
  }

  async connectStdio(
    command: string,
    args: readonly string[],
    options: RemoteMcpConnectOptions,
  ): Promise<void> {
    const transport = new StdioClientTransport({ command, args: [...args] });
    await this.#connectSdkClient(options, transport, `stdio://${command}`);
  }

  async connectStreamableHttp(endpoint: string, options: RemoteMcpConnectOptions): Promise<void> {
    const transport = new StreamableHTTPClientTransport(
      new URL(endpoint),
      options.headers !== undefined ? { requestInit: { headers: options.headers } } : {},
    );
    await this.#connectSdkClient(options, transport, endpoint);
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    context: MCPContext,
  ): Promise<ToolExecutionResult> {
    const start = Date.now();
    const server = this.#registry.findServerByTool(toolName);
    const serverId = server?.id;
    const shortName = serverId ? shortToolName(serverId, toolName) : toolName;
    const span = this.#traceStore?.start("tool", toolName, {
      traceId: context.requestId,
      tenantId: context.tenantId,
      serverId,
    });

    if (!context.tenantId) {
      const result = {
        success: false,
        error: "Missing tenant context; suggestion: call tools with a tenantId.",
        duration: Date.now() - start,
      };
      await this.#recordCall(toolName, shortName, serverId, context, result);
      span?.fail(result.error);
      return result;
    }

    if (!server || !server.manifest) {
      const result = {
        success: false,
        error: "Tool server is not connected with a manifest; suggestion: run `pnpm tool:doctor`.",
        duration: Date.now() - start,
      };
      await this.#recordCall(toolName, shortName, serverId, context, result);
      span?.fail(result.error);
      return result;
    }

    const consentRequest = {
      tenantId: context.tenantId,
      serverId: server.id,
      toolName: shortName,
      scopes: server.manifest.scopes,
      ...(context.userId !== undefined && { userId: context.userId }),
    };
    const hasConsent = await this.#consent.hasConsent(consentRequest);

    if (!hasConsent) {
      const result = {
        success: false,
        error: `Missing per-tool consent for ${server.id}:${shortName}; suggestion: grant scopes ${server.manifest.scopes.join(", ")}.`,
        duration: Date.now() - start,
      };
      await this.#recordCall(toolName, shortName, server.id, context, result);
      span?.fail(result.error);
      return result;
    }

    const result = await this.#client.executeTool(toolName, args, context);
    await this.#recordCall(toolName, shortName, server.id, context, result);
    if (result.success) span?.end({ toolName });
    else span?.fail(result.error);
    return result;
  }

  listTools(context: MCPContext): Array<ToolDefinition & { serverId: string }> {
    return this.#client.listTools(context);
  }

  inspect(serverId: string): MCPServerConfig {
    const server = this.#registry.getServer(serverId);
    if (!server) {
      throw new CapabilityError("tool-protocol", "MCP server not found", {
        suggestion: "Run `pnpm tool:doctor` to list connected servers.",
        metadata: { serverId },
        statusCode: 404,
      });
    }
    void appendToolDebug({ type: "inspect", serverId, ok: true });
    return server;
  }

  async doctor(): Promise<{
    ok: boolean;
    servers: Array<{
      id: string;
      name: string;
      transport: MCPServerConfig["transport"];
      tools: number;
      manifest?: MCPServerManifest;
    }>;
    suggestion?: string;
  }> {
    const servers = this.#registry.getAllServers().map((server) => ({
      id: server.id,
      name: server.name,
      transport: server.transport,
      tools: server.tools.length,
      ...(server.manifest !== undefined && { manifest: server.manifest }),
    }));
    return {
      ok: servers.length > 0,
      servers,
      ...(servers.length === 0 && {
        suggestion: "Connect an MCP server or register a local tool surface before running agents.",
      }),
    };
  }

  async debug(limit = 10) {
    return readToolDebug(limit);
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.#sdkClients.values()).map((client) => client.close()));
    this.#sdkClients.clear();
  }

  async #connectSdkClient(
    options: RemoteMcpConnectOptions,
    transport: unknown,
    endpoint: string,
  ): Promise<void> {
    const manifest = requireManifest(options.id, options.manifest);
    const client = new Client({ name: "nebutra-tool-protocol", version: "0.1.0" });
    await client.connect(transport as Parameters<Client["connect"]>[0]);
    const listed = await client.listTools();
    const tools = listed.tools.map(
      (tool) =>
        ({
          name: tool.name,
          description: tool.description ?? tool.name,
          parameters: {},
        }) satisfies ToolDefinition,
    );
    const handlers = Object.fromEntries(
      tools.map((tool) => [
        tool.name,
        async (args: Record<string, unknown>) => {
          return client.callTool({ name: tool.name, arguments: toJsonObject(args) });
        },
      ]),
    );
    this.#sdkClients.set(options.id, client);
    this.#registry.register({
      id: options.id,
      name: options.name ?? manifest.name,
      description: options.description ?? `${manifest.name} MCP server`,
      endpoint,
      transport: endpoint.startsWith("stdio://") ? "stdio" : "http",
      manifest,
      tools,
      handlers,
    });
    await appendToolDebug({ type: "connect", serverId: options.id, ok: true });
  }

  async #recordCall(
    originalToolName: string,
    toolName: string,
    serverId: string | undefined,
    context: MCPContext,
    result: ToolExecutionResult,
  ): Promise<void> {
    await appendToolDebug({
      type: "tool_call",
      requestId: context.requestId,
      toolName,
      ok: result.success,
      durationMs: result.duration,
      ...(context.tenantId !== undefined && { tenantId: context.tenantId }),
      ...(serverId !== undefined && { serverId }),
      ...(result.error !== undefined && { error: result.error }),
    });
    if (result.success && context.tenantId && this.#eventLog) {
      await this.#eventLog.commit({
        traceId: context.requestId,
        kind: "tool_call",
        affected: [],
        parent: null,
        snapshot: {
          [`tool/${serverId ?? "unknown"}/${toolName}.json`]: JSON.stringify({
            toolName: originalToolName,
            result: result.result,
          }),
        },
      });
    }
  }
}

export const toolConsentStore = new InMemoryToolConsentStore();
export const mcpHost = new McpHost({ consent: toolConsentStore });

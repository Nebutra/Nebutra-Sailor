import { z } from "zod";

// ============================================
// MCP Tool Definition
// ============================================

export const ToolParameterSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
});

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.string(), ToolParameterSchema).optional(),
  returns: z.string().optional(),
});

export type ToolParameter = z.infer<typeof ToolParameterSchema>;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ============================================
// MCP Request/Response
// ============================================

export interface MCPRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  id: string;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// ============================================
// MCP Context (with tenant info)
// ============================================

export interface MCPContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  plan?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// Tool Execution
// ============================================

export interface ToolExecutionRequest {
  tool: string;
  arguments: Record<string, unknown>;
  context: MCPContext;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  tokensUsed?: number;
}

// ============================================
// MCP Server Registration
// ============================================

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  transport: "http" | "websocket" | "stdio";
  tools: ToolDefinition[];
  authentication?: {
    type: "bearer" | "api-key" | "none";
    headerName?: string;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  // Tenant access control
  allowedPlans?: string[]; // e.g., ["PRO", "ENTERPRISE"]
  allowedTenants?: string[]; // specific tenant IDs
}

// ============================================
// Smithery Integration
// ============================================

export interface SmitheryServerInfo {
  qualifiedName: string;
  displayName: string;
  description: string;
  homepage?: string;
  useCount?: number;
  isDeployed?: boolean;
}

export interface SmitheryConfig {
  apiKey?: string;
  baseUrl: string;
  defaultServers?: string[]; // Pre-configured server qualified names
}

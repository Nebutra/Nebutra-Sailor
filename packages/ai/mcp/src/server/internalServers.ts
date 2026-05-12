import { serverRegistry } from "../registry/serverRegistry";
import type { MCPServerConfig } from "../types";

/**
 * Register internal Nebutra services as MCP servers
 * These wrap our existing microservices with MCP-compatible interfaces
 */

export const INTERNAL_SERVERS: MCPServerConfig[] = [
  // AI Service
  {
    id: "nebutra-ai",
    name: "Nebutra AI Service",
    description: "AI-powered text generation, embedding, and translation",
    endpoint: process.env.AI_SERVICE_URL || "http://localhost:8001",
    transport: "http",
    tools: [
      {
        name: "generate_text",
        description: "Generate text using LLM",
        parameters: {
          prompt: { type: "string", description: "Input prompt", required: true },
          max_tokens: { type: "number", description: "Max tokens to generate", default: 1000 },
          temperature: { type: "number", description: "Sampling temperature", default: 0.7 },
        },
        returns: "Generated text",
      },
      {
        name: "create_embedding",
        description: "Create vector embedding for text",
        parameters: {
          text: { type: "string", description: "Text to embed", required: true },
          model: {
            type: "string",
            description: "Embedding model",
            default: "text-embedding-3-small",
          },
        },
        returns: "Vector embedding array",
      },
      {
        name: "translate",
        description: "Translate text between languages",
        parameters: {
          text: { type: "string", description: "Text to translate", required: true },
          source: { type: "string", description: "Source language code", default: "en" },
          target: { type: "string", description: "Target language code", required: true },
        },
        returns: "Translated text",
      },
    ],
    rateLimit: { maxRequests: 100, windowMs: 60000 },
  },

  // E-commerce Service
  {
    id: "nebutra-ecommerce",
    name: "Nebutra E-commerce Service",
    description: "E-commerce operations and Shopify integration",
    endpoint: process.env.ECOMMERCE_SERVICE_URL || "http://localhost:8004",
    transport: "http",
    tools: [
      {
        name: "get_products",
        description: "Get product catalog",
        parameters: {
          limit: { type: "number", description: "Number of products", default: 20 },
          category: { type: "string", description: "Filter by category" },
        },
        returns: "Products array",
      },
      {
        name: "get_order",
        description: "Get order details",
        parameters: {
          order_id: { type: "string", description: "Order ID", required: true },
        },
        returns: "Order object",
      },
      {
        name: "sync_inventory",
        description: "Sync inventory with Shopify",
        parameters: {
          force: { type: "boolean", description: "Force full sync", default: false },
        },
        returns: "Sync status",
      },
    ],
    allowedPlans: ["PRO", "ENTERPRISE"],
    rateLimit: { maxRequests: 100, windowMs: 60000 },
  },
];

/**
 * Register all internal servers
 */
export function registerInternalServers(): void {
  for (const server of INTERNAL_SERVERS) {
    serverRegistry.register(server);
  }
}

/**
 * Get list of internal server IDs
 */
export function getInternalServerIds(): string[] {
  return INTERNAL_SERVERS.map((s) => s.id);
}

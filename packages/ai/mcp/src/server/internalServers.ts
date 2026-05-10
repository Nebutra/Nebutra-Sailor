import { serverRegistry } from "../registry/serverRegistry.js";
import type { MCPServerConfig } from "../types.js";

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

  // Content Service
  {
    id: "nebutra-content",
    name: "Nebutra Content Service",
    description: "Content management and feed operations",
    endpoint: process.env.CONTENT_SERVICE_URL || "http://localhost:8002",
    transport: "http",
    tools: [
      {
        name: "create_post",
        description: "Create a new content post",
        parameters: {
          title: { type: "string", description: "Post title", required: true },
          body: { type: "string", description: "Post content", required: true },
        },
        returns: "Created post object",
      },
      {
        name: "get_feed",
        description: "Get content feed",
        parameters: {
          limit: { type: "number", description: "Number of items", default: 20 },
          cursor: { type: "string", description: "Pagination cursor" },
        },
        returns: "Feed items array",
      },
      {
        name: "search_content",
        description: "Search content by query",
        parameters: {
          query: { type: "string", description: "Search query", required: true },
          limit: { type: "number", description: "Max results", default: 10 },
        },
        returns: "Search results",
      },
    ],
    rateLimit: { maxRequests: 200, windowMs: 60000 },
  },

  // Recommendation Service
  {
    id: "nebutra-recsys",
    name: "Nebutra Recommendation Service",
    description: "AI-powered content recommendations",
    endpoint: process.env.RECSYS_SERVICE_URL || "http://localhost:8003",
    transport: "http",
    tools: [
      {
        name: "get_recommendations",
        description: "Get personalized content recommendations",
        parameters: {
          user_id: { type: "string", description: "User ID" },
          limit: { type: "number", description: "Number of recommendations", default: 10 },
          context: { type: "object", description: "Additional context" },
        },
        returns: "Recommended items array",
      },
      {
        name: "similar_items",
        description: "Find similar items to a given item",
        parameters: {
          item_id: { type: "string", description: "Item ID", required: true },
          limit: { type: "number", description: "Number of similar items", default: 5 },
        },
        returns: "Similar items array",
      },
    ],
    allowedPlans: ["PRO", "ENTERPRISE"],
    rateLimit: { maxRequests: 50, windowMs: 60000 },
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

  // Web3 Service
  {
    id: "nebutra-web3",
    name: "Nebutra Web3 Service",
    description: "Blockchain data and Web3 operations",
    endpoint: process.env.WEB3_SERVICE_URL || "http://localhost:8005",
    transport: "http",
    tools: [
      {
        name: "get_balance",
        description: "Get wallet balance",
        parameters: {
          address: { type: "string", description: "Wallet address", required: true },
          chain: { type: "string", description: "Blockchain network", default: "ethereum" },
        },
        returns: "Balance object",
      },
      {
        name: "get_transaction",
        description: "Get transaction details",
        parameters: {
          tx_hash: { type: "string", description: "Transaction hash", required: true },
        },
        returns: "Transaction object",
      },
      {
        name: "get_nfts",
        description: "Get NFTs for a wallet",
        parameters: {
          address: { type: "string", description: "Wallet address", required: true },
          limit: { type: "number", description: "Max NFTs to return", default: 50 },
        },
        returns: "NFTs array",
      },
    ],
    allowedPlans: ["ENTERPRISE"],
    rateLimit: { maxRequests: 50, windowMs: 60000 },
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

import type { MeterDefinition } from "./types.js";

// =============================================================================
// Common SaaS Meters — pre-configured meter definitions for typical billing scenarios
// =============================================================================

/**
 * API Calls meter — tracks total number of API requests
 * Aggregation: sum of request counts across all endpoints
 * Unit: requests
 */
export const API_CALLS: MeterDefinition = {
  id: "api_calls",
  name: "API Calls",
  type: "counter",
  description: "Total number of API requests processed",
  unit: "requests",
  aggregation: "sum",
};

/**
 * AI Tokens meter — tracks token consumption for AI models
 * Aggregation: sum of tokens (input + output)
 * Unit: tokens
 *
 * Dimensions: model (gpt-4, claude-3, etc.), endpoint
 */
export const AI_TOKENS: MeterDefinition = {
  id: "ai_tokens",
  name: "AI Tokens",
  type: "counter",
  description: "Total tokens consumed by AI model calls",
  unit: "tokens",
  aggregation: "sum",
};

/**
 * Storage Bytes meter — tracks current storage usage
 * Aggregation: maximum value in period (gauge)
 * Unit: bytes
 *
 * Dimensions: storage_type (documents, media, cache)
 */
export const STORAGE_BYTES: MeterDefinition = {
  id: "storage_bytes",
  name: "Storage Used",
  type: "gauge",
  description: "Current storage usage in bytes",
  unit: "bytes",
  aggregation: "max",
};

/**
 * Active Users meter — tracks count of unique active users
 * Aggregation: count of distinct user IDs
 * Unit: users
 *
 * Dimensions: user_type (standard, admin), region
 */
export const ACTIVE_USERS: MeterDefinition = {
  id: "active_users",
  name: "Active Users",
  type: "unique_count",
  description: "Number of distinct active users",
  unit: "users",
  aggregation: "count_distinct",
};

/**
 * Bandwidth meter — tracks data transfer volume
 * Aggregation: sum of bytes transferred
 * Unit: bytes
 *
 * Dimensions: direction (inbound, outbound), region
 */
export const BANDWIDTH: MeterDefinition = {
  id: "bandwidth",
  name: "Bandwidth",
  type: "counter",
  description: "Total data transfer volume in bytes",
  unit: "bytes",
  aggregation: "sum",
};

/**
 * Request Latency meter — tracks distribution of request latencies
 * Aggregation: histogram (could be max, percentile)
 * Unit: milliseconds
 *
 * Dimensions: endpoint, method (GET, POST, etc.)
 */
export const REQUEST_LATENCY: MeterDefinition = {
  id: "request_latency",
  name: "Request Latency",
  type: "histogram",
  description: "Distribution of API request latencies",
  unit: "milliseconds",
  aggregation: "max",
};

/**
 * Computation Time meter — tracks CPU/GPU time consumed
 * Aggregation: sum of milliseconds
 * Unit: milliseconds
 *
 * Dimensions: compute_type (cpu, gpu, ml)
 */
export const COMPUTATION_TIME: MeterDefinition = {
  id: "computation_time",
  name: "Computation Time",
  type: "counter",
  description: "Total computation time consumed",
  unit: "milliseconds",
  aggregation: "sum",
};

/**
 * Database Operations meter — tracks database transactions
 * Aggregation: count of operations
 * Unit: operations
 *
 * Dimensions: operation_type (read, write, delete)
 */
export const DB_OPERATIONS: MeterDefinition = {
  id: "db_operations",
  name: "Database Operations",
  type: "counter",
  description: "Total number of database operations",
  unit: "operations",
  aggregation: "count",
};

/**
 * Email Messages meter — tracks sent emails
 * Aggregation: count of emails
 * Unit: messages
 *
 * Dimensions: email_type (notification, marketing, transactional)
 */
export const EMAIL_MESSAGES: MeterDefinition = {
  id: "email_messages",
  name: "Email Messages",
  type: "counter",
  description: "Total email messages sent",
  unit: "messages",
  aggregation: "count",
};

/**
 * Webhooks Fired meter — tracks webhook invocations
 * Aggregation: count of webhooks
 * Unit: webhooks
 *
 * Dimensions: event_type, status (success, failed)
 */
export const WEBHOOKS_FIRED: MeterDefinition = {
  id: "webhooks_fired",
  name: "Webhooks Fired",
  type: "counter",
  description: "Total webhook invocations",
  unit: "webhooks",
  aggregation: "count",
};

/**
 * All standard meters for bulk registration
 */
export const ALL_STANDARD_METERS = [
  API_CALLS,
  AI_TOKENS,
  STORAGE_BYTES,
  ACTIVE_USERS,
  BANDWIDTH,
  REQUEST_LATENCY,
  COMPUTATION_TIME,
  DB_OPERATIONS,
  EMAIL_MESSAGES,
  WEBHOOKS_FIRED,
] as const;

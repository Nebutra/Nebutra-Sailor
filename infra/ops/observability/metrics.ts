import { type Counter, type Histogram, metrics, type UpDownCounter } from "@opentelemetry/api";

const meter = metrics.getMeter("nebutra-sailor");

/**
 * HTTP request metrics
 */
export const httpRequestsTotal = meter.createCounter("http_requests_total", {
  description: "Total number of HTTP requests",
}) as Counter;

export const httpRequestDuration = meter.createHistogram("http_request_duration_ms", {
  description: "HTTP request duration in milliseconds",
  unit: "ms",
}) as Histogram;

/**
 * API usage metrics (per tenant)
 */
export const apiCallsTotal = meter.createCounter("api_calls_total", {
  description: "Total API calls per tenant",
}) as Counter;

export const aiTokensUsed = meter.createCounter("ai_tokens_used_total", {
  description: "Total AI tokens used per tenant",
}) as Counter;

/**
 * Active connections
 */
export const activeConnections = meter.createUpDownCounter("active_connections", {
  description: "Number of active connections",
}) as UpDownCounter;

/**
 * Cache metrics
 */
export const cacheHits = meter.createCounter("cache_hits_total", {
  description: "Total cache hits",
}) as Counter;

export const cacheMisses = meter.createCounter("cache_misses_total", {
  description: "Total cache misses",
}) as Counter;

/**
 * Rate limiting metrics
 */
export const rateLimitExceeded = meter.createCounter("rate_limit_exceeded_total", {
  description: "Total rate limit exceeded events",
}) as Counter;

/**
 * Database metrics
 */
export const dbQueryDuration = meter.createHistogram("db_query_duration_ms", {
  description: "Database query duration in milliseconds",
  unit: "ms",
}) as Histogram;

export const dbConnectionPoolSize = meter.createUpDownCounter("db_connection_pool_size", {
  description: "Database connection pool size",
}) as UpDownCounter;

/**
 * Queue metrics
 */
export const queueJobsProcessed = meter.createCounter("queue_jobs_processed_total", {
  description: "Total queue jobs processed",
}) as Counter;

export const queueJobsFailed = meter.createCounter("queue_jobs_failed_total", {
  description: "Total queue jobs failed",
}) as Counter;

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  tenantId?: string,
): void {
  const attributes = {
    method,
    path,
    status: status.toString(),
    tenant_id: tenantId || "unknown",
  };

  httpRequestsTotal.add(1, attributes);
  httpRequestDuration.record(duration, attributes);
}

/**
 * Record API call for billing/usage
 */
export function recordApiCall(tenantId: string, endpoint: string, weight: number = 1): void {
  apiCallsTotal.add(weight, {
    tenant_id: tenantId,
    endpoint,
  });
}

/**
 * Record AI token usage for billing
 */
export function recordAiTokens(tenantId: string, model: string, tokens: number): void {
  aiTokensUsed.add(tokens, {
    tenant_id: tenantId,
    model,
  });
}

/**
 * Record cache operation
 */
export function recordCacheOp(hit: boolean, cache: string): void {
  if (hit) {
    cacheHits.add(1, { cache });
  } else {
    cacheMisses.add(1, { cache });
  }
}

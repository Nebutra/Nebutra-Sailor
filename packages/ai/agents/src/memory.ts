/**
 * Agent memory — Redis-backed per-tenant conversation persistence.
 *
 * Key format: `agent:memory:{tenantId}:{conversationId}`
 * TTL: 7 days (configurable via AGENT_MEMORY_TTL_SECONDS env var).
 *
 * Graceful degradation: if Redis is unavailable, functions return
 * empty arrays / silently skip writes so agents still work in
 * in-memory-only mode.
 */

import { logger } from "@nebutra/logger";
import type { AgentMessage } from "./types";

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getTtl(): number {
  const envTtl = process.env["AGENT_MEMORY_TTL_SECONDS"];
  if (envTtl) {
    const parsed = Number.parseInt(envTtl, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TTL_SECONDS;
}

function memoryKey(tenantId: string, conversationId: string): string {
  return `agent:memory:${tenantId}:${conversationId}`;
}

/**
 * Lazily resolve Redis. Returns null when Redis is not configured
 * so callers can gracefully degrade.
 */
async function tryGetRedis() {
  try {
    const { getRedis } = await import("@nebutra/cache");
    return getRedis();
  } catch {
    return null;
  }
}

/**
 * Load conversation history from Redis.
 * Returns an empty array when Redis is unavailable.
 */
export async function getMemory(tenantId: string, conversationId: string): Promise<AgentMessage[]> {
  const redis = await tryGetRedis();
  if (!redis) return [];

  try {
    const raw = await redis.get<string>(memoryKey(tenantId, conversationId));
    if (!raw) return [];

    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    return parsed.map((m: Record<string, unknown>): AgentMessage => {
      const toolCalls = m["toolCalls"];
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        return {
          role: m["role"] as AgentMessage["role"],
          content: String(m["content"] ?? ""),
          toolCalls: toolCalls as unknown as NonNullable<AgentMessage["toolCalls"]>,
          timestamp: new Date(String(m["timestamp"])),
        };
      }
      return {
        role: m["role"] as AgentMessage["role"],
        content: String(m["content"] ?? ""),
        timestamp: new Date(String(m["timestamp"])),
      };
    });
  } catch (error) {
    logger.warn("Failed to load agent memory, falling back to empty", {
      tenantId,
      conversationId,
      error,
    });
    return [];
  }
}

/**
 * Persist messages to Redis with TTL.
 * Silently skips when Redis is unavailable.
 */
export async function saveMemory(
  tenantId: string,
  conversationId: string,
  messages: readonly AgentMessage[],
): Promise<void> {
  const redis = await tryGetRedis();
  if (!redis) return;

  try {
    const key = memoryKey(tenantId, conversationId);
    await redis.set(key, JSON.stringify(messages), { ex: getTtl() });
  } catch (error) {
    logger.warn("Failed to save agent memory", {
      tenantId,
      conversationId,
      error,
    });
  }
}

/**
 * Clear conversation memory for a tenant/conversation pair.
 */
export async function clearMemory(tenantId: string, conversationId: string): Promise<void> {
  const redis = await tryGetRedis();
  if (!redis) return;

  try {
    await redis.del(memoryKey(tenantId, conversationId));
  } catch (error) {
    logger.warn("Failed to clear agent memory", {
      tenantId,
      conversationId,
      error,
    });
  }
}

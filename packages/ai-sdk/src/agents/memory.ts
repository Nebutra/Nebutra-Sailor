import type { AgentMessage, MemoryConfig } from "./types.js";

export interface ConversationMemory {
  getMessages(conversationId: string): Promise<AgentMessage[]>;
  addMessage(conversationId: string, message: AgentMessage): Promise<void>;
  clear(conversationId: string): Promise<void>;
}

/**
 * Dynamically import @nebutra/cache at runtime.
 * The cache package uses bundler module resolution internally, which is
 * incompatible with ai-sdk's nodenext resolution. We cast through `any`
 * to avoid pulling in its unresolvable type graph at typecheck time.
 */
async function loadRedis(): Promise<{
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
}> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const mod: { getRedis: () => ReturnType<typeof loadRedis> extends Promise<infer R> ? R : never } =
    await (import("@nebutra/cache") as Promise<any>);
  return mod.getRedis();
}

/** In-memory implementation for development */
export function createInMemoryMemory(config?: Partial<MemoryConfig>): ConversationMemory {
  const store = new Map<string, AgentMessage[]>();
  const maxMessages = config?.maxMessages ?? 50;

  return {
    async getMessages(conversationId) {
      return store.get(conversationId)?.slice(-maxMessages) ?? [];
    },
    async addMessage(conversationId, message) {
      const messages = store.get(conversationId) ?? [];
      messages.push(message);
      if (messages.length > maxMessages * 2) {
        messages.splice(0, messages.length - maxMessages);
      }
      store.set(conversationId, messages);
    },
    async clear(conversationId) {
      store.delete(conversationId);
    },
  };
}

/** Redis-backed memory for production (uses @nebutra/cache) */
export function createRedisMemory(config?: Partial<MemoryConfig>): ConversationMemory {
  const maxMessages = config?.maxMessages ?? 50;
  const ttl = config?.ttlSeconds ?? 86400; // 24h default

  return {
    async getMessages(conversationId) {
      try {
        const redis = await loadRedis();
        const raw = await redis.get(`agent:memory:${conversationId}`);
        if (!raw) return [];
        const messages = JSON.parse(raw) as AgentMessage[];
        return messages.slice(-maxMessages);
      } catch {
        return [];
      }
    },
    async addMessage(conversationId, message) {
      try {
        const redis = await loadRedis();
        const key = `agent:memory:${conversationId}`;
        const existing = await this.getMessages(conversationId);
        existing.push(message);
        await redis.set(key, JSON.stringify(existing.slice(-maxMessages * 2)), {
          ex: ttl,
        });
      } catch {
        // Graceful: memory failure should not break agent execution
      }
    },
    async clear(conversationId) {
      try {
        const redis = await loadRedis();
        await redis.del(`agent:memory:${conversationId}`);
      } catch {
        // Graceful
      }
    },
  };
}

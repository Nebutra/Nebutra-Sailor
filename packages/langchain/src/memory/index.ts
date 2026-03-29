import { logger } from "@nebutra/logger";

export interface ChatMessage {
  role: "human" | "ai" | "system" | "tool";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMemoryConfig {
  /** Conversation identifier */
  conversationId: string;
  /** Tenant for isolation */
  tenantId: string;
  /** Max messages to keep */
  maxMessages?: number;
  /** TTL in seconds */
  ttlSeconds?: number;
  /** Storage backend */
  backend?: "redis" | "in-memory";
}

const memoryStore = new Map<string, ChatMessage[]>();

/**
 * Create a chat memory instance compatible with LangChain's BufferMemory pattern.
 * Supports Redis (production) and in-memory (development).
 */
export function createChatMemory(config: ChatMemoryConfig) {
  const maxMessages = config.maxMessages ?? 50;
  const key = `chat:${config.tenantId}:${config.conversationId}`;

  async function loadMessages(): Promise<ChatMessage[]> {
    if (config.backend === "redis") {
      try {
        const { getRedis } = await import("@nebutra/cache");
        const redis = getRedis();
        const raw = await redis.get(key);
        if (!raw) return [];
        return (
          JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as ChatMessage[]
        ).slice(-maxMessages);
      } catch {
        return [];
      }
    }
    return memoryStore.get(key)?.slice(-maxMessages) ?? [];
  }

  async function saveMessage(message: ChatMessage): Promise<void> {
    if (config.backend === "redis") {
      try {
        const { getRedis } = await import("@nebutra/cache");
        const redis = getRedis();
        const existing = await loadMessages();
        const updated = [...existing, message];
        await redis.set(key, JSON.stringify(updated.slice(-maxMessages * 2)), {
          ex: config.ttlSeconds ?? 86400,
        });
      } catch (error) {
        logger.warn("Chat memory save failed", { error });
      }
      return;
    }
    const messages = memoryStore.get(key) ?? [];
    const updated = [...messages, message];
    if (updated.length > maxMessages * 2) {
      memoryStore.set(key, updated.slice(-maxMessages));
    } else {
      memoryStore.set(key, updated);
    }
  }

  async function clear(): Promise<void> {
    if (config.backend === "redis") {
      try {
        const { getRedis } = await import("@nebutra/cache");
        const redis = getRedis();
        await redis.del(key);
      } catch {
        /* graceful */
      }
      return;
    }
    memoryStore.delete(key);
  }

  return {
    loadMessages,
    saveMessage,
    clear,
    config,
  };
}

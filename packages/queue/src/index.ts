// =============================================================================
// @nebutra/queue — Provider-agnostic message queue
// =============================================================================
// Supports:
//   - Upstash QStash  (serverless, HTTP-based)
//   - BullMQ          (self-hosted Redis)
//   - In-memory       (dev/test only)
//
// Usage:
//   import { getQueue, createJob } from "@nebutra/queue";
//
//   const queue = await getQueue();  // auto-detects provider
//   await queue.enqueue(createJob("email", "send", { to: "user@example.com" }));
// =============================================================================

// ── Factory ─────────────────────────────────────────────────────────────────
export {
  closeQueue,
  createJob,
  createQueue,
  getQueue,
  setQueue,
} from "./factory";
// ── Middleware ───────────────────────────────────────────────────────────────
export { createQStashWebhookHandler } from "./middleware/qstash-verify";
export { BullMQProvider } from "./providers/bullmq";
export { MemoryProvider } from "./providers/memory";
// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { getQStashHandler, getQStashHandlerKeys, QStashProvider } from "./providers/qstash";
// ── Types ───────────────────────────────────────────────────────────────────
export type {
  BullMQProviderConfig,
  JobHandler,
  JobOptions,
  JobPayload,
  JobResult,
  JobStatus,
  JobStatusInfo,
  MemoryProviderConfig,
  QStashProviderConfig,
  QueueConfig,
  QueueProvider,
  QueueProviderType,
} from "./types";
export { JobOptionsSchema, JobPayloadSchema } from "./types";

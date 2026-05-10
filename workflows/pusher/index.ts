/**
 * Pusher Real-time Infrastructure
 *
 * Server-side:
 * ```typescript
 * import { pusherServer, triggerEvent, broadcastToTenant } from "@/lib/pusher";
 * ```
 *
 * Client-side:
 * ```typescript
 * import { getPusherClient, Channels } from "@/lib/pusher/client";
 * ```
 */

// Auth utilities
export { type User, validateChannelAccess } from "./auth";

// Client exports
export {
  type Channel,
  Channels,
  disconnect,
  getPusherClient,
  type Members,
  type PresenceChannel,
  pusherClient,
  subscribeChannel,
  unsubscribeChannel,
} from "./client";
// Event bridge
export {
  addEventMapping,
  type BroadcastConfig,
  initEventBridge,
  removeEventMapping,
} from "./event-bridge";
// Server exports
export {
  authorizeChannel,
  broadcastToTenant,
  getPusherServer,
  notifyUser,
  notifyUsers,
  type PusherEvent,
  PusherEvents,
  pusherServer,
  triggerBatch,
  triggerEvent,
} from "./server";

import Pusher from "pusher";

/**
 * Server-side Pusher client singleton
 *
 * Usage:
 * ```typescript
 * import { pusherServer, triggerEvent } from "@/lib/pusher/server";
 *
 * await triggerEvent("private-user-123", "notification", { message: "Hello" });
 * ```
 */

let pusherServerInstance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (pusherServerInstance) {
    return pusherServerInstance;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

  if (!appId || !key || !secret) {
    throw new Error(
      "Missing Pusher server credentials. Set PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET",
    );
  }

  // Check for self-hosted (Soketi) configuration
  const host = process.env.PUSHER_HOST;
  const port = process.env.PUSHER_PORT ? parseInt(process.env.PUSHER_PORT, 10) : undefined;

  pusherServerInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: process.env.PUSHER_USE_TLS !== "false",
    ...(host && { host }),
    ...(port && { port }),
  });

  return pusherServerInstance;
}

// Export singleton instance
export const pusherServer = getPusherServer();

/**
 * Trigger an event on a channel
 */
export async function triggerEvent(
  channel: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(channel, event, data);
}

/**
 * Trigger events to multiple channels at once (max 10)
 */
export async function triggerBatch(
  events: Array<{
    channel: string;
    name: string;
    data: Record<string, unknown>;
  }>,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.triggerBatch(events);
}

/**
 * Broadcast to a tenant's private channel
 */
export async function broadcastToTenant(
  tenantId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  await triggerEvent(`private-tenant-${tenantId}`, event, data);
}

/**
 * Send notification to a specific user
 */
export async function notifyUser(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  await triggerEvent(`private-user-${userId}`, event, data);
}

/**
 * Broadcast to multiple users at once
 */
export async function notifyUsers(
  userIds: string[],
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Pusher batch limit is 10 events
  const batchSize = 10;
  const batches: string[][] = [];

  for (let i = 0; i < userIds.length; i += batchSize) {
    batches.push(userIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await triggerBatch(
      batch.map((userId) => ({
        channel: `private-user-${userId}`,
        name: event,
        data,
      })),
    );
  }
}

/**
 * Authorize a socket for private/presence channel access
 * Use in your auth endpoint
 */
export function authorizeChannel(
  socketId: string,
  channel: string,
  presenceData?: {
    user_id: string;
    user_info?: Record<string, unknown>;
  },
): Pusher.ChannelAuthResponse | Pusher.PresenceChannelData {
  const pusher = getPusherServer();

  if (channel.startsWith("presence-") && presenceData) {
    return pusher.authorizeChannel(socketId, channel, presenceData);
  }

  return pusher.authorizeChannel(socketId, channel);
}

// Event type constants
export const PusherEvents = {
  // Notifications
  NOTIFICATION: "notification",
  NOTIFICATION_URGENT: "notification:urgent",

  // Collaboration
  PRESENCE_JOIN: "presence:join",
  PRESENCE_LEAVE: "presence:leave",
  CURSOR_MOVE: "cursor:move",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Data sync
  RECORD_CREATED: "record:created",
  RECORD_UPDATED: "record:updated",
  RECORD_DELETED: "record:deleted",

  // System
  SYSTEM_MAINTENANCE: "system:maintenance",
  SYSTEM_RELOAD: "system:reload",
} as const;

export type PusherEvent = (typeof PusherEvents)[keyof typeof PusherEvents];

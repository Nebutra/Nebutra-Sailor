/**
 * Event Bus → Pusher Bridge
 *
 * Subscribes to internal event bus events and broadcasts
 * them via Pusher for real-time client updates.
 */

import { type BaseEvent, EventTypes, eventBus } from "@nebutra/event-bus";
import { PusherEvents, triggerEvent } from "./server";

/**
 * Event mapping configuration
 * Maps internal event types to Pusher broadcast configuration
 */
interface BroadcastConfig {
  /** Pusher event name to emit */
  pusherEvent: string;
  /** Function to determine target channel(s) */
  getChannels: (event: BaseEvent) => string[];
  /** Transform event data for client consumption */
  transform?: (event: BaseEvent) => Record<string, unknown>;
}

const eventMappings: Record<string, BroadcastConfig> = {
  // Content events → broadcast to tenant
  [EventTypes.CONTENT_CREATED]: {
    pusherEvent: PusherEvents.RECORD_CREATED,
    getChannels: (e) => (e.tenantId ? [`private-tenant-${e.tenantId}`] : []),
    transform: (e) => ({
      type: "content",
      id: e.data.contentId,
      title: e.data.title,
      createdBy: e.data.userId,
    }),
  },

  [EventTypes.CONTENT_UPDATED]: {
    pusherEvent: PusherEvents.RECORD_UPDATED,
    getChannels: (e) => (e.tenantId ? [`private-tenant-${e.tenantId}`] : []),
    transform: (e) => ({
      type: "content",
      id: e.data.contentId,
      updatedBy: e.data.userId,
    }),
  },

  [EventTypes.CONTENT_DELETED]: {
    pusherEvent: PusherEvents.RECORD_DELETED,
    getChannels: (e) => (e.tenantId ? [`private-tenant-${e.tenantId}`] : []),
    transform: (e) => ({
      type: "content",
      id: e.data.contentId,
    }),
  },

  // Order events → notify specific user + tenant
  [EventTypes.ORDER_CREATED]: {
    pusherEvent: "order:created",
    getChannels: (e) => {
      const channels: string[] = [];
      if (e.data.userId) channels.push(`private-user-${e.data.userId}`);
      if (e.tenantId) channels.push(`private-tenant-${e.tenantId}`);
      return channels;
    },
    transform: (e) => ({
      orderId: e.data.orderId,
      total: e.data.total,
      status: "created",
    }),
  },

  [EventTypes.ORDER_PAID]: {
    pusherEvent: "order:paid",
    getChannels: (e) => {
      const channels: string[] = [];
      if (e.data.userId) channels.push(`private-user-${e.data.userId}`);
      if (e.tenantId) channels.push(`private-tenant-${e.tenantId}`);
      return channels;
    },
    transform: (e) => ({
      orderId: e.data.orderId,
      status: "paid",
    }),
  },

  [EventTypes.ORDER_SHIPPED]: {
    pusherEvent: "order:shipped",
    getChannels: (e) => (e.data.userId ? [`private-user-${e.data.userId}`] : []),
    transform: (e) => ({
      orderId: e.data.orderId,
      trackingNumber: e.data.trackingNumber,
      status: "shipped",
    }),
  },

  // AI job events → notify requesting user
  [EventTypes.AI_JOB_COMPLETED]: {
    pusherEvent: "ai:completed",
    getChannels: (e) => (e.data.userId ? [`private-user-${e.data.userId}`] : []),
    transform: (e) => ({
      jobId: e.data.jobId,
      jobType: e.data.jobType,
      result: e.data.result,
    }),
  },

  [EventTypes.AI_JOB_FAILED]: {
    pusherEvent: "ai:failed",
    getChannels: (e) => (e.data.userId ? [`private-user-${e.data.userId}`] : []),
    transform: (e) => ({
      jobId: e.data.jobId,
      jobType: e.data.jobType,
      error: e.data.error,
    }),
  },

  // Web3 events → notify user
  [EventTypes.TX_CONFIRMED]: {
    pusherEvent: "web3:tx:confirmed",
    getChannels: (e) => (e.data.userId ? [`private-user-${e.data.userId}`] : []),
    transform: (e) => ({
      txHash: e.data.txHash,
      chain: e.data.chain,
    }),
  },

  [EventTypes.NFT_MINTED]: {
    pusherEvent: "web3:nft:minted",
    getChannels: (e) => (e.data.userId ? [`private-user-${e.data.userId}`] : []),
    transform: (e) => ({
      tokenId: e.data.tokenId,
      contractAddress: e.data.contractAddress,
      txHash: e.data.txHash,
    }),
  },
};

/**
 * Initialize the event bridge
 * Call this during app startup to start bridging events
 */
export function initEventBridge(): () => void {
  const unsubscribers: Array<() => void> = [];

  // Subscribe to all mapped events
  for (const [eventType, config] of Object.entries(eventMappings)) {
    const unsubscribe = eventBus.subscribe(eventType, async (event) => {
      try {
        const channels = config.getChannels(event);
        if (channels.length === 0) return;

        const data = config.transform ? config.transform(event) : event.data;
        const payload = {
          ...data,
          eventId: event.id,
          timestamp: event.timestamp,
        };

        // Broadcast to all target channels
        await Promise.all(
          channels.map((channel) => triggerEvent(channel, config.pusherEvent, payload)),
        );
      } catch (_error) {}
    });

    unsubscribers.push(unsubscribe);
  }

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Add a custom event mapping
 */
export function addEventMapping(eventType: string, config: BroadcastConfig): void {
  eventMappings[eventType] = config;
}

/**
 * Remove an event mapping
 */
export function removeEventMapping(eventType: string): void {
  delete eventMappings[eventType];
}

export type { BroadcastConfig };

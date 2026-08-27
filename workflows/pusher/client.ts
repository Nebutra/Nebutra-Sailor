import PusherClient, { type Channel, type Members, type PresenceChannel } from "pusher-js";

/**
 * Client-side Pusher utilities
 *
 * For React hooks, copy the hooks below to your app's lib folder
 * and import PusherClient from this module.
 */

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (pusherClientInstance) {
    return pusherClientInstance;
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_PUSHER_KEY");
  }

  // Check for self-hosted (Soketi) configuration
  const wsHost = process.env.NEXT_PUBLIC_PUSHER_WS_HOST;
  const wsPort = process.env.NEXT_PUBLIC_PUSHER_WS_PORT
    ? parseInt(process.env.NEXT_PUBLIC_PUSHER_WS_PORT, 10)
    : undefined;

  pusherClientInstance = new PusherClient(key, {
    cluster,
    authEndpoint: process.env.NEXT_PUBLIC_PUSHER_AUTH_ENDPOINT || "/api/pusher/auth",
    forceTLS: process.env.NEXT_PUBLIC_PUSHER_FORCE_TLS !== "false",
    ...(wsHost && { wsHost }),
    ...(wsPort && { wsPort }),
  });

  return pusherClientInstance;
}

// Export singleton instance getter
export const pusherClient = getPusherClient;

/**
 * Subscribe to a channel
 */
export function subscribeChannel(channelName: string): Channel {
  const pusher = getPusherClient();
  return pusher.subscribe(channelName);
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribeChannel(channelName: string): void {
  const pusher = getPusherClient();
  pusher.unsubscribe(channelName);
}

/**
 * Disconnect Pusher client
 */
export function disconnect(): void {
  if (pusherClientInstance) {
    pusherClientInstance.disconnect();
    pusherClientInstance = null;
  }
}

// ============================================================================
// React Hooks (copy to your app's lib/pusher/hooks.ts)
// ============================================================================

/**
 * React hooks for Pusher - copy this section to your app
 *
 * Usage:
 * ```typescript
 * // apps/web/lib/pusher/hooks.ts
 * export { usePusher, useChannel, usePresenceChannel, useEvent } from "./hooks";
 * ```
 */

/*
import { useEffect, useRef, useState, useCallback } from "react";
import PusherClient, { Channel, PresenceChannel, Members } from "pusher-js";

// Pusher context for React
let sharedPusherClient: PusherClient | null = null;

function getSharedPusherClient(): PusherClient {
  if (sharedPusherClient) return sharedPusherClient;
  
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY!;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";
  
  sharedPusherClient = new PusherClient(key, {
    cluster,
    authEndpoint: process.env.NEXT_PUBLIC_PUSHER_AUTH_ENDPOINT || "/api/pusher/auth",
  });
  
  return sharedPusherClient;
}

// Hook: Get Pusher client instance
export function usePusher(): PusherClient {
  const [client] = useState(() => getSharedPusherClient());
  return client;
}

// Hook: Subscribe to a channel
export function useChannel(channelName: string | null): Channel | null {
  const pusher = usePusher();
  const [channel, setChannel] = useState<Channel | null>(null);
  
  useEffect(() => {
    if (!channelName) {
      setChannel(null);
      return;
    }
    
    const ch = pusher.subscribe(channelName);
    setChannel(ch);
    
    return () => {
      pusher.unsubscribe(channelName);
      setChannel(null);
    };
  }, [pusher, channelName]);
  
  return channel;
}

// Hook: Subscribe to presence channel with member tracking
interface PresenceState<T = Record<string, unknown>> {
  channel: PresenceChannel | null;
  members: Array<{ id: string; info: T }>;
  myId: string | null;
  count: number;
}

export function usePresenceChannel<T = Record<string, unknown>>(
  channelName: string | null
): PresenceState<T> {
  const pusher = usePusher();
  const [state, setState] = useState<PresenceState<T>>({
    channel: null,
    members: [],
    myId: null,
    count: 0,
  });
  
  useEffect(() => {
    if (!channelName || !channelName.startsWith("presence-")) {
      setState({ channel: null, members: [], myId: null, count: 0 });
      return;
    }
    
    const channel = pusher.subscribe(channelName) as PresenceChannel;
    
    const updateMembers = (members: Members) => {
      const memberList: Array<{ id: string; info: T }> = [];
      members.each((member: { id: string; info: T }) => {
        memberList.push({ id: member.id, info: member.info });
      });
      
      setState({
        channel,
        members: memberList,
        myId: members.myID,
        count: members.count,
      });
    };
    
    channel.bind("pusher:subscription_succeeded", updateMembers);
    channel.bind("pusher:member_added", () => updateMembers(channel.members));
    channel.bind("pusher:member_removed", () => updateMembers(channel.members));
    
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      setState({ channel: null, members: [], myId: null, count: 0 });
    };
  }, [pusher, channelName]);
  
  return state;
}

// Hook: Listen to specific event on a channel
export function useEvent<T = unknown>(
  channel: Channel | null,
  eventName: string,
  callback: (data: T) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  useEffect(() => {
    if (!channel) return;
    
    const handler = (data: T) => {
      callbackRef.current(data);
    };
    
    channel.bind(eventName, handler);
    
    return () => {
      channel.unbind(eventName, handler);
    };
  }, [channel, eventName]);
}

// Hook: Connection state
export function useConnectionState(): string {
  const pusher = usePusher();
  const [state, setState] = useState(pusher.connection.state);
  
  useEffect(() => {
    const handleStateChange = (states: { current: string }) => {
      setState(states.current);
    };
    
    pusher.connection.bind("state_change", handleStateChange);
    
    return () => {
      pusher.connection.unbind("state_change", handleStateChange);
    };
  }, [pusher]);
  
  return state;
}
*/

// Channel name builders
export const Channels = {
  tenant: (tenantId: string) => `private-tenant-${tenantId}`,
  user: (userId: string) => `private-user-${userId}`,
  room: (roomId: string) => `presence-room-${roomId}`,
  public: (name: string) => `public-${name}`,
} as const;

export type { Channel, Members, PresenceChannel };

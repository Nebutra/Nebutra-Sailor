import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

export type { RealtimeChannel, RealtimePostgresChangesPayload };

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface SubscribeOptions<T extends Record<string, unknown>> {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Subscribe to table changes
 */
export function subscribeToTable<T extends Record<string, unknown>>(
  options: SubscribeOptions<T>,
): RealtimeChannel {
  const client = getSupabaseClient();
  const {
    table,
    schema = "public",
    event = "*",
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
  } = options;

  // Note: postgres_changes config is deprecated in newer Supabase SDK.
  // Use .on() method instead to subscribe to postgres changes.
  const channel = client.channel(`${schema}:${table}`);

  channel.on(
    "postgres_changes" as never,
    { event, schema, table, filter } as never,
    (payload: RealtimePostgresChangesPayload<T>) => {
      onChange?.(payload);

      if (payload.eventType === "INSERT" && onInsert) {
        onInsert(payload.new as T);
      } else if (payload.eventType === "UPDATE" && onUpdate) {
        onUpdate({ old: payload.old as T, new: payload.new as T });
      } else if (payload.eventType === "DELETE" && onDelete) {
        onDelete(payload.old as T);
      }
    },
  );

  channel.subscribe();
  return channel;
}

/**
 * Subscribe to a broadcast channel
 */
export function subscribeToBroadcast(
  channelName: string,
  eventName: string,
  callback: (payload: Record<string, unknown>) => void,
): RealtimeChannel {
  const client = getSupabaseClient();

  const channel = client.channel(channelName);
  channel.on("broadcast", { event: eventName }, ({ payload }) => {
    callback(payload as Record<string, unknown>);
  });

  channel.subscribe();
  return channel;
}

/**
 * Broadcast a message to a channel
 */
export async function broadcast(
  channelName: string,
  eventName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getSupabaseClient();

  const channel = client.channel(channelName);
  await channel.send({
    type: "broadcast",
    event: eventName,
    payload,
  });
}

/**
 * Subscribe to presence (online users)
 */
export function subscribeToPresence(
  channelName: string,
  callbacks: {
    onSync?: () => void;
    onJoin?: (key: string, currentPresences: unknown[], newPresences: unknown[]) => void;
    onLeave?: (key: string, currentPresences: unknown[], leftPresences: unknown[]) => void;
  },
): RealtimeChannel {
  const client = getSupabaseClient();
  const channel = client.channel(channelName);

  channel.on("presence", { event: "sync" }, () => {
    callbacks.onSync?.();
  });

  channel.on("presence", { event: "join" }, ({ key, currentPresences, newPresences }) => {
    callbacks.onJoin?.(key, currentPresences, newPresences);
  });

  channel.on("presence", { event: "leave" }, ({ key, currentPresences, leftPresences }) => {
    callbacks.onLeave?.(key, currentPresences, leftPresences);
  });

  channel.subscribe();
  return channel;
}

/**
 * Track user presence
 */
export async function trackPresence(
  channel: RealtimeChannel,
  userState: Record<string, unknown>,
): Promise<void> {
  await channel.track(userState);
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe();
}

import { logger } from "@nebutra/logger";
import type {
  ChannelResult,
  InAppFeedOptions,
  InAppFeedResult,
  InAppNotification,
  KnockProviderConfig,
  NotificationChannel,
  NotificationPayload,
  NotificationPreference,
  NotificationProvider,
  NotificationResult,
} from "../types";

// =============================================================================
// Knock Provider — Managed notification platform (HTTP API)
// =============================================================================
// Uses Knock's HTTP API directly rather than the @knocklabs/node SDK to avoid
// SDK-version drift. The shapes here track Knock's public API documented at
// https://docs.knock.app/api-reference.
//
// What this covers honestly:
//   - send / sendBatch (POST /v1/workflows/:key/trigger)
//   - getInAppNotifications (GET /v1/users/:id/messages)
//   - markAsRead / markAsReadBatch / markAllAsRead (PUT /v1/messages/.../status)
//   - getPreferences / updatePreferences (GET/PUT /v1/users/:id/preferences)
//
// Tenant scoping: payload.tenantId is passed as Knock's `tenant` argument.
//
// Per-channel overrides: passed into `data.__nebutra_overrides`. Workflow
// templates can read them as variables ({{data.__nebutra_overrides.email.subject}}).
// =============================================================================

const KNOCK_BASE_URL = "https://api.knock.app/v1";

interface KnockFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export class KnockProvider implements NotificationProvider {
  readonly name = "knock" as const;

  private apiKey: string;

  constructor(config?: KnockProviderConfig) {
    const apiKey = config?.apiKey ?? process.env.KNOCK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[notifications:knock] KNOCK_API_KEY not configured. Pass `apiKey` or set the env var.",
      );
    }
    this.apiKey = apiKey;
    logger.info("[notifications:knock] Provider initialised");
  }

  private async knockFetch<T>(path: string, options: KnockFetchOptions = {}): Promise<T> {
    const url = new URL(`${KNOCK_BASE_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }
    const response = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Knock API ${options.method ?? "GET"} ${path} → ${response.status}: ${text}`);
    }
    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  // ── Send ────────────────────────────────────────────────────────────────

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const errors: string[] = [];
    const channelResults: ChannelResult[] = [];

    try {
      const response = await this.knockFetch<{ workflow_run_id: string }>(
        `/workflows/${encodeURIComponent(payload.type)}/trigger`,
        {
          method: "POST",
          body: {
            recipients: [payload.recipientId],
            data: {
              ...payload.data,
              ...(payload.overrides ? { __nebutra_overrides: payload.overrides } : {}),
              __nebutra_channels: payload.channels,
              ...(payload.tenantId ? { __nebutra_tenant_id: payload.tenantId } : {}),
            },
            ...(payload.tenantId ? { tenant: payload.tenantId } : {}),
          },
        },
      );

      // Knock returns a single workflow_run_id. We mark every requested channel
      // as "sent" optimistically — actual per-channel success is observable via
      // Knock's message status API after the workflow fans out.
      for (const channel of payload.channels) {
        channelResults.push({
          channel,
          sent: true,
          messageId: response.workflow_run_id,
        });
      }

      return {
        id: payload.id ?? response.workflow_run_id,
        accepted: true,
        provider: "knock",
        channelResults,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      logger.error("[notifications:knock] Workflow trigger failed", {
        type: payload.type,
        recipientId: payload.recipientId,
        error: message,
      });
      for (const channel of payload.channels) {
        channelResults.push({ channel, sent: false, error: message });
      }
      return {
        id: payload.id ?? "unknown",
        accepted: false,
        provider: "knock",
        channelResults,
        errors,
      };
    }
  }

  async sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    // Knock has no native multi-workflow trigger; sequential trigger keeps the
    // implementation small. Knock's own retry/buffering handles burst load.
    const results: NotificationResult[] = [];
    for (const payload of payloads) results.push(await this.send(payload));
    return results;
  }

  // ── Preferences ─────────────────────────────────────────────────────────

  async getPreferences(userId: string, _tenantId?: string): Promise<NotificationPreference[]> {
    try {
      const prefs = await this.knockFetch<{
        channel_types?: Record<string, boolean>;
      }>(`/users/${encodeURIComponent(userId)}/preferences/default`);
      const channelTypes = prefs.channel_types ?? {};
      const result: NotificationPreference[] = [];
      for (const [channelKey, enabled] of Object.entries(channelTypes)) {
        const channel = mapKnockChannel(channelKey);
        if (!channel) continue;
        result.push({ userId, channel, enabled, frequency: "immediate" });
      }
      return result;
    } catch (error) {
      logger.error("[notifications:knock] getPreferences failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreference>[],
    _tenantId?: string,
  ): Promise<void> {
    const channelTypes: Record<string, boolean> = {};
    for (const pref of preferences) {
      if (!pref.channel || pref.enabled === undefined) continue;
      const knockChannel = toKnockChannel(pref.channel);
      if (!knockChannel) continue;
      channelTypes[knockChannel] = pref.enabled;
    }
    await this.knockFetch(`/users/${encodeURIComponent(userId)}/preferences/default`, {
      method: "PUT",
      body: { channel_types: channelTypes },
    });
  }

  // ── In-App Feed ─────────────────────────────────────────────────────────

  async markAsRead(notificationId: string, _userId: string, _tenantId?: string): Promise<void> {
    await this.knockFetch(`/messages/${encodeURIComponent(notificationId)}/status/read`, {
      method: "PUT",
    });
  }

  async markAsReadBatch(
    notificationIds: string[],
    userId: string,
    _tenantId?: string,
  ): Promise<void> {
    await Promise.all(notificationIds.map((id) => this.markAsRead(id, userId)));
  }

  async markAllAsRead(userId: string, _tenantId?: string): Promise<number> {
    try {
      // Knock has POST /v1/users/:id/feeds/:feed_id/messages/bulk/seen_at —
      // a generic "mark all as read" is via /messages with status filter.
      // The simplest reliable path: fetch unread messages, mark each.
      const feed = await this.getInAppNotifications(userId, { unreadOnly: true, limit: 200 });
      for (const note of feed.notifications) {
        await this.markAsRead(note.id, userId);
      }
      return feed.notifications.length;
    } catch (error) {
      logger.error("[notifications:knock] markAllAsRead failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  async getInAppNotifications(
    userId: string,
    options?: InAppFeedOptions,
  ): Promise<InAppFeedResult> {
    const limit = options?.limit ?? 50;
    try {
      type KnockMessageItem = {
        id: string;
        tenant?: string;
        source?: { key?: string };
        data?: Record<string, unknown>;
        read_at?: string | null;
        inserted_at?: string;
        updated_at?: string;
      };
      const feed = await this.knockFetch<{
        items?: KnockMessageItem[];
        page_info?: { total_count?: number };
      }>(`/users/${encodeURIComponent(userId)}/messages`, {
        query: {
          page_size: limit,
          ...(options?.unreadOnly ? { status: "unread" } : {}),
        },
      });

      const items = feed.items ?? [];
      const notifications: InAppNotification[] = items.map((msg) => {
        const data = msg.data ?? {};
        return {
          id: msg.id,
          userId,
          ...(msg.tenant ? { tenantId: msg.tenant } : {}),
          type: msg.source?.key ?? "unknown",
          title: typeof data.title === "string" ? data.title : "",
          body: typeof data.body === "string" ? data.body : "",
          data,
          read: msg.read_at != null,
          createdAt: msg.inserted_at ?? new Date().toISOString(),
          updatedAt: msg.updated_at ?? new Date().toISOString(),
        };
      });

      const unreadCount = notifications.filter((n) => !n.read).length;

      return {
        notifications,
        total: feed.page_info?.total_count ?? notifications.length,
        unreadCount,
      };
    } catch (error) {
      logger.error("[notifications:knock] getInAppNotifications failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async close(): Promise<void> {
    // No-op: HTTP fetch-based provider, no persistent state to clean up.
  }
}

function mapKnockChannel(knockKey: string): NotificationChannel | undefined {
  switch (knockKey) {
    case "in_app_feed":
      return "in_app";
    case "email":
      return "email";
    case "push":
      return "push";
    case "sms":
      return "sms";
    case "chat":
      return "chat";
    default:
      return undefined;
  }
}

function toKnockChannel(channel: NotificationChannel): string | undefined {
  switch (channel) {
    case "in_app":
      return "in_app_feed";
    case "email":
      return "email";
    case "push":
      return "push";
    case "sms":
      return "sms";
    case "chat":
      return "chat";
    default:
      return undefined;
  }
}

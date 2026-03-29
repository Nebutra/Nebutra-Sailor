import { z } from "zod";

// =============================================================================
// Core Notification Abstraction — Provider-agnostic notification center
// =============================================================================

/**
 * Supported notification channels.
 *
 * - `in_app`  — In-app notification center / feed
 * - `email`   — Transactional email
 * - `push`    — Web push notifications
 * - `sms`     — Short message service
 * - `chat`    — Slack / Discord webhooks
 */
export type NotificationChannel = "in_app" | "email" | "push" | "sms" | "chat";

/**
 * Supported notification backend providers.
 *
 * - `novu`   — Managed Novu platform (recommended)
 * - `direct` — Self-hosted direct dispatchers (Resend, Pusher, SMS, webhooks)
 */
export type NotificationProviderType = "novu" | "direct";

// ── Notification Payload ────────────────────────────────────────────────────

export const NotificationPayloadSchema = z.object({
  /** Globally unique notification ID (auto-generated if omitted) */
  id: z.string().optional(),

  /** Notification type / template ID (e.g. "invoice.paid", "user.signup") */
  type: z.string(),

  /** Recipient user ID */
  recipientId: z.string(),

  /** Multi-tenancy — scope notification to a tenant */
  tenantId: z.string().optional(),

  /** Channels to send this notification to */
  channels: z.array(z.enum(["in_app", "email", "push", "sms", "chat"])),

  /** Template data — arbitrary payload passed to the notification handler */
  data: z.record(z.string(), z.unknown()),

  /** Per-channel content overrides (e.g. custom email subject, custom SMS text) */
  overrides: z
    .object({
      email: z.object({ subject: z.string(), body: z.string() }).partial().optional(),
      sms: z.object({ body: z.string() }).optional(),
      push: z.object({ title: z.string(), body: z.string() }).partial().optional(),
      chat: z.object({ text: z.string() }).optional(),
      in_app: z.object({ title: z.string(), body: z.string() }).partial().optional(),
    })
    .optional(),

  /** Optional metadata for debugging / logging */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

// ── Notification Result ─────────────────────────────────────────────────────

export interface ChannelResult {
  channel: NotificationChannel;
  sent: boolean;
  error?: string;
  messageId?: string;
}

export interface NotificationResult {
  /** The notification ID that was sent */
  id: string;

  /** Was the notification accepted by the provider? */
  accepted: boolean;

  /** Which provider handled this notification */
  provider: NotificationProviderType;

  /** Per-channel results */
  channelResults: ChannelResult[];

  /** Any errors that occurred during send */
  errors?: string[];
}

// ── Notification Preference ─────────────────────────────────────────────────

export const NotificationPreferenceSchema = z.object({
  /** User ID (globally unique) */
  userId: z.string(),

  /** Tenant ID (if multi-tenant) */
  tenantId: z.string().optional(),

  /** Channel enabled/disabled */
  channel: z.enum(["in_app", "email", "push", "sms", "chat"]),

  /** Is this channel enabled for this user? */
  enabled: z.boolean().default(true),

  /** Notification categories/types this user has opted out of */
  disabledCategories: z.array(z.string()).optional(),

  /** User's preferred frequency/digest settings */
  frequency: z.enum(["immediate", "daily", "weekly", "never"]).default("immediate"),

  /** Last updated timestamp */
  updatedAt: z.string().datetime().optional(),
});

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

// ── In-App Notification Feed ────────────────────────────────────────────────

export interface InAppNotification {
  id: string;
  userId: string;
  tenantId?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InAppFeedOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface InAppFeedResult {
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
}

// ── Provider Interface ──────────────────────────────────────────────────────

/**
 * Every notification provider must implement this interface.
 * The factory function returns a `NotificationProvider`.
 */
export interface NotificationProvider {
  readonly name: NotificationProviderType;

  /**
   * Send a notification to a single recipient across one or more channels.
   */
  send(payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * Send notifications to multiple recipients in a single operation.
   * Falls back to sequential sends if the provider has no native batch API.
   */
  sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]>;

  /**
   * Get notification preferences for a user.
   */
  getPreferences(userId: string, tenantId?: string): Promise<NotificationPreference[]>;

  /**
   * Update notification preferences for a user.
   */
  updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreference>[],
    tenantId?: string,
  ): Promise<void>;

  /**
   * Mark an in-app notification as read.
   */
  markAsRead(notificationId: string, userId: string, tenantId?: string): Promise<void>;

  /**
   * Get the in-app notification feed for a user.
   */
  getInAppNotifications(
    userId: string,
    options?: InAppFeedOptions,
    tenantId?: string,
  ): Promise<InAppFeedResult>;

  /**
   * Graceful shutdown — close connections.
   */
  close(): Promise<void>;
}

// ── Provider Configuration ──────────────────────────────────────────────────

export interface NovuProviderConfig {
  provider: "novu";

  /** Novu API key (defaults to `process.env.NOVU_API_KEY`) */
  apiKey?: string;

  /** Optional Novu API base URL (for self-hosted Novu) */
  baseUrl?: string;
}

export interface DirectProviderConfig {
  provider: "direct";

  /** In-app notification store — required for in_app channel */
  inAppStore?: InAppNotificationStore;

  /** Email dispatcher — required for email channel */
  emailDispatcher?: EmailDispatcher;

  /** Push notification dispatcher — required for push channel */
  pushDispatcher?: PushDispatcher;

  /** SMS dispatcher — required for sms channel */
  smsDispatcher?: SMSDispatcher;

  /** Chat webhook dispatcher — required for chat channel */
  chatDispatcher?: ChatDispatcher;

  /** Preference store — required for preference management */
  preferenceStore?: PreferenceStore;
}

export type NotificationConfig = NovuProviderConfig | DirectProviderConfig;

// ── Direct Provider Dispatcher Interfaces ───────────────────────────────────

/**
 * In-app notification store — implement this to persist in-app notifications.
 * Can be a database, Redis, or in-memory store.
 */
export interface InAppNotificationStore {
  create(
    notification: Omit<InAppNotification, "id" | "createdAt" | "updatedAt">,
  ): Promise<InAppNotification>;
  markAsRead(notificationId: string, userId: string, tenantId?: string): Promise<void>;
  markAsReadBatch(notificationIds: string[], userId: string, tenantId?: string): Promise<void>;
  getByUserId(
    userId: string,
    options?: InAppFeedOptions,
    tenantId?: string,
  ): Promise<InAppFeedResult>;
  deleteOld(beforeDate: Date, tenantId?: string): Promise<number>;
}

/**
 * Email dispatcher — implement this to send emails.
 * Can delegate to Resend, SendGrid, AWS SES, etc.
 */
export interface EmailDispatcher {
  send(
    to: string,
    subject: string,
    body: string,
    html?: string,
  ): Promise<{ messageId: string; sent: boolean; error?: string }>;
}

/**
 * Push notification dispatcher — implement this to send web push notifications.
 * Can delegate to Pusher Beams, Firebase Cloud Messaging, etc.
 */
export interface PushDispatcher {
  send(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ messageId: string; sent: boolean; error?: string }>;
}

/**
 * SMS dispatcher — implement this to send SMS messages.
 * Can delegate to Twilio, AWS SNS, Vonage, etc.
 */
export interface SMSDispatcher {
  send(
    phoneNumber: string,
    body: string,
  ): Promise<{ messageId: string; sent: boolean; error?: string }>;
}

/**
 * Chat dispatcher — implement this to send chat messages.
 * Can delegate to Slack webhooks, Discord webhooks, etc.
 */
export interface ChatDispatcher {
  send(
    webhookUrl: string,
    text: string,
    data?: Record<string, unknown>,
  ): Promise<{ messageId: string; sent: boolean; error?: string }>;
}

/**
 * Preference store — implement this to persist user notification preferences.
 * Can be a database, Redis, or in-memory store.
 */
export interface PreferenceStore {
  getAll(userId: string, tenantId?: string): Promise<NotificationPreference[]>;
  getByChannel(
    userId: string,
    channel: NotificationChannel,
    tenantId?: string,
  ): Promise<NotificationPreference | null>;
  updateBatch(
    userId: string,
    preferences: Partial<NotificationPreference>[],
    tenantId?: string,
  ): Promise<void>;
}

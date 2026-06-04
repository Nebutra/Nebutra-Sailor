/**
 * Centralized, hierarchical React Query key factory.
 *
 * Every component that talks to the server through React Query MUST source its
 * `queryKey` from this module — never hand-roll string keys inline. The factory
 * follows the official TanStack Query "query key factory" pattern: each entity
 * exposes a stable `all` root plus typed builders for the concrete keys.
 *
 * Conventions
 * -----------
 * - Keys are tuples whose first element namespaces the entity (e.g. "api-keys").
 * - List keys may take a scoping argument (orgId, threadId, ...). When the
 *   argument is omitted the key still resolves to a valid array, so a broad
 *   `invalidateQueries({ queryKey: queryKeys.apiKeys.all })` invalidates every
 *   variant under that entity.
 * - `as const` keeps the tuples literally typed so consumers get exact-key
 *   inference and `invalidateQueries` partial matching works as expected.
 */

export const queryKeys = {
  apiKeys: {
    all: ["api-keys"] as const,
    list: (orgId?: string) =>
      orgId ? (["api-keys", "list", orgId] as const) : (["api-keys", "list"] as const),
    detail: (id: string) => ["api-keys", "detail", id] as const,
  },

  webhooks: {
    all: ["webhooks"] as const,
    list: (orgId?: string) =>
      orgId ? (["webhooks", "list", orgId] as const) : (["webhooks", "list"] as const),
    detail: (id: string) => ["webhooks", "detail", id] as const,
  },

  webhookDeliveries: {
    all: ["webhook-deliveries"] as const,
    list: (webhookId: string) => ["webhook-deliveries", "list", webhookId] as const,
    detail: (id: string) => ["webhook-deliveries", "detail", id] as const,
  },

  teamMembers: {
    all: ["team-members"] as const,
    list: (orgId?: string) =>
      orgId ? (["team-members", "list", orgId] as const) : (["team-members", "list"] as const),
  },

  orgMembers: {
    all: ["org-members"] as const,
    list: (orgId?: string) =>
      orgId ? (["org-members", "list", orgId] as const) : (["org-members", "list"] as const),
  },

  personalization: {
    all: ["personalization"] as const,
    detail: (userId?: string) =>
      userId
        ? (["personalization", "detail", userId] as const)
        : (["personalization", "detail"] as const),
  },

  organizations: {
    all: ["organizations"] as const,
    list: () => ["organizations", "list"] as const,
    detail: (orgId: string) => ["organizations", "detail", orgId] as const,
    active: () => ["organizations", "active"] as const,
  },

  orgThreads: {
    all: ["org-threads"] as const,
    list: (orgId?: string) =>
      orgId ? (["org-threads", "list", orgId] as const) : (["org-threads", "list"] as const),
    detail: (threadId: string) => ["org-threads", "detail", threadId] as const,
  },

  passkeys: {
    all: ["passkeys"] as const,
    list: (userId?: string) =>
      userId ? (["passkeys", "list", userId] as const) : (["passkeys", "list"] as const),
  },

  notifications: {
    all: ["notifications"] as const,
    settings: () => ["notifications", "settings"] as const,
    preferences: (userId?: string) =>
      userId
        ? (["notifications", "preferences", userId] as const)
        : (["notifications", "preferences"] as const),
    preferencesEndpoint: (endpoint: string) =>
      ["notifications", "preferences", "endpoint", endpoint] as const,
  },

  notificationsInbox: {
    all: ["notifications-inbox"] as const,
    list: (userId?: string) =>
      userId
        ? (["notifications-inbox", "list", userId] as const)
        : (["notifications-inbox", "list"] as const),
    unreadCount: (userId?: string) =>
      userId
        ? (["notifications-inbox", "unread-count", userId] as const)
        : (["notifications-inbox", "unread-count"] as const),
  },

  auditLog: {
    all: ["audit-log"] as const,
    list: (orgId?: string) =>
      orgId ? (["audit-log", "list", orgId] as const) : (["audit-log", "list"] as const),
  },

  checkoutStatus: {
    all: ["checkout-status"] as const,
    detail: (sessionId: string) => ["checkout-status", "detail", sessionId] as const,
  },

  accountAvatar: {
    all: ["account-avatar"] as const,
    upload: () => ["account-avatar", "upload"] as const,
    remove: () => ["account-avatar", "remove"] as const,
  },

  organizationLogo: {
    all: ["organization-logo"] as const,
    upload: (orgId: string) => ["organization-logo", "upload", orgId] as const,
    remove: (orgId: string) => ["organization-logo", "remove", orgId] as const,
  },

  tasks: {
    all: ["tasks"] as const,
    detail: (taskId: string) => ["tasks", "detail", taskId] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;

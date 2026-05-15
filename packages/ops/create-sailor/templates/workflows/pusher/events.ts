export const PUSHER_EVENTS = {
  NOTIFICATION_CREATED: "notification.created",
  TENANT_UPDATED: "tenant.updated",
} as const;

export type PusherEvent = (typeof PUSHER_EVENTS)[keyof typeof PUSHER_EVENTS];

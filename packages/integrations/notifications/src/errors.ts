// =============================================================================
// Notification errors — typed failures callers can branch on
// =============================================================================

/**
 * Thrown when a provider (or the store behind it) cannot perform an operation
 * the abstraction exposes. Callers should surface this as "not implemented"
 * rather than swallow it: a silent success is indistinguishable from a real
 * write to the client, which then renders state the backend never stored.
 */
export class NotificationUnsupportedOperationError extends Error {
  readonly operation: string;
  readonly provider: string;

  constructor(operation: string, provider: string, reason: string) {
    super(`[notifications:${provider}] ${operation} is not supported: ${reason}`);
    this.name = "NotificationUnsupportedOperationError";
    this.operation = operation;
    this.provider = provider;
  }
}

/**
 * Thrown when the addressed notification does not exist for the requesting
 * user and tenant. A store write that matched zero rows must not be reported
 * as a success: the client would render a state the backend never stored, and
 * a cross-tenant id would look indistinguishable from a legitimate write.
 */
export class NotificationNotFoundError extends Error {
  readonly notificationId: string;

  constructor(notificationId: string) {
    super(`Notification ${notificationId} was not found for this user and tenant`);
    this.name = "NotificationNotFoundError";
    this.notificationId = notificationId;
  }
}

export function isNotificationNotFoundError(error: unknown): error is NotificationNotFoundError {
  return (
    error instanceof NotificationNotFoundError ||
    (error instanceof Error && error.name === "NotificationNotFoundError")
  );
}

export function isNotificationUnsupportedOperationError(
  error: unknown,
): error is NotificationUnsupportedOperationError {
  return (
    error instanceof NotificationUnsupportedOperationError ||
    (error instanceof Error && error.name === "NotificationUnsupportedOperationError")
  );
}

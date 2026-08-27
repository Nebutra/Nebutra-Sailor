/**
 * Short-lived client-side handoff between a credentials form and the Turnstile
 * challenge page. Credentials never leave the tab; sessionStorage is cleared
 * after the challenge completes or expires.
 */

export const PENDING_AUTH_KEY = "nebutra.auth.pending";

/** 5 minutes — long enough for a slow captcha, short enough for a forgotten tab. */
export const PENDING_AUTH_TTL_MS = 5 * 60 * 1000;

export type PendingAuthKind = "sign-in" | "sign-up" | "magic-link" | "forgot-password";

export type PendingAuth = {
  readonly v: 1;
  readonly createdAt: number;
  readonly kind: PendingAuthKind;
  readonly endpoint: string;
  readonly body: Record<string, unknown>;
  /**
   * Absolute URL after a successful sign-in / sign-up.
   * Magic-link and forgot-password use in-page success instead.
   */
  readonly successRedirect?: string;
  /** Path (+ query) to return to if the user cancels or the handoff is stale. */
  readonly cancelTo: string;
};

export function writePendingAuth(pending: Omit<PendingAuth, "v" | "createdAt">): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: PendingAuth = {
    v: 1,
    createdAt: Date.now(),
    ...pending,
  };
  sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(payload));
}

export function readPendingAuth(): PendingAuth | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingAuth;
    if (parsed?.v !== 1 || typeof parsed.createdAt !== "number") {
      clearPendingAuth();
      return null;
    }
    if (Date.now() - parsed.createdAt > PENDING_AUTH_TTL_MS) {
      clearPendingAuth();
      return null;
    }
    if (!parsed.endpoint || !parsed.kind || !parsed.cancelTo) {
      clearPendingAuth();
      return null;
    }
    return parsed;
  } catch {
    clearPendingAuth();
    return null;
  }
}

export function clearPendingAuth(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PENDING_AUTH_KEY);
}

export function challengePath(cancelTo: string): string {
  const params = new URLSearchParams({ cancelTo });
  return `/challenge?${params.toString()}`;
}

/**
 * Pure helpers for the Add-account flow. No React, no server-only, so the
 * copy and the state transitions can be unit-tested without a DOM.
 */

export type LoginProviderId = "codex" | "antigravity" | "anthropic";
export type LoginStatus = "wait" | "ok" | "error" | "unknown";

export interface LoginProviderOption {
  id: LoginProviderId;
  label: string;
  hint: string;
}

/** Order = frequency of use. Labels match router's LOGIN_PROVIDERS. */
export const LOGIN_PROVIDER_OPTIONS: readonly LoginProviderOption[] = [
  {
    id: "codex",
    label: "ChatGPT · Codex",
    hint: "Approve in your browser, then paste the callback URL",
  },
  {
    id: "antigravity",
    label: "Google · Antigravity (Gemini)",
    hint: "Approve in your browser, then paste the callback URL",
  },
  {
    id: "anthropic",
    label: "Claude Code",
    hint: "Approve in your browser, then paste the callback URL",
  },
];

/** What the router returns from `account.login`. */
export interface LoginStart {
  state: string;
  provider: LoginProviderId;
  url: string;
  callbackHost: string;
}

/** One row of the `login` resource. */
export interface LoginRow {
  id: string;
  provider: string;
  providerLabel: string;
  url: string;
  status: LoginStatus;
  detail: string;
  startedAt: string;
  startedBy: string;
}

/**
 * The provider redirects the browser to a localhost port that only the engine
 * listens on, so the page never loads. The operator copies that address from
 * the address bar; the router replays it server-side.
 */
export function describeCallbackHint(callbackHost: string): string {
  const host =
    callbackHost
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "") || "localhost";
  return `After you approve, the browser lands on http://${host}/… and the page does not load. Copy that full address from the address bar and paste it here.`;
}

/** Whether a pasted callback URL looks like the redirect we expect. */
export function looksLikeCallback(value: string, callbackHost: string): boolean {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  const host = callbackHost
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return url.host === host && url.searchParams.has("state");
}

/** Pick the row for one flow out of the `login` resource, if it is still listed. */
export function findLoginRow(
  items: ReadonlyArray<Record<string, unknown>>,
  state: string,
): LoginRow | null {
  const hit = items.find((row) => row.id === state);
  return hit ? (hit as unknown as LoginRow) : null;
}

/** Polling stops when the flow has settled either way. */
export function isSettled(status: LoginStatus | undefined): boolean {
  return status === "ok" || status === "error";
}

/**
 * Generic ActionButtons post an empty input, so an action that declares a
 * required input schema cannot be driven by them; those get a bespoke surface.
 */
export function needsInput(action: { input?: unknown }): boolean {
  const schema = action.input as { required?: unknown } | undefined;
  return Array.isArray(schema?.required) && schema.required.length > 0;
}

import "server-only";

import { randomUUID } from "node:crypto";
import { auditLogger } from "@nebutra/audit";
import type { ActionResult, ResourceList } from "@nebutra/contracts/admin";
import type { StaffCaller } from "../admin/service-token";
import { CLIPROXY_INTERNAL_URL } from "./clients";

/**
 * Account login flows for the pool, driven through CLIProxyAPI's management
 * API. The operator never sees the third-party console: the product starts
 * the OAuth flow, hands back the URL, accepts the pasted callback, and reports
 * status until the auth file lands on the volume.
 *
 * Observed shapes (v7.2.154):
 *   GET /v0/management/{codex,antigravity,anthropic}-auth-url → {state, status:"ok", url}
 *   GET /v0/management/get-auth-status?state=… → {status:"wait"|"ok"|"error", error?}
 *   GET /oauth-callback?<provider redirect query> → completes the exchange
 */

export const LOGIN_PROVIDERS = {
  codex: { label: "ChatGPT · Codex", endpoint: "codex-auth-url", callbackPort: 1455 },
  antigravity: {
    label: "Google · Antigravity (Gemini)",
    endpoint: "antigravity-auth-url",
    callbackPort: 51121,
  },
  anthropic: { label: "Claude Code", endpoint: "anthropic-auth-url", callbackPort: 54545 },
} as const;
export type LoginProvider = keyof typeof LOGIN_PROVIDERS;

export interface PendingLogin extends Record<string, unknown> {
  id: string;
  provider: LoginProvider;
  providerLabel: string;
  url: string;
  status: "wait" | "ok" | "error" | "unknown";
  detail: string;
  startedAt: string;
  startedBy: string;
}

const pending = new Map<string, PendingLogin>();
const LOGIN_TTL_MS = 30 * 60_000;

function managementHeaders(): Record<string, string> {
  const key = process.env.CLIPROXY_MANAGEMENT_KEY?.trim();
  if (!key) throw new Error("CLIPROXY_MANAGEMENT_KEY is not set on this Machine.");
  return { Authorization: `Bearer ${key}`, accept: "application/json" };
}

export function isLoginProvider(value: unknown): value is LoginProvider {
  return typeof value === "string" && value in LOGIN_PROVIDERS;
}

export async function startLogin(
  provider: LoginProvider,
  caller: StaffCaller,
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<ActionResult> {
  const meta = LOGIN_PROVIDERS[provider];
  const res = await fetchImpl(`${CLIPROXY_INTERNAL_URL}/v0/management/${meta.endpoint}`, {
    headers: managementHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    state?: string;
    status?: string;
    url?: string;
    error?: string;
  };
  if (!res.ok || body.status !== "ok" || !body.state || !body.url) {
    throw new Error(`CLIProxyAPI ${meta.endpoint} → ${body.error ?? res.status}`);
  }
  const startedAt = new Date().toISOString();
  pending.set(body.state, {
    id: body.state,
    provider,
    providerLabel: meta.label,
    url: body.url,
    status: "wait",
    detail: "Waiting for approval",
    startedAt,
    startedBy: caller.userId,
  });
  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.account.login.start",
    outcome: "success",
    resource: { type: "account-login", id: body.state },
    metadata: { auditId, provider, role: caller.role },
  });
  return {
    auditId,
    summary: `Sign in to ${meta.label} on your own device, then paste the callback URL back.`,
    result: {
      state: body.state,
      provider,
      url: body.url,
      callbackHost: `localhost:${meta.callbackPort}`,
    },
  };
}

/**
 * The provider redirects the operator's browser to localhost:<port>, which
 * does not load. The operator pastes that URL; we replay its query string to
 * CLIProxyAPI's callback endpoint, which completes the exchange server-side.
 */
export async function completeLogin(
  redirectUrl: string,
  caller: StaffCaller,
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<ActionResult> {
  let parsed: URL;
  try {
    parsed = new URL(redirectUrl.trim());
  } catch {
    throw new Error(
      "Paste the full URL from the browser address bar (it starts with http://localhost:…).",
    );
  }
  const state = parsed.searchParams.get("state") ?? "";
  // `pending` is this Machine's bookkeeping for the console, not the authority
  // on the flow: CLIProxyAPI issued the state and holds the verifier. A deploy
  // between "start sign-in" and the paste-back empties the map, and refusing
  // here would strand a callback CLIProxyAPI can still redeem. So an unknown
  // state is reconstructed from the redirect port and forwarded anyway.
  const flow = pending.get(state) ?? adoptCallback(state, parsed, caller);
  const res = await fetchImpl(`${CLIPROXY_INTERNAL_URL}/oauth-callback${parsed.search}`, {
    headers: managementHeaders(),
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text().catch(() => "");
  if (res.status >= 400) {
    flow.status = "error";
    flow.detail = text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(`CLIProxyAPI rejected the callback: ${flow.detail}`);
  }
  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.account.login.complete",
    outcome: "success",
    resource: { type: "account-login", id: state },
    metadata: { auditId, provider: flow.provider, role: caller.role },
  });
  await refreshStatus(flow, fetchImpl);
  return {
    auditId,
    summary: `Callback accepted for ${flow.providerLabel}. ${flow.detail}`,
    result: { state, status: flow.status },
  };
}

/**
 * Rebuild a flow record for a callback this Machine has no memory of. The
 * provider is read from the redirect port the provider was told to use; an
 * unrecognised port still goes through, because only CLIProxyAPI can say
 * whether the state is redeemable.
 */
function adoptCallback(state: string, parsed: URL, caller: StaffCaller): PendingLogin {
  const port = Number(parsed.port);
  const entry = Object.entries(LOGIN_PROVIDERS).find(([, meta]) => meta.callbackPort === port);
  const provider = (entry?.[0] ?? "codex") as LoginProvider;
  const adopted: PendingLogin = {
    id: state,
    provider,
    providerLabel: entry ? LOGIN_PROVIDERS[provider].label : `callback on port ${parsed.port}`,
    url: "",
    status: "wait",
    detail: "Adopted from a sign-in started before this Machine came up",
    startedAt: new Date().toISOString(),
    startedBy: caller.userId,
  };
  pending.set(state, adopted);
  return adopted;
}

async function refreshStatus(flow: PendingLogin, fetchImpl: typeof fetch): Promise<void> {
  try {
    const res = await fetchImpl(
      `${CLIPROXY_INTERNAL_URL}/v0/management/get-auth-status?state=${encodeURIComponent(flow.id)}`,
      {
        headers: managementHeaders(),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
    if (body.status === "ok") {
      flow.status = "ok";
      flow.detail = "Account is in the pool";
    } else if (body.status === "error") {
      flow.status = "error";
      flow.detail = body.error ?? "Login failed";
    } else if (body.status === "wait") {
      flow.status = "wait";
      flow.detail = "Waiting for approval";
    } else {
      flow.status = "unknown";
      flow.detail = body.error ?? `HTTP ${res.status}`;
    }
  } catch (error) {
    flow.status = "unknown";
    flow.detail = error instanceof Error ? error.message : "status probe failed";
  }
}

/** Pending logins with a fresh status probe — the `login` resource. */
export async function listLogins(fetchImpl: typeof fetch = fetch): Promise<ResourceList> {
  const cutoff = Date.now() - LOGIN_TTL_MS;
  for (const [state, flow] of pending) {
    if (Date.parse(flow.startedAt) < cutoff) pending.delete(state);
  }
  const flows = [...pending.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  await Promise.all(
    flows
      .filter((f) => f.status === "wait" || f.status === "unknown")
      .map((f) => refreshStatus(f, fetchImpl)),
  );
  return { items: flows, total: flows.length, probedAt: new Date().toISOString() };
}

/** Test seam. */
export function _resetLogins(): void {
  pending.clear();
}

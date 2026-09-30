/**
 * Active usage/balance pulls (ADR 2026-09-30 addendum — quota layer, §1b).
 *
 * Same posture as `discovery.ts`: one adapter per shape, pure I/O, no Prisma
 * or vault. Each answers "how much of this source's quota is used, and what
 * does it know about the limit/reset" from a credential over plain `fetch`.
 * The repository seam persists the result as a `QuotaObservation`
 * (`./quota.ts`), merged with the source's own declared `planConfig` for
 * whatever a source's endpoint does not report (most commonly: the limit).
 */

import type { NewApiSessionClient, SourceCredential } from "./discovery";

export type UsageUnit = "USD" | "TOKENS" | "REQUESTS";

export interface UsageWindowSignal {
  /** Provider- or adapter-scoped window name, e.g. a CLIProxyAPI auth provider ("codex"), or "balance". */
  readonly name: string;
  readonly unit: UsageUnit;
  readonly limit: number | null;
  readonly used: number | null;
  readonly resetsAt: Date | null;
}

export interface UsageResult {
  readonly ok: boolean;
  readonly windows: readonly UsageWindowSignal[];
  readonly note: string;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

async function fetchJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs = 10_000,
): Promise<{ ok: boolean; status: number; body: T | null }> {
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const body = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, body };
}

// ---------------------------------------------------------------- CLIProxyAPI

interface CliProxyAuthFileQuota {
  provider?: string;
  disabled?: boolean;
  unavailable?: boolean;
  recent_requests?: number;
  next_retry_after?: string;
  /**
   * GAP (honest, not faked): CLIProxyAPI's management API does not document a
   * schema for this field as of this writing (`clients.ts` types it
   * `unknown`). This adapter duck-types the handful of shapes actually seen
   * (`{used,limit}` / `{usedAmount,limitAmount}` / `{limit,remaining}`) and
   * falls back to a bare request count with no ratio when none match.
   */
  quota?: unknown;
}

function extractRatioFromQuotaField(quota: unknown): { used: number; limit: number } | null {
  if (!quota || typeof quota !== "object") return null;
  const q = quota as Record<string, unknown>;
  const used =
    typeof q.used === "number" ? q.used : typeof q.usedAmount === "number" ? q.usedAmount : null;
  const limit =
    typeof q.limit === "number"
      ? q.limit
      : typeof q.limitAmount === "number"
        ? q.limitAmount
        : null;
  if (used !== null && limit !== null) return { used, limit };
  if (limit !== null && typeof q.remaining === "number") {
    return { used: Math.max(0, limit - q.remaining), limit };
  }
  return null;
}

/**
 * `/v0/management/auth-files` — the same endpoint `discoverCliProxyApi`
 * already reads, aggregated per auth provider (codex/anthropic/antigravity)
 * instead of per model. See the stated gap on `quota`'s shape above.
 */
export async function fetchCliProxyUsage(
  input: SourceCredential,
  fetchImpl: typeof fetch = fetch,
): Promise<UsageResult> {
  if (!input.managementKey) {
    return {
      ok: false,
      windows: [],
      note: "no managementKey configured — CLIProxyAPI usage needs the management API",
    };
  }
  const base = stripTrailingSlash(input.baseUrl);
  try {
    const { ok, status, body } = await fetchJson<
      { files?: CliProxyAuthFileQuota[] } | CliProxyAuthFileQuota[]
    >(fetchImpl, `${base}/v0/management/auth-files`, {
      headers: { Authorization: `Bearer ${input.managementKey}` },
    });
    if (!ok || !body) return { ok: false, windows: [], note: `HTTP ${status}` };
    const files = Array.isArray(body) ? body : (body.files ?? []);

    const byProvider = new Map<string, CliProxyAuthFileQuota[]>();
    for (const file of files) {
      if (file.disabled || file.unavailable) continue;
      const provider = (file.provider ?? "").toLowerCase();
      if (!provider) continue;
      const list = byProvider.get(provider) ?? [];
      list.push(file);
      byProvider.set(provider, list);
    }

    const windows: UsageWindowSignal[] = [];
    let ratiosFound = 0;
    for (const [provider, accounts] of byProvider) {
      const ratios = accounts
        .map((a) => extractRatioFromQuotaField(a.quota))
        .filter((r): r is { used: number; limit: number } => r !== null);
      const resetTimestamps = accounts
        .map((a) => (a.next_retry_after ? Date.parse(a.next_retry_after) : Number.NaN))
        .filter((n) => !Number.isNaN(n));
      const resetsAt = resetTimestamps.length ? new Date(Math.min(...resetTimestamps)) : null;

      if (ratios.length > 0) {
        ratiosFound += 1;
        windows.push({
          name: provider,
          unit: "REQUESTS",
          limit: ratios.reduce((sum, r) => sum + r.limit, 0),
          used: ratios.reduce((sum, r) => sum + r.used, 0),
          resetsAt,
        });
      } else {
        const recentRequests = accounts.reduce(
          (sum, a) => sum + (typeof a.recent_requests === "number" ? a.recent_requests : 0),
          0,
        );
        windows.push({
          name: provider,
          unit: "REQUESTS",
          limit: null,
          used: recentRequests,
          resetsAt,
        });
      }
    }

    return {
      ok: true,
      windows,
      note: windows.length
        ? `${windows.length} provider(s) — ratio available for ${ratiosFound}, count-only for ${windows.length - ratiosFound}`
        : "no healthy accounts reported",
    };
  } catch (error) {
    return {
      ok: false,
      windows: [],
      note: error instanceof Error ? error.message : "fetch failed",
    };
  }
}

// ---------------------------------------------------------------- New-API channel

/**
 * A New-API channel's `used_quota` — a running counter, not a remaining
 * balance, and New-API channels carry no limit of their own (the limit for
 * this window comes from the source's declared `planConfig`, merged in by
 * the repository seam, same as self-metering). Converted to USD only when
 * `input.quotaPerUnitUsd` (New-API's own install-time $-per-unit ratio) is
 * configured; otherwise the raw unit is reported as a gap, never mislabeled.
 */
export async function fetchNewApiChannelUsage(
  input: SourceCredential,
  session: NewApiSessionClient,
  fetchImpl: typeof fetch = fetch,
): Promise<UsageResult> {
  if (!input.channelName) {
    return { ok: false, windows: [], note: "no channelName configured" };
  }
  try {
    const auth = await session.login(fetchImpl);
    const channel = await session.findChannel(fetchImpl, auth, input.channelName);
    if (!channel) {
      return { ok: false, windows: [], note: `channel ${input.channelName} not found` };
    }
    const usedQuota = channel.used_quota;
    if (usedQuota === undefined) {
      return { ok: true, windows: [], note: "channel response carries no used_quota field" };
    }
    if (!input.quotaPerUnitUsd) {
      return {
        ok: true,
        windows: [],
        note: `used_quota=${usedQuota} raw unit(s) — set quotaPerUnitUsd (New-API's QuotaPerUnit) to convert to USD`,
      };
    }
    const usedUsd = usedQuota / input.quotaPerUnitUsd;
    return {
      ok: true,
      windows: [{ name: "balance", unit: "USD", limit: null, used: usedUsd, resetsAt: null }],
      note: `used_quota=${usedQuota} → $${usedUsd.toFixed(4)} at ${input.quotaPerUnitUsd}/unit`,
    };
  } catch (error) {
    return {
      ok: false,
      windows: [],
      note: error instanceof Error ? error.message : "New-API session failed",
    };
  }
}

// ---------------------------------------------------------------- generic OpenAI-compatible balance

export type BalanceShape = "openai_credit_grants" | "generic_available_used";

/**
 * GAP (honest, not faked): there is no standard balance/credit endpoint
 * across OpenAI-compatible relays, unlike `/v1/models`. This adapter only
 * speaks the two shapes actually observed in the wild — the legacy OpenAI
 * dashboard shape (`total_granted`/`total_available`/`total_used`) and the
 * generic `{total_available, total_usage}`-style shape several 中转站 clones
 * use — and only when the operator declares which one (`balanceEndpoint` +
 * `balanceShape`) when adding the source. A source with neither configured,
 * or whose endpoint answers neither shape, gets no active balance signal and
 * falls back to self-metering (§1c).
 */
export async function fetchOpenAiCompatibleBalance(
  input: SourceCredential,
  fetchImpl: typeof fetch = fetch,
): Promise<UsageResult> {
  if (!input.balanceEndpoint || !input.balanceShape) {
    return {
      ok: false,
      windows: [],
      note: "no balanceEndpoint/balanceShape configured — no standard balance API exists across OpenAI-compatible providers",
    };
  }
  const base = stripTrailingSlash(input.baseUrl);
  const path = input.balanceEndpoint.startsWith("/")
    ? input.balanceEndpoint
    : `/${input.balanceEndpoint}`;
  try {
    const { ok, status, body } = await fetchJson<Record<string, unknown>>(
      fetchImpl,
      `${base}${path}`,
      {
        headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
      },
    );
    if (!ok || !body) return { ok: false, windows: [], note: `HTTP ${status}` };

    if (input.balanceShape === "openai_credit_grants") {
      const granted = typeof body.total_granted === "number" ? body.total_granted : null;
      const available = typeof body.total_available === "number" ? body.total_available : null;
      const used =
        typeof body.total_used === "number"
          ? body.total_used
          : granted !== null && available !== null
            ? granted - available
            : null;
      if (used === null)
        return { ok: false, windows: [], note: "credit_grants shape did not match" };
      return {
        ok: true,
        windows: [{ name: "balance", unit: "USD", limit: granted, used, resetsAt: null }],
        note: `granted=${granted ?? "?"} used=${used}`,
      };
    }

    // generic_available_used
    const totalAvailable =
      typeof body.total_available === "number"
        ? body.total_available
        : typeof body.available === "number"
          ? body.available
          : null;
    const totalUsed =
      typeof body.total_usage === "number"
        ? body.total_usage
        : typeof body.total_used === "number"
          ? body.total_used
          : typeof body.used === "number"
            ? body.used
            : null;
    if (totalUsed === null && totalAvailable === null) {
      return { ok: false, windows: [], note: "generic balance shape did not match" };
    }
    const limit = totalAvailable !== null && totalUsed !== null ? totalAvailable + totalUsed : null;
    return {
      ok: true,
      windows: [{ name: "balance", unit: "USD", limit, used: totalUsed ?? 0, resetsAt: null }],
      note: `available=${totalAvailable ?? "?"} used=${totalUsed ?? "?"}`,
    };
  } catch (error) {
    return {
      ok: false,
      windows: [],
      note: error instanceof Error ? error.message : "fetch failed",
    };
  }
}

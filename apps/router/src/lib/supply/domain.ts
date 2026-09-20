import "server-only";

import { randomUUID } from "node:crypto";
import { auditLogger } from "@nebutra/audit";
import type {
  ActionPlan,
  ActionResult,
  ResourceList,
  SignalReading,
} from "@nebutra/contracts/admin";
import type { StaffCaller } from "../admin/service-token";
import {
  CLIPROXY_CHANNEL_NAME,
  CLIPROXY_INTERNAL_URL,
  cliProxyAuthFiles,
  cliProxyModels,
  NEW_API_INTERNAL_URL,
  newApiAdmin,
  newApiFindChannel,
  newApiLogin,
  newApiShelf,
} from "./clients";
import { findPriceDrift } from "./pricing";

const now = () => new Date().toISOString();

// ---------------------------------------------------------------- engines
export async function listEngines(fetchImpl: typeof fetch = fetch): Promise<ResourceList> {
  const probe = async (id: string, label: string, url: string) => {
    const started = Date.now();
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(4_000) });
      const latencyMs = Date.now() - started;
      return {
        id,
        label,
        status: res.status < 500 ? "healthy" : "degraded",
        latencyMs,
        detail: `HTTP ${res.status}`,
      };
    } catch (error) {
      return {
        id,
        label,
        status: "down",
        latencyMs: null,
        detail: error instanceof Error ? error.message : "unreachable",
      };
    }
  };
  const items = await Promise.all([
    probe("cliproxyapi", "Account pool · CLIProxyAPI", `${CLIPROXY_INTERNAL_URL}/v1/models`),
    probe("new-api", "Channel hub · New-API", `${NEW_API_INTERNAL_URL}/api/status`),
  ]);
  return { items, total: items.length, probedAt: now() };
}

// ---------------------------------------------------------------- accounts
export interface AccountRow extends Record<string, unknown> {
  id: string;
  provider: string;
  account: string;
  status: "healthy" | "expired" | "disabled" | "unknown";
  detail: string;
  lastUsed: string | null;
  requests: number | null;
}

export async function listAccounts(fetchImpl: typeof fetch = fetch): Promise<ResourceList> {
  const files = await cliProxyAuthFiles(fetchImpl);
  const items: AccountRow[] = files.map((f) => {
    const provider = f.provider ?? f.type ?? "unknown";
    const account = f.email ?? f.account ?? f.name ?? f.id ?? "—";
    let status: AccountRow["status"] = "unknown";
    if (f.disabled) status = "disabled";
    else if (
      f.unavailable ||
      (f.status ?? "").toLowerCase().includes("expire") ||
      (f.status ?? "").toLowerCase() === "error"
    )
      status = "expired";
    else if (
      (f.status ?? "").toLowerCase() === "ok" ||
      (f.status ?? "").toLowerCase() === "active" ||
      f.status === undefined
    )
      status = "healthy";
    return {
      id: f.id ?? f.name ?? account,
      provider,
      account,
      status,
      detail: f.status_message ?? f.status ?? "",
      lastUsed: f.last_refresh ?? f.updated_at ?? null,
      requests: typeof f.recent_requests === "number" ? f.recent_requests : null,
    };
  });
  return { items, total: items.length, probedAt: now() };
}

// ---------------------------------------------------------------- shelf
export async function listShelf(fetchImpl: typeof fetch = fetch): Promise<ResourceList> {
  const [served, sold] = await Promise.all([
    cliProxyModels(fetchImpl).catch(() => []),
    newApiShelf(fetchImpl),
  ]);
  const servedSet = new Set(served);
  const items = sold.map((id) => ({
    id,
    supply: servedSet.has(id) ? "account" : "key",
    status: "on-shelf",
  }));
  for (const id of served)
    if (!sold.includes(id)) items.push({ id, supply: "account", status: "pending-sync" });
  return { items, total: items.length, probedAt: now() };
}

// ---------------------------------------------------------------- channel.sync (plan → apply)
interface ChannelDiff {
  add: string[];
  remove: string[];
  served: string[];
  channelId: number | null;
}

async function computeChannelDiff(fetchImpl: typeof fetch): Promise<ChannelDiff> {
  const served = await cliProxyModels(fetchImpl);
  const session = await newApiLogin(fetchImpl);
  const channel = await newApiFindChannel(fetchImpl, session, CLIPROXY_CHANNEL_NAME);
  const listed = new Set(
    (channel?.models ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return {
    add: served.filter((m) => !listed.has(m)),
    remove: [...listed].filter((m) => !served.includes(m)),
    served,
    channelId: channel?.id ?? null,
  };
}

const plans = new Map<string, { diff: ChannelDiff; expiresAt: number }>();
const PLAN_TTL_MS = 10 * 60_000;

export async function planChannelSync(fetchImpl: typeof fetch = fetch): Promise<ActionPlan> {
  const diff = await computeChannelDiff(fetchImpl);
  const planId = randomUUID();
  const expiresAt = Date.now() + PLAN_TTL_MS;
  plans.set(planId, { diff, expiresAt });
  const summary =
    diff.add.length === 0 && diff.remove.length === 0
      ? `Channel ${CLIPROXY_CHANNEL_NAME} already lists all ${diff.served.length} served models.`
      : `${diff.channelId ? "Update" : "Create"} channel ${CLIPROXY_CHANNEL_NAME}: +${diff.add.length} −${diff.remove.length} models.`;
  return {
    planId,
    summary,
    diff: [
      ...diff.add.map((m) => ({ op: "add" as const, path: `channel.models.${m}`, to: m })),
      ...diff.remove.map((m) => ({ op: "remove" as const, path: `channel.models.${m}`, from: m })),
    ],
    affected: [{ resource: "channel", id: CLIPROXY_CHANNEL_NAME, label: "New-API channel" }],
    warnings:
      diff.served.length === 0 ? ["CLIProxyAPI serves no models — log an account in first."] : [],
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function applyChannelSync(
  planId: string,
  caller: StaffCaller,
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<ActionResult | { expired: true }> {
  const plan = plans.get(planId);
  if (!plan || plan.expiresAt < Date.now()) return { expired: true };
  plans.delete(planId);
  // Re-read at apply time: the plan is a review, not a snapshot to replay blindly.
  const diff = await computeChannelDiff(fetchImpl);
  if (diff.served.length === 0)
    throw new Error("CLIProxyAPI serves no models — nothing to publish.");
  const session = await newApiLogin(fetchImpl);
  const apiKey = process.env.CLIPROXY_API_KEY ?? "";
  const channel = {
    type: 1,
    name: CLIPROXY_CHANNEL_NAME,
    key: apiKey,
    base_url: CLIPROXY_INTERNAL_URL,
    models: diff.served.join(","),
    group: "default",
    status: 1,
    priority: 0,
    weight: 1,
    tag: "account-relay",
  };
  if (diff.channelId)
    await newApiAdmin(fetchImpl, session, "PUT", "/api/channel/", {
      ...channel,
      id: diff.channelId,
    });
  else await newApiAdmin(fetchImpl, session, "POST", "/api/channel/", channel);

  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.channel.sync",
    outcome: "success",
    resource: { type: "channel", id: CLIPROXY_CHANNEL_NAME },
    severity: "info",
    metadata: {
      auditId,
      planId,
      role: caller.role,
      add: diff.add,
      remove: diff.remove,
      models: diff.served.length,
    },
  });
  return {
    auditId,
    summary: `Channel ${CLIPROXY_CHANNEL_NAME} ${diff.channelId ? "updated" : "created"} with ${diff.served.length} models.`,
    result: { add: diff.add, remove: diff.remove, models: diff.served },
  };
}

// ---------------------------------------------------------------- signals
export async function readSignal(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SignalReading | null> {
  const probedAt = now();
  switch (id) {
    case "price.drift": {
      try {
        const drifted = await findPriceDrift();
        const raised = drifted.length > 0;
        return {
          id,
          status: raised ? "raised" : "ok",
          severity: "critical",
          probedAt,
          title: raised ? "Upstream costs more than we charge" : "Every price still covers cost",
          detail: raised
            ? `${drifted.length} published model(s) now cost more upstream than our price: ${drifted
                .map((d) => d.modelName)
                .join(", ")}. Take them off sale.`
            : "No published model has been overtaken by its upstream rate.",
          resource: "shelf",
          action: "price.unpublish_drifted",
          data: { drifted },
        };
      } catch (error) {
        return {
          id,
          status: "unknown",
          severity: "critical",
          probedAt,
          title: "Could not compare prices to upstream",
          detail: error instanceof Error ? error.message : "probe failed",
          resource: "shelf",
        };
      }
    }
    case "channel.drift": {
      try {
        const diff = await computeChannelDiff(fetchImpl);
        const raised = diff.add.length > 0 || diff.remove.length > 0;
        return {
          id,
          status: raised ? "raised" : "ok",
          severity: "warn",
          probedAt,
          title: raised ? "Channel out of sync" : "Channel in sync",
          detail: raised
            ? `CLIProxyAPI serves ${diff.served.length} models; the New-API channel is missing ${diff.add.length} and lists ${diff.remove.length} stale.`
            : `All ${diff.served.length} served models are on the shelf.`,
          resource: "shelf",
          action: "channel.sync",
          data: { add: diff.add, remove: diff.remove },
        };
      } catch (error) {
        return {
          id,
          status: "unknown",
          severity: "warn",
          probedAt,
          detail: error instanceof Error ? error.message : "probe failed",
        };
      }
    }
    case "account.expired": {
      try {
        const accounts = (await listAccounts(fetchImpl)).items as AccountRow[];
        const bad = accounts.filter((a) => a.status === "expired" || a.status === "disabled");
        return {
          id,
          status: bad.length ? "raised" : "ok",
          severity: "warn",
          probedAt,
          title: bad.length
            ? `${bad.length} account${bad.length > 1 ? "s" : ""} need re-login`
            : "All accounts healthy",
          detail:
            bad.map((a) => `${a.provider} · ${a.account}`).join(", ") ||
            `${accounts.length} accounts serving.`,
          resource: "account",
          data: { accounts: bad.map((a) => a.id) },
        };
      } catch (error) {
        return {
          id,
          status: "unknown",
          severity: "warn",
          probedAt,
          detail: error instanceof Error ? error.message : "probe failed",
        };
      }
    }
    case "engine.down": {
      const engines = (await listEngines(fetchImpl)).items as Array<{
        id: string;
        status: string;
        detail: string;
      }>;
      const down = engines.filter((e) => e.status !== "healthy");
      return {
        id,
        status: down.length ? "raised" : "ok",
        severity: "critical",
        probedAt,
        title: down.length
          ? `${down.map((e) => e.id).join(", ")} unreachable`
          : "Both engines reachable",
        detail: down.map((e) => `${e.id}: ${e.detail}`).join("; ") || undefined,
        resource: "engine",
      };
    }
    default:
      return null;
  }
}

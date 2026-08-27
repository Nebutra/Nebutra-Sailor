import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import pLimit from "p-limit";
import { env } from "@/lib/env";
import { loadAllServiceHistory, recordProbeHistory } from "./status-history";
import { listActiveIncidents, listIncidents, type StatusIncident } from "./status-incidents";
import { isStatusHistoryDurable } from "./status-store";

export type ServiceState = "operational" | "degraded" | "outage" | "unknown";

export interface ServiceProbe {
  id: string;
  name: string;
  description: string;
  url: string;
  state: ServiceState;
  statusCode: number | null;
  latencyMs: number | null;
  checkedAt: string;
  note: string;
  /** UTC date → worst state recorded that day (when history store is available). */
  history?: Record<string, ServiceState>;
}

export interface StatusSnapshot {
  checkedAt: string;
  overall: Exclude<ServiceState, "unknown">;
  services: ServiceProbe[];
  activeIncidents: StatusIncident[];
  /** All incidents for history feed (resolved + active). */
  incidents: StatusIncident[];
  historyDurable: boolean;
}

interface ServiceTarget {
  id: string;
  name: string;
  description: string;
  url: string;
  okStatuses?: number[];
}

const TIMEOUT_MS = 4500;
const STATUS_PROBE_CONCURRENCY = 2;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function withPath(base: string, path: string): string {
  return `${trimTrailingSlash(base)}${path}`;
}

function getServiceTargets(): ServiceTarget[] {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? getBrandOrigin("landing");

  return [
    {
      id: "landing",
      name: "Marketing site",
      description: "Public homepage, pricing, and product narrative.",
      url: siteUrl,
    },
    {
      id: "console",
      name: "Console",
      description: "Authenticated SaaS workspace and sign-in surface.",
      url: withPath(env.NEXT_PUBLIC_APP_URL, "/sign-in"),
    },
    {
      id: "api",
      name: "API gateway",
      description: "Public API edge and dependency health contract.",
      url: withPath(env.NEXT_PUBLIC_API_URL, "/system/status"),
    },
    {
      id: "docs",
      name: "Documentation",
      description: "Sailor docs and LLM-readable knowledge surface.",
      url: withPath(env.DOCS_ORIGIN_URL, "/llms.txt"),
    },
  ];
}

function classifyHttpStatus(statusCode: number): ServiceState {
  if (statusCode >= 200 && statusCode < 400) return "operational";
  if (statusCode >= 400 && statusCode < 500) return "outage";
  if (statusCode >= 500) return "degraded";
  return "unknown";
}

function normalizeApiState(payload: unknown, fallback: ServiceState): ServiceState {
  if (!payload || typeof payload !== "object" || !("status" in payload)) {
    return fallback;
  }

  const status = String((payload as { status: unknown }).status);
  if (status === "healthy") return "operational";
  if (status === "degraded") return "degraded";
  if (status === "unhealthy") return "outage";
  return fallback;
}

async function probeService(target: ServiceTarget): Promise<ServiceProbe> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(target.url, {
      cache: "no-store",
      headers: {
        accept: "application/json,text/plain,text/html;q=0.8,*/*;q=0.5",
        "user-agent": `${brand.name}-Status/1.0`,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latencyMs = Date.now() - startedAt;
    let state = classifyHttpStatus(response.status);
    let note = response.ok ? "Responding normally" : `HTTP ${response.status}`;

    if (target.id === "api" && response.headers.get("content-type")?.includes("json")) {
      try {
        const payload = await response.json();
        state = normalizeApiState(payload, state);
        if (payload && typeof payload === "object" && "status" in payload) {
          note = `API reports ${(payload as { status: string }).status}`;
        }
      } catch {
        note = "API responded, but status payload was not readable";
        state = state === "operational" ? "degraded" : state;
      }
    }

    return {
      ...target,
      state,
      statusCode: response.status,
      latencyMs,
      checkedAt,
      note,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return {
      ...target,
      state: isTimeout ? "degraded" : "outage",
      statusCode: null,
      latencyMs: Date.now() - startedAt,
      checkedAt,
      note: isTimeout ? "Timed out before the health deadline" : "No successful response",
    };
  }
}

function summarize(services: ServiceProbe[]): StatusSnapshot["overall"] {
  if (services.some((service) => service.state === "outage")) return "outage";
  if (services.some((service) => service.state === "degraded" || service.state === "unknown")) {
    return "degraded";
  }
  return "operational";
}

export async function getStatusSnapshot(): Promise<StatusSnapshot> {
  const limit = pLimit(STATUS_PROBE_CONCURRENCY);
  const probed = await Promise.all(
    getServiceTargets().map((target) => limit(() => probeService(target))),
  );

  // Fire-and-forget history write should not block the page, but we await so
  // today's cell is visible on the same request when storage is available.
  try {
    await recordProbeHistory(probed.map((s) => ({ id: s.id, state: s.state })));
  } catch {
    // History is best-effort — page still serves live probes.
  }

  let historyByService: Record<string, Record<string, ServiceState>> = {};
  try {
    historyByService = await loadAllServiceHistory(probed.map((s) => s.id));
  } catch {
    historyByService = {};
  }

  const services = probed.map((service) => ({
    ...service,
    history: historyByService[service.id] ?? {},
  }));

  let activeIncidents: StatusIncident[] = [];
  let incidents: StatusIncident[] = [];
  try {
    [activeIncidents, incidents] = await Promise.all([listActiveIncidents(), listIncidents()]);
  } catch {
    activeIncidents = [];
    incidents = [];
  }

  return {
    checkedAt: new Date().toISOString(),
    overall: summarize(services),
    services,
    activeIncidents,
    incidents,
    historyDurable: isStatusHistoryDurable(),
  };
}

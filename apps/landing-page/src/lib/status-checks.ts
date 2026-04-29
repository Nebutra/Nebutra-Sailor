import { env } from "@/lib/env";

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
}

export interface StatusSnapshot {
  checkedAt: string;
  overall: Exclude<ServiceState, "unknown">;
  services: ServiceProbe[];
}

interface ServiceTarget {
  id: string;
  name: string;
  description: string;
  url: string;
  okStatuses?: number[];
}

const TIMEOUT_MS = 4500;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function withPath(base: string, path: string): string {
  return `${trimTrailingSlash(base)}${path}`;
}

function getServiceTargets(): ServiceTarget[] {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com";

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(target.url, {
      cache: "no-store",
      headers: {
        accept: "application/json,text/plain,text/html;q=0.8,*/*;q=0.5",
        "user-agent": "Nebutra-Status/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
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
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      ...target,
      state: isAbort ? "degraded" : "outage",
      statusCode: null,
      latencyMs: Date.now() - startedAt,
      checkedAt,
      note: isAbort ? "Timed out before the health deadline" : "No successful response",
    };
  } finally {
    clearTimeout(timeout);
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
  const services = await Promise.all(getServiceTargets().map((target) => probeService(target)));
  return {
    checkedAt: new Date().toISOString(),
    overall: summarize(services),
    services,
  };
}

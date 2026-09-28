import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import {
  buildStatusSnapshot,
  type ServiceTarget,
  type StatusSnapshot,
  sendAlerts,
} from "@nebutra/status";
import { env } from "@/lib/env";

export type { ServiceProbe, ServiceState, StatusSnapshot } from "@nebutra/status";

const STATUS_PROBE_CONCURRENCY = 2;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function withPath(base: string, path: string): string {
  return `${trimTrailingSlash(base)}${path}`;
}

/** Nebutra's public surfaces. The engine is @nebutra/status; this is only the list. */
export function getServiceTargets(): ServiceTarget[] {
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
      // /misc/ready, not /system/status: the status route answers 200
      // "degraded" while the rate-limit store is down, which is what let the
      // 2026-09-02 outage sit behind a green status page for two days. The
      // readiness probe goes through the same Redis client the rate limiter
      // uses and answers 503 the moment that path breaks.
      id: "api",
      name: "API gateway",
      description: "Public API edge and request-path readiness (database, rate-limit store).",
      url: withPath(env.NEXT_PUBLIC_API_URL, "/misc/ready"),
      readiness: true,
    },
    {
      id: "docs",
      name: "Documentation",
      description: "Product documentation and LLM-readable knowledge surface.",
      url: withPath(env.DOCS_ORIGIN_URL, "/llms.txt"),
    },
  ];
}

export function getStatusSnapshot(): Promise<StatusSnapshot> {
  return buildStatusSnapshot(getServiceTargets(), {
    userAgent: `${brand.name}-Status/1.0`,
    concurrency: STATUS_PROBE_CONCURRENCY,
    onStateChange: async (changes) => {
      const { statusMailContext } = await import("./status-mail");
      await sendAlerts(statusMailContext(), changes);
    },
  });
}

/** Where incident links and chat cards point. */
export function statusOrigin(): string {
  return process.env.STATUS_PUBLIC_ORIGIN ?? `https://${brand.domains.status}`;
}

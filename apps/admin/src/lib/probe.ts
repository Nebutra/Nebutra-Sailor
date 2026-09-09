import "server-only";

import { brand } from "@nebutra/brand/metadata";
import type { AdminStatus } from "@nebutra/contracts/admin";
import { buildFleet, type FleetRow } from "./fleet";

/**
 * Live Fleet: probe every service that declares a health endpoint. A row
 * without one is `unknown` with the reason spelled out — never green.
 */
export interface ProbedFleetRow extends FleetRow {
  health: string | null;
  status: AdminStatus;
  latencyMs: number | null;
  version: string | null;
  detail: string;
  probedAt: string | null;
}

const TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 30_000;
let cache: { rows: ProbedFleetRow[]; expiresAt: number } | null = null;

export function healthUrl(row: FleetRow): string | null {
  if (!row.health || !row.domainKey) return null;
  const override = process.env[`ADMIN_MANIFEST_ORIGIN_${row.domainKey.toUpperCase()}`]?.trim();
  return `${override || `https://${brand.domains[row.domainKey]}`}${row.health}`;
}

export async function probeFleet(
  fetchImpl: typeof fetch = fetch,
  force = false,
): Promise<ProbedFleetRow[]> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.rows;
  const rows = await Promise.all(buildFleet().map((row) => probeRow(row, fetchImpl)));
  cache = { rows, expiresAt: Date.now() + CACHE_TTL_MS };
  return rows;
}

async function probeRow(row: FleetRow, fetchImpl: typeof fetch): Promise<ProbedFleetRow> {
  const url = healthUrl(row);
  const base = { ...row, latencyMs: null, version: null, probedAt: null };
  if (!url) {
    return {
      ...base,
      status: "unknown",
      detail: row.health === null ? "no health endpoint" : "no public host",
    };
  }
  const started = Date.now();
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    const latencyMs = Date.now() - started;
    const body = (await res.json().catch(() => ({}))) as { status?: string; version?: string };
    const probedAt = new Date().toISOString();
    if (res.status >= 500 || body.status === "unhealthy") {
      return {
        ...base,
        status: "down",
        latencyMs,
        version: body.version ?? null,
        detail: `HTTP ${res.status}`,
        probedAt,
      };
    }
    if (body.status === "degraded") {
      return {
        ...base,
        status: "degraded",
        latencyMs,
        version: body.version ?? null,
        detail: "degraded",
        probedAt,
      };
    }
    if (res.ok) {
      return {
        ...base,
        status: "healthy",
        latencyMs,
        version: body.version ?? null,
        detail: `HTTP ${res.status}`,
        probedAt,
      };
    }
    return {
      ...base,
      status: "unknown",
      latencyMs,
      version: null,
      detail: `HTTP ${res.status}`,
      probedAt,
    };
  } catch (error) {
    return {
      ...base,
      status: "down",
      detail: error instanceof Error ? error.message : "unreachable",
      probedAt: new Date().toISOString(),
    };
  }
}

export function _resetProbeCache(): void {
  cache = null;
}

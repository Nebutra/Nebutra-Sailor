/**
 * CDN-fronted mirror of the signed Tauri updater manifest.
 *
 * Prefer a live GitHub fetch when the origin can reach github.com; otherwise
 * serve the last-known-good snapshot so clients behind GitHub outages still
 * get a valid signed latest.json (minisign verification unchanged).
 *
 * Snapshot sources (in order after live miss):
 * 1. public/updater/latest.json on disk (refreshable without rebuild)
 * 2. bundled src/lib/updater-latest.fallback.json (always present in the build)
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brand } from "@nebutra/brand/metadata";
import fallbackManifest from "@/lib/updater-latest.fallback.json";

const UPSTREAM = "https://github.com/nebutra/pebble/releases/latest/download/latest.json";
const UPSTREAM_TIMEOUT_MS = 8_000;

export const revalidate = 300;
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
} as const;

function isValidManifest(body: string): boolean {
  return body.includes('"version"') && body.includes('"platforms"');
}

function okJson(body: string, cacheControl: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      ...CORS,
    },
  });
}

async function readDiskFallback(): Promise<string | null> {
  const candidates = [
    join(process.cwd(), "public/updater/latest.json"),
    join(process.cwd(), "apps/pebble/public/updater/latest.json"),
  ];
  for (const filePath of candidates) {
    try {
      const body = await readFile(filePath, "utf8");
      if (isValidManifest(body)) {
        return body;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

function bundledFallback(): string {
  return JSON.stringify(fallbackManifest);
}

async function fetchUpstream(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        Accept: "application/json",
        "User-Agent": `${brand.domains.pebble}-updater-mirror/1.1`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!upstream.ok) {
      return null;
    }
    const body = await upstream.text();
    return isValidManifest(body) ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const live = await fetchUpstream();
  if (live) {
    return okJson(live, "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  }

  const disk = await readDiskFallback();
  if (disk) {
    return okJson(
      disk,
      // Why: stale snapshot — cache briefly so deploys can refresh quickly.
      "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    );
  }

  const bundled = bundledFallback();
  if (isValidManifest(bundled)) {
    return okJson(bundled, "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  }

  return Response.json(
    { error: "updater_manifest_unavailable" },
    {
      status: 503,
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=15",
        ...CORS,
      },
    },
  );
}

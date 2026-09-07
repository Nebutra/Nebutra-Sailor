import { getAuthCenterOrigin } from "@nebutra/auth";
import { getSystemDb, getTenantDb } from "@nebutra/db";
import { isDbConfigured } from "@/lib/db";
import { DEFAULT_IMAGE2_BASE_URL, isImage2Configured } from "@/lib/image2";
import { isR2Configured } from "@/lib/resources";

export const runtime = "nodejs";

/** A cross-region round trip that hangs must not hang health with it. */
const PROBE_TIMEOUT_MS = 5_000;

type Probe = { ok: true; ms: number } | { ok: false; ms: number; reason: string };

async function probe(run: () => Promise<unknown>): Promise<Probe> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS);
      }),
    ]);
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    // The role probe's message names the role, which is config, not a secret.
    // Nothing else that can land here carries a credential.
    const reason = error instanceof Error ? error.message.slice(0, 200) : "unknown";
    return { ok: false, ms: Date.now() - started, reason };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * The database section answers the two questions the P1 work depends on and
 * nothing in the repo could answer before this app had a connection:
 *
 * - `reachable` / `ms` — can Fly `sin` reach PlanetScale, and what does the
 *   round trip cost. This is the cross-region latency measured, not guessed.
 * - `role` — is `app_user` assumable on this connection. `getTenantDb` probes
 *   it on first use and refuses tenant queries if not; better to learn that
 *   here than on someone's first shoot.
 *
 * The tenant id passed to the role probe is a label for `set_config`, not a
 * row — nothing is created.
 */
async function databaseHealth() {
  if (!isDbConfigured()) {
    return { provider: "planetscale", configured: false as const };
  }

  const reachable = await probe(() => getSystemDb().$queryRaw`SELECT 1`);
  const role = reachable.ok
    ? await probe(() => getTenantDb("health-probe").$queryRaw`SELECT 1`)
    : { ok: false as const, ms: 0, reason: "skipped: unreachable" };

  return {
    provider: "planetscale",
    configured: true as const,
    reachable,
    role: { name: process.env.APP_DB_ROLE ?? null, ...role },
  };
}

export async function GET() {
  const database = await databaseHealth();

  return Response.json(
    {
      service: "kuanlan",
      status: "ok",
      storage: {
        provider: "r2",
        configured: isR2Configured(),
      },
      database,
      consume: {
        provider: "router",
        model: process.env.IMAGE2_MODEL || "gpt-image-2",
        base: process.env.IMAGE2_BASE_URL || DEFAULT_IMAGE2_BASE_URL,
        configured: isImage2Configured(),
      },
      auth: {
        center: getAuthCenterOrigin(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

import { getSystemDb } from "@nebutra/db";
import { getOIDCRedis } from "@/lib/oidc";
import { getIdpRuntimeConfig } from "@/lib/oidc-config";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "error";

async function check(
  name: string,
  run: () => Promise<unknown>,
): Promise<{ name: string; status: CheckStatus; error?: string }> {
  try {
    await run();
    return { name, status: "ok" };
  } catch (error) {
    return {
      name,
      status: "error",
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

export async function GET() {
  const checks = await Promise.all([
    check("config", async () => getIdpRuntimeConfig()),
    check("postgres", async () => {
      // AUDIT(no-tenant): Readiness checks database connectivity outside any request tenant.
      await getSystemDb().$queryRaw`SELECT 1`;
    }),
    check("redis", async () => getOIDCRedis().ping()),
  ]);

  const ready = checks.every((item) => item.status === "ok");

  return Response.json(
    {
      service: "nebutra-idp",
      status: ready ? "ready" : "not_ready",
      checks,
    },
    { status: ready ? 200 : 503 },
  );
}

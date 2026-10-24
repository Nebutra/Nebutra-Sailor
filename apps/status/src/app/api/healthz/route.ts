/** Liveness with a database ping: 200 when Postgres answers, 503 otherwise. */
import { getDb } from "@/server/db";
import { json } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  try {
    await getDb().$queryRaw`SELECT 1`;
    return json({ ok: true, database: { ok: true, latencyMs: Date.now() - started } });
  } catch {
    return json({ ok: false, database: { ok: false } }, { status: 503 });
  }
}

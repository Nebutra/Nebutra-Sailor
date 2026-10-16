/**
 * Readiness: the database answers and its migrations are applied, so the
 * instance can serve pages. A load balancer sends traffic only on 200.
 */
import { getDb } from "@/server/db";
import { json } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    const pages = await db.page.count();
    return json({ ready: true, pages });
  } catch {
    return json({ ready: false }, { status: 503 });
  }
}

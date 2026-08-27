import { z } from "zod";

/**
 * IndexNow ping endpoint (G4).
 * POST { "urlList": ["https://…"] } with header or body key.
 * Requires INDEXNOW_KEY env. Dry-run when key missing (200 + skipped).
 */

const bodySchema = z.object({
  urlList: z.array(z.string().url()).min(1).max(100),
  host: z.string().optional(),
});

export async function POST(req: Request) {
  const key = process.env.INDEXNOW_KEY;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!key) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "INDEXNOW_KEY not configured — dry run",
      count: parsed.data.urlList.length,
    });
  }

  const host =
    parsed.data.host ?? process.env.INDEXNOW_HOST ?? new URL(parsed.data.urlList[0]!).host;

  const payload = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: parsed.data.urlList,
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return Response.json({
      ok: res.ok,
      status: res.status,
      count: parsed.data.urlList.length,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "indexnow_failed" },
      { status: 502 },
    );
  }
}

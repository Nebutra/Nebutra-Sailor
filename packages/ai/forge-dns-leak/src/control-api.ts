/**
 * Localhost control plane for Forge: create/read leak sessions.
 * Bind 127.0.0.1 only in production — never expose publicly without auth.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { SessionStore } from "./sessions.ts";

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

export async function startControlApi(
  store: SessionStore,
  opts: { host?: string; port?: number; nsHostname: string; dnsPort: number },
): Promise<Server> {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 3953;

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        send(res, 200, {
          ok: true,
          zone: store.zoneName,
          nsHostname: opts.nsHostname,
          dnsPort: opts.dnsPort,
          answerIp: store.answer,
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/sessions") {
        const body = (await readJson(req)) as { probeCount?: number; ttlSec?: number };
        const session = store.create({
          ...(typeof body.probeCount === "number" ? { probeCount: body.probeCount } : {}),
          ...(typeof body.ttlSec === "number" ? { ttlSec: body.ttlSec } : {}),
        });
        send(res, 201, {
          ...session,
          nsHostname: opts.nsHostname,
          dnsPort: opts.dnsPort,
          triggerHint:
            "Resolve probeNames via the browser's system DNS (Image/link prefetch), not DoH.",
        });
        return;
      }
      const m = url.pathname.match(/^\/sessions\/([a-f0-9]+)$/i);
      if (req.method === "GET" && m?.[1]) {
        const session = store.get(m[1]);
        if (!session) {
          send(res, 404, { ok: false, code: "not_found" });
          return;
        }
        send(res, 200, session);
        return;
      }
      send(res, 404, { ok: false, code: "not_found" });
    } catch (err) {
      send(res, 500, {
        ok: false,
        code: "internal",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  return server;
}

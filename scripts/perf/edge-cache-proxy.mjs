#!/usr/bin/env node
/**
 * A local stand-in for Cloudflare in front of apps/landing, for measuring the edge cache before
 * merge (a production build behind it behaves like the deployed site behind the zone).
 *
 *   node scripts/perf/edge-cache-proxy.mjs --origin http://127.0.0.1:3100 --group nebutra \
 *     [--port 8787] [--origin-latency 400] [--no-cache]
 *
 * It applies the same rules the deploy writes (infra/iac/cloudflare/edge-cache/landing.json via
 * infra/ops/scripts/apply-landing-edge-cache.sh): the group's host is eligible, the bypass list is
 * never cached, and otherwise the origin decides — Cloudflare-CDN-Cache-Control first, then
 * CDN-Cache-Control, then Cache-Control (s-maxage, max-age); private/no-store/no-cache, max-age=0
 * and any Set-Cookie mean no store. Answers carry `cf-cache-status` (HIT, MISS, EXPIRED, STALE/UPDATING, BYPASS,
 * DYNAMIC) and `age`, so infra/ops/scripts/verify-landing-edge-cache.sh runs against it unchanged.
 *
 * --origin-latency adds a delay to every origin fetch (the deployed origin is one Fly Machine in
 * Singapore); --no-cache passes everything through with that delay, the "before" baseline.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const origin = new URL(opt("--origin", "http://127.0.0.1:3100"));
const port = Number(opt("--port", "8787"));
const latency = Number(opt("--origin-latency", "0"));
const passthrough = args.includes("--no-cache");
const config = JSON.parse(
  fs.readFileSync(
    opt("--config", path.join(root, "infra/iac/cloudflare/edge-cache/landing.json")),
    "utf8",
  ),
);
const group = config.groups[opt("--group", "nebutra")];
if (!group) throw new Error(`unknown --group; known: ${Object.keys(config.groups).join(", ")}`);

function bypassed(req, pathname) {
  const b = config.bypass;
  if (b.pathPrefixes.some((p) => pathname.startsWith(p))) return true;
  if (b.paths.includes(pathname)) return true;
  return b.requestHeaders.some((h) => req.headers[h] !== undefined);
}

/** Edge TTL in seconds the origin allows, plus its stale windows; null when it may not be stored. */
function edgePolicy(headers) {
  if (headers["set-cookie"]) return null;
  const raw =
    headers["cloudflare-cdn-cache-control"] ??
    headers["cdn-cache-control"] ??
    headers["cache-control"];
  if (!raw) return null;
  const d = Object.fromEntries(
    String(raw)
      .split(",")
      .map((part) => part.trim().toLowerCase().split("="))
      .map(([k, v]) => [k, v === undefined ? true : Number(v)]),
  );
  if (d["no-store"] || d.private || d["no-cache"]) return null;
  const ttl = d["s-maxage"] ?? d["max-age"];
  if (!(ttl > 0)) return null;
  return { ttl, swr: d["stale-while-revalidate"] || 0, sie: d["stale-if-error"] || 0 };
}

const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One origin round trip; `req` is the incoming request (its body is piped) or a plain GET. */
async function fetchOrigin(req) {
  if (latency) await sleep(latency);
  const headers = {
    ...req.headers,
    host: req.headers.host ?? origin.host,
    "accept-encoding": "gzip",
  };
  return new Promise((resolve, reject) => {
    const up = http.request(
      { hostname: origin.hostname, port: origin.port, path: req.url, method: req.method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
            at: Date.now(),
          }),
        );
        res.on("error", reject);
      },
    );
    up.on("error", reject);
    if (typeof req.pipe === "function") req.pipe(up);
    else up.end();
  });
}

function send(req, res, entry, status) {
  const headers = { ...entry.headers };
  delete headers["cloudflare-cdn-cache-control"];
  delete headers["transfer-encoding"];
  delete headers.connection;
  let body = entry.body;
  if (
    headers["content-encoding"] === "gzip" &&
    !/gzip/.test(req.headers["accept-encoding"] ?? "")
  ) {
    body = zlib.gunzipSync(body);
    delete headers["content-encoding"];
  }
  headers["content-length"] = String(body.length);
  headers["cf-cache-status"] = status;
  if (status === "HIT" || status === "STALE" || status === "UPDATING") {
    headers.age = String(Math.floor((Date.now() - entry.at) / 1000));
  }
  res.writeHead(entry.status, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://edge.local");
    const pathname = url.pathname;
    try {
      const readable = req.method === "GET" || req.method === "HEAD";
      const bypass = bypassed(req, pathname);
      if (passthrough || !readable || bypass) {
        return send(
          req,
          res,
          await fetchOrigin(req),
          bypass && !passthrough ? "BYPASS" : "DYNAMIC",
        );
      }
      const key = `${url.pathname}${url.search}`;
      const hit = cache.get(key);
      if (hit) {
        const age = (Date.now() - hit.at) / 1000;
        if (age < hit.policy.ttl) return send(req, res, hit, "HIT");
        if (age < hit.policy.ttl + hit.policy.swr) {
          // Serve the stale copy and refresh it behind the visitor (stale-while-revalidate).
          if (!hit.refreshing) {
            hit.refreshing = true;
            fetchOrigin({ method: "GET", url: req.url, headers: req.headers })
              .then((r) => {
                const policy = r.status === 200 ? edgePolicy(r.headers) : null;
                if (policy) cache.set(key, { ...r, policy });
                else cache.delete(key);
              })
              .catch(() => {
                hit.refreshing = false;
              });
          }
          return send(req, res, hit, "UPDATING");
        }
      }
      const r = await fetchOrigin(req);
      // The group's host is eligible (the public rule); the origin decides what is stored.
      const policy = r.status === 200 ? edgePolicy(r.headers) : null;
      if (policy) {
        cache.set(key, { ...r, policy });
        return send(req, res, r, hit ? "EXPIRED" : "MISS");
      }
      cache.delete(key);
      return send(req, res, r, edgeDirective(r.headers) ? "BYPASS" : "DYNAMIC");
    } catch (error) {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end(`edge proxy: ${error.message}`);
    }
  })
  .listen(port, "127.0.0.1", () => {
    console.log(
      `edge proxy on http://127.0.0.1:${port} → ${origin.origin} (${group.hosts.join(", ")}; ` +
        `${passthrough ? "no cache" : "edge cache on"}; origin latency ${latency} ms)`,
    );
  });

/** Whether the origin said anything about caching at all (BYPASS vs DYNAMIC, as Cloudflare reports). */
function edgeDirective(headers) {
  return Boolean(
    headers["cloudflare-cdn-cache-control"] ??
      headers["cdn-cache-control"] ??
      headers["cache-control"],
  );
}

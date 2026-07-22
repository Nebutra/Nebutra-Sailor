#!/usr/bin/env node
/**
 * Preflight checks for web/auth Vercel cutover — no DNS mutation.
 *
 * Verifies:
 *  1. apps/web + apps/auth vercel.json env defaults match auth-center topology
 *  2. Production origins still answer expected health/sign-in probes (ECS today)
 *  3. Local .vercel/project.json exists (project is linked)
 *
 * Usage: node scripts/preflight-web-auth-vercel.mjs
 * Exit 0 = ready for a human DNS cutover decision; non-zero = blockers.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
const notes = [];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function must(cond, msg) {
  if (!cond) failures.push(msg);
}

// ── vercel.json env defaults ──────────────────────────────────────────────
const webEnv = readJson("apps/web/vercel.json").env || {};
const authEnv = readJson("apps/auth/vercel.json").env || {};

must(webEnv.BETTER_AUTH_URL === "https://auth.nebutra.com", "web vercel.json BETTER_AUTH_URL");
must(
  webEnv.NEXT_PUBLIC_AUTH_URL === "https://auth.nebutra.com",
  "web vercel.json NEXT_PUBLIC_AUTH_URL",
);
must(authEnv.BETTER_AUTH_URL === "https://auth.nebutra.com", "auth vercel.json BETTER_AUTH_URL");
must(
  authEnv.NEXT_PUBLIC_AUTH_URL === "https://auth.nebutra.com",
  "auth vercel.json NEXT_PUBLIC_AUTH_URL",
);
must(authEnv.AUTH_COOKIE_DOMAIN === ".nebutra.com", "auth vercel.json AUTH_COOKIE_DOMAIN");
must(
  webEnv.NEXT_PUBLIC_APP_URL === "https://app.nebutra.com",
  "web vercel.json NEXT_PUBLIC_APP_URL",
);

// ── linked projects ───────────────────────────────────────────────────────
for (const rel of ["apps/web/.vercel/project.json", "apps/auth/.vercel/project.json"]) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    failures.push(`missing ${rel} — run vercel link in that app`);
  } else {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    notes.push(`${rel}: projectId=${j.projectId || j.projectName || "set"}`);
  }
}

// ── live origin probes (current ECS production) ───────────────────────────
async function probe(name, url, expect) {
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const ok = expect(res);
    if (!ok) failures.push(`${name}: unexpected ${res.status} for ${url}`);
    else notes.push(`${name}: ${res.status} OK`);
  } catch (e) {
    failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

await probe("api health", "https://api.nebutra.com/api/misc/health", (r) => r.status === 200);
await probe("auth health", "https://auth.nebutra.com/health", (r) => r.status === 200);
await probe("app sign-in", "https://app.nebutra.com/sign-in", (r) => {
  if (r.status !== 307 && r.status !== 302) return false;
  const loc = r.headers.get("location") || "";
  return loc.includes("auth.nebutra.com");
});
await probe("docs", "https://docs.nebutra.com/", (r) => r.status === 200 || r.status === 307);

// ── report ────────────────────────────────────────────────────────────────
for (const n of notes) console.log("ok ", n);
if (failures.length) {
  console.error("\npreflight FAILED:");
  for (const f of failures) console.error("  -", f);
  process.exit(1);
}
console.log("\npreflight OK — ECS origins healthy; vercel.json topology correct.");
console.log(
  "Next human step: green Vercel deploys for web/auth, then DNS flip per docs/ops/web-auth-vercel-cutover.md",
);

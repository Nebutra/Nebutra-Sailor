#!/usr/bin/env node
/**
 * Fire Vercel deploy hooks for nebutra-web + nebutra-auth (main).
 *
 * Free-tier safe: does not create API deployments when hooks are missing;
 * uses project deploy hooks only. Safe to re-run after Hobby daily quota resets.
 *
 * Env:
 *   VERCEL_TOKEN          — required (or auth.json from `vercel login`)
 *   VERCEL_TEAM_ID        — default team_c6eOa4ByLijc29qSjIsdCjCb (nebutra)
 *   VERCEL_WEB_HOOK_URL   — optional override
 *   VERCEL_AUTH_HOOK_URL  — optional override
 *
 * Usage: node scripts/redeploy-web-auth-vercel.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEAM = process.env.VERCEL_TEAM_ID || "team_c6eOa4ByLijc29qSjIsdCjCb";
const WEB_PID = "prj_Oc2SQdY8qoApixVj6wITMFAUilLE";
const AUTH_PID = "prj_IjLJxn4JA9xLxCMYTXkk3UYkzuLG";

function loadToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const authPath = path.join(os.homedir(), "Library/Application Support/com.vercel.cli/auth.json");
  if (fs.existsSync(authPath)) {
    const j = JSON.parse(fs.readFileSync(authPath, "utf8"));
    if (j.token) return j.token;
  }
  throw new Error("Set VERCEL_TOKEN or run vercel login");
}

async function api(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || text.slice(0, 200);
    const err = new Error(`${res.status} ${msg}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function ensureHook(token, projectId, name = "manual-main") {
  const project = await api(
    token,
    `https://api.vercel.com/v9/projects/${projectId}?teamId=${TEAM}`,
  );
  const hooks = project?.link?.deployHooks || [];
  const existing = hooks.find((h) => h.name === name) || hooks[hooks.length - 1];
  if (existing?.url) return existing.url;

  const updated = await api(
    token,
    `https://api.vercel.com/v1/projects/${projectId}/deploy-hooks?teamId=${TEAM}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ref: "main" }),
    },
  );
  const next = updated?.link?.deployHooks || [];
  const created = next.find((h) => h.name === name) || next[next.length - 1];
  if (!created?.url) throw new Error(`could not create deploy hook for ${projectId}`);
  return created.url;
}

async function fireHook(label, url) {
  const res = await fetch(url, { method: "POST" });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    console.error(`fail ${label}: ${res.status}`, body?.error?.message || text.slice(0, 200));
    if (
      String(body?.error?.code || body?.error?.message || "").includes(
        "api-deployments-free-per-day",
      )
    ) {
      console.error(
        "→ Hobby daily deploy quota exhausted. Retry after reset (~24h). ECS production is unaffected.",
      );
    }
    return false;
  }
  console.log(`ok   ${label}: job=${body?.job?.id || "?"} state=${body?.job?.state || "PENDING"}`);
  return true;
}

async function latestState(token, projectId, label) {
  const data = await api(
    token,
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${TEAM}&limit=1`,
  );
  const d = (data.deployments || [])[0];
  if (!d) {
    console.log(`info ${label}: no deployments`);
    return;
  }
  const sha = (d.meta?.githubCommitSha || "").slice(0, 8);
  console.log(`info ${label}: latest ${d.readyState} sha=${sha || "?"} ${d.uid}`);
}

const token = loadToken();
const webHook = process.env.VERCEL_WEB_HOOK_URL || (await ensureHook(token, WEB_PID));
const authHook = process.env.VERCEL_AUTH_HOOK_URL || (await ensureHook(token, AUTH_PID));

console.log("Firing production deploy hooks (main)…");
const webOk = await fireHook("nebutra-web", webHook);
const authOk = await fireHook("nebutra-auth", authHook);

await latestState(token, WEB_PID, "nebutra-web");
await latestState(token, AUTH_PID, "nebutra-auth");

if (!webOk || !authOk) process.exit(1);
console.log("\nHooks accepted. Poll dashboard or re-run this script later to check READY.");
console.log("DNS stays on ECS until both are green — see docs/ops/web-auth-vercel-cutover.md");

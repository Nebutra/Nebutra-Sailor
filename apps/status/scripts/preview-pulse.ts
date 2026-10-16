/**
 * Keeps a local preview looking like a live instance: every 30 s it pushes
 * fresh evidence for the demo page's components through the same
 * pushEvidence path real callers use — mostly operational, one degraded.
 * Preview only; it invents readings. Never point it at a real instance.
 *
 *   STATUS_DATABASE_URL=postgres://… npx tsx --tsconfig tsconfig.json scripts/seed-demo.ts
 *   STATUS_DATABASE_URL=postgres://… npx tsx --tsconfig tsconfig.json scripts/preview-pulse.ts
 *
 * `console` gets no pulse on purpose, so its seeded synthetic reading ages
 * out and the "awaiting fresh data" treatment stays visible.
 * Built-in monitors are not used: Node's fetch ignores the HTTP proxy here.
 */
import { getDb } from "@/server/db";
import { type EvidenceInput, pushEvidence } from "@/server/evidence";

const SLUG = process.env.PREVIEW_PAGE ?? "demo";
const INTERVAL_MS = 30_000;

type Reading = Omit<EvidenceInput, "checkedAt">;

function jitter(base: number): number {
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

function readings(): Reading[] {
  return [
    {
      component: "website",
      source: "http-home",
      coverage: "dependency",
      state: "operational",
      freshnessSeconds: 120,
      latencyMs: jitter(140),
    },
    {
      component: "login",
      source: "journey-login",
      coverage: "synthetic",
      state: "operational",
      freshnessSeconds: 300,
      latencyMs: jitter(820),
    },
    {
      component: "login",
      source: "http-auth",
      coverage: "dependency",
      state: "operational",
      freshnessSeconds: 120,
      latencyMs: jitter(95),
    },
    {
      component: "api",
      source: "http-api",
      coverage: "dependency",
      state: "degraded",
      freshnessSeconds: 120,
      latencyMs: jitter(2100),
      note: "p95 above 2s",
    },
    {
      component: "chat",
      source: "upstream-deepseek",
      coverage: "upstream",
      state: "operational",
      freshnessSeconds: 300,
    },
    {
      component: "images",
      source: "journey-images",
      coverage: "synthetic",
      state: "operational",
      freshnessSeconds: 300,
      latencyMs: jitter(3400),
    },
    {
      component: "cn-edge",
      source: "http-cn",
      coverage: "dependency",
      state: "operational",
      freshnessSeconds: 120,
      latencyMs: jitter(60),
    },
    {
      component: "global-edge",
      source: "http-global",
      coverage: "dependency",
      state: "operational",
      freshnessSeconds: 120,
      latencyMs: jitter(90),
    },
  ];
}

async function tick(pageId: string) {
  const db = getDb();
  const now = new Date();
  let pushed = 0;
  for (const r of readings()) {
    const result = await pushEvidence(db, pageId, { ...r, checkedAt: now.toISOString() }, now);
    if (!("error" in result)) pushed += 1;
  }
  process.stdout.write(`${now.toISOString()} pushed ${pushed} readings\n`);
}

async function main() {
  if (process.env.STATUS_DATABASE_URL?.includes("prod"))
    throw new Error("refusing: looks like prod");
  const page = await getDb().page.findUniqueOrThrow({
    where: { slug: SLUG },
    select: { id: true },
  });
  await tick(page.id);
  setInterval(() => {
    tick(page.id).catch((error) => process.stderr.write(`${String(error)}\n`));
  }, INTERVAL_MS);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});

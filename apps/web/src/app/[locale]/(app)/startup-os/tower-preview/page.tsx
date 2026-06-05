"use client";

import { useMemo } from "react";
import { CompanyTower } from "@/components/startup-os/company-tower";
import type { CompanyContext } from "@/lib/startup-os/company-context/model";
import {
  createEmptyContext,
  InMemoryCompanyContextRepository,
} from "@/lib/startup-os/company-context/repository";

/**
 * Tower preview — a screenshot/dev harness for <CompanyTower>. Builds a SAMPLE
 * nine-layer company context in memory (keyless repository, fixed `now`) with
 * varied completeness across L1 / L4 / L5 / L8 / L9, then renders the tower in a
 * dense left-aligned container. This is an internal preview surface — no feature
 * flag, no network, deterministic seed data.
 */

const PROJECT_ID = "preview-project";
const NOW = "2026-06-05T00:00:00.000Z";

/** Seed a representative, partially-filled tower for the preview. */
function buildSampleContext(): CompanyContext {
  const repo = new InMemoryCompanyContextRepository();
  repo.save(createEmptyContext(PROJECT_ID, "seed", NOW));

  const upsert = (
    layerId: Parameters<InMemoryCompanyContextRepository["upsertField"]>[1],
    fieldKey: string,
    value: unknown,
    provenance: "user" | "ai" | "document" | "agent",
  ) => {
    repo.upsertField(PROJECT_ID, layerId, fieldKey, value, { provenance, now: NOW });
  };

  // L1 本质 — essence (fully filled: mission required + the rest).
  upsert("L1", "mission", "Compile a company from a single proposition.", "user");
  upsert("L1", "why", "Founders should reason about strategy, not boilerplate.", "user");
  upsert("L1", "technical_belief", "AI-native context beats hand-maintained docs.", "ai");

  // L4 战略 — strategy (partial).
  upsert(
    "L4",
    "positioning",
    { for: "early founders", category: "Startup OS", unlike: "doc wikis" },
    "ai",
  );
  upsert("L4", "category", "Startup operating system", "user");
  upsert("L4", "moat", "Compounding company context across the nine layers.", "ai");

  // L5 产品 — product (partial; required jtbd left empty to show partial state).
  upsert(
    "L5",
    "value_proposition",
    "Turn a proposition into a living, compilable company.",
    "user",
  );

  // L8 身份 — identity / brand kit (partial: name + a couple of assets).
  upsert("L8", "name", "Nebutra", "user");
  upsert("L8", "tone", ["precise", "calm", "ambitious"], "ai");
  upsert("L8", "design_guide", "Geist density, monochrome + one blue accent.", "document");

  // L9 执行 — execution / control deck (OKR + roadmap + bets + live runs).
  upsert(
    "L9",
    "okrs",
    {
      objective: "Reach product-market fit signal with design partners.",
      key_results: [
        { label: "Design partners onboarded", value: 6, target: 10 },
        { label: "Weekly active companies", value: 18, target: 25 },
        { label: "Compile success rate", value: 82, target: 95 },
      ],
    },
    "agent",
  );
  upsert(
    "L9",
    "roadmap",
    {
      now: ["Tower compile v1", "Brand kit import"],
      next: ["Live runs panel", "Multi-tenant context"],
      later: ["Marketplace of layers"],
    },
    "user",
  );
  upsert("L9", "nsm", "Companies compiled per week", "user");
  upsert("L9", "bets", ["Context > prompts", "Founder-OS identity"], "ai");
  upsert(
    "L9",
    "live_runs",
    [
      { id: "run_8f21a", stage: "compile", status: "success" },
      { id: "run_71c0d", stage: "brand-kit", status: "warning" },
      { id: "run_3ad9e", stage: "narrative", status: "info" },
    ],
    "agent",
  );

  const ctx = repo.get(PROJECT_ID);
  if (ctx === undefined) {
    throw new Error("Preview seed failed: company context not found after upsert.");
  }
  return ctx;
}

export default function TowerPreviewPage() {
  const sample = useMemo(buildSampleContext, []);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-neutral-12">Company Tower — preview</h1>
        <p className="font-mono text-xs text-neutral-9">
          sample nine-layer context · seed stage · deterministic
        </p>
      </div>
      <CompanyTower context={sample} />
    </main>
  );
}

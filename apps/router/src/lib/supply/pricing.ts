import "server-only";

import { randomUUID } from "node:crypto";
import { auditLogger } from "@nebutra/audit";
import type { ActionPlan, ActionResult } from "@nebutra/contracts/admin";
import { getSystemDb } from "@nebutra/db";
import type { StaffCaller } from "../admin/service-token";
import { getListingCatalog, type ListingModel, type ListingProvider } from "../listing-catalog";
import { coverageFor, priceOverrideFor } from "./price-overrides";

/**
 * Publish the shelf into `model_configs`, the one table the /v1 edge prices a
 * request from.
 *
 * This used to be a script an operator ran from a laptop, which meant the
 * operator's shell had to hold `DATABASE_URL` and the New-API credentials. That
 * is how the shelf came to publish fifteen models against an inventory of one:
 * a stray `OPENAI_API_KEY` in one shell widened what the script believed was
 * servable. Running it here removes the question — the Machine already holds
 * exactly the credentials it is entitled to, and `sellable` means what the
 * catalogue and the DNS cutover gate mean by it.
 */

type AIProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";

// Only the brands the schema's enum names map through; everything else is
// CUSTOM. The enum describes who bills us, not who made the model.
const PROVIDER_MAP: Partial<Record<ListingProvider, AIProvider>> = {
  openai: "OPENAI",
  anthropic: "ANTHROPIC",
  google: "GOOGLE",
};

/** A model with no price is never published — an unpriced SKU must be refusable. */
function isPriced(m: ListingModel): boolean {
  return m.inputPerMTok > 0 && m.outputPerMTok > 0;
}

function parseContext(context: string): number | null {
  const match = /^([\d.]+)\s*([KM])?/i.exec(context.trim());
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const scale = match[2]?.toUpperCase() === "M" ? 1_000_000 : match[2] ? 1_000 : 1;
  return Math.round(n * scale);
}

interface PriceRowPlan {
  modelName: string;
  provider: AIProvider;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  contextLength: number | null;
  isActive: boolean;
  published: boolean;
}

function toRow(m: ListingModel): PriceRowPlan {
  // An override is a deliberate, documented rate for a model the public index
  // cannot price, and it wins. Without this the shelf's zero would overwrite a
  // hand-set price and take the model off sale — which is what a plan to
  // publish would have done to gpt-image-2, the only model we currently sell.
  const override = priceOverrideFor(m.publicModel);
  // Fold in the dimensions upstream bills that our parsed usage cannot see (I3).
  // Applied here, at publish, so the request path stays a plain table lookup.
  const cover = coverageFor(m.provider);
  const inputPerMTok = (override?.inputPricePerMillion ?? m.inputPerMTok) * cover.input;
  const outputPerMTok = (override?.outputPricePerMillion ?? m.outputPerMTok) * cover.output;
  return {
    modelName: m.publicModel,
    provider: override?.provider ?? PROVIDER_MAP[m.provider] ?? "CUSTOM",
    inputPricePerMillion: inputPerMTok,
    outputPricePerMillion: outputPerMTok,
    contextLength: override ? override.contextLength : parseContext(m.context),
    // `sellable` is inventory-confirmed: the edge's real upstream said it can
    // serve this. Nothing else may set it.
    isActive: m.sellable,
    published: m.sellable && (override ? true : isPriced(m)),
  };
}

interface PricePlan {
  rows: PriceRowPlan[];
  onShelf: string[];
  publishing: string[];
  holding: string[];
  expiresAt: number;
}

const plans = new Map<string, PricePlan>();
const PLAN_TTL_MS = 10 * 60_000;

async function computePlan(): Promise<Omit<PricePlan, "expiresAt">> {
  const { models } = await getListingCatalog();
  const rows = models.map(toRow);
  return {
    rows,
    onShelf: models.map((m) => m.publicModel),
    publishing: rows.filter((r) => r.published).map((r) => r.modelName),
    holding: rows.filter((r) => !r.published).map((r) => r.modelName),
  };
}

/**
 * Models whose upstream rate has risen above what we published against.
 *
 * Every guarantee here rests on our recorded rate still being upstream's rate,
 * and that premise expires without telling us. The structural answer is to
 * **unpublish, never auto-reprice**: a model we can no longer price above cost
 * is refused at the edge, which cannot lose money, while raising a customer's
 * price without warning ambushes them on their next invoice.
 */
export interface PriceDrift {
  modelName: string;
  publishedInput: number;
  upstreamInput: number;
  publishedOutput: number;
  upstreamOutput: number;
}

export async function findPriceDrift(): Promise<PriceDrift[]> {
  const { models } = await getListingCatalog();
  const db = getSystemDb();
  const live = await db.modelConfig.findMany({
    where: { published: true },
    select: { modelName: true, inputPricePerMillion: true, outputPricePerMillion: true },
  });
  const byName = new Map(live.map((r) => [r.modelName, r]));

  const drifted: PriceDrift[] = [];
  for (const m of models) {
    const row = byName.get(m.publicModel);
    if (!row) continue;
    // An override is a deliberate rate we set ourselves; the index does not
    // price those models, so its numbers say nothing about them.
    if (priceOverrideFor(m.publicModel)) continue;
    const cover = coverageFor(m.provider);
    const publishedInput = Number(row.inputPricePerMillion ?? 0);
    const publishedOutput = Number(row.outputPricePerMillion ?? 0);
    // Upstream's own rate, before our markup — what we would actually be billed.
    const upstreamInput = m.inputPerMTok * cover.input;
    const upstreamOutput = m.outputPerMTok * cover.output;
    if (upstreamInput > publishedInput || upstreamOutput > publishedOutput) {
      drifted.push({
        modelName: m.publicModel,
        publishedInput,
        upstreamInput,
        publishedOutput,
        upstreamOutput,
      });
    }
  }
  return drifted;
}

/** Take every drifted model off sale. Prices are never raised automatically. */
export async function unpublishDrifted(
  caller: StaffCaller,
  request: Request,
): Promise<ActionResult> {
  const drifted = await findPriceDrift();
  const names = drifted.map((d) => d.modelName);
  if (names.length > 0) {
    await getSystemDb().modelConfig.updateMany({
      where: { modelName: { in: names } },
      data: { published: false },
    });
  }
  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.price.unpublish_drifted",
    outcome: "success",
    resource: { type: "price-table", id: "model_configs" },
    metadata: { auditId, role: caller.role, unpublished: names },
  });
  return {
    auditId,
    summary:
      names.length === 0
        ? "No published model costs more upstream than we charge."
        : `Took ${names.length} model(s) off sale: upstream now costs more than we charge.`,
    result: { unpublished: names, drift: drifted },
  };
}

export async function planPricePublish(): Promise<ActionPlan> {
  const plan = await computePlan();
  const planId = randomUUID();
  const expiresAt = Date.now() + PLAN_TTL_MS;
  plans.set(planId, { ...plan, expiresAt });

  const db = getSystemDb();
  const live = new Set(
    (
      await db.modelConfig.findMany({
        where: { published: true },
        select: { modelName: true },
      })
    ).map((r) => r.modelName),
  );
  const adding = plan.publishing.filter((m) => !live.has(m));
  const removing = [...live].filter((m) => !plan.publishing.includes(m));

  return {
    planId,
    summary:
      adding.length === 0 && removing.length === 0
        ? `Prices already match the shelf: ${plan.publishing.length} published, ${plan.holding.length} held.`
        : `Publish prices: +${adding.length} −${removing.length}; ${plan.holding.length} held unpriced or unservable.`,
    diff: [
      ...adding.map((m) => ({ op: "add" as const, path: `price.published.${m}`, to: m })),
      ...removing.map((m) => ({ op: "remove" as const, path: `price.published.${m}`, from: m })),
    ],
    affected: [{ resource: "shelf", id: "model_configs", label: "Router price table" }],
    warnings:
      plan.publishing.length === 0
        ? ["Nothing would be published — the shelf has no model that is both servable and priced."]
        : [],
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function applyPricePublish(
  planId: string,
  caller: StaffCaller,
  request: Request,
): Promise<ActionResult | { expired: true }> {
  const held = plans.get(planId);
  if (!held || held.expiresAt < Date.now()) return { expired: true };
  plans.delete(planId);

  // Re-read at apply time: the plan is a review, not a snapshot to replay.
  const plan = await computePlan();
  if (plan.rows.length === 0) throw new Error("The shelf is empty — refusing to write prices.");

  const db = getSystemDb();
  let created = 0;
  let updated = 0;

  for (const row of plan.rows) {
    const { modelName, ...rest } = row;
    const values = { ...rest, currency: "USD", unit: "PER_1M_TOKENS" as const };
    const existing = await db.modelConfig.findUnique({
      where: { modelName },
      select: { id: true },
    });
    await db.modelConfig.upsert({
      where: { modelName },
      create: { modelName, ...values },
      update: values,
    });
    if (existing) updated += 1;
    else created += 1;
  }

  // A model that has left the shelf stops being sold but keeps its row, so old
  // ledger entries still join to a price. Nothing here ever deletes.
  const retired = await db.modelConfig.updateMany({
    where: { modelName: { notIn: plan.onShelf }, published: true },
    data: { published: false, isActive: false },
  });

  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.price.publish",
    outcome: "success",
    resource: { type: "price-table", id: "model_configs" },
    metadata: {
      auditId,
      role: caller.role,
      published: plan.publishing.length,
      held: plan.holding.length,
      retired: retired.count,
    },
  });

  return {
    auditId,
    summary: `${plan.publishing.length} models on sale, ${plan.holding.length} held, ${retired.count} retired.`,
    result: {
      published: plan.publishing,
      held: plan.holding,
      created,
      updated,
      retired: retired.count,
    },
  };
}

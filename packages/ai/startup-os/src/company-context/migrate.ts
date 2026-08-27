import type { CompanyContext, FieldProvenance, LayerId, Stage } from "./model";
import { createEmptyContext, InMemoryCompanyContextRepository } from "./repository";

const STAGES: ReadonlySet<string> = new Set(["pre_seed", "seed", "series_a", "post_a"]);

/** Already a nine-layer tower (has a `layers` map keyed by L1..L9)? */
function isTower(ctx: unknown): ctx is CompanyContext {
  if (ctx === null || typeof ctx !== "object") return false;
  const layers = (ctx as { layers?: unknown }).layers;
  return layers !== null && typeof layers === "object" && "L1" in layers;
}

/**
 * Coerce a project's `companyContext` into a nine-layer tower. A context created
 * before the tower rewrite is a FLAT object ({ name, category, market, coreBet,
 * promise, moat, operatingModel }); this migrates those fields into the tower
 * (name -> L8.name, promise -> L5.value_proposition, ...) so the tower UI AND
 * the field-edit write path both work on legacy data. An already-tower context
 * is returned unchanged (its projectId pinned to the host project).
 */
export function ensureTower(ctx: unknown, projectId: string, now: string): CompanyContext {
  if (isTower(ctx)) {
    return ctx.projectId === projectId ? ctx : { ...ctx, projectId };
  }

  const flat = (ctx ?? {}) as Record<string, unknown>;
  const stage = (STAGES.has(String(flat.stage)) ? flat.stage : "pre_seed") as Stage;
  const repo = new InMemoryCompanyContextRepository();
  repo.save(createEmptyContext(projectId, stage, now));

  const seed = (
    layerId: LayerId,
    fieldKey: string,
    value: unknown,
    provenance: FieldProvenance,
  ) => {
    if (value === undefined || value === null || value === "") return;
    repo.upsertField(projectId, layerId, fieldKey, value, { provenance, now });
  };

  seed("L8", "name", flat.name, "user");
  seed("L5", "value_proposition", flat.promise, "user");
  seed("L4", "category", flat.category, "user");
  seed("L6", "market", flat.market, "user");
  seed("L1", "why", flat.coreBet, "user");
  seed("L4", "moat", flat.moat, "user");
  seed("L3", "operating_principles", flat.operatingModel, "user");

  return repo.get(projectId) ?? createEmptyContext(projectId, stage, now);
}

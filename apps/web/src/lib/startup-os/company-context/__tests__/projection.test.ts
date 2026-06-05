import { describe, expect, it } from "vitest";
import type { LayerId } from "../model";
import {
  companyCategory,
  companyName,
  flatCompanyView,
  operatingPrinciples,
  valueProposition,
} from "../projection";
import { createEmptyContext, InMemoryCompanyContextRepository } from "../repository";

const NOW = "2026-06-05T00:00:00.000Z";

async function ctxWith(layerId: LayerId, fieldKey: string, value: unknown) {
  const repo = new InMemoryCompanyContextRepository();
  await repo.save(createEmptyContext("p1", "pre_seed", NOW));
  await repo.upsertField("p1", layerId, fieldKey, value, { provenance: "user", now: NOW });
  const ctx = repo.get("p1");
  if (!ctx) throw new Error("expected context for p1");
  return ctx;
}

describe("projection", () => {
  it("reads company name from L8.name and falls back to a non-empty default", async () => {
    expect(companyName(await ctxWith("L8", "name", "Sailor"))).toBe("Sailor");
    expect(companyName(createEmptyContext("p2", "pre_seed", NOW))).toBe("Nebutra Venture");
  });

  it("reads the promise from L5.value_proposition", async () => {
    expect(valueProposition(await ctxWith("L5", "value_proposition", "Compile a company"))).toBe(
      "Compile a company",
    );
  });

  it("reads the category from L4.category", async () => {
    expect(companyCategory(await ctxWith("L4", "category", "Founder OS"))).toBe("Founder OS");
    expect(companyCategory(createEmptyContext("p3", "pre_seed", NOW))).toBe("");
  });

  it("reads operating principles from L3 as a string list, tolerating non-lists", async () => {
    expect(
      operatingPrinciples(await ctxWith("L3", "operating_principles", ["root-cause"])),
    ).toEqual(["root-cause"]);
    expect(operatingPrinciples(createEmptyContext("p4", "pre_seed", NOW))).toEqual([]);
  });

  it("flatCompanyView returns the legacy seven-field shape derived from the tower", async () => {
    const view = flatCompanyView(await ctxWith("L8", "name", "Sailor"));
    expect(Object.keys(view).sort()).toEqual(
      ["category", "coreBet", "market", "moat", "name", "operatingModel", "promise"].sort(),
    );
    expect(view.name).toBe("Sailor");
    expect(view.promise).toBe("A company workspace compiled from the submitted proposition.");
    expect(Array.isArray(view.operatingModel)).toBe(true);
  });
});

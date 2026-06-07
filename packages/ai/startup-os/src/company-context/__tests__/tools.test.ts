import { describe, expect, it } from "vitest";
import { createEmptyContext, InMemoryCompanyContextRepository } from "../repository";
import {
  addField,
  createCompanyContextTools,
  deleteField,
  describe as describeContext,
  getField,
  getLayer,
  lockField,
  search,
  unlockField,
  upsertField,
} from "../tools";

const NOW = "2026-06-05T00:00:00.000Z";
const LATER = "2026-06-05T01:00:00.000Z";

/** Fixed, deterministic clock so the AI-SDK tools stay keyless + reproducible. */
const fixedClock = () => NOW;

function seededRepo() {
  const repo = new InMemoryCompanyContextRepository();
  repo.save(createEmptyContext("startup_test", "pre_seed", NOW));
  return repo;
}

describe("company-context pure tool functions", () => {
  describe("describe (progressive disclosure)", () => {
    it("returns the cheap manifest and NEVER carries any stored field value", () => {
      const repo = seededRepo();
      upsertField(repo, "startup_test", "L1", "mission", "Make startup chaos legible.", {
        provenance: "user",
        now: NOW,
      });

      const manifest = describeContext(repo, "startup_test");

      expect(manifest.projectId).toBe("startup_test");
      expect(manifest.stage).toBe("pre_seed");
      expect(manifest.layers).toHaveLength(9);

      // The manifest carries field KEYS only.
      const l1 = manifest.layers.find((layer) => layer.id === "L1");
      expect(l1?.fieldKeys).toContain("mission");

      // Hard invariant: serialised manifest must contain no stored value.
      const serialised = JSON.stringify(manifest);
      expect(serialised).not.toContain("Make startup chaos legible.");
      // And no per-field "value" payload key leaked into the manifest shape.
      expect(serialised).not.toContain('"value"');
      expect(serialised).not.toContain("provenance");
    });

    it("throws a clear error for an unknown project", () => {
      const repo = new InMemoryCompanyContextRepository();
      expect(() => describeContext(repo, "missing")).toThrow(/missing/);
    });
  });

  describe("getLayer / getField (lazy reads)", () => {
    it("reads a layer's fields and provenance-carrying values on demand", () => {
      const repo = seededRepo();
      upsertField(repo, "startup_test", "L1", "mission", "Coherent company state.", {
        provenance: "ai",
        confidence: 0.8,
        now: NOW,
      });

      const layer = getLayer(repo, "startup_test", "L1");
      expect(layer?.values.mission.value).toBe("Coherent company state.");
      expect(layer?.values.mission.provenance).toBe("ai");

      const field = getField(repo, "startup_test", "L1", "mission");
      expect(field?.value).toBe("Coherent company state.");
      expect(field?.confidence).toBe(0.8);
    });

    it("returns undefined for a missing field", () => {
      const repo = seededRepo();
      expect(getField(repo, "startup_test", "L1", "does_not_exist")).toBeUndefined();
    });
  });

  describe("search (find without reading all)", () => {
    it("finds an upserted value by case-insensitive substring", () => {
      const repo = seededRepo();
      upsertField(repo, "startup_test", "L1", "mission", "Turn one thesis into a company.", {
        provenance: "user",
        now: NOW,
      });
      upsertField(repo, "startup_test", "L4", "category", "Founder operating system", {
        provenance: "user",
        now: NOW,
      });

      const hits = search(repo, "startup_test", "COMPANY");

      expect(hits.length).toBeGreaterThanOrEqual(1);
      const hit = hits.find((entry) => entry.layerId === "L1" && entry.fieldKey === "mission");
      expect(hit).toBeDefined();
      expect(hit?.snippet.toLowerCase()).toContain("company");
    });

    it("returns no hits when nothing matches", () => {
      const repo = seededRepo();
      upsertField(repo, "startup_test", "L1", "mission", "Alpha.", {
        provenance: "user",
        now: NOW,
      });
      expect(search(repo, "startup_test", "zzz-no-match")).toEqual([]);
    });
  });

  describe("upsertField (provenance required)", () => {
    it("requires provenance and writes a draft value", () => {
      const repo = seededRepo();
      const ctx = upsertField(repo, "startup_test", "L1", "mission", "Mission text.", {
        provenance: "document",
        now: NOW,
      });

      expect(ctx.layers.L1.values.mission).toMatchObject({
        value: "Mission text.",
        provenance: "document",
        status: "draft",
      });
    });

    it("rejects an upsert with no provenance at the boundary", () => {
      const repo = seededRepo();
      expect(() =>
        // @ts-expect-error provenance is required — omitting it must fail validation.
        upsertField(repo, "startup_test", "L1", "mission", "No provenance.", { now: NOW }),
      ).toThrow();
    });

    it("protects a locked value unless force is passed", () => {
      const repo = seededRepo();
      upsertField(repo, "startup_test", "L1", "mission", "Approved.", {
        provenance: "user",
        now: NOW,
      });
      lockField(repo, "startup_test", "L1", "mission", LATER);

      expect(() =>
        upsertField(repo, "startup_test", "L1", "mission", "Casual overwrite.", {
          provenance: "ai",
          now: LATER,
        }),
      ).toThrow(/locked/);

      const forced = upsertField(repo, "startup_test", "L1", "mission", "Forced approved edit.", {
        provenance: "user",
        force: true,
        now: LATER,
      });
      expect(forced.layers.L1.values.mission.value).toBe("Forced approved edit.");
      expect(forced.layers.L1.values.mission.status).toBe("locked");
    });
  });

  describe("addField / deleteField / lockField / unlockField", () => {
    it("adds and removes an extensible field", () => {
      const repo = seededRepo();
      const added = addField(
        repo,
        "startup_test",
        "L4",
        {
          key: "anti_positioning",
          label: "Anti-positioning",
          kind: "text",
          required: false,
        },
        NOW,
      );
      expect(added.layers.L4.fields.anti_positioning).toMatchObject({ kind: "text" });

      const removed = deleteField(repo, "startup_test", "L4", "anti_positioning", LATER);
      expect(removed.layers.L4.fields.anti_positioning).toBeUndefined();
    });

    it("locks then unlocks a field", () => {
      const repo = seededRepo();
      upsertField(repo, "startup_test", "L1", "mission", "Lockable.", {
        provenance: "user",
        now: NOW,
      });

      const locked = lockField(repo, "startup_test", "L1", "mission", LATER);
      expect(locked.layers.L1.values.mission.status).toBe("locked");

      const unlocked = unlockField(repo, "startup_test", "L1", "mission", LATER);
      expect(unlocked.layers.L1.values.mission.status).toBe("ready");
    });
  });
});

describe("createCompanyContextTools (AI-SDK tool set, keyless)", () => {
  const EXPECTED_TOOL_KEYS = [
    "companyContext_describe",
    "companyContext_getLayer",
    "companyContext_getField",
    "companyContext_search",
    "companyContext_upsertField",
    "companyContext_addField",
    "companyContext_deleteField",
    "companyContext_lockField",
    "companyContext_unlockField",
  ] as const;

  it("returns all nine tool keys, each with an input schema", () => {
    const repo = seededRepo();
    const tools = createCompanyContextTools(repo, { now: fixedClock });

    expect(Object.keys(tools).sort()).toEqual([...EXPECTED_TOOL_KEYS].sort());

    for (const key of EXPECTED_TOOL_KEYS) {
      const definition = tools[key];
      expect(definition).toBeDefined();
      expect(definition.inputSchema).toBeDefined();
      expect(definition.description).toBeTypeOf("string");
    }
  });

  it("describe tool delegates to the cheap manifest with no values", async () => {
    const repo = seededRepo();
    upsertField(repo, "startup_test", "L1", "mission", "Secret value should not leak.", {
      provenance: "user",
      now: NOW,
    });
    const tools = createCompanyContextTools(repo, { now: fixedClock });

    const result = await tools.companyContext_describe.execute?.(
      { projectId: "startup_test" },
      // ToolCallOptions — the in-process call does not use them.
      // biome-ignore lint/suspicious/noExplicitAny: test-only stub for ToolCallOptions
      {} as any,
    );

    expect(JSON.stringify(result)).not.toContain("Secret value should not leak.");
  });

  it("upsertField tool requires provenance in its input schema", () => {
    const repo = seededRepo();
    const tools = createCompanyContextTools(repo, { now: fixedClock });
    const schema = tools.companyContext_upsertField.inputSchema;

    // Provenance present -> parses.
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: zod schema parse at the boundary
      (schema as any).parse({
        projectId: "startup_test",
        layerId: "L1",
        fieldKey: "mission",
        value: "ok",
        provenance: "user",
      }),
    ).not.toThrow();

    // Provenance missing -> rejected.
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: zod schema parse at the boundary
      (schema as any).parse({
        projectId: "startup_test",
        layerId: "L1",
        fieldKey: "mission",
        value: "ok",
      }),
    ).toThrow();
  });

  it("upsertField tool delegates to the repository and search finds the value", async () => {
    const repo = seededRepo();
    const tools = createCompanyContextTools(repo, { now: fixedClock });

    await tools.companyContext_upsertField.execute?.(
      {
        projectId: "startup_test",
        layerId: "L1",
        fieldKey: "mission",
        value: "Tool-written mission about coherence.",
        provenance: "agent",
      },
      // biome-ignore lint/suspicious/noExplicitAny: test-only stub for ToolCallOptions
      {} as any,
    );

    const hits = search(repo, "startup_test", "coherence");
    expect(hits.some((hit) => hit.fieldKey === "mission")).toBe(true);
  });
});

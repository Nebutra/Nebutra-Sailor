import { ResumeContentV1Schema } from "@nebutra/contracts/sleptons";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { getSection, RESUME_SECTIONS } from "../../features/resume/editor/sections";

/** Keys of ResumeContentV1 that the editor deliberately does not expose. */
const NOT_EDITED = new Set(["version", "preferences"]);

function shapeOf(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  // unwrap optional / default / prefault / array wrappers down to the object
  let s: z.ZodTypeAny = schema;
  for (let i = 0; i < 6; i++) {
    const def = (s as { def?: { type?: string; innerType?: z.ZodTypeAny; element?: z.ZodTypeAny } })
      .def;
    if (def?.type === "object")
      return (s as z.ZodObject<z.ZodRawShape>).shape as unknown as Record<string, z.ZodTypeAny>;
    if (def?.innerType) s = def.innerType;
    else if (def?.element) s = def.element;
    else break;
  }
  throw new Error("not an object schema");
}

describe("RESUME_SECTIONS registry", () => {
  const schemaKeys = Object.keys(ResumeContentV1Schema.shape).filter((k) => !NOT_EDITED.has(k));

  it("covers every editable key of ResumeContentV1 exactly once", () => {
    const ids = RESUME_SECTIONS.map((s) => s.id);
    expect([...ids].sort()).toEqual([...schemaKeys].sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references field keys that exist in the schema", () => {
    for (const section of RESUME_SECTIONS) {
      if (section.kind === "skills" || section.kind === "tags") continue;
      const shape = shapeOf(ResumeContentV1Schema.shape[section.id]);
      for (const f of section.fields) {
        expect(Object.keys(shape), `${section.id}.${f.key}`).toContain(f.key);
      }
      if (section.kind === "list") {
        expect(section.fields.map((f) => f.key)).toContain(section.itemTitleKey);
      }
    }
  });

  it("select options are valid enum values", () => {
    const ventures = getSection("ventures");
    const experiences = getSection("experiences");
    const stage =
      ventures.kind === "list" ? ventures.fields.find((f) => f.key === "stage") : undefined;
    const kind =
      experiences.kind === "list" ? experiences.fields.find((f) => f.key === "kind") : undefined;
    for (const [field, section, key] of [
      [stage, "ventures", "stage"],
      [kind, "experiences", "kind"],
    ] as const) {
      const shape = shapeOf(ResumeContentV1Schema.shape[section]);
      const enumSchema = shape[key];
      const def = (enumSchema as { def?: { innerType?: z.ZodTypeAny } }).def;
      const inner = (def?.innerType ?? enumSchema) as z.ZodEnum<Record<string, string>>;
      const values = Object.values(inner.def?.entries ?? inner.options ?? {});
      for (const o of field?.options ?? []) expect(values).toContain(o.value);
    }
  });

  it("skills categories match the contract", () => {
    const skills = getSection("skills");
    const shape = shapeOf(ResumeContentV1Schema.shape.skills);
    if (skills.kind !== "skills") throw new Error("expected skills section");
    expect(skills.categories.map((c) => c.key).sort()).toEqual(Object.keys(shape).sort());
  });

  it("throws on an unknown section id", () => {
    expect(() => getSection("nope" as never)).toThrow();
  });
});

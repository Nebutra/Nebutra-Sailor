import { ResumeContentV1Schema } from "@nebutra/contracts/sleptons";
import { describe, expect, it } from "vitest";
import { slugForFile, toJson } from "../../features/resume/export/download";
import { modelToMarkdown, toMarkdown } from "../../features/resume/export/markdown";
import {
  DEFAULT_SECTION_ORDER,
  resolveOrder,
  toDocumentModel,
} from "../../features/resume/render/model";

const content = ResumeContentV1Schema.parse({
  basic: {
    name: "张伟",
    name_en: "Zhang Wei",
    email: "zw@example.com",
    phone: "138",
    location: "Shanghai",
    links: { github: "zw", linkedin: "https://linkedin.com/in/zw" },
  },
  objective: {
    summary: "<p>AI contract review for SMBs. Second sentence.</p>",
    advantage_tags: ["legal"],
  },
  ventures: [
    {
      name: "LexBot",
      role: "Founder",
      period: "2023 – now",
      stage: "launched",
      outcome: "1,200 paying SMBs",
      details: ["a", "b", "c", "d"],
      url: "https://lexbot.ai",
    },
  ],
  experiences: [
    { kind: "campus", period: "2019", org: "SU", title: "Lead", rich: "<b>did</b> things" },
  ],
  skills: { programming: ["Go"], ai_engineering: [] },
  education: [
    { school: "Fudan", school_en: "FDU", degree: "BSc", major: "CS", gpa: "3.8", courses: ["OS"] },
  ],
  interests: ["tea", "running"],
  preferences: { max_bullets_per_entry: 2, section_order: ["skills", "nope", "ventures"] },
});

describe("toDocumentModel", () => {
  const m = toDocumentModel(content);

  it("builds header, contact and links", () => {
    expect(m.name).toBe("张伟");
    expect(m.headline).toBe("AI contract review for SMBs.");
    expect(m.contact).toEqual(["zw@example.com", "138", "Shanghai"]);
    expect(m.links.map((l) => l.href)).toEqual([
      "https://github.com/zw",
      "https://linkedin.com/in/zw",
    ]);
  });

  it("hides email and phone but keeps location when hideContact", () => {
    expect(toDocumentModel(content, { hideContact: true }).contact).toEqual(["Shanghai"]);
  });

  it("respects section_order, ignores unknown ids, appends the rest, drops empty sections", () => {
    expect(m.sections.map((s) => s.id)).toEqual([
      "skills",
      "ventures",
      "summary",
      "experiences",
      "education",
      "interests",
    ]);
  });

  it("caps bullets per entry and strips html from rich text", () => {
    const ventures = m.sections.find((s) => s.id === "ventures");
    expect(ventures?.entries[0]?.bullets).toEqual(["1,200 paying SMBs", "a"]);
    const exp = m.sections.find((s) => s.id === "experiences");
    expect(exp?.entries[0]?.bullets).toEqual(["did things"]);
    expect(exp?.entries[0]?.meta).toBe("2019 · campus");
  });

  it("skills groups skip empty categories", () => {
    expect(m.sections.find((s) => s.id === "skills")?.groups).toEqual([
      { label: "Programming", values: ["Go"] },
    ]);
  });
});

describe("resolveOrder", () => {
  it("defaults to DEFAULT_SECTION_ORDER", () => {
    expect(resolveOrder(undefined)).toEqual([...DEFAULT_SECTION_ORDER]);
  });
});

describe("markdown export", () => {
  const md = toMarkdown(content);
  it("is one document from the shared model", () => {
    expect(md.startsWith("# 张伟 (Zhang Wei)\n\n> AI contract review for SMBs.")).toBe(true);
    expect(md).toContain("## Skills\n- **Programming:** Go");
    expect(md).toContain(
      "**LexBot** · Founder · _2023 – now · launched_ ([link](https://lexbot.ai))",
    );
    expect(md).toContain("- 1,200 paying SMBs\n- a\n");
    expect(md.endsWith("\n")).toBe(true);
  });
  it("modelToMarkdown handles a minimal model", () => {
    expect(
      modelToMarkdown({ name: "A", contact: [], links: [], advantageTags: [], sections: [] }),
    ).toBe("# A\n");
  });
});

describe("json export + filename", () => {
  it("wraps content with schemaVersion and round-trips through the schema", () => {
    const parsed = JSON.parse(toJson(content)) as { schemaVersion: number; content: unknown };
    expect(parsed.schemaVersion).toBe(1);
    expect(ResumeContentV1Schema.safeParse(parsed.content).success).toBe(true);
  });
  it("slugForFile handles CJK and empties", () => {
    expect(slugForFile("Zhang Wei")).toBe("zhang-wei");
    expect(slugForFile("张伟")).toBe("张伟");
    expect(slugForFile("  ")).toBe("resume");
  });
});

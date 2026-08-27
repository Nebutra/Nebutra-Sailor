import { describe, expect, it } from "vitest";

import {
  analyzeEditIntent,
  applyEditBlock,
  buildEditInstructions,
  type EditBlock,
  EditType,
  type FileManifest,
  parseEditBlocks,
  planEdit,
  selectFilesForEdit,
} from "./edit-planner.js";

const TENANT = "org_123";

const manifest: FileManifest = {
  files: {
    "src/App.tsx": { path: "src/App.tsx", type: "page" },
    "src/components/Button.tsx": {
      path: "src/components/Button.tsx",
      type: "component",
    },
    "src/components/Header.tsx": {
      path: "src/components/Header.tsx",
      type: "component",
    },
    "src/pages/Home.tsx": { path: "src/pages/Home.tsx", type: "page" },
    "src/styles/theme.css": { path: "src/styles/theme.css", type: "style" },
    "package.json": { path: "package.json", type: "config" },
    "src/utils/format.ts": { path: "src/utils/format.ts", type: "util" },
  },
};

describe("analyzeEditIntent", () => {
  it("matches UPDATE_STYLE for styling prompts", () => {
    const intent = analyzeEditIntent("change the color theme to blue", manifest);
    expect(intent.type).toBe(EditType.UPDATE_STYLE);
    expect(intent.targetFiles).toContain("src/styles/theme.css");
  });

  it("matches ADD_DEPENDENCY for package install prompts", () => {
    const intent = analyzeEditIntent("install the axios package", manifest);
    expect(intent.type).toBe(EditType.ADD_DEPENDENCY);
    expect(intent.targetFiles).toContain("package.json");
  });

  it("matches FIX_ISSUE for bug prompts", () => {
    const intent = analyzeEditIntent("fix the bug in the Header", manifest);
    expect(intent.type).toBe(EditType.FIX_ISSUE);
    expect(intent.targetFiles).toContain("src/components/Header.tsx");
  });

  it("matches FULL_REBUILD and targets all files", () => {
    const intent = analyzeEditIntent("rebuild the entire app from scratch", manifest);
    expect(intent.type).toBe(EditType.FULL_REBUILD);
    expect(intent.targetFiles.sort()).toEqual(Object.keys(manifest.files).sort());
  });

  it("matches REFACTOR", () => {
    const intent = analyzeEditIntent("refactor the Button component", manifest);
    expect(intent.type).toBe(EditType.REFACTOR);
    expect(intent.targetFiles).toContain("src/components/Button.tsx");
  });

  it("matches ADD_FEATURE with page insertion points", () => {
    const intent = analyzeEditIntent("add a new search feature", manifest);
    expect(intent.type).toBe(EditType.ADD_FEATURE);
    expect(intent.targetFiles).toContain("src/App.tsx");
  });

  it("matches UPDATE_COMPONENT by component name", () => {
    const intent = analyzeEditIntent("update the Button component label", manifest);
    expect(intent.type).toBe(EditType.UPDATE_COMPONENT);
    expect(intent.targetFiles).toContain("src/components/Button.tsx");
  });

  it("first-match-wins: fix beats update ordering", () => {
    const intent = analyzeEditIntent("fix the broken Button update", manifest);
    expect(intent.type).toBe(EditType.FIX_ISSUE);
  });

  it("falls back to UPDATE_COMPONENT with empty targets on no match", () => {
    const intent = analyzeEditIntent("zzz qqq", manifest);
    expect(intent.type).toBe(EditType.UPDATE_COMPONENT);
    expect(intent.targetFiles).toEqual([]);
    expect(intent.description).toBe("zzz qqq");
  });

  it("does not mutate the manifest", () => {
    const snapshot = JSON.stringify(manifest);
    analyzeEditIntent("rebuild everything", manifest);
    expect(JSON.stringify(manifest)).toBe(snapshot);
  });
});

describe("buildEditInstructions", () => {
  it("is deterministic per edit type", () => {
    expect(buildEditInstructions(EditType.FIX_ISSUE)).toBe(
      buildEditInstructions(EditType.FIX_ISSUE),
    );
    expect(buildEditInstructions(EditType.FIX_ISSUE)).not.toBe(
      buildEditInstructions(EditType.ADD_FEATURE),
    );
  });
});

describe("selectFilesForEdit", () => {
  it("splits primary and context, always includes key files", () => {
    const ctx = selectFilesForEdit("update the Button component", manifest);
    expect(ctx.primaryFiles).toContain("src/components/Button.tsx");
    expect(ctx.contextFiles).toContain("src/App.tsx");
    expect(ctx.contextFiles).toContain("package.json");
    expect(ctx.contextFiles).not.toContain("src/components/Button.tsx");
  });

  it("FULL_REBUILD makes all files primary", () => {
    const ctx = selectFilesForEdit("rebuild the whole app", manifest);
    expect(ctx.primaryFiles.sort()).toEqual(Object.keys(manifest.files).sort());
    expect(ctx.contextFiles).toEqual([]);
  });

  it("systemPrompt is deterministic and skips structure for FULL_REBUILD", () => {
    const a = selectFilesForEdit("update the Button", manifest);
    const b = selectFilesForEdit("update the Button", manifest);
    expect(a.systemPrompt).toBe(b.systemPrompt);
    expect(a.systemPrompt).toContain("File structure");
    const rebuild = selectFilesForEdit("full rebuild now", manifest);
    expect(rebuild.systemPrompt).not.toContain("File structure");
  });
});

describe("parseEditBlocks", () => {
  it("parses multiple blocks", () => {
    const text = `
<<<edit file="a.tsx">>>
do thing one
---
const a = 1;
<<<end>>>
noise
<<<edit file="b.tsx">>>
do thing two
---
const b = 2;
<<<end>>>`;
    const blocks = parseEditBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual<EditBlock>({
      targetFile: "a.tsx",
      instructions: "do thing one",
      update: "const a = 1;",
    });
    expect(blocks[1]?.targetFile).toBe("b.tsx");
  });

  it("tolerates malformed input", () => {
    expect(parseEditBlocks("no blocks here")).toEqual([]);
    expect(parseEditBlocks('<<<edit file="x">>> incomplete')).toEqual([]);
  });
});

describe("applyEditBlock", () => {
  const block: EditBlock = {
    targetFile: "a.tsx",
    instructions: "append",
    update: "ADDED",
  };

  it("uses the injected merger", async () => {
    const merge = async (orig: string, upd: string) => `${orig}|${upd}`;
    const res = await applyEditBlock("ORIG", block, merge);
    expect(res.ok).toBe(true);
    expect(res.merged).toBe("ORIG|ADDED");
  });

  it("returns error path when merger throws", async () => {
    const merge = async () => {
      throw new Error("boom");
    };
    const res = await applyEditBlock("ORIG", block, merge);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("boom");
  });
});

describe("planEdit (tenant)", () => {
  it("fails closed on empty tenant", async () => {
    await expect(planEdit("", "update the Button", manifest)).rejects.toThrow();
    await expect(planEdit("   ", "update the Button", manifest)).rejects.toThrow();
  });

  it("returns a FileContext for a valid tenant", async () => {
    const ctx = await planEdit(TENANT, "update the Button component", manifest);
    expect(ctx.editIntent.type).toBe(EditType.UPDATE_COMPONENT);
    expect(ctx.primaryFiles).toContain("src/components/Button.tsx");
  });

  it("does not mutate the input manifest", async () => {
    const snapshot = JSON.stringify(manifest);
    await planEdit(TENANT, "rebuild everything", manifest);
    expect(JSON.stringify(manifest)).toBe(snapshot);
  });
});

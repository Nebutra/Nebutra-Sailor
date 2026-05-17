import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PlayLoader, parsePlayMarkdown, resolvePlayChain } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

const playMarkdown = `---
name: launch_page
kind: play
version: 1.0.0
description: Build a launch page
inputs:
  idea: { type: string }
outputs:
  url: { type: string }
budget:
  duration_s: 60
required_skills:
  - content_store.write
  - tool_protocol.call
sub_agents:
  - role: researcher
    allowed_skills: [content_store.search]
depends_on_plays:
  - play: brand_profile
    outputs: [BRAND.md]
---

## What this play does

Create a launch page from a compact brief.
`;

describe("play-loader", () => {
  it("parses play metadata from SKILL.md without inventing a second file format", () => {
    const play = parsePlayMarkdown(playMarkdown);

    expect(play.meta).toMatchObject({
      name: "launch_page",
      kind: "play",
      version: "1.0.0",
      description: "Build a launch page",
    });
    expect(play.requiredSkills).toEqual(["content_store.write", "tool_protocol.call"]);
    expect(play.subAgents).toEqual([
      { role: "researcher", allowedSkills: ["content_store.search"] },
    ]);
    expect(play.dependsOnPlays).toEqual([{ play: "brand_profile", outputs: ["BRAND.md"] }]);
    expect(play.body).toContain("Create a launch page");
  });

  it("rejects non-play SKILL.md documents with a fix suggestion", () => {
    const markdown = playMarkdown.replace("kind: play", "kind: skill");
    expect(() => parsePlayMarkdown(markdown)).toThrow(/kind: play/i);
  });

  it("orders play dependencies and rejects cycles", () => {
    const chain = resolvePlayChain([
      { name: "pitch", dependsOn: ["brand", "demo"] },
      { name: "brand", dependsOn: [] },
      { name: "demo", dependsOn: ["brand"] },
    ]);
    expect(chain).toEqual(["brand", "demo", "pitch"]);

    expect(() =>
      resolvePlayChain([
        { name: "a", dependsOn: ["b"] },
        { name: "b", dependsOn: ["a"] },
      ]),
    ).toThrow(/cycle/i);
  });

  it("lists and tests local plays from a portable root", async () => {
    root = await mkdtemp(join(tmpdir(), "play-loader-"));
    const loader = await PlayLoader.open(root);
    await loader.writePlay("launch_page", playMarkdown);

    await expect(loader.list()).resolves.toEqual([
      expect.objectContaining({ name: "launch_page", kind: "play" }),
    ]);
    await expect(loader.test("launch_page")).resolves.toMatchObject({
      name: "launch_page",
      ok: true,
    });

    const source = join(root, "external.md");
    await writeFile(source, playMarkdown.replaceAll("launch_page", "launch_page_copy"), "utf8");
    await expect(loader.install(`file:${source}`)).resolves.toMatchObject({
      meta: { name: "launch_page_copy" },
    });
  });
});

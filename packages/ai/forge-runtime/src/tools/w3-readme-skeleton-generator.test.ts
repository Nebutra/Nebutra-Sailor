import { describe, expect, it } from "vitest";
import {
  assignAnchors,
  githubAnchor,
  README_DEFAULT_SECTIONS,
  README_SECTIONS,
  type ReadmeSkeletonOutput,
  readmeSkeletonGeneratorTool,
  shieldsEscape,
} from "./w3-readme-skeleton-generator";

const schema = readmeSkeletonGeneratorTool.inputSchema;

function run(input: Record<string, unknown>): ReadmeSkeletonOutput {
  return readmeSkeletonGeneratorTool.execute(schema.parse(input)) as ReadmeSkeletonOutput;
}

describe("readme-skeleton-generator · tool metadata", () => {
  it("is a pure, deterministic tool with a meter id and real engine metadata", () => {
    expect(readmeSkeletonGeneratorTool.sideEffect).toBe("pure");
    expect(readmeSkeletonGeneratorTool.meterId).toBe("forge.dev.readme_skeleton_generator");
    expect(readmeSkeletonGeneratorTool.roots).toContain("template");
    expect(readmeSkeletonGeneratorTool.engine.upstream).toMatch(/shields\.io/);
  });

  it("is deterministic — same input, byte-identical markdown", () => {
    const input = { projectName: "Sailor", sections: [...README_SECTIONS], license: "MIT" };
    expect(run(input).markdown).toBe(run(input).markdown);
  });
});

describe("readme-skeleton-generator · schema contract", () => {
  it("defaults to the 80% skeleton when nothing is passed", () => {
    const parsed = schema.parse({});
    expect(parsed.sections).toEqual([...README_DEFAULT_SECTIONS]);
  });

  it("rejects an unknown section id", () => {
    expect(schema.safeParse({ sections: ["not-a-section"] }).success).toBe(false);
  });

  it("rejects GitHub-profile section types — different JTBD (brief §7 rule 7)", () => {
    for (const s of ["about-me", "skills", "links", "introduction"]) {
      expect(schema.safeParse({ sections: [s] }).success).toBe(false);
    }
  });

  it("rejects a non-string project name and an over-long description", () => {
    expect(schema.safeParse({ projectName: 42 }).success).toBe(false);
    expect(schema.safeParse({ description: "x".repeat(2_001) }).success).toBe(false);
  });
});

describe("readme-skeleton-generator · rule 1, no empty headers", () => {
  it("omits sections that were never toggled on", () => {
    const out = run({ projectName: "Sailor", sections: ["title"] });
    expect(out.sectionsIncluded).toEqual(["title"]);
    expect(out.markdown).not.toMatch(/^## /m);
  });

  it("drops a requested section that has no data rather than emitting a bare header", () => {
    const out = run({ sections: ["title", "authors", "tech-stack"], authors: [], techStack: [] });
    expect(out.markdown).not.toContain("## Authors");
    expect(out.markdown).not.toContain("## Tech Stack");
    expect(out.sectionsOmitted.map((o) => o.section).sort()).toEqual(["authors", "tech-stack"]);
  });

  it("emits nothing at all when every section is off", () => {
    const out = run({ sections: [] });
    expect(out.markdown).toBe("");
    expect(out.chars).toBe(0);
  });

  it("never emits a header immediately followed by another header", () => {
    const out = run({
      projectName: "Sailor",
      sections: [...README_SECTIONS],
      license: "MIT",
      authors: ["@tseka"],
      techStack: ["typescript"],
      calloutBody: "Alpha.",
      badges: { license: true, npmVersion: false, buildStatus: false },
    });
    expect(out.markdown).not.toMatch(/^#{1,2} .*\n\n#{1,2} /m);
  });
});

describe("readme-skeleton-generator · rule 2, GitHub anchor slugification", () => {
  it("lowercases, hyphenates spaces and strips punctuation", () => {
    // "API Reference" → "api-reference"; GitHub drops `(`, `)` entirely, so
    // "Setup (macOS)" → "setup-macos" (not "setup-(macos)").
    expect(githubAnchor("API Reference")).toBe("api-reference");
    expect(githubAnchor("Setup (macOS)")).toBe("setup-macos");
    expect(githubAnchor("`install` the CLI")).toBe("install-the-cli");
    expect(githubAnchor("Notes_and-stuff")).toBe("notes_and-stuff");
  });

  it("suffixes duplicate anchors -1, -2 in document order", () => {
    // GitHub: first occurrence is bare, the next ones get -1, -2 …
    expect(assignAnchors(["Usage", "Usage", "Usage"])).toEqual(["usage", "usage-1", "usage-2"]);
    // Headings that differ only in punctuation collide after slugification —
    // exactly the case a naive lowercase-and-hyphenate gets wrong.
    expect(assignAnchors(["Setup", "Set-up", "Setup!"])).toEqual(["setup", "set-up", "setup-1"]);
  });

  it("emits a TOC whose links match the anchors of the headings it lists", () => {
    const out = run({
      projectName: "Sailor",
      sections: ["title", "toc", "installation", "usage", "api-reference", "license"],
      license: "MIT",
    });
    const links = [...out.markdown.matchAll(/^- \[(.+?)]\(#(.+?)\)$/gm)].map((m) => ({
      text: m[1],
      anchor: m[2],
    }));
    expect(links).toEqual([
      { text: "Installation", anchor: "installation" },
      { text: "Usage", anchor: "usage" },
      { text: "API Reference", anchor: "api-reference" },
      { text: "License", anchor: "license" },
    ]);
    // Every anchor resolves to a heading actually present in the document.
    for (const l of links) {
      expect(out.headings.some((h) => h.anchor === l.anchor)).toBe(true);
    }
    // The TOC does not list itself.
    expect(out.markdown).not.toContain("(#table-of-contents)");
  });

  it("drops the TOC when there are fewer than two linkable sections", () => {
    const out = run({ projectName: "Sailor", sections: ["title", "toc", "usage"] });
    expect(out.markdown).not.toContain("## Table of Contents");
    expect(out.sectionsOmitted.map((o) => o.section)).toContain("toc");
  });
});

describe("readme-skeleton-generator · rule 3, license is referenced not embedded", () => {
  it("emits a one-line SPDX pointer to the LICENSE file", () => {
    const out = run({ sections: ["license"], license: "MIT" });
    expect(out.markdown).toContain(
      "Distributed under the MIT license. See [LICENSE](LICENSE) for the full text.",
    );
  });

  it("never embeds license text", () => {
    const out = run({ sections: ["license"], license: "MIT" });
    expect(out.markdown).not.toMatch(/Permission is hereby granted/i);
    expect(out.markdown.length).toBeLessThan(400);
  });

  it("refuses to guess a license when none was given", () => {
    const out = run({ sections: ["title", "license"] });
    expect(out.markdown).not.toContain("## License");
    expect(out.sectionsOmitted).toContainEqual({
      section: "license",
      reason: "no SPDX license id given",
    });
  });

  it("honours a custom license filename", () => {
    const out = run({ sections: ["license"], license: "Apache-2.0", licenseFile: "COPYING" });
    expect(out.markdown).toContain("See [COPYING](COPYING) for the full text.");
  });
});

describe("readme-skeleton-generator · rule 4, shields.io badge grammar", () => {
  it("escapes the static badge path: - → --, _ → __, space → _", () => {
    expect(shieldsEscape("Apache-2.0")).toBe("Apache--2.0");
    expect(shieldsEscape("build passing")).toBe("build_passing");
    expect(shieldsEscape("a_b")).toBe("a__b");
  });

  it("renders the static license badge with the escaped SPDX id", () => {
    const out = run({
      sections: ["badges"],
      license: "Apache-2.0",
      badges: { license: true, npmVersion: false, buildStatus: false },
    });
    expect(out.markdown).toContain(
      "[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)",
    );
  });

  it("uses the dynamic npm endpoint, not a static badge, for package version", () => {
    const out = run({
      sections: ["badges"],
      npmPackage: "@nebutra/forge-runtime",
      badges: { npmVersion: true, buildStatus: false, license: false },
    });
    expect(out.markdown).toContain("https://img.shields.io/npm/v/@nebutra/forge-runtime");
  });

  it("skips a badge whose data is missing, and says why", () => {
    const out = run({
      sections: ["badges"],
      badges: { npmVersion: true, buildStatus: true, license: true },
    });
    expect(out.sectionsOmitted.map((o) => o.section)).toContain("badges");
    expect(out.warnings).toHaveLength(3);
    expect(out.warnings.join(" ")).toMatch(/owner\/repo/);
  });

  it("rejects a malformed repo for the build badge instead of emitting a broken URL", () => {
    const out = run({
      sections: ["badges"],
      repo: "https://github.com/Nebutra/Sailor",
      badges: { buildStatus: true, npmVersion: false, license: false },
    });
    expect(out.markdown).not.toContain("img.shields.io/github/actions");
    expect(out.warnings.join(" ")).toMatch(/build status badge skipped/);
  });

  it("builds the GitHub Actions endpoint from owner/repo plus a workflow file", () => {
    const out = run({
      sections: ["badges"],
      repo: "Nebutra/Nebutra-Sailor",
      workflowFile: "ci.yml",
      badges: { buildStatus: true, npmVersion: false, license: false },
    });
    expect(out.markdown).toContain(
      "https://img.shields.io/github/actions/workflow/status/Nebutra/Nebutra-Sailor/ci.yml",
    );
  });

  it("renders tech-stack badges with the logo= simple-icons parameter", () => {
    const out = run({ sections: ["tech-stack"], techStack: ["typescript", "postgresql"] });
    expect(out.markdown).toContain("?logo=typescript");
    expect(out.markdown).toContain("?logo=postgresql");
  });

  it("drops a tech-stack entry that is not a simple-icons slug", () => {
    const out = run({ sections: ["tech-stack"], techStack: ["Node JS!", "react"] });
    expect(out.markdown).toContain("?logo=react");
    expect(out.markdown).not.toContain("Node JS!");
    expect(out.warnings.join(" ")).toMatch(/not a simple-icons slug/);
  });
});

describe("readme-skeleton-generator · rule 5, code fences carry a language", () => {
  it("tags the install fence and the usage fence", () => {
    const out = run({
      sections: ["installation", "usage"],
      installCommand: "pnpm add sailor",
      installLanguage: "bash",
      usageExample: "import { sail } from 'sailor';",
      usageLanguage: "ts",
    });
    expect(out.markdown).toContain("```bash\npnpm add sailor\n```");
    expect(out.markdown).toContain("```ts\nimport { sail } from 'sailor';\n```");
    // Every *opening* fence (the even-indexed ones) carries an info string.
    const fences = out.markdown.split("\n").filter((l) => l.startsWith("```"));
    expect(fences).toHaveLength(4);
    for (const [i, line] of fences.entries()) {
      if (i % 2 === 0) expect(line.length).toBeGreaterThan(3);
    }
  });

  it("falls back to `text` rather than an empty info string", () => {
    const out = run({ sections: ["installation"], installLanguage: "", installCommand: "make" });
    expect(out.markdown).toContain("```text\nmake\n```");
  });

  it("refuses a fence language that would break the info string", () => {
    const out = run({
      sections: ["installation"],
      installLanguage: "bash ```evil",
      installCommand: "make",
    });
    expect(out.markdown).toContain("```text\n");
    expect(out.markdown).not.toContain("evil");
  });
});

describe("readme-skeleton-generator · rule 6, GFM alert callouts", () => {
  it("emits a GitHub alert block in the > [!KIND] form", () => {
    const out = run({
      sections: ["callout"],
      calloutKind: "WARNING",
      calloutBody: "Pre-1.0.\nThe API still moves.",
    });
    expect(out.markdown).toBe("> [!WARNING]\n> Pre-1.0.\n> The API still moves.\n");
  });

  it("rejects an alert kind GitHub does not render", () => {
    expect(schema.safeParse({ calloutKind: "DANGER" }).success).toBe(false);
  });

  it("omits the callout when its body is empty", () => {
    const out = run({ sections: ["title", "callout"] });
    expect(out.markdown).not.toContain("[!NOTE]");
  });
});

describe("readme-skeleton-generator · never a broken page", () => {
  it("falls back to a placeholder title and description", () => {
    const out = run({ sections: ["title"] });
    expect(out.markdown).toContain("# Project Title");
    expect(out.markdown).toContain("One sentence on what this project does");
  });

  it("derives the placeholder install command from the project name", () => {
    const out = run({ projectName: "Nebutra Sailor!", sections: ["installation"] });
    expect(out.markdown).toContain("npm install nebutra-sailor");
  });

  it("renders sections in the fixed order regardless of the order requested", () => {
    const out = run({
      sections: ["license", "usage", "title", "installation"],
      license: "MIT",
    });
    expect(out.sectionsIncluded).toEqual(["title", "installation", "usage", "license"]);
  });

  it("de-duplicates a repeated section id", () => {
    const out = run({ sections: ["title", "title", "usage"] });
    expect(out.sectionsIncluded).toEqual(["title", "usage"]);
  });

  it("links an @handle author to GitHub and leaves a plain name alone", () => {
    const out = run({ sections: ["authors"], authors: ["@octokatherine", "Jane Roe"] });
    expect(out.markdown).toContain("- [@octokatherine](https://github.com/octokatherine)");
    expect(out.markdown).toContain("- Jane Roe");
  });

  it("ends the document with exactly one trailing newline", () => {
    const out = run({ projectName: "Sailor", sections: ["title", "usage"] });
    expect(out.markdown.endsWith("\n")).toBe(true);
    expect(out.markdown.endsWith("\n\n")).toBe(false);
    expect(out.chars).toBe(out.markdown.length);
  });
});

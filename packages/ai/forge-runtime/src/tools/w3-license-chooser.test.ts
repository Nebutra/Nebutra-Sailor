import { describe, expect, it } from "vitest";
import {
  findLicense,
  GENERATABLE_SPDX_IDS,
  LICENSES,
  licenseGenerateTool,
  licenseRecommendTool,
  w3LicenseChooserTools,
} from "./w3-license-chooser";

/* The registry erases tool output types (AnyForgeToolDefinition), so the tests
 * re-attach the contract they assert against — the same shape §9.6 of the brief
 * publishes to agents. */

interface Alternate {
  spdxId: string;
  name: string;
  why: string;
  whyZh: string;
}

interface RecommendResult {
  scenario: string;
  licenseId: string | null;
  spdxId: string | null;
  name: string | null;
  family: string | null;
  url: string | null;
  rationale: string;
  rationaleZh: string;
  permissions: string[];
  conditions: string[];
  limitations: string[];
  alternates: Alternate[];
  generatable: boolean;
  nextStep: string | null;
  noLicenseWarning: string;
  disclaimer: string;
}

interface GenerateResult {
  spdxId: string;
  name: string;
  family: string;
  filename: string;
  text: string;
  bytes: number;
  lines: number;
  holder: string;
  year: number;
  holderSubstituted: boolean;
  spdxHeaderSnippet: string;
  noticeSnippet: string | null;
  manifest: Record<string, string>;
  placement: string;
  disclaimer: string;
  source: { name: string; version: string; releaseDate: string; url: string };
}

function recommend(input: unknown): RecommendResult {
  return licenseRecommendTool.execute(
    licenseRecommendTool.inputSchema.parse(input),
  ) as RecommendResult;
}

function generate(input: unknown): GenerateResult {
  return licenseGenerateTool.execute(
    licenseGenerateTool.inputSchema.parse(input),
  ) as GenerateResult;
}

/* ── registry contract ──────────────────────────────────────────────────── */

describe("tool declarations", () => {
  it("declares both operations pure, deterministic and slug-derived", () => {
    expect(w3LicenseChooserTools).toHaveLength(2);
    for (const tool of w3LicenseChooserTools) {
      expect(tool.sideEffect).toBe("pure");
      expect(tool.category).toBe("template");
      expect(tool.meterId).toBe(`forge.template.${tool.slug.replace(/-/g, "_")}`);
      expect(tool.roots).toContain("template");
      expect(tool.title.zh).toBeTruthy();
      expect(tool.title.en).toBeTruthy();
      expect(tool.description.zh).toBeTruthy();
      expect(tool.description.en).toBeTruthy();
      expect(tool.seoKeywords.zh).toBeTruthy();
      expect(tool.seoKeywords.en).toBeTruthy();
      // Gate §6.5 #10: the engine names the spec it implements, with a version.
      expect(tool.engine.name).toBe("SPDX License List");
      expect(tool.engine.version).toMatch(/^\S+ \(\d{4}-\d{2}-\d{2}\)$/);
    }
    expect(licenseRecommendTool.id).toBe("template/license-recommend");
    expect(licenseGenerateTool.id).toBe("template/license-generate");
  });

  it("keeps SPDX ids unique and every vendored text reachable", () => {
    const ids = LICENSES.map((l) => l.spdxId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(GENERATABLE_SPDX_IDS).toContain("MIT");
    // Content licenses are recommendable but deliberately not generated here.
    expect(GENERATABLE_SPDX_IDS).not.toContain("CC-BY-4.0");
  });

  it("is deterministic — the same input yields byte-identical output", () => {
    const a = generate({ spdxId: "MIT", holder: "Jane Doe", year: 2026 });
    const b = generate({ spdxId: "MIT", holder: "Jane Doe", year: 2026 });
    expect(a.text).toBe(b.text);
    expect(recommend({ scenario: "copyleft" })).toEqual(recommend({ scenario: "copyleft" }));
  });
});

/* ── recommendation: the triage table ───────────────────────────────────── */

describe("license-recommend", () => {
  it("resolves the permissive scenario to MIT in one step", () => {
    const r = recommend({ scenario: "permissive" });
    expect(r.spdxId).toBe("MIT");
    expect(r.licenseId).toBe("mit");
    expect(r.family).toBe("permissive");
    expect(r.generatable).toBe(true);
    expect(r.conditions).toEqual(["include-copyright"]);
    expect(r.url).toBe("https://spdx.org/licenses/MIT.html");
  });

  it("know-how #5: a patent concern moves the permissive answer to Apache-2.0", () => {
    const r = recommend({ scenario: "permissive", patentConcern: true });
    expect(r.spdxId).toBe("Apache-2.0");
    expect(r.permissions).toContain("patent-use");
    // …and it says *why*, rather than presenting Apache as MIT with paperwork.
    expect(r.rationale).toMatch(/patent/i);
    expect(r.alternates.map((a) => a.spdxId)).toContain("MIT");
    // MIT itself must not claim a patent grant it does not make.
    expect(recommend({ scenario: "permissive" }).permissions).not.toContain("patent-use");
  });

  it("resolves plain copyleft to GPL-3.0-or-later", () => {
    const r = recommend({ scenario: "copyleft" });
    expect(r.spdxId).toBe("GPL-3.0-or-later");
    expect(r.family).toBe("strong-copyleft");
    expect(r.conditions).toContain("same-license");
    expect(r.conditions).not.toContain("network-use-disclose");
  });

  it("know-how #4: -only vs -or-later is a real choice, not a version typo", () => {
    expect(recommend({ scenario: "copyleft", futureVersions: "only" }).spdxId).toBe("GPL-3.0-only");
    expect(recommend({ scenario: "copyleft", futureVersions: "or-later" }).spdxId).toBe(
      "GPL-3.0-or-later",
    );
    expect(
      recommend({ scenario: "copyleft", networkService: true, futureVersions: "only" }).spdxId,
    ).toBe("AGPL-3.0-only");
    // Default stays -or-later: combining with Apache-2.0 code needs it.
    expect(recommend({ scenario: "copyleft" }).spdxId).toBe("GPL-3.0-or-later");
  });

  it("know-how #3: a network service triggers AGPL, and AGPL alone carries §13", () => {
    const agpl = recommend({ scenario: "copyleft", networkService: true });
    expect(agpl.spdxId).toBe("AGPL-3.0-or-later");
    expect(agpl.conditions).toContain("network-use-disclose");
    expect(agpl.rationale).toMatch(/network/i);
    // The network trigger outranks the library refinement.
    expect(
      recommend({ scenario: "copyleft", networkService: true, projectKind: "library" }).spdxId,
    ).toBe("AGPL-3.0-or-later");
    // Plain GPL must not be described as covering network use.
    expect(findLicense("GPL-3.0-or-later")?.conditions).not.toContain("network-use-disclose");
  });

  it("know-how #2: a library gets file-scoped weak copyleft, with LGPL as the alternate", () => {
    const r = recommend({ scenario: "copyleft", projectKind: "library" });
    expect(r.spdxId).toBe("MPL-2.0");
    expect(r.family).toBe("weak-copyleft");
    expect(r.conditions).toContain("same-license-file");
    expect(r.alternates.map((a) => a.spdxId)).toContain("LGPL-3.0-or-later");
  });

  it("refuses to invent an answer for a contribution to an existing project", () => {
    const r = recommend({ scenario: "community" });
    expect(r.spdxId).toBeNull();
    expect(r.generatable).toBe(false);
    expect(r.alternates).toEqual([]);
    expect(r.nextStep).toMatch(/LICENSE/);
  });

  it("know-how #9: non-software is routed to Creative Commons, not to MIT", () => {
    const r = recommend({ scenario: "non-software" });
    expect(r.spdxId).toBe("CC-BY-4.0");
    expect(r.family).toBe("content");
    // Recommendable, but we do not hand out a CC file from this tool.
    expect(r.generatable).toBe(false);
    expect(r.alternates.map((a) => a.spdxId)).toEqual(["CC0-1.0", "CC-BY-SA-4.0"]);
  });

  it("answers 'unsure' with the low-regret default plus a copyleft escape", () => {
    const r = recommend({ scenario: "unsure" });
    expect(r.spdxId).toBe("MIT");
    expect(r.alternates.map((a) => a.spdxId)).toEqual(["Apache-2.0", "ISC", "GPL-3.0-or-later"]);
  });

  it("know-how #1: every answer states that no license ≠ public domain", () => {
    for (const scenario of ["permissive", "copyleft", "community", "unsure", "non-software"]) {
      const r = recommend({ scenario });
      expect(r.noLicenseWarning).toMatch(/not the same as public domain/i);
      expect(r.disclaimer).toMatch(/not legal advice/i);
      expect(r.rationaleZh).toBeTruthy();
    }
  });

  it("rejects input the contract does not allow", () => {
    expect(() => recommend({ scenario: "whatever" })).toThrow();
    expect(() => recommend({})).toThrow();
    expect(() => recommend({ scenario: "copyleft", futureVersions: "v3" })).toThrow();
    expect(() => recommend({ scenario: "copyleft", projectKind: "firmware" })).toThrow();
  });
});

/* ── generation: byte-faithful text ─────────────────────────────────────── */

describe("license-generate", () => {
  it("fills the MIT copyright line and changes nothing else", () => {
    const a = generate({ spdxId: "MIT", holder: "Jane Doe", year: 2026 });
    expect(a.filename).toBe("LICENSE");
    expect(a.holderSubstituted).toBe(true);
    expect(a.text.startsWith("MIT License\n\nCopyright (c) 2026 Jane Doe\n")).toBe(true);
    expect(a.text).not.toContain("<year>");
    expect(a.text).not.toContain("<copyright holders>");
    // Exactly one line may differ between two holders — the copyright line.
    const b = generate({ spdxId: "MIT", holder: "ACME Corp", year: 1999 });
    const la = a.text.split("\n");
    const lb = b.text.split("\n");
    expect(la.length).toBe(lb.length);
    expect(la.filter((line, i) => line !== lb[i])).toEqual(["Copyright (c) 2026 Jane Doe"]);
  });

  it("know-how #7: Apache-2.0 ships verbatim — the APPENDIX is instructions, not a form", () => {
    const r = generate({ spdxId: "Apache-2.0", holder: "ACME Corp", year: 2026 });
    expect(r.holderSubstituted).toBe(false);
    expect(r.text.startsWith("Apache License\nVersion 2.0, January 2004\n")).toBe(true);
    // The bracketed fields belong to the appendix and stay as written…
    expect(r.text).toContain("Copyright [yyyy] [name of copyright owner]");
    expect(r.text).not.toContain("Copyright 2026 ACME Corp");
    // …while the filled boilerplate is handed over separately, for source files.
    expect(r.noticeSnippet).toContain("Copyright 2026 ACME Corp");
    expect(r.noticeSnippet).toContain("http://www.apache.org/licenses/LICENSE-2.0");
  });

  it("keeps the GNU texts identical across -only / -or-later and differs in the notice", () => {
    const only = generate({ spdxId: "GPL-3.0-only", holder: "Jane Doe", year: 2026 });
    const later = generate({ spdxId: "GPL-3.0-or-later", holder: "Jane Doe", year: 2026 });
    expect(only.text).toBe(later.text);
    expect(only.text.startsWith("GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n")).toBe(
      true,
    );
    expect(only.holderSubstituted).toBe(false);

    // The choice shows up exactly where it is load-bearing: the SPDX id and the
    // source-file notice's version clause.
    expect(only.spdxHeaderSnippet).toContain("SPDX-License-Identifier: GPL-3.0-only");
    expect(later.spdxHeaderSnippet).toContain("SPDX-License-Identifier: GPL-3.0-or-later");
    expect(later.noticeSnippet).toContain("or (at your option) any later version.");
    expect(only.noticeSnippet).not.toContain("any later version");
    expect(only.noticeSnippet).toContain("version 3 of the License.");
    expect(only.noticeSnippet).toContain("Copyright (C) 2026  Jane Doe");
  });

  it("gives AGPL its own text and its own notice wording", () => {
    const agpl = generate({ spdxId: "AGPL-3.0-or-later", holder: "Jane Doe", year: 2026 });
    const gpl = generate({ spdxId: "GPL-3.0-or-later", holder: "Jane Doe", year: 2026 });
    expect(agpl.text).not.toBe(gpl.text);
    expect(agpl.text.startsWith("GNU AFFERO GENERAL PUBLIC LICENSE\n")).toBe(true);
    expect(agpl.noticeSnippet).toContain("GNU Affero General Public License");
    expect(gpl.noticeSnippet).not.toContain("Affero");
  });

  it("uses the program name in the GNU notice when one is given", () => {
    const named = generate({
      spdxId: "GPL-3.0-only",
      holder: "Jane Doe",
      year: 2026,
      program: "widgetd — a widget daemon",
    });
    expect(named.noticeSnippet?.startsWith("widgetd — a widget daemon\n")).toBe(true);
    const unnamed = generate({ spdxId: "GPL-3.0-only", holder: "Jane Doe", year: 2026 });
    expect(unnamed.noticeSnippet?.startsWith("<one line to give the program's name")).toBe(true);
  });

  it("emits the ISC file in the holder's own name — including the disclaimer", () => {
    const r = generate({ spdxId: "ISC", holder: "Jane Doe", year: 2026 });
    expect(r.text).not.toContain("Internet Systems Consortium");
    expect(r.text).not.toContain("Internet Software Consortium");
    expect(r.text).toContain("Copyright (c) 2026 Jane Doe");
    expect(r.holderSubstituted).toBe(true);
    // The trap: SPDX's ISC text disclaims warranties on *ISC's* behalf. Swapping
    // the copyright line alone leaves "IN NO EVENT SHALL ISC BE LIABLE" in a
    // file that has nothing to do with ISC — a legally incoherent document.
    expect(r.text).not.toMatch(/\bISC DISCLAIMS\b/);
    expect(r.text).not.toMatch(/SHALL ISC BE LIABLE/);
    expect(r.text).toContain("THE AUTHOR DISCLAIMS ALL WARRANTIES");
    expect(r.text).toContain("IN NO EVENT SHALL THE AUTHOR BE LIABLE");
  });

  it("names no third party in any generated file", () => {
    // A holder-substituted text must not leave another entity standing in the
    // liability or warranty clauses. (Apache/MPL/GNU ship verbatim and do name
    // their stewards in the preamble, which is correct for those files.)
    for (const spdxId of GENERATABLE_SPDX_IDS) {
      const r = generate({ spdxId, holder: "Jane Doe", year: 2026 });
      if (!r.holderSubstituted) continue;
      expect(r.text).not.toMatch(/\bConsortium\b/);
      expect(r.text).not.toMatch(/\bFree Software Foundation\b/);
    }
  });

  it("leaves no trailing whitespace on the BSD copyright lines", () => {
    const three = generate({ spdxId: "BSD-3-Clause", holder: "Jane Doe", year: 2026 });
    expect(three.text.startsWith("Copyright (c) 2026 Jane Doe.\n")).toBe(true);
    const two = generate({ spdxId: "BSD-2-Clause", holder: "Jane Doe", year: 2026 });
    expect(two.text.startsWith("Copyright (c) 2026 Jane Doe\n")).toBe(true);
    expect(two.text).not.toMatch(/^Copyright.* $/m);
  });

  it("leaves the Unlicense and MPL texts alone — neither carries a holder field", () => {
    const unl = generate({ spdxId: "Unlicense", holder: "Jane Doe", year: 2026 });
    expect(unl.holderSubstituted).toBe(false);
    expect(unl.text).not.toContain("Jane Doe");
    expect(unl.noticeSnippet).toBeNull();

    const mpl = generate({ spdxId: "MPL-2.0", holder: "Jane Doe", year: 2026 });
    expect(mpl.holderSubstituted).toBe(false);
    expect(mpl.text.startsWith("Mozilla Public License Version 2.0\n")).toBe(true);
    expect(mpl.noticeSnippet).toContain("https://mozilla.org/MPL/2.0/");
    expect(mpl.noticeSnippet).not.toContain("Jane Doe");
  });

  it("know-how #6 + #8: SPDX id is the machine key and the file is named LICENSE", () => {
    const r = generate({ spdxId: "GPL-3.0-or-later", holder: "Jane Doe", year: 2026 });
    expect(r.filename).toBe("LICENSE");
    expect(r.manifest["package.json"]).toBe('"license": "GPL-3.0-or-later"');
    expect(r.manifest["Cargo.toml"]).toBe('license = "GPL-3.0-or-later"');
    expect(r.manifest["pyproject.toml"]).toBe('license = "GPL-3.0-or-later"');
    expect(r.placement).toMatch(/repository root/i);
    expect(r.source.name).toBe("SPDX License List");
  });

  it("emits the SPDX file header in every comment syntax", () => {
    const base = { spdxId: "MIT", holder: "Jane Doe", year: 2026 };
    expect(generate(base).spdxHeaderSnippet).toBe(
      "// SPDX-FileCopyrightText: 2026 Jane Doe\n// SPDX-License-Identifier: MIT",
    );
    expect(generate({ ...base, commentStyle: "hash" }).spdxHeaderSnippet).toBe(
      "# SPDX-FileCopyrightText: 2026 Jane Doe\n# SPDX-License-Identifier: MIT",
    );
    expect(generate({ ...base, commentStyle: "html" }).spdxHeaderSnippet).toBe(
      "<!-- SPDX-FileCopyrightText: 2026 Jane Doe -->\n<!-- SPDX-License-Identifier: MIT -->",
    );
    expect(generate({ ...base, commentStyle: "block" }).spdxHeaderSnippet).toBe(
      "/*\n * SPDX-FileCopyrightText: 2026 Jane Doe\n * SPDX-License-Identifier: MIT\n */",
    );
  });

  it("treats a holder containing replacement syntax as literal text", () => {
    // "$&" is the whole-match token of String.replace — a naive implementation
    // would inject the placeholder back into the file.
    const r = generate({ spdxId: "MIT", holder: "A$& $1 Ltd", year: 2026 });
    expect(r.text).toContain("Copyright (c) 2026 A$& $1 Ltd");
    expect(r.text).not.toContain("<copyright holders>");
  });

  it("substitutes correctly for every license whose text we vendor", () => {
    for (const spdxId of GENERATABLE_SPDX_IDS) {
      const r = generate({ spdxId, holder: "Jane Doe", year: 2026 });
      expect(r.text.length).toBeGreaterThan(500);
      expect(r.bytes).toBe(new TextEncoder().encode(r.text).length);
      expect(r.lines).toBe(r.text.split("\n").length);
      expect(r.spdxHeaderSnippet).toContain(`SPDX-License-Identifier: ${spdxId}`);
      if (r.holderSubstituted) {
        expect(r.text).toContain("Jane Doe");
        expect(r.text).not.toMatch(/<year>|<owner>|<copyright holders>/);
      }
    }
  });

  it("rejects input that would produce a wrong or broken legal document", () => {
    expect(() => generate({ spdxId: "MIT-0", holder: "Jane Doe", year: 2026 })).toThrow(
      /Unknown SPDX id/,
    );
    // Content licenses are recommendable but not generated here.
    expect(() => generate({ spdxId: "CC-BY-4.0", holder: "Jane Doe", year: 2026 })).toThrow(
      /content license/,
    );
    expect(() =>
      generate({ spdxId: "MIT", holder: "Jane\nDoe <evil@example.com>", year: 2026 }),
    ).toThrow(/single line/);
    expect(() => generate({ spdxId: "MIT", holder: "   ", year: 2026 })).toThrow(/blank/);
    // Schema-level rejections.
    expect(() => generate({ spdxId: "MIT", holder: "Jane Doe" })).toThrow();
    expect(() => generate({ spdxId: "MIT", holder: "", year: 2026 })).toThrow();
    expect(() => generate({ spdxId: "MIT", holder: "Jane Doe", year: 1969 })).toThrow();
    expect(() => generate({ spdxId: "MIT", holder: "Jane Doe", year: 2026.5 })).toThrow();
    expect(() =>
      generate({ spdxId: "MIT", holder: "Jane Doe", year: 2026, commentStyle: "lisp" }),
    ).toThrow();
  });

  it("hands the recommendation straight to the generator", () => {
    // The brief's differentiator (§9.5): decision feeds generation with no
    // intermediate step and no re-typing of the license name.
    const r = recommend({ scenario: "copyleft", networkService: true });
    expect(r.generatable).toBe(true);
    const file = generate({ spdxId: r.spdxId as string, holder: "Jane Doe", year: 2026 });
    expect(file.spdxId).toBe("AGPL-3.0-or-later");
    expect(file.filename).toBe("LICENSE");
  });
});

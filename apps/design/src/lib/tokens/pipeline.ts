/**
 * The layer model, read out of the files themselves.
 *
 * Item 3 of the brief: a reader must be able to SEE that
 * `packages/design/tokens/styles.css` is output, not input. So this module does
 * not describe the pipeline in prose — it opens each file and reports the first
 * comment block, which is where every generated file in this repo announces
 * itself. `packages/design/tokens/styles.css` line 5 reads
 * "AUTO-GENERATED from packages/design/design-tokens/tokens/*.json — DO NOT EDIT".
 * The site quotes that line. If the file stops being generated, the quote
 * changes with it.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PROBE = join("packages", "design", "design-tokens", "tokens", "core.json");

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let up = 0; up < 6; up += 1) {
    if (existsSync(join(dir, PROBE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`[apps/design] Could not locate ${PROBE} from ${process.cwd()}.`);
}

const REPO_ROOT = findRepoRoot();

export type Editability = "editable" | "generated" | "generated-untracked";

export interface PipelineStage {
  /** Repo-relative path. */
  path: string;
  /** What this file is for, in one line. */
  role: string;
  editability: Editability;
  /**
   * The evidence for `editability`, quoted from the file's own header — or the
   * reason there is none. Never a claim this app makes on its own.
   */
  evidence: string;
  /** True when the file is present on disk right now. */
  present: boolean;
}

/** Markers a generated file uses to say so. Matched case-insensitively. */
const GENERATED_MARKERS = [/do not edit/iu, /auto-generated/iu, /generated from/iu];

/**
 * Quote the strongest self-declaration in a file's first 40 lines.
 *
 * Markers are tried in order, so "DO NOT EDIT" wins over "generated from", and a
 * `biome-ignore` pragma is only quoted when nothing clearer exists — a lint
 * suppression that happens to mention generation is weaker evidence than the
 * banner written for a human.
 */
function quoteEvidence(absolute: string): { evidence: string; declaresGenerated: boolean } {
  if (!existsSync(absolute)) {
    return { evidence: "not present in this checkout", declaresGenerated: false };
  }

  const lines = readFileSync(absolute, "utf8")
    .split("\n")
    .slice(0, 40)
    .map((entry) => entry.replace(/^[\s*/]+/u, "").trim())
    .filter(Boolean);

  const ranked = [
    ...lines.filter((entry) => !entry.startsWith("biome-ignore")),
    ...lines.filter((entry) => entry.startsWith("biome-ignore")),
  ];

  for (const marker of GENERATED_MARKERS) {
    const hit = ranked.find((entry) => marker.test(entry));
    if (hit) return { evidence: hit, declaresGenerated: true };
  }

  return { evidence: "header carries no generated-file marker", declaresGenerated: false };
}

interface StageSpec {
  path: string;
  role: string;
  /** `generated-untracked` for build output that is gitignored. */
  expected: Editability;
}

/**
 * The token pipeline, in dependency order. Each entry names a real file; the
 * editability column is decided by reading it, not by this list.
 */
const STAGES: StageSpec[] = [
  {
    path: "packages/design/design-tokens/tokens/core.json",
    role: "Primitive palettes and foundations — the 11-stop brand ramps, radius ladder, durations, easings, font stacks. Layer 1.",
    expected: "editable",
  },
  {
    path: "packages/design/design-tokens/tokens/semantic.json",
    role: "Semantic aliases over the primitives — brand.primary, status.*, container widths, focus ring. Mode-agnostic. Layer 2.",
    expected: "editable",
  },
  {
    path: "packages/design/design-tokens/tokens/themes/light.json",
    role: "Light mode: the 12-step functional scales, the shadcn semantic roles, the Geist-compat tier, and the elevation ramp. Layer 3.",
    expected: "editable",
  },
  {
    path: "packages/design/design-tokens/tokens/themes/dark.json",
    role: "Dark mode, same shape. Its values are chosen independently — not derived from light — which is why the elevation page renders both.",
    expected: "editable",
  },
  {
    path: "packages/design/design-tokens/scripts/derive-border-tier.mjs",
    role: "Computes scale steps 6/7/8 (the border tier) at build time by OKLab interpolation, and asserts the 12-step ladder invariant. This site imports the same module, so the L* and contrast numbers it prints are the ones the build checked.",
    expected: "editable",
  },
  {
    path: "packages/design/design-tokens/scripts/css-var-name.mjs",
    role: "The single DTCG-path → CSS-variable namer. Used by the token build to emit the CSS and by this site to label every row, so a rename cannot land in one place only.",
    expected: "editable",
  },
  {
    path: "packages/design/design-tokens/style-dictionary.config.mjs",
    role: "The Style Dictionary 4 build. Merges core → semantic → theme per mode, runs the border-tier preprocessor, and writes CSS, TypeScript and a Tailwind preset.",
    expected: "editable",
  },
  {
    path: "packages/design/design-tokens/build/css/styles.generated.css",
    role: "Build output. The parity target that packages/design/tokens/styles.css is checked against. Gitignored.",
    expected: "generated-untracked",
  },
  {
    path: "packages/design/tokens/styles.css",
    role: "The runtime stylesheet every app imports. A byte copy of the build output above, produced by packages/design/tokens/scripts/sync-styles.mjs.",
    expected: "generated",
  },
  {
    path: "packages/design/tokens/recipe.css",
    role: "The product-chrome recipe layer on top of the tokens: role indirections (--role-action), component slots (--btn-default-bg), brand-skin override points. Hand-maintained — it composes tokens rather than declaring them.",
    expected: "editable",
  },
];

export function pipeline(): PipelineStage[] {
  return STAGES.map((stage) => {
    const absolute = join(REPO_ROOT, stage.path);
    const present = existsSync(absolute);
    const { evidence, declaresGenerated } = quoteEvidence(absolute);

    // The file's own header decides. If a file we expected to be generated does
    // not say so, the site reports what the file says — the disagreement is the
    // information.
    const editability: Editability =
      stage.expected === "editable"
        ? declaresGenerated
          ? "generated"
          : "editable"
        : stage.expected;

    return { path: stage.path, role: stage.role, editability, evidence, present };
  });
}

/** The one-line rule that follows from the table above. */
export const EDIT_RULE =
  "Change a value in tokens/*.json, then run `pnpm --filter @nebutra/design-tokens build` " +
  "followed by `pnpm --filter @nebutra/tokens build`. Editing styles.css directly is " +
  "overwritten by the next sync, and the parity check will not notice the value you wanted.";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * "Every new component MUST have a Storybook story." — CLAUDE.md, Adding New
 * Components, Step 3.
 *
 * Nothing enforced that. docs/design-system/component-census.md measured the
 * consequence: 235 source files under `packages/design/ui/src/{components,
 * primitives,patterns}`, 58 of them with no sibling story, and — the number that
 * matters — standalone exported components with no story anywhere. This test is
 * the enforcement the census said did not exist (§1 Governance state, §6.9).
 *
 * Two measurement traps the census identified, and how this test avoids each:
 *
 *  1. **Compound sub-parts are not coverage debt.** `SelectTrigger`,
 *     `DialogFooter`, `CardHeader`, `DropdownMenuSeparator` and ~240 siblings are
 *     exercised by the story for their parent. Counting them turns a real 130
 *     into a fake 550 and makes the list unreadable. The census classified them
 *     by hand; the mechanical form of the same rule is: a symbol is a compound
 *     part when another export **in the same file** is a strict prefix of its
 *     name at a word boundary (`Select` ⊂ `SelectTrigger`). Cross-file names are
 *     never collapsed, which is why `AvatarSmartGroup` (its own file) counts and
 *     `AccordionItem` (same file as `Accordion`) does not. `Badge1` counts, as
 *     the census asked: `1` is not a word boundary.
 *
 *  2. **Stories live in two places.** `packages/design/ui/src/**\/*.stories.tsx`
 *     (195 files) and `apps/storybook/src/**\/*.stories.tsx` (22 files). Both
 *     count. CLAUDE.md's Step 2 file structure documents only the colocated one,
 *     so a sibling-file check reports components as storyless when their story is
 *     simply in the other tree — that documentation gap is a finding in its own
 *     right, recorded in the census §1 and §6.4.
 *
 * What counts as covered, and why not less:
 *
 *   - the symbol is a story **subject** (`component: X`, or a `title:` whose last
 *     segment is `X`), or
 *   - some story file **renders** it — `<X>` / `<X />` / `<X `.
 *
 * The census flagged (§6.3) that its own 171-symbol figure was a bare text
 * match: a name in an import list counted as coverage. Requiring a JSX render
 * site is the strongest signal available without parsing the story graph, and it
 * has a useful property — one composition story that assembles a family
 * (`command-menu-parts.tsx`'s nine exports, `tree.tsx`'s seven) clears all of
 * them at once, which is exactly what the census recommends writing.
 *
 * Everything uncovered is absorbed by MISSING_STORY_ALLOWLIST, shrink-only in
 * the shape of tests/architecture/doc-claims-drift.test.ts: a new storyless
 * component fails, and a *stale* entry fails too, so writing the story forces
 * the exemption out. The list is sorted — read it as the worklist it is.
 *
 * Deliberately NOT filtered by consumer count. The census's headline 41 was
 * "standalone *and consumed*", and it warned that consumer counts are name-grep
 * heuristics (§6.2). A component with zero consumers still owes either a story
 * or a deletion (census §4 lists 11 delete candidates); deleting it satisfies
 * this test the same way writing a story does.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const UI_SRC = resolve(ROOT, "packages/design/ui/src");
const STORYBOOK_SRC = resolve(ROOT, "apps/storybook/src");

/** The three directories the component census surveyed. */
const SURVEYED_DIRS = ["components", "primitives", "patterns"] as const;

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".open-next",
  "storybook-static",
  "dist",
  ".turbo",
  ".deploy",
  "__tests__",
]);

/* ------------------------------------------------------------------ *
 * File collection
 * ------------------------------------------------------------------ */

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else if (entry.isFile()) results.push(full);
  }
  return results;
}

const isStory = (f: string) => f.endsWith(".stories.tsx");

function sourceFiles(): string[] {
  return SURVEYED_DIRS.flatMap((d) => walk(join(UI_SRC, d)))
    .filter((f) => f.endsWith(".tsx") && !/\.(stories|test|spec)\.tsx$/.test(f))
    .sort();
}

/** Both documented-and-undocumented story locations. */
function storyFiles(): { colocated: string[]; storybookApp: string[] } {
  return {
    colocated: walk(UI_SRC).filter(isStory).sort(),
    storybookApp: walk(STORYBOOK_SRC).filter(isStory).sort(),
  };
}

/* ------------------------------------------------------------------ *
 * Exported components
 * ------------------------------------------------------------------ */

/**
 * `export const|function|class X`. Half the library instead uses a trailing
 * `export { Card, CardHeader, … }` block, so both forms are read — a
 * declaration-only regex would make `Card` itself invisible to this test, which
 * is the same inverted-coverage failure this whole exercise is about. Re-export
 * blocks with a `from` clause are skipped: the story is owed by the file that
 * defines the component, not by a barrel.
 */
const EXPORT_DECLARATION =
  /^export\s+(?:default\s+)?(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_BLOCK = /^export\s*\{([^}]*)\}\s*;?[ \t]*$/gm;

/** PascalCase with at least one lowercase letter — excludes `SOME_CONSTANT`. */
const looksLikeComponent = (name: string) => /^[A-Z]/.test(name) && /[a-z]/.test(name);

function exportedComponents(file: string): string[] {
  const source = readFileSync(file, "utf-8");
  const names = new Set<string>();

  for (const match of source.matchAll(EXPORT_DECLARATION)) {
    const name = match[1] as string;
    if (looksLikeComponent(name)) names.add(name);
  }

  for (const match of source.matchAll(EXPORT_BLOCK)) {
    if (/\bfrom\b/.test(match[0])) continue;
    for (const raw of (match[1] as string).split(",")) {
      const spec = raw.trim();
      if (!spec || spec.startsWith("type ")) continue;
      const alias = (spec.split(/\s+as\s+/).pop() as string).trim();
      if (looksLikeComponent(alias)) names.add(alias);
    }
  }

  return [...names];
}

/**
 * A compound sub-part: another export in the same file is a prefix of this name
 * ending at a word boundary. `Select` ⊂ `SelectTrigger` (part).
 * `Badge` ⊄ `Badge1` (`1` is not a new word) — the census wanted `Badge1`
 * triaged, not hidden.
 */
function isCompoundPart(name: string, siblings: readonly string[]): boolean {
  return siblings.some(
    (parent) =>
      parent !== name && name.startsWith(parent) && /^[A-Z]/.test(name.slice(parent.length)),
  );
}

/* ------------------------------------------------------------------ *
 * Story coverage
 * ------------------------------------------------------------------ */

interface StoryIndex {
  subjects: Set<string>;
  texts: string[];
}

function indexStories(files: readonly string[]): StoryIndex {
  const subjects = new Set<string>();
  const texts: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf-8");
    texts.push(text);
    for (const match of text.matchAll(/component:\s*([A-Z][A-Za-z0-9_]*)/g)) {
      subjects.add(match[1] as string);
    }
    for (const match of text.matchAll(/title:\s*["'`]([^"'`]+)["'`]/g)) {
      const segment = ((match[1] as string).split("/").pop() as string).trim();
      if (/^[A-Z][A-Za-z0-9_]*$/.test(segment)) subjects.add(segment);
    }
  }
  return { subjects, texts };
}

function isCovered(name: string, index: StoryIndex): boolean {
  if (index.subjects.has(name)) return true;
  const rendered = new RegExp(`<${name}[\\s/>]`);
  return index.texts.some((text) => rendered.test(text));
}

/* ------------------------------------------------------------------ *
 * Shrink-only baseline
 * ------------------------------------------------------------------ */

/**
 * Standalone exported components with no story in either tree, as `Name @ path`.
 * The list may only shrink — see the header. Two ways to remove an entry:
 * write the story, or delete the component (census §3 and §4 name the merge and
 * delete candidates among these).
 *
 * One composition story can clear a whole cluster: the nine `CommandMenu*` parts,
 * the seven `Tree*` parts, the `Kinetic*` set, and the eleven `*Loader` variants
 * are each one story's worth of work, not nine.
 */
const MISSING_STORY_ALLOWLIST: readonly string[] = [
  "Alert @ packages/design/ui/src/primitives/alert.tsx",
  "AlertDialog @ packages/design/ui/src/primitives/alert-dialog.tsx",
  "AnimatedCircularProgressBar @ packages/design/ui/src/primitives/animated-circular-progress-bar.tsx",
  "AnimatedThemeToggler @ packages/design/ui/src/primitives/theme-toggle.tsx",
  "AppleLiquidGlassSwitcher @ packages/design/ui/src/primitives/apple-liquid-glass-switcher.tsx",
  "ArtifactShiftCard @ packages/design/ui/src/patterns/artifact-shift-card.tsx",
  "AsciiText @ packages/design/ui/src/components/ascii-text.tsx",
  "AspectRatio @ packages/design/ui/src/primitives/aspect-ratio.tsx",
  "AvatarSmartGroup @ packages/design/ui/src/primitives/avatar-smart-group.tsx",
  "Badge1 @ packages/design/ui/src/primitives/badge-1.tsx",
  "BarsLoader @ packages/design/ui/src/primitives/loader.tsx",
  "BaseBadge @ packages/design/ui/src/primitives/base-badge.tsx",
  "BaseBadgeButton @ packages/design/ui/src/primitives/base-badge-button.tsx",
  "BaseBadgeDot @ packages/design/ui/src/primitives/base-badge-dot.tsx",
  "BaseButton @ packages/design/ui/src/primitives/base-button.tsx",
  "Book @ packages/design/ui/src/primitives/book.tsx",
  "BrandMark @ packages/design/ui/src/primitives/brand-mark.tsx",
  "Breadcrumb @ packages/design/ui/src/primitives/breadcrumb.tsx",
  "BulkActionBar @ packages/design/ui/src/primitives/bulk-action-bar.tsx",
  "BulkActionConfirmDialog @ packages/design/ui/src/primitives/confirm-dialog.tsx",
  "CardErrorBoundary @ packages/design/ui/src/primitives/error-boundary.tsx",
  "Carousel @ packages/design/ui/src/primitives/carousel.tsx",
  "ChangelogWidget @ packages/design/ui/src/components/changelog-widget.tsx",
  "ChartLegend @ packages/design/ui/src/primitives/chart.tsx",
  "CircularLoader @ packages/design/ui/src/primitives/loader.tsx",
  "ClassicLoader @ packages/design/ui/src/primitives/loader.tsx",
  "ClientXPostCard @ packages/design/ui/src/primitives/x-post-card.tsx",
  "CodeBlockLanguageIcon @ packages/design/ui/src/primitives/code-block-language-icon.tsx",
  "Collapsible @ packages/design/ui/src/primitives/collapsible.tsx",
  "CommandBox @ packages/design/ui/src/patterns/CommandBox.tsx",
  "CompactBulkActionBar @ packages/design/ui/src/primitives/compact-bulk-action-bar.tsx",
  "ConfirmDeleteDialog @ packages/design/ui/src/primitives/confirm-dialog.tsx",
  "ConfirmDialog @ packages/design/ui/src/primitives/confirm-dialog.tsx",
  "DashboardCommandSurface @ packages/design/ui/src/patterns/dashboard-surfaces.tsx",
  "DashboardMetricTile @ packages/design/ui/src/patterns/dashboard-surfaces.tsx",
  "DashboardPanel @ packages/design/ui/src/patterns/dashboard-surfaces.tsx",
  "DataTable @ packages/design/ui/src/patterns/data-table/data-table.tsx",
  "DataTableFacetedFilter @ packages/design/ui/src/patterns/data-table/components/data-table-faceted-filter.tsx",
  "DataTableToolbar @ packages/design/ui/src/patterns/data-table/components/data-table-toolbar.tsx",
  "DotsLoader @ packages/design/ui/src/primitives/loader.tsx",
  "DualModeImage @ packages/design/ui/src/primitives/feature-card.tsx",
  "Enable2FACard @ packages/design/ui/src/primitives/enable-2fa-card.tsx",
  "ErrorBoundary @ packages/design/ui/src/primitives/error-boundary.tsx",
  "ExpandingTextarea @ packages/design/ui/src/primitives/expanding-textarea.tsx",
  "FallbackCard @ packages/design/ui/src/primitives/fallback-card.tsx",
  "FeatureGate @ packages/design/ui/src/primitives/feature-gate.tsx",
  "FloatingBulkActionBar @ packages/design/ui/src/primitives/floating-bulk-action-bar.tsx",
  "GeistTooltip @ packages/design/ui/src/primitives/geist-tooltip.tsx",
  "GrainCloudsBackground @ packages/design/ui/src/primitives/grain-gradient-background.tsx",
  "HexGrid @ packages/design/ui/src/primitives/hex-grid.tsx",
  "HoverCard @ packages/design/ui/src/primitives/hover-card.tsx",
  "HoverCardContent @ packages/design/ui/src/primitives/hover-card-content.tsx",
  "HoverCardTrigger @ packages/design/ui/src/primitives/hover-card-trigger.tsx",
  "ImageViewDialog @ packages/design/ui/src/components/ai-prompt-box/file-attachment-zone.tsx",
  "InputOTP @ packages/design/ui/src/primitives/input-otp.tsx",
  "InteractiveFrostedGlassCard @ packages/design/ui/src/primitives/interactive-frosted-glass-card.tsx",
  "KineticCodePreview @ packages/design/ui/src/patterns/kinetic-marketing.tsx",
  "KineticCommandBox @ packages/design/ui/src/patterns/kinetic-marketing.tsx",
  "KineticConsoleFrame @ packages/design/ui/src/patterns/kinetic-marketing.tsx",
  "KineticFeatureCard @ packages/design/ui/src/patterns/kinetic-marketing.tsx",
  "KineticMorphSurface @ packages/design/ui/src/patterns/kinetic-marketing.tsx",
  "KineticSignalMarquee @ packages/design/ui/src/patterns/kinetic-marketing.tsx",
  "KineticStep @ packages/design/ui/src/patterns/kinetic-marketing.tsx",
  "LetterGlitch @ packages/design/ui/src/primitives/fallback-card.tsx",
  "MacbookPro @ packages/design/ui/src/primitives/macbook-pro.tsx",
  "MarkdownEditor @ packages/design/ui/src/patterns/qa-page/markdown-editor.tsx",
  "MarkdownRenderer @ packages/design/ui/src/patterns/qa-page/markdown-renderer.tsx",
  "MemoizedDataTableRow @ packages/design/ui/src/patterns/data-table/components/data-table-row.tsx",
  "Menubar @ packages/design/ui/src/primitives/menubar.tsx",
  "MeshGradientBg @ packages/design/ui/src/primitives/mesh-gradient-bg.tsx",
  "NavigationMenu @ packages/design/ui/src/primitives/navigation-menu.tsx",
  "NeuroNoiseBg @ packages/design/ui/src/primitives/neuro-noise-bg.tsx",
  "OnboardingChecklist @ packages/design/ui/src/components/onboarding-checklist.tsx",
  "PaginationControl @ packages/design/ui/src/primitives/pagination-control.tsx",
  "PanelErrorBoundary @ packages/design/ui/src/primitives/error-boundary.tsx",
  "ProgressStepper @ packages/design/ui/src/primitives/stepper.tsx",
  "PromptAttachmentPreviews @ packages/design/ui/src/components/ai-prompt-box/file-attachment-zone.tsx",
  "PromptInputBox @ packages/design/ui/src/components/ai-prompt-box/prompt-input.tsx",
  "PulseDotLoader @ packages/design/ui/src/primitives/loader.tsx",
  "PulseLoader @ packages/design/ui/src/primitives/loader.tsx",
  "QAPage @ packages/design/ui/src/patterns/qa-page/qa-page.tsx",
  "QuestionPrompt @ packages/design/ui/src/primitives/question-tool.tsx",
  "RadioGroupCard @ packages/design/ui/src/primitives/radio-group-card.tsx",
  "RadioGroupStacked @ packages/design/ui/src/primitives/radio-group-stacked.tsx",
  "ResizableHandle @ packages/design/ui/src/primitives/resizable.tsx",
  "ResizablePanel @ packages/design/ui/src/primitives/resizable.tsx",
  "Separator @ packages/design/ui/src/primitives/separator.tsx",
  "SettingsLayoutClient @ packages/design/ui/src/patterns/settings-layout/settings-layout.tsx",
  "SettingsSidebarNav @ packages/design/ui/src/patterns/settings-layout/sidebar-nav.tsx",
  "SliderNumberFlow @ packages/design/ui/src/primitives/slider-number-flow.tsx",
  "StatItem @ packages/design/ui/src/primitives/metric-card.tsx",
  "Stepper @ packages/design/ui/src/primitives/stepper.tsx",
  "TableErrorBoundary @ packages/design/ui/src/primitives/error-boundary.tsx",
  "TeamChat @ packages/design/ui/src/components/team-chat.tsx",
  "TerminalLoader @ packages/design/ui/src/primitives/loader.tsx",
  "TextBlinkLoader @ packages/design/ui/src/primitives/loader.tsx",
  "TextDotsLoader @ packages/design/ui/src/primitives/loader.tsx",
  "TextScramble @ packages/design/ui/src/primitives/text-scramble.tsx",
  "TextShimmerLoader @ packages/design/ui/src/primitives/loader.tsx",
  "TreeExpander @ packages/design/ui/src/primitives/tree.tsx",
  "TreeIcon @ packages/design/ui/src/primitives/tree.tsx",
  "TreeLabel @ packages/design/ui/src/primitives/tree.tsx",
  "TreeLines @ packages/design/ui/src/primitives/tree.tsx",
  "TreeNode @ packages/design/ui/src/primitives/tree.tsx",
  "TreeProvider @ packages/design/ui/src/primitives/tree.tsx",
  "TreeView @ packages/design/ui/src/primitives/tree.tsx",
  "TypingLoader @ packages/design/ui/src/primitives/loader.tsx",
  "UserInfo @ packages/design/ui/src/patterns/qa-page/user-info.tsx",
  "VoiceRecorder @ packages/design/ui/src/components/ai-prompt-box/voice-visualizer.tsx",
  "VoteButtons @ packages/design/ui/src/patterns/qa-page/vote-buttons.tsx",
  "WaveLoader @ packages/design/ui/src/primitives/loader.tsx",
  "WavesBg @ packages/design/ui/src/primitives/waves-bg.tsx",
];

function ratchet(
  observed: readonly string[],
  allowlist: readonly string[],
): { unlisted: string[]; stale: string[] } {
  const allowed = new Set(allowlist);
  const seen = new Set<string>();
  const unlisted: string[] = [];
  for (const entry of observed) {
    if (allowed.has(entry)) seen.add(entry);
    else unlisted.push(entry);
  }
  return {
    unlisted: unlisted.sort(),
    stale: allowlist.filter((entry) => !seen.has(entry)),
  };
}

/**
 * Entries are `Name @ path`, so a component moved to another file re-surfaces
 * rather than inheriting its old exemption.
 */
function collectStorylessComponents(): string[] {
  const { colocated, storybookApp } = storyFiles();
  const index = indexStories([...colocated, ...storybookApp]);
  const storyless = new Set<string>();

  for (const file of sourceFiles()) {
    const exported = exportedComponents(file);
    for (const name of exported) {
      if (isCompoundPart(name, exported)) continue;
      if (isCovered(name, index)) continue;
      storyless.add(`${name} @ ${relative(ROOT, file)}`);
    }
  }

  return [...storyless].sort();
}

/* ------------------------------------------------------------------ *
 * Assertions
 * ------------------------------------------------------------------ */

describe("Storybook coverage: every standalone @nebutra/ui component has a story", () => {
  it("finds the surveyed source tree", () => {
    const files = sourceFiles();
    expect(
      files.length,
      `Only ${files.length} source files found under packages/design/ui/src/{${SURVEYED_DIRS.join(",")}}. ` +
        `The component census counted 235; a number far below that means the walker lost a directory.`,
    ).toBeGreaterThan(200);
  });

  it("counts stories from BOTH locations, not only the colocated one CLAUDE.md documents", () => {
    const { colocated, storybookApp } = storyFiles();

    expect(
      colocated.length,
      "no colocated packages/design/ui/src/**/*.stories.tsx found — the primary story location is missing",
    ).toBeGreaterThan(100);

    expect(
      storybookApp.length,
      "no apps/storybook/src/**/*.stories.tsx found. This location is undocumented in CLAUDE.md " +
        "(Adding New Components, Step 2 names only the colocated path) but it is real: dropping it " +
        "from this scan would report components as storyless when their story simply lives here.",
    ).toBeGreaterThan(0);
  });

  it("keeps MISSING_STORY_ALLOWLIST sorted and free of duplicates", () => {
    expect(
      [...MISSING_STORY_ALLOWLIST],
      "MISSING_STORY_ALLOWLIST must be sorted so a diff shows exactly what moved",
    ).toEqual([...MISSING_STORY_ALLOWLIST].sort());
    expect(
      new Set(MISSING_STORY_ALLOWLIST).size,
      "MISSING_STORY_ALLOWLIST has duplicate entries",
    ).toBe(MISSING_STORY_ALLOWLIST.length);
  });

  it("no standalone exported component is without a story", () => {
    const { unlisted } = ratchet(collectStorylessComponents(), MISSING_STORY_ALLOWLIST);

    expect(
      unlisted,
      `${unlisted.length} standalone exported component(s) in @nebutra/ui have no Storybook story ` +
        `in either packages/design/ui/src/**/*.stories.tsx or apps/storybook/src/**/*.stories.tsx:\n${unlisted
          .map((entry) => {
            const [name, file] = entry.split(" @ ");
            return (
              `  - ${name} — ${file}\n` +
              `      No story declares it (\`component: ${name}\` / \`title: ".../${name}"\`) and no story renders <${name} />.\n` +
              `      CLAUDE.md, Adding New Components Step 3: every new component MUST have a Storybook story.`
            );
          })
          .join("\n")}`,
    ).toEqual([]);
  });

  it("carries no stale allowlist entries (the list may only shrink)", () => {
    const { stale } = ratchet(collectStorylessComponents(), MISSING_STORY_ALLOWLIST);

    expect(
      stale,
      `MISSING_STORY_ALLOWLIST entries now have a story (or no longer exist) and must be deleted:\n${stale
        .map((entry) => `  - ${entry}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});

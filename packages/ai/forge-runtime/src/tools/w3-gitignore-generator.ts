/**
 * W3 · Template root — .gitignore generator (brief: docs/plans/tools/gitignore-generator.md).
 *
 * Two pure tools on one corpus:
 *  - template/gitignore-generator — merge N stack templates into one file
 *  - template/gitignore-stacks    — list/search the corpus (autocomplete + agent discovery)
 *
 * Domain rules implemented from the brief §7:
 *  1. the unit is a *stack*, not a language — OS / editor / language compose
 *  2. templates are merged, not blindly concatenated: `### Name ###` section
 *     banners survive, and a pattern that already appeared in an earlier
 *     section is dropped so overlap (`dist/`, `*.log`) is not noise
 *  3. corpus is data, not logic — one table, curated from github/gitignore
 *  4. global-vs-project scope is carried per template and reported back
 *  5. a .gitignore only affects *untracked* files — stated in the header
 *  6. multi-stack composition is the reason this exists over the raw repo
 */

import { z } from "zod";
import { ForgeRuntimeError } from "../errors";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── corpus ─────────────────────────────────────────────────────────────── */

export type GitignoreScope = "project" | "global";
export type GitignoreKind = "language" | "framework" | "os" | "editor" | "tool";

export interface GitignoreTemplate {
  /** Stable id used by the API. Lowercase, no separators. */
  readonly id: string;
  /** Human section name, printed in the `### Name ###` banner. */
  readonly name: string;
  /**
   * `global` = the kind of entry most developers keep in their personal
   * `~/.gitignore_global` rather than in every repo (brief §7 rule 4).
   */
  readonly scope: GitignoreScope;
  readonly kind: GitignoreKind;
  /** Accepted spellings ("vscode", "golang", "c#"), normalized on lookup. */
  readonly aliases: readonly string[];
  readonly patterns: readonly string[];
}

/**
 * Curated subset of github/gitignore (CC0-1.0). Content is data — extend this
 * table, never branch on stack id in the merge logic.
 */
export const GITIGNORE_TEMPLATES: readonly GitignoreTemplate[] = [
  {
    id: "node",
    name: "Node",
    scope: "project",
    kind: "language",
    aliases: ["nodejs", "npm", "pnpm", "yarn", "javascript", "typescript", "react", "vite"],
    patterns: [
      "node_modules/",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      "pnpm-debug.log*",
      "lerna-debug.log*",
      ".pnpm-store/",
      ".npm",
      ".yarn-integrity",
      ".eslintcache",
      ".node_repl_history",
      "*.tsbuildinfo",
      "*.tgz",
      "coverage/",
      ".nyc_output/",
      "dist/",
      "build/",
      ".cache/",
      ".env",
      ".env.local",
      ".env.*.local",
    ],
  },
  {
    id: "nextjs",
    name: "Next.js",
    scope: "project",
    kind: "framework",
    aliases: ["next"],
    patterns: [".next/", "out/", "next-env.d.ts", ".vercel"],
  },
  {
    id: "python",
    name: "Python",
    scope: "project",
    kind: "language",
    aliases: ["py", "python3", "pip"],
    patterns: [
      "__pycache__/",
      "*.py[cod]",
      "*$py.class",
      "*.so",
      "build/",
      "dist/",
      "develop-eggs/",
      "downloads/",
      "eggs/",
      ".eggs/",
      "*.egg-info/",
      "*.egg",
      ".pytest_cache/",
      ".mypy_cache/",
      ".ruff_cache/",
      ".tox/",
      ".nox/",
      ".coverage",
      ".coverage.*",
      "htmlcov/",
      ".hypothesis/",
      ".venv/",
      "venv/",
      "env/",
      "ENV/",
      ".python-version",
    ],
  },
  {
    id: "django",
    name: "Django",
    scope: "project",
    kind: "framework",
    aliases: [],
    patterns: [
      "*.log",
      "db.sqlite3",
      "db.sqlite3-journal",
      "local_settings.py",
      "media/",
      "staticfiles/",
    ],
  },
  {
    id: "jupyternotebooks",
    name: "JupyterNotebooks",
    scope: "project",
    kind: "tool",
    aliases: ["jupyter", "notebook", "ipynb"],
    patterns: [
      ".ipynb_checkpoints",
      "*/.ipynb_checkpoints/*",
      "profile_default/",
      "ipython_config.py",
    ],
  },
  {
    id: "java",
    name: "Java",
    scope: "project",
    kind: "language",
    aliases: [],
    patterns: [
      "*.class",
      "*.jar",
      "*.war",
      "*.ear",
      "*.nar",
      "*.log",
      "hs_err_pid*",
      "replay_pid*",
    ],
  },
  {
    id: "maven",
    name: "Maven",
    scope: "project",
    kind: "tool",
    aliases: ["mvn"],
    patterns: [
      "target/",
      "pom.xml.tag",
      "pom.xml.releaseBackup",
      "pom.xml.versionsBackup",
      "pom.xml.next",
      "release.properties",
      "dependency-reduced-pom.xml",
      ".mvn/timing.properties",
    ],
  },
  {
    id: "gradle",
    name: "Gradle",
    scope: "project",
    kind: "tool",
    aliases: [],
    patterns: [".gradle/", "build/", "gradle-app.setting", ".gradletasknamecache"],
  },
  {
    id: "kotlin",
    name: "Kotlin",
    scope: "project",
    kind: "language",
    aliases: ["kt"],
    patterns: ["*.class", "build/", ".kotlin/", "hs_err_pid*"],
  },
  {
    id: "android",
    name: "Android",
    scope: "project",
    kind: "framework",
    aliases: [],
    patterns: [
      "*.apk",
      "*.aab",
      "*.ap_",
      "*.dex",
      "bin/",
      "gen/",
      "local.properties",
      ".cxx/",
      "captures/",
      "output.json",
    ],
  },
  {
    id: "go",
    name: "Go",
    scope: "project",
    kind: "language",
    aliases: ["golang"],
    patterns: [
      "*.exe",
      "*.exe~",
      "*.dll",
      "*.so",
      "*.dylib",
      "*.test",
      "*.out",
      "go.work",
      "go.work.sum",
      "vendor/",
    ],
  },
  {
    id: "rust",
    name: "Rust",
    scope: "project",
    kind: "language",
    aliases: ["cargo"],
    patterns: [
      "/target/",
      "**/*.rs.bk",
      "*.pdb",
      "# Cargo.lock — commit it for binaries, ignore it for libraries",
    ],
  },
  {
    id: "cpp",
    name: "C++",
    scope: "project",
    kind: "language",
    aliases: ["c++", "cplusplus"],
    patterns: [
      "*.o",
      "*.obj",
      "*.a",
      "*.lib",
      "*.so",
      "*.dylib",
      "*.dll",
      "*.exe",
      "*.out",
      "*.app",
      "*.gch",
      "*.pch",
    ],
  },
  {
    id: "c",
    name: "C",
    scope: "project",
    kind: "language",
    aliases: [],
    patterns: ["*.o", "*.obj", "*.a", "*.lib", "*.so", "*.exe", "*.out", "*.d"],
  },
  {
    id: "csharp",
    name: "C#",
    scope: "project",
    kind: "language",
    aliases: ["c#", "dotnet", ".net", "visualstudio", "vs"],
    patterns: [
      "bin/",
      "obj/",
      "[Dd]ebug/",
      "[Rr]elease/",
      "x64/",
      "x86/",
      "*.user",
      "*.suo",
      "*.userprefs",
      ".vs/",
      "*.nupkg",
      "packages/",
    ],
  },
  {
    id: "ruby",
    name: "Ruby",
    scope: "project",
    kind: "language",
    aliases: ["rb", "bundler"],
    patterns: [
      "*.gem",
      "*.rbc",
      "/.bundle/",
      "/vendor/bundle",
      "/.config",
      "/coverage/",
      "/spec/reports/",
      "/tmp/",
      ".byebug_history",
      ".rvmrc",
    ],
  },
  {
    id: "rails",
    name: "Rails",
    scope: "project",
    kind: "framework",
    aliases: ["ruby-on-rails"],
    patterns: [
      "/log/*",
      "!/log/.keep",
      "/tmp/*",
      "!/tmp/.keep",
      "/storage/*",
      "!/storage/.keep",
      "/public/assets",
      "/config/master.key",
      "/config/credentials/*.key",
    ],
  },
  {
    id: "php",
    name: "PHP",
    scope: "project",
    kind: "language",
    aliases: [],
    patterns: ["*.log", "*.cache", "vendor/", ".phpunit.result.cache", ".phpunit.cache/"],
  },
  {
    id: "composer",
    name: "Composer",
    scope: "project",
    kind: "tool",
    aliases: [],
    patterns: ["vendor/", "composer.phar"],
  },
  {
    id: "laravel",
    name: "Laravel",
    scope: "project",
    kind: "framework",
    aliases: [],
    patterns: [
      "/vendor/",
      "/node_modules/",
      "/public/build",
      "/public/hot",
      "/public/storage",
      "/storage/*.key",
      ".env",
      ".env.backup",
      ".phpunit.result.cache",
    ],
  },
  {
    id: "swift",
    name: "Swift",
    scope: "project",
    kind: "language",
    aliases: [],
    patterns: [".build/", "Packages/", "*.xcodeproj", ".swiftpm/", ".netrc", "DerivedData/"],
  },
  {
    id: "dart",
    name: "Dart",
    scope: "project",
    kind: "language",
    aliases: ["flutter"],
    patterns: [
      ".dart_tool/",
      ".packages",
      "build/",
      ".flutter-plugins",
      ".flutter-plugins-dependencies",
      "pubspec.lock",
      "doc/api/",
    ],
  },
  {
    id: "elixir",
    name: "Elixir",
    scope: "project",
    kind: "language",
    aliases: ["phoenix", "mix"],
    patterns: ["/_build/", "/cover/", "/deps/", "/doc/", "/.fetch", "erl_crash.dump", "*.ez"],
  },
  {
    id: "scala",
    name: "Scala",
    scope: "project",
    kind: "language",
    aliases: ["sbt"],
    patterns: ["*.class", "*.log", "target/", "project/target/", ".bloop/", ".metals/"],
  },
  {
    id: "haskell",
    name: "Haskell",
    scope: "project",
    kind: "language",
    aliases: ["stack", "cabal"],
    patterns: ["dist/", "dist-newstyle/", ".stack-work/", "*.hi", "*.o", "cabal.project.local"],
  },
  {
    id: "r",
    name: "R",
    scope: "project",
    kind: "language",
    aliases: ["rlang", "rstudio"],
    patterns: [
      ".Rhistory",
      ".Rapp.history",
      ".RData",
      ".Ruserdata",
      "*.Rproj.user/",
      "vignettes/*.pdf",
    ],
  },
  {
    id: "unity",
    name: "Unity",
    scope: "project",
    kind: "framework",
    aliases: [],
    patterns: [
      "[Ll]ibrary/",
      "[Tt]emp/",
      "[Oo]bj/",
      "[Bb]uild/",
      "[Ll]ogs/",
      "[Uu]serSettings/",
      "*.pidb",
      "*.booproj",
      "sysinfo.txt",
    ],
  },
  {
    id: "terraform",
    name: "Terraform",
    scope: "project",
    kind: "tool",
    aliases: ["tf", "opentofu"],
    patterns: [
      "**/.terraform/*",
      "*.tfstate",
      "*.tfstate.*",
      "crash.log",
      "crash.*.log",
      "*.tfvars",
      "*.tfvars.json",
      "override.tf",
      "override.tf.json",
      "*_override.tf",
      "*_override.tf.json",
      ".terraformrc",
      "terraform.rc",
    ],
  },
  {
    id: "ansible",
    name: "Ansible",
    scope: "project",
    kind: "tool",
    aliases: [],
    patterns: ["*.retry", "*.vault", "inventory/hosts.local"],
  },
  {
    id: "vagrant",
    name: "Vagrant",
    scope: "project",
    kind: "tool",
    aliases: [],
    patterns: [".vagrant/", "*.box"],
  },
  {
    id: "jekyll",
    name: "Jekyll",
    scope: "project",
    kind: "framework",
    aliases: [],
    patterns: ["_site/", ".sass-cache/", ".jekyll-cache/", ".jekyll-metadata"],
  },
  {
    id: "hugo",
    name: "Hugo",
    scope: "project",
    kind: "framework",
    aliases: [],
    patterns: ["/public/", "/resources/_gen/", ".hugo_build.lock"],
  },
  {
    id: "wordpress",
    name: "WordPress",
    scope: "project",
    kind: "framework",
    aliases: ["wp"],
    patterns: [
      "wp-config.php",
      "wp-content/uploads/",
      "wp-content/cache/",
      "wp-content/upgrade/",
      "wp-content/backup-db/",
    ],
  },
  {
    id: "sass",
    name: "Sass",
    scope: "project",
    kind: "tool",
    aliases: ["scss"],
    patterns: [".sass-cache/", "*.css.map", "*.sass.map", "*.scss.map"],
  },
  {
    id: "tex",
    name: "TeX",
    scope: "project",
    kind: "language",
    aliases: ["latex"],
    patterns: [
      "*.aux",
      "*.bbl",
      "*.blg",
      "*.fdb_latexmk",
      "*.fls",
      "*.lof",
      "*.lot",
      "*.out",
      "*.synctex.gz",
      "*.toc",
    ],
  },
  {
    id: "macos",
    name: "macOS",
    scope: "global",
    kind: "os",
    aliases: ["mac", "osx", "os-x", "apple"],
    patterns: [
      ".DS_Store",
      ".AppleDouble",
      ".LSOverride",
      "._*",
      ".DocumentRevisions-V100",
      ".fseventsd",
      ".Spotlight-V100",
      ".TemporaryItems",
      ".Trashes",
      ".VolumeIcon.icns",
      ".com.apple.timemachine.donotpresent",
      ".AppleDB",
      ".AppleDesktop",
      "Network Trash Folder",
      "Temporary Items",
      ".apdisk",
    ],
  },
  {
    id: "windows",
    name: "Windows",
    scope: "global",
    kind: "os",
    aliases: ["win", "win32"],
    patterns: [
      "Thumbs.db",
      "Thumbs.db:encryptable",
      "ehthumbs.db",
      "ehthumbs_vista.db",
      "*.stackdump",
      "[Dd]esktop.ini",
      "$RECYCLE.BIN/",
      "*.cab",
      "*.msi",
      "*.msix",
      "*.msm",
      "*.msp",
      "*.lnk",
    ],
  },
  {
    id: "linux",
    name: "Linux",
    scope: "global",
    kind: "os",
    aliases: ["ubuntu", "debian", "gnu"],
    patterns: ["*~", ".fuse_hidden*", ".directory", ".Trash-*", ".nfs*"],
  },
  {
    id: "visualstudiocode",
    name: "VisualStudioCode",
    scope: "global",
    kind: "editor",
    aliases: ["vscode", "vs-code", "code"],
    patterns: [
      ".vscode/*",
      "!.vscode/settings.json",
      "!.vscode/tasks.json",
      "!.vscode/launch.json",
      "!.vscode/extensions.json",
      "!.vscode/*.code-snippets",
      ".history/",
      "*.vsix",
    ],
  },
  {
    id: "jetbrains",
    name: "JetBrains",
    scope: "global",
    kind: "editor",
    aliases: ["intellij", "idea", "webstorm", "pycharm", "goland", "rider", "clion"],
    patterns: [".idea/", "*.iml", "*.iws", "*.ipr", "out/", "cmake-build-*/"],
  },
  {
    id: "vim",
    name: "Vim",
    scope: "global",
    kind: "editor",
    aliases: ["neovim", "nvim"],
    patterns: ["*.swp", "*.swo", "*~", "Session.vim", "Sessionx.vim", ".netrwhist", "tags"],
  },
  {
    id: "emacs",
    name: "Emacs",
    scope: "global",
    kind: "editor",
    aliases: [],
    patterns: [
      "*~",
      "\\#*\\#",
      ".\\#*",
      ".emacs.desktop",
      ".emacs.desktop.lock",
      "auto-save-list/",
    ],
  },
  {
    id: "sublimetext",
    name: "SublimeText",
    scope: "global",
    kind: "editor",
    aliases: ["sublime"],
    patterns: [
      "*.sublime-workspace",
      "*.tmlanguage.cache",
      "*.tmPreferences.cache",
      "*.stTheme.cache",
      "sftp-config.json",
    ],
  },
  {
    id: "eclipse",
    name: "Eclipse",
    scope: "global",
    kind: "editor",
    aliases: [],
    patterns: [".metadata/", ".project", ".classpath", ".settings/", "bin/", "tmp/"],
  },
  {
    id: "xcode",
    name: "Xcode",
    scope: "global",
    kind: "editor",
    aliases: [],
    patterns: ["xcuserdata/", "*.xcuserstate", "*.xcscmblueprint", "*.xccheckout", "DerivedData/"],
  },
] as const;

/** Corpus revision this build ships. Bump when the table above changes. */
export const GITIGNORE_CORPUS_VERSION = "curated-2026-07";

/* ── lookup ─────────────────────────────────────────────────────────────── */

/** "VS Code" / "vs-code" / "vscode." all collapse to the same lookup key. */
function normalizeKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

const TEMPLATE_INDEX: ReadonlyMap<string, GitignoreTemplate> = (() => {
  const index = new Map<string, GitignoreTemplate>();
  for (const template of GITIGNORE_TEMPLATES) {
    for (const key of [template.id, template.name, ...template.aliases]) {
      const normalized = normalizeKey(key);
      if (normalized && !index.has(normalized)) index.set(normalized, template);
    }
  }
  return index;
})();

export function resolveGitignoreStack(raw: string): GitignoreTemplate | null {
  return TEMPLATE_INDEX.get(normalizeKey(raw)) ?? null;
}

/* ── merge ──────────────────────────────────────────────────────────────── */

export interface GitignoreSection {
  readonly id: string;
  readonly name: string;
  readonly scope: GitignoreScope;
  readonly kind: GitignoreKind;
  readonly patterns: number;
}

export interface GitignoreMergeResult {
  readonly content: string;
  readonly stacksResolved: string[];
  readonly notFound: string[];
  readonly sections: GitignoreSection[];
  readonly globalScoped: string[];
  readonly duplicatesRemoved: number;
  readonly lines: number;
  readonly bytes: number;
  readonly corpusVersion: string;
  readonly note: string;
}

const UNTRACKED_NOTE =
  "A .gitignore only affects untracked files. For a file git already tracks, run: git rm -r --cached <path>";

export interface MergeOptions {
  readonly dedupe?: boolean;
  readonly header?: boolean;
  readonly strict?: boolean;
}

export function mergeGitignore(
  requested: readonly string[],
  options: MergeOptions = {},
): GitignoreMergeResult {
  const dedupe = options.dedupe ?? true;
  const header = options.header ?? true;

  const resolved: GitignoreTemplate[] = [];
  const notFound: string[] = [];
  const seenIds = new Set<string>();
  for (const raw of requested) {
    const template = resolveGitignoreStack(raw);
    if (!template) {
      if (!notFound.includes(raw)) notFound.push(raw);
      continue;
    }
    if (seenIds.has(template.id)) continue;
    seenIds.add(template.id);
    resolved.push(template);
  }

  if (options.strict && notFound.length > 0) {
    throw new ForgeRuntimeError(
      "invalid_input",
      `unknown_stack: ${notFound.join(", ")}. Call template/gitignore-stacks for the valid id list.`,
    );
  }
  if (resolved.length === 0) {
    throw new ForgeRuntimeError(
      "invalid_input",
      `unknown_stack: ${requested.join(", ") || "(none)"}. No requested stack matched the corpus; call template/gitignore-stacks for the valid id list.`,
    );
  }

  // Sections are alphabetized by display name so the same set of stacks always
  // produces the same file, whatever order the caller listed them in.
  // Case-insensitive so "macOS" files next to "Node", not after every capital;
  // id is the tie-break so the order never depends on input order.
  const ordered = [...resolved].sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    if (an !== bn) return an < bn ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const emitted = new Set<string>();
  let duplicatesRemoved = 0;
  const blocks: string[] = [];
  const sections: GitignoreSection[] = [];

  for (const template of ordered) {
    const lines: string[] = [];
    for (const pattern of template.patterns) {
      // Comment lines carry per-template guidance, so they are never deduped.
      // Negations are exempt for a harder reason: git resolves a path by the
      // LAST matching pattern, so dropping a repeated `!x` as a "duplicate"
      // moves the re-include earlier and any ignore rule emitted in between
      // silently wins over it. An identical negation repeated in two sections
      // is a few bytes; a negation deleted from the section that needed it is
      // a wrong file.
      const isComment = pattern.startsWith("#");
      const isNegation = pattern.startsWith("!");
      if (dedupe && !isComment && !isNegation) {
        if (emitted.has(pattern)) {
          duplicatesRemoved += 1;
          continue;
        }
        emitted.add(pattern);
      }
      lines.push(pattern);
    }
    sections.push({
      id: template.id,
      name: template.name,
      scope: template.scope,
      kind: template.kind,
      patterns: lines.length,
    });
    // Defensive: no template in the current corpus is a strict subset of
    // another, but a future addition could be. A section emptied entirely by
    // dedupe still gets its banner — silently dropping it would read as "that
    // stack was ignored".
    blocks.push(
      lines.length > 0
        ? `### ${template.name} ###\n${lines.join("\n")}`
        : `### ${template.name} ###\n# (all patterns already covered by an earlier section)`,
    );
  }

  const idList = ordered.map((t) => t.id).join(", ");
  const head = header
    ? [
        "# .gitignore generated by forge.nebutra.com",
        `# Stacks: ${idList}`,
        `# Corpus: github/gitignore (CC0-1.0), curated subset ${GITIGNORE_CORPUS_VERSION}`,
        `# Note: ${UNTRACKED_NOTE}`,
      ].join("\n")
    : "";
  const tail = header ? `# End of .gitignore for ${idList}` : "";

  const content = [head, ...blocks, tail].filter(Boolean).join("\n\n").concat("\n");

  return {
    content,
    stacksResolved: ordered.map((t) => t.id),
    notFound,
    sections,
    globalScoped: ordered.filter((t) => t.scope === "global").map((t) => t.id),
    duplicatesRemoved,
    lines: content.split("\n").length - 1,
    // TextEncoder, not Buffer: the tool declares a client runtime and Buffer
    // does not exist in a browser bundle.
    bytes: new TextEncoder().encode(content).length,
    corpusVersion: GITIGNORE_CORPUS_VERSION,
    note: UNTRACKED_NOTE,
  };
}

/* ── tools ──────────────────────────────────────────────────────────────── */

export const gitignoreGeneratorTool = tool({
  id: "template/gitignore-generator",
  slug: "gitignore-generator",
  category: "template",
  title: { zh: ".gitignore 生成器", en: ".gitignore Generator" },
  description: {
    // Coverage is stated, not implied: this is a curated subset of
    // github/gitignore, not the whole ~180-template upstream corpus.
    zh: `按技术栈（语言 / 框架 / 系统 / 编辑器）合并生成 .gitignore，分节标注并去重；模板取自 github/gitignore 的 ${GITIGNORE_TEMPLATES.length} 项精选子集，非全量`,
    en: `Merge language, framework, OS and editor templates into one sectioned .gitignore. Covers a curated ${GITIGNORE_TEMPLATES.length}-stack subset of github/gitignore, not the full upstream corpus`,
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.template.gitignore_generator",
  roots: ["template", "generator"],
  engine: {
    name: "gitignore-corpus-merge",
    upstream: "github/gitignore (CC0-1.0), curated subset",
    version: GITIGNORE_CORPUS_VERSION,
  },
  seoKeywords: {
    zh: "gitignore生成器,gitignore模板,node gitignore,python gitignore",
    en: "gitignore generator, .gitignore generator online, node python macos gitignore",
  },
  inputSchema: z.object({
    stacks: z
      .array(z.string().min(1).max(64))
      .min(1)
      .max(40)
      .describe(
        'Stack ids to merge, e.g. ["node","python","macos","visualstudiocode"]. Names and common aliases (vscode, golang, c#) resolve too. Call template/gitignore-stacks for the full id list.',
      ),
    dedupe: z
      .boolean()
      .default(true)
      .describe("Drop a pattern that already appeared in an earlier section (dist/, *.log)."),
    header: z
      .boolean()
      .default(true)
      .describe("Emit the generated-by / stack-list / untracked-files banner comments."),
    strict: z
      .boolean()
      .default(false)
      .describe(
        "Fail with unknown_stack instead of reporting unresolved ids in notFound. Unknown ids are never silently dropped either way.",
      ),
  }),
  execute: (input: { stacks: string[]; dedupe?: boolean; header?: boolean; strict?: boolean }) =>
    mergeGitignore(input.stacks, {
      dedupe: input.dedupe ?? true,
      header: input.header ?? true,
      strict: input.strict ?? false,
    }),
});

export const gitignoreStacksTool = tool({
  id: "template/gitignore-stacks",
  slug: "gitignore-stacks",
  category: "template",
  title: { zh: ".gitignore 技术栈清单", en: ".gitignore Stack List" },
  description: {
    zh: `检索可用的 .gitignore 模板 id（语言 / 框架 / 系统 / 编辑器），共 ${GITIGNORE_TEMPLATES.length} 项，供补全与 Agent 调用`,
    en: `Search the ${GITIGNORE_TEMPLATES.length} available .gitignore template ids by name, alias, scope or kind`,
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.template.gitignore_stacks",
  roots: ["template", "viewer"],
  engine: {
    name: "gitignore-corpus-index",
    upstream: "github/gitignore (CC0-1.0), curated subset",
    version: GITIGNORE_CORPUS_VERSION,
  },
  seoKeywords: {
    zh: "gitignore模板列表,gitignore支持语言",
    en: "gitignore template list, available gitignore stacks",
  },
  inputSchema: z.object({
    query: z
      .string()
      .max(64)
      .default("")
      .describe("Case-insensitive substring match over id, display name and aliases. Empty = all."),
    scope: z
      .enum(["all", "project", "global"])
      .default("all")
      .describe("global = entries usually kept in a personal ~/.gitignore_global instead."),
    kind: z
      .enum(["all", "language", "framework", "os", "editor", "tool"])
      .default("all")
      .describe("Filter by template axis."),
    limit: z.coerce.number().int().min(1).max(500).default(200),
  }),
  execute: (input: {
    query?: string;
    scope?: "all" | "project" | "global";
    kind?: "all" | "language" | "framework" | "os" | "editor" | "tool";
    limit?: number;
  }) => {
    const query = normalizeKey(input.query ?? "");
    const scope = input.scope ?? "all";
    const kind = input.kind ?? "all";
    const limit = input.limit ?? 200;
    const matched = GITIGNORE_TEMPLATES.filter((template) => {
      if (scope !== "all" && template.scope !== scope) return false;
      if (kind !== "all" && template.kind !== kind) return false;
      if (!query) return true;
      return [template.id, template.name, ...template.aliases].some((key) =>
        normalizeKey(key).includes(query),
      );
    });
    return {
      stacks: matched.slice(0, limit).map((template) => ({
        id: template.id,
        name: template.name,
        scope: template.scope,
        kind: template.kind,
        aliases: [...template.aliases],
        patterns: template.patterns.length,
      })),
      matched: matched.length,
      total: GITIGNORE_TEMPLATES.length,
      corpusVersion: GITIGNORE_CORPUS_VERSION,
    };
  },
});

export const w3GitignoreGeneratorTools: readonly AnyForgeToolDefinition[] = [
  gitignoreGeneratorTool,
  gitignoreStacksTool,
];

"use client";

import { Check, ChevronDown, Copy, File, FileText as FileCode, FileText } from "@nebutra/icons";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils";
import {
  CodeBlockLanguageIcon,
  type CodeBlockLanguageIconMap,
  type CodeBlockLanguageIconValue,
} from "./code-block-language-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// =============================================================================
// Types
// =============================================================================

/**
 * Per-file shape (multi-file tab mode).
 *
 * Geist's `<CodeBlock>` is single-file by design — pass `children`/`filename`/
 * `language` directly on the component instead. The `files[]` array remains
 * the canonical multi-file form, which Geist does not provide.
 *
 * Geist prop-name aliases:
 *   - `filename` (single-file) ↔ `title` (per file in `files[]`)
 *   - `addedLinesNumbers` ↔ `addedLines`
 *   - `removedLinesNumbers` ↔ `removedLines`
 */
export interface CodeBlockFile {
  /** File name/title displayed in tab. Geist single-file equivalent: `filename`. */
  title: string;
  /** Code content. */
  code: string;
  /** Language for syntax highlighting (auto-detected from title if omitted). */
  language?: string;
  /** Line numbers to highlight with emphasis background (1-indexed). */
  highlightedLines?: number[];
  /** Line numbers to mark as added / diff-green (1-indexed). Geist alias: `addedLinesNumbers`. */
  addedLines?: number[];
  /** Line numbers to mark as removed / diff-red (1-indexed). Geist alias: `removedLinesNumbers`. */
  removedLines?: number[];
  /** Optional per-file language logo override. Defaults from `language` / file extension. */
  icon?: CodeBlockLanguageIconValue;
}

export interface CodeBlockSwitcherOption {
  /** Human-readable label displayed in the switcher. */
  label: string;
  /** Language value passed to the syntax highlighter. */
  value: string;
  /** Optional language logo override for this option. */
  icon?: CodeBlockLanguageIconValue;
}

/**
 * Controlled language-switcher (Geist API).
 * The single-file form accepts this directly; the multi-file form keeps the
 * legacy uncontrolled `showLanguageSwitcher` + `languages` for back-compat.
 */
export type CodeBlockSwitcher = {
  options: ReadonlyArray<CodeBlockSwitcherOption>;
  value: string;
} & (
  | { onValueChange: (next: string) => void; onChange?: never }
  | {
      /** @deprecated Use `onValueChange` — `onChange` conventionally receives an event. */
      onChange: (next: string) => void;
      onValueChange?: never;
    }
);

interface CommonCodeBlockProps {
  /** Additional CSS classes on the outer container. */
  className?: string;
  /** Maximum height of code area. */
  maxHeight?: string | number;
  /** Show line numbers. Geist default: visible. Alias of `hideLineNumbers` (inverted). */
  showLineNumbers?: boolean;
  /** Geist single-file convention — inverse of `showLineNumbers`. */
  hideLineNumbers?: boolean;
  /** Enable clickable line numbers that copy `#L{n}` anchors. */
  enableLineReferences?: boolean;
  /** Callback when a line reference is clicked. */
  onLineReference?: (lineNumber: number) => void;
  /** Language logo overrides keyed by language name or alias (`python`, `py`, `tsx`, etc.). */
  languageIcons?: CodeBlockLanguageIconMap;
  /** Show language logos in the header/tabs/switcher. Defaults to true. */
  showLanguageIcon?: boolean;
  /** Hide the header bar entirely (filename + copy) — for embedded read-only views. */
  hideHeader?: boolean;
  /** Accessible label for the code block. Pass via the standard `aria-label` attribute. */
  "aria-label"?: string;
  /** Accessible name for the copy-code button. Pass a translated string. */
  copyLabel?: string;
}

/** Multi-file (legacy) shape — tabs across `files[]`. */
export interface CodeBlockFilesProps extends CommonCodeBlockProps {
  /** Array of code files to display as tabs. */
  files: CodeBlockFile[];
  /** Initially active file title. */
  defaultTitle?: string;
  /** Show an uncontrolled language switcher dropdown over the built-in list. */
  showLanguageSwitcher?: boolean;
  /** Languages available in the uncontrolled switcher (defaults to built-in list). */
  languages?: string[];
  // Mutually exclusive with single-file props:
  children?: never;
  filename?: never;
  language?: never;
  addedLinesNumbers?: never;
  removedLinesNumbers?: never;
  highlightedLines?: never;
  switcher?: never;
}

/** Single-file (Geist) shape — `<CodeBlock filename="..." language="...">{code}</CodeBlock>`. */
export interface CodeBlockSingleProps extends CommonCodeBlockProps {
  /** Source code as a string. */
  children: string;
  /** Language for syntax highlighting. Required by Geist guidance. */
  language: string;
  /** File name shown in the header; omit for ephemeral examples. */
  filename?: string;
  /** Line numbers to highlight with emphasis background (1-indexed). */
  highlightedLines?: number[];
  /** Geist canonical name for added lines. */
  addedLinesNumbers?: number[];
  /** Geist canonical name for removed lines. */
  removedLinesNumbers?: number[];
  /** Controlled language switcher. */
  switcher?: CodeBlockSwitcher;
  /** Optional single-file language logo override. Defaults from `language`. */
  languageIcon?: CodeBlockLanguageIconValue;
  // Mutually exclusive with multi-file props:
  files?: never;
  defaultTitle?: never;
  showLanguageSwitcher?: never;
  languages?: never;
}

export type CodeBlockProps = CodeBlockFilesProps | CodeBlockSingleProps;

// =============================================================================
// Themes
// =============================================================================

const CODE_FONT_FAMILY = "var(--font-mono)";

/**
 * Syntax palettes, one per mode, written out in full.
 *
 * The light theme used to spread `nightOwl` — a palette tuned for a near-black
 * background — and override seven tokens. Everything it did not override kept
 * night-owl's dark-ground colour on a white card: CSS at-rules 1.42:1, line
 * numbers 3.41:1, comments 4.02:1 (landing review, 2026-10-15). Each hue below
 * is ≥ 4.5:1 on --card and --background in its own mode; comments and line
 * numbers use --muted-foreground, which the token layer already holds to AA.
 */
type Palette = {
  keyword: string;
  string: string;
  fn: string;
  property: string;
  number: string;
  tag: string;
  className: string;
  operator: string;
};

const LIGHT: Palette = {
  keyword: "#7c3aed", // 5.7:1 on white
  string: "#166534", // 7.1:1
  fn: "#b42318", // 6.4:1
  property: "#0646d6", // 7.2:1
  number: "#9a3412", // 7.3:1
  tag: "#b42318",
  className: "#92400e", // 7.1:1
  operator: "hsl(var(--foreground))",
};

const DARK: Palette = {
  keyword: "#c792ea", // night owl, 8.0:1 on #0a0a0a
  string: "#ecc48d", // 11.8:1
  fn: "#82aaff", // 8.2:1
  property: "#80cbc4", // 10.4:1
  number: "#f78c6c", // 7.8:1
  tag: "#ff7a8a", // 7.0:1
  className: "#ffcb8b", // 12.5:1
  operator: "#7fdbca",
};

function syntaxTheme(c: Palette): Record<string, React.CSSProperties> {
  const base: React.CSSProperties = {
    color: "hsl(var(--foreground))",
    background: "transparent",
    fontFamily: CODE_FONT_FAMILY,
    textShadow: "none",
    whiteSpace: "pre",
    tabSize: 2,
  };
  return {
    'code[class*="language-"]': base,
    'pre[class*="language-"]': { ...base, overflow: "auto" },
    comment: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    prolog: { color: "hsl(var(--muted-foreground))" },
    doctype: { color: "hsl(var(--muted-foreground))" },
    cdata: { color: "hsl(var(--muted-foreground))" },
    punctuation: { color: "hsl(var(--foreground))" },
    operator: { color: c.operator },
    keyword: { color: c.keyword },
    atrule: { color: c.keyword },
    rule: { color: c.keyword },
    important: { color: c.tag, fontWeight: 600 },
    string: { color: c.string },
    char: { color: c.string },
    "attr-value": { color: c.string },
    url: { color: c.string },
    regex: { color: c.tag },
    function: { color: c.fn },
    "function-variable": { color: c.fn },
    method: { color: c.fn },
    property: { color: c.property },
    "attr-name": { color: c.property },
    builtin: { color: c.property },
    constant: { color: c.number },
    symbol: { color: c.number },
    number: { color: c.number },
    boolean: { color: c.number },
    tag: { color: c.tag },
    selector: { color: c.tag },
    deleted: { color: "hsl(var(--destructive-strong))" },
    inserted: { color: "hsl(var(--success-strong))" },
    "class-name": { color: c.className },
    namespace: { color: c.className },
    variable: { color: "hsl(var(--foreground))" },
    entity: { color: c.property, cursor: "help" },
    bold: { fontWeight: 600 },
    italic: { fontStyle: "italic" },
  };
}

const lightTheme = syntaxTheme(LIGHT);
const darkTheme = syntaxTheme(DARK);

// =============================================================================
// Utilities
// =============================================================================

function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    graphql: "graphql",
    gql: "graphql",
  };
  return languageMap[ext || ""] || "javascript";
}

const SUPPORTED_LANGUAGES = [
  "javascript",
  "jsx",
  "typescript",
  "tsx",
  "html",
  "css",
  "scss",
  "json",
  "markdown",
  "python",
  "ruby",
  "go",
  "rust",
  "bash",
  "yaml",
  "sql",
  "graphql",
  "java",
  "c",
  "cpp",
  "csharp",
  "php",
  "swift",
  "kotlin",
] as const;

function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <FileCode className="h-4 w-4" />;
    case "css":
    case "scss":
      return <FileText className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

function HeaderIcon({
  fileName,
  icon,
  language,
  languageIcons,
  showLanguageIcon,
}: {
  fileName: string;
  icon?: CodeBlockLanguageIconValue | undefined;
  language?: string | null | undefined;
  languageIcons?: CodeBlockLanguageIconMap | undefined;
  showLanguageIcon: boolean;
}) {
  const fallback = <FileIcon fileName={fileName} />;

  if (!showLanguageIcon) return fallback;

  return (
    <CodeBlockLanguageIcon
      className="size-4"
      fallback={fallback}
      icon={icon}
      icons={languageIcons}
      language={language || fileName}
    />
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * CodeBlock — syntax-highlighted code viewer with copy + (optional) tabs.
 *
 * Two calling conventions are supported:
 *
 * @example Geist single-file (canonical for prose-embedded snippets)
 * ```tsx
 * <CodeBlock filename="Table.jsx" language="jsx" aria-label="Hello world">
 *   {code}
 * </CodeBlock>
 * ```
 *
 * @example Geist with a controlled language switcher
 * ```tsx
 * <CodeBlock
 *   filename="example.tsx"
 *   language={lang}
 *   switcher={{
 *     options: [{ label: "JS", value: "js" }, { label: "TS", value: "ts" }],
 *     value: lang,
 *     onValueChange: setLang,
 *   }}
 * >
 *   {code}
 * </CodeBlock>
 * ```
 *
 * @example Multi-file tabs (Nebutra extension — Geist has no tabs)
 * ```tsx
 * <CodeBlock
 *   files={[
 *     { title: "theme.ts", code: themeCode },
 *     { title: "styles.css", code: cssCode },
 *   ]}
 *   defaultTitle="theme.ts"
 * />
 * ```
 *
 * Line number defaults:
 *   - Single-file (Geist) → line numbers shown by default; opt out via `hideLineNumbers`.
 *   - Multi-file (legacy) → hidden by default; opt in via `showLineNumbers`.
 */
export function CodeBlock(props: CodeBlockProps) {
  // Normalize single-file (Geist) and multi-file (legacy) shapes into one
  // internal representation. Single-file form is the canonical Geist surface;
  // multi-file form keeps tabs across `files[]`.
  const isSingleFile = "children" in props && typeof props.children === "string";

  const normalizedFiles: CodeBlockFile[] = isSingleFile
    ? (() => {
        const single = props as CodeBlockSingleProps;
        const f: CodeBlockFile = {
          title: single.filename ?? "",
          code: single.children,
          language: single.language,
        };
        if (single.highlightedLines !== undefined) f.highlightedLines = single.highlightedLines;
        if (single.addedLinesNumbers !== undefined) f.addedLines = single.addedLinesNumbers;
        if (single.removedLinesNumbers !== undefined) f.removedLines = single.removedLinesNumbers;
        if (single.languageIcon !== undefined) f.icon = single.languageIcon;
        return [f];
      })()
    : (props as CodeBlockFilesProps).files;

  const showFilenameHeader = isSingleFile
    ? Boolean((props as CodeBlockSingleProps).filename)
    : true;

  const {
    className,
    maxHeight = 400,
    enableLineReferences = false,
    onLineReference,
    languageIcons,
    showLanguageIcon = true,
    "aria-label": ariaLabel,
    copyLabel = "Copy code",
  } = props;

  // Line numbers default differs by form: Geist shows them by default
  // (`hideLineNumbers` opts out); legacy `files[]` defaults to hidden.
  const resolvedHide = props.hideLineNumbers;
  const resolvedShow = props.showLineNumbers;
  const showLineNumbers =
    resolvedShow !== undefined
      ? resolvedShow
      : resolvedHide !== undefined
        ? !resolvedHide
        : isSingleFile; // Geist default true; legacy default false

  // Switcher: single-file uses controlled `switcher` prop; multi-file uses
  // legacy uncontrolled `showLanguageSwitcher` + `languages`.
  const controlledSwitcher = isSingleFile ? (props as CodeBlockSingleProps).switcher : undefined;
  const showLanguageSwitcher =
    !isSingleFile && Boolean((props as CodeBlockFilesProps).showLanguageSwitcher);
  const languages = isSingleFile ? undefined : (props as CodeBlockFilesProps).languages;
  const defaultTitle = isSingleFile ? undefined : (props as CodeBlockFilesProps).defaultTitle;

  const [activeTitle, setActiveTitle] = useState(defaultTitle || normalizedFiles[0]?.title || "");
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [languageOverride, setLanguageOverride] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const scopeId = useId().replace(/:/g, "");
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centralized copy feedback with timer cleanup
  const showCopyFeedback = useCallback(() => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopied(true);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Reset language override when switching files
  useEffect(() => {
    setLanguageOverride(null);
  }, []);

  // Detect dark mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const activeFile = normalizedFiles.find((file) => file.title === activeTitle);
  const code = activeFile?.code || "";
  const detectedLanguage = activeFile?.language || getLanguageFromFileName(activeTitle || "");
  // Priority: controlled switcher > local override > detected/passed language.
  const effectiveLanguage = controlledSwitcher?.value ?? languageOverride ?? detectedLanguage;
  const selectedControlledOption = controlledSwitcher?.options.find(
    (option) => option.value === controlledSwitcher.value,
  );
  const selectedControlledLabel = selectedControlledOption?.label ?? controlledSwitcher?.value;

  // Memoized Set lookups for O(1) per-line checks + stable useCallback deps
  const highlightedSet = useMemo(
    () => new Set(activeFile?.highlightedLines),
    [activeFile?.highlightedLines],
  );
  const addedSet = useMemo(() => new Set(activeFile?.addedLines), [activeFile?.addedLines]);
  const removedSet = useMemo(() => new Set(activeFile?.removedLines), [activeFile?.removedLines]);

  const hasLineFeatures =
    highlightedSet.size > 0 || addedSet.size > 0 || removedSet.size > 0 || enableLineReferences;

  // Line props for highlighted / diff lines
  const getLineProps = useCallback(
    (lineNumber: number): React.HTMLProps<HTMLElement> => {
      const styles: React.CSSProperties = {
        display: "block",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        marginLeft: "-1rem",
        marginRight: "-1rem",
      };
      const dataAttrs: Record<string, string> = {};

      if (highlightedSet.has(lineNumber)) {
        styles.backgroundColor = isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)";
        styles.borderLeft = "2px solid rgba(59, 130, 246, 0.6)";
        styles.paddingLeft = "calc(1rem - 2px)";
      }

      if (addedSet.has(lineNumber)) {
        styles.backgroundColor = isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)";
        dataAttrs["data-diff"] = "+";
      }

      if (removedSet.has(lineNumber)) {
        styles.backgroundColor = isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)";
        dataAttrs["data-diff"] = "-";
      }

      return { style: styles, ...dataAttrs } as React.HTMLProps<HTMLElement>;
    },
    [highlightedSet, addedSet, removedSet, isDark],
  );

  // Line number styling for diff colors + clickable references
  const getLineNumberStyle = useCallback(
    (lineNumber: number): React.CSSProperties => {
      // Line numbers are secondary text and must still pass AA: night-owl's
      // default grey was 3.41:1 here. Diff colours use the *-strong inks.
      const style: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };

      if (addedSet.has(lineNumber)) {
        style.color = "hsl(var(--success-strong))";
      } else if (removedSet.has(lineNumber)) {
        style.color = "hsl(var(--destructive-strong))";
      }

      if (enableLineReferences && showLineNumbers) {
        style.cursor = "pointer";
        style.userSelect = "none";
      }

      return style;
    },
    [addedSet, removedSet, enableLineReferences, showLineNumbers],
  );

  // Click handler for line references (event delegation)
  const handleCodeClick = useCallback(
    (e: React.MouseEvent) => {
      if (!enableLineReferences || !showLineNumbers) return;

      const target = e.target as HTMLElement;
      const lineNumEl = target.closest(".react-syntax-highlighter-line-number, .linenumber");
      if (!lineNumEl) return;

      const lineNumber = parseInt(lineNumEl.textContent?.trim() ?? "", 10);
      if (Number.isNaN(lineNumber)) return;

      const anchor = `#L${lineNumber}`;
      navigator.clipboard.writeText(anchor).catch(() => {});
      onLineReference?.(lineNumber);
      showCopyFeedback();
    },
    [enableLineReferences, showLineNumbers, onLineReference, showCopyFeedback],
  );

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback();
      } catch {
        // Silently fail in environments without clipboard API
      }
    },
    [showCopyFeedback],
  );

  // Header is rendered only when there's something to show: tabs in multi-file
  // mode, a filename in single-file mode, a switcher, or the copy affordance.
  const hasMultipleFiles = normalizedFiles.length > 1;
  const hasSwitcher = showLanguageSwitcher || Boolean(controlledSwitcher);
  const showHeader =
    !(props as CommonCodeBlockProps).hideHeader &&
    (hasMultipleFiles || showFilenameHeader || hasSwitcher || true); // copy lives here unless hidden

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "cb-root relative rounded-[var(--radius-lg)] border bg-card text-card-foreground",
        "backdrop-blur-md",
        className,
      )}
      data-scope={scopeId}
    >
      {/* Scoped styles for diff markers */}
      {(addedSet.size > 0 || removedSet.size > 0) && (
        <style>{`
          [data-scope="${scopeId}"] [data-diff]::before {
            position: absolute;
            left: 0.5rem;
            font-weight: 600;
            font-size: 0.75rem;
            line-height: inherit;
          }
          [data-scope="${scopeId}"] [data-diff="+"]::before {
            content: "+";
            color: rgb(16 185 129);
          }
          [data-scope="${scopeId}"] [data-diff="-"]::before {
            content: "-";
            color: rgb(239 68 68);
          }
        `}</style>
      )}

      {/* Header — tabs (multi-file) or filename (single-file) + switcher + copy */}
      {showHeader && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {hasMultipleFiles ? (
              normalizedFiles.map(({ icon, language, title }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setActiveTitle(title)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors",
                    title === activeTitle
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <HeaderIcon
                    fileName={title}
                    icon={icon}
                    language={language || title}
                    languageIcons={languageIcons}
                    showLanguageIcon={showLanguageIcon}
                  />
                  <span className="hidden sm:inline">{title}</span>
                </button>
              ))
            ) : showFilenameHeader && activeTitle ? (
              <span className="inline-flex items-center gap-2 px-2 py-1.5 text-muted-foreground text-sm">
                <HeaderIcon
                  fileName={activeTitle}
                  icon={activeFile?.icon}
                  language={effectiveLanguage}
                  languageIcons={languageIcons}
                  showLanguageIcon={showLanguageIcon}
                />
                <span>{activeTitle}</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            {/* Controlled switcher (Geist single-file API) */}
            {controlledSwitcher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Switch language, current: ${
                      selectedControlledLabel ?? controlledSwitcher.value
                    }`}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <CodeBlockLanguageIcon
                      className="size-3.5"
                      icon={selectedControlledOption?.icon}
                      icons={languageIcons}
                      language={controlledSwitcher.value}
                    />
                    <span>{selectedControlledLabel ?? controlledSwitcher.value}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                  {controlledSwitcher.options.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() =>
                        (controlledSwitcher.onValueChange ?? controlledSwitcher.onChange)?.(
                          opt.value,
                        )
                      }
                      className={cn(
                        "text-xs",
                        opt.value === controlledSwitcher.value && "bg-accent font-medium",
                      )}
                    >
                      <CodeBlockLanguageIcon
                        className="me-1 size-3.5"
                        icon={opt.icon}
                        icons={languageIcons}
                        language={opt.value}
                      />
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Uncontrolled switcher (legacy multi-file API) */}
            {showLanguageSwitcher && !controlledSwitcher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Switch language, current: ${effectiveLanguage}`}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <CodeBlockLanguageIcon
                      className="size-3.5"
                      icons={languageIcons}
                      language={effectiveLanguage}
                    />
                    <span>{effectiveLanguage}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                  {(languages ?? SUPPORTED_LANGUAGES).map((lang) => (
                    <DropdownMenuItem
                      key={lang}
                      onClick={() => setLanguageOverride(lang)}
                      className={cn(
                        "text-xs",
                        lang === effectiveLanguage && "bg-accent font-medium",
                      )}
                    >
                      <CodeBlockLanguageIcon
                        className="me-1 size-3.5"
                        icons={languageIcons}
                        language={lang}
                      />
                      {lang}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Copy button */}
            <button
              type="button"
              onClick={() => copyToClipboard(code)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] hover:bg-accent hover:text-accent-foreground"
              aria-label={copyLabel}
            >
              {copied ? (
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Code content */}
      {/* The click here selects text in a scroll container; it adds nothing a
          keyboard user cannot already do by focusing the region and using
          the normal selection keys. */}
      <div
        className="overflow-auto"
        style={{
          maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
        }}
        onClick={handleCodeClick}
      >
        <SyntaxHighlighter
          language={effectiveLanguage}
          style={isDark ? darkTheme : lightTheme}
          showLineNumbers={showLineNumbers}
          wrapLines={hasLineFeatures}
          lineProps={hasLineFeatures ? getLineProps : undefined}
          lineNumberStyle={getLineNumberStyle}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontFamily: CODE_FONT_FAMILY,
            fontSize: "0.875rem",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

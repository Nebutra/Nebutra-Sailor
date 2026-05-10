"use client";

import { Check, ChevronDown, Copy, File, FileCode, FileText } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "../utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// =============================================================================
// Types
// =============================================================================

export interface CodeBlockFile {
  /** File name/title displayed in tab */
  title: string;
  /** Code content */
  code: string;
  /** Language for syntax highlighting (auto-detected from title if omitted) */
  language?: string;
  /** Line numbers to highlight with emphasis background (1-indexed) */
  highlightedLines?: number[];
  /** Line numbers to mark as added / diff-green (1-indexed) */
  addedLines?: number[];
  /** Line numbers to mark as removed / diff-red (1-indexed) */
  removedLines?: number[];
}

export interface CodeBlockProps {
  /** Array of code files to display */
  files: CodeBlockFile[];
  /** Initially active file title */
  defaultTitle?: string;
  /** Additional CSS classes */
  className?: string;
  /** Maximum height of code area */
  maxHeight?: string | number;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Enable clickable line numbers that copy #L{n} anchors */
  enableLineReferences?: boolean;
  /** Show a language switcher dropdown in the header */
  showLanguageSwitcher?: boolean;
  /** Languages available in the switcher (defaults to built-in list) */
  languages?: string[];
  /** Callback when a line reference is clicked */
  onLineReference?: (lineNumber: number) => void;
}

// =============================================================================
// Themes
// =============================================================================

const lightTheme = {
  ...nightOwl,
  'pre[class*="language-"]': {
    ...nightOwl['pre[class*="language-"]'],
    background: "transparent",
  },
  'code[class*="language-"]': {
    ...nightOwl['code[class*="language-"]'],
    color: "hsl(var(--foreground))",
  },
  comment: {
    color: "hsl(var(--muted-foreground))",
    fontStyle: "italic",
  },
  punctuation: {
    color: "hsl(var(--foreground))",
  },
  property: {
    color: "#0550FF",
  },
  string: {
    color: "#14532D",
  },
  keyword: {
    color: "#9333EA",
  },
  function: {
    color: "#E45C3A",
  },
  boolean: {
    color: "#9333EA",
  },
  number: {
    color: "#9333EA",
  },
  operator: {
    color: "hsl(var(--foreground))",
  },
};

const darkTheme = {
  ...nightOwl,
  'pre[class*="language-"]': {
    ...nightOwl['pre[class*="language-"]'],
    background: "transparent",
  },
};

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

// =============================================================================
// Component
// =============================================================================

/**
 * CodeBlock - Multi-file code display with syntax highlighting
 *
 * @description
 * A tabbed code viewer with syntax highlighting, copy functionality,
 * and automatic language detection. Supports light/dark themes.
 *
 * @example Single file
 * ```tsx
 * <CodeBlock
 *   files={[{
 *     title: "example.ts",
 *     code: `const greeting = "Hello World";`
 *   }]}
 * />
 * ```
 *
 * @example Multiple files
 * ```tsx
 * <CodeBlock
 *   files={[
 *     { title: "theme.ts", code: themeCode, language: "typescript" },
 *     { title: "styles.css", code: cssCode, language: "css" },
 *   ]}
 *   defaultTitle="theme.ts"
 * />
 * ```
 *
 * @example With custom height
 * ```tsx
 * <CodeBlock
 *   files={files}
 *   maxHeight={300}
 *   showLineNumbers
 * />
 * ```
 */
export function CodeBlock({
  files,
  defaultTitle,
  className,
  maxHeight = 400,
  showLineNumbers = false,
  enableLineReferences = false,
  showLanguageSwitcher = false,
  languages,
  onLineReference,
}: CodeBlockProps) {
  const [activeTitle, setActiveTitle] = useState(defaultTitle || files[0]?.title);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [languageOverride, setLanguageOverride] = useState<string | null>(null);
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

  const activeFile = files.find((file) => file.title === activeTitle);
  const code = activeFile?.code || "";
  const detectedLanguage = activeFile?.language || getLanguageFromFileName(activeTitle || "");
  const effectiveLanguage = languageOverride ?? detectedLanguage;

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
      const style: React.CSSProperties = {};

      if (addedSet.has(lineNumber)) {
        style.color = "rgb(16, 185, 129)";
      } else if (removedSet.has(lineNumber)) {
        style.color = "rgb(239, 68, 68)";
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

  const switcherLanguages = languages ?? SUPPORTED_LANGUAGES;

  return (
    <div
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

      {/* Tab header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {files.map(({ title }) => (
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
              <FileIcon fileName={title} />
              <span className="hidden sm:inline">{title}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* Language switcher */}
          {showLanguageSwitcher && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Switch language, current: ${effectiveLanguage}`}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {effectiveLanguage}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                {switcherLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setLanguageOverride(lang)}
                    className={cn("text-xs", lang === effectiveLanguage && "bg-accent font-medium")}
                  >
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
            aria-label="Copy code"
          >
            {copied ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="h-4 w-4" />
              </motion.div>
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Code content */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
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
          lineNumberStyle={showLineNumbers ? getLineNumberStyle : undefined}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.875rem",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

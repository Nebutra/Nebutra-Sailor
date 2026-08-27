"use client";

import { CodeBlock } from "@nebutra/ui/primitives";

// =============================================================================
// Language mapping — file.language → react-syntax-highlighter language id.
// CodeBlock already auto-detects from a filename, but Startup OS files carry an
// explicit `language` (e.g. "tsx", "ts", "css"), so we normalize that directly.
// =============================================================================

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  typescript: "typescript",
  tsx: "tsx",
  js: "javascript",
  javascript: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  scss: "scss",
  sass: "scss",
  html: "html",
  md: "markdown",
  mdx: "markdown",
  markdown: "markdown",
  yaml: "yaml",
  yml: "yaml",
  sh: "bash",
  bash: "bash",
  py: "python",
  python: "python",
};

/**
 * Resolve a Startup OS file language string (or a path extension) to a
 * highlighter language id. Falls back to the raw value so unknown languages
 * still pass through to the highlighter rather than being dropped.
 */
function toHighlighterLanguage(language: string, path: string): string {
  const fromLang = LANGUAGE_MAP[language?.toLowerCase?.() ?? ""];
  if (fromLang) return fromLang;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_MAP[ext] ?? language ?? "text";
}

// =============================================================================
// Types
// =============================================================================

export interface StartupOsCodeViewFile {
  readonly path: string;
  readonly language: string;
  readonly content: string;
}

export interface StartupOsCodeViewProps {
  /** The file to render — path drives language detection, content is the source. */
  file: StartupOsCodeViewFile;
  /**
   * @deprecated Workspace code is AI-generated and the view is read-only; manual
   * editing was removed. Accepted (no-op) for back-compat with existing callers.
   */
  onSave?: (content: string) => void | Promise<void>;
  /** @deprecated No-op — see {@link StartupOsCodeViewProps.onSave}. */
  isSaving?: boolean;
  /** Cap the rendered height of the highlighted view (CodeBlock `maxHeight`). */
  maxHeight?: string | number;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * StartupOsCodeView — a read-only, syntax-highlighted view of a generated file
 * via the `@nebutra/ui` {@link CodeBlock} primitive.
 *
 * The Startup OS workspace is AI-generated: code changes flow through the chat /
 * plan, not a manual editor. So there is no Edit/Save UX — the panel only
 * renders the source. The path lives in the workspace tab bar, so the header is
 * hidden here to avoid duplication.
 */
export function StartupOsCodeView({ file, maxHeight = "100%", className }: StartupOsCodeViewProps) {
  const language = toHighlighterLanguage(file.language, file.path);

  return (
    <section
      data-testid="startup-os-code-view"
      data-mode="view"
      className={`min-h-0 flex-1 overflow-hidden bg-neutral-1 ${className ?? ""}`}
    >
      <CodeBlock
        aria-label={`Source of ${file.path}`}
        language={language}
        maxHeight={maxHeight}
        hideHeader
        className="h-full rounded-none border-0"
      >
        {file.content}
      </CodeBlock>
    </section>
  );
}

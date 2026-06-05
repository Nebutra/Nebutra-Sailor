"use client";

import { Check, Cross, PencilEdit } from "@nebutra/icons";
import { Button, CodeBlock } from "@nebutra/ui/primitives";
import { type KeyboardEvent, useCallback, useDeferredValue, useEffect, useState } from "react";

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
  /** The file to render — path drives the header + filename, content is the source. */
  file: StartupOsCodeViewFile;
  /** Persist handler invoked from the editor's Save. Omit for a read-only viewer. */
  onSave?: (content: string) => void | Promise<void>;
  /** External save-in-flight flag — disables Save and shows a saving label. */
  isSaving?: boolean;
  /** Cap the rendered height of the highlighted view (CodeBlock `maxHeight`). */
  maxHeight?: string | number;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * StartupOsCodeView — a Lovable-style code panel for the Startup OS workspace.
 *
 * The default mode is a syntax-highlighted, read-only render of the file via the
 * `@nebutra/ui` {@link CodeBlock} primitive (dark night-owl theme, language logo
 * + path in the header). When `onSave` is supplied an **Edit** toggle swaps to a
 * draft `<textarea>` (the existing editor flow, deferred for a cheap live
 * preview elsewhere) plus a **Save** that calls `onSave`. **Done** or **Esc**
 * returns to the highlighted view.
 *
 * So it looks highlighted like Lovable but stays editable.
 */
export function StartupOsCodeView({
  file,
  onSave,
  isSaving = false,
  maxHeight = "100%",
  className,
}: StartupOsCodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(file.content);
  const deferredDraft = useDeferredValue(draft);
  const language = toHighlighterLanguage(file.language, file.path);
  const isDirty = draft !== file.content;
  const editable = typeof onSave === "function";

  // Re-sync the draft whenever the selected file changes underneath us (a
  // different path, or an external save that changed content). Leaving edit
  // mode here keeps the highlighted view authoritative for the new file.
  // biome-ignore lint/correctness/useExhaustiveDependencies: file.path resets on file *identity* change, not only content — two files can share identical content.
  useEffect(() => {
    setDraft(file.content);
    setIsEditing(false);
  }, [file.path, file.content]);

  const enterEdit = useCallback(() => setIsEditing(true), []);

  const exitEdit = useCallback(() => {
    setDraft(file.content);
    setIsEditing(false);
  }, [file.content]);

  const save = useCallback(async () => {
    if (!editable || !isDirty || isSaving) return;
    await onSave?.(draft);
    setIsEditing(false);
  }, [editable, isDirty, isSaving, onSave, draft]);

  const onTextareaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exitEdit();
      }
    },
    [exitEdit],
  );

  return (
    <section
      data-testid="startup-os-code-view"
      data-mode={isEditing ? "edit" : "view"}
      className={`flex min-h-0 flex-1 flex-col bg-neutral-1 ${className ?? ""}`}
    >
      {/* Toolbar — Edit / Done + Save live here so the highlighted view stays clean. */}
      {editable ? (
        <div className="flex items-center justify-end gap-2 bg-neutral-2 px-3 py-2">
          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="ink"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void save()}
                  disabled={!isDirty || isSaving}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  {isSaving ? "Saving..." : isDirty ? "Save" : "Saved"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={exitEdit}
                >
                  <Cross className="size-3.5" aria-hidden="true" />
                  Done
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={enterEdit}
              >
                <PencilEdit className="size-3.5" aria-hidden="true" />
                Edit
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {isEditing ? (
        // Edit mode — the existing draft textarea flow. data-allow-native is the
        // sanctioned opt-out for the one editor surface that needs a raw control.
        <textarea
          data-allow-native
          data-testid="startup-os-code-editor"
          aria-label={`Edit ${file.path}`}
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onTextareaKeyDown}
          className="min-h-0 flex-1 resize-none border-0 bg-neutral-12 p-4 font-mono text-[13px] leading-6 text-neutral-1 shadow-none outline-none placeholder:text-neutral-6 dark:bg-black"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden" data-testid="startup-os-code-highlight">
          <CodeBlock
            aria-label={`Source of ${file.path}`}
            language={language}
            maxHeight={maxHeight}
            className="h-full rounded-none border-0"
          >
            {deferredDraft}
          </CodeBlock>
        </div>
      )}
    </section>
  );
}

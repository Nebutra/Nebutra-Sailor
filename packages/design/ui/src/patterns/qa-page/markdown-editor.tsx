"use client";

import {
  Code,
  FileText,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  ListUnordered,
  Pencil,
  TextBold,
  TextItalic,
} from "@nebutra/icons";
import { useCallback, useRef, useState } from "react";
import { Button } from "../../primitives/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { Textarea } from "../../primitives/textarea";
import { cn } from "../../utils/cn";
import { MarkdownRenderer } from "./markdown-renderer";

/* -------------------------------------------------------------------------- *\
 *  MarkdownEditor — tab-switchable write/preview composer with a toolbar.
 *
 *  Toolbar buttons insert markdown around the current selection (or at the
 *  caret if no selection) via a single `insertMarkdown` helper. No global
 *  state, no DOM lookup outside the textarea ref.
 *
 *  The Quote toolbar button uses a small inline SVG glyph because the Geist
 *  icon set doesn't ship a dedicated Quote — the AI-marketing Phosphor escape
 *  hatch doesn't apply to a forum surface, so we render a typographic mark.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MarkdownEditorProps = MarkdownEditorBaseProps &
  (
    | { onValueChange: (next: string) => void; onChange?: never }
    | {
        /** @deprecated Use `onValueChange` — `onChange` conventionally receives an event. */
        onChange: (next: string) => void;
        onValueChange?: never;
      }
  );

interface MarkdownEditorBaseProps {
  value: string;
  placeholder?: string;
  /** @default 250 */
  minHeight?: number;
  className?: string;
  /** Accessible names for the toolbar buttons. Pass translated strings. */
  labels?: Partial<MarkdownEditorLabels>;
}

export interface MarkdownEditorLabels {
  bold: string;
  italic: string;
  inlineCode: string;
  heading: string;
  blockQuote: string;
  bulletList: string;
  link: string;
  image: string;
  fencedCodeBlock: string;
}

const DEFAULT_MARKDOWN_EDITOR_LABELS: MarkdownEditorLabels = {
  bold: "Bold (Ctrl+B)",
  italic: "Italic (Ctrl+I)",
  inlineCode: "Inline code",
  heading: "Heading",
  blockQuote: "Block quote",
  bulletList: "Bullet list",
  link: "Link",
  image: "Image",
  fencedCodeBlock: "Fenced code block",
};

// ---------------------------------------------------------------------------
// Quote glyph — inline SVG (no Geist equivalent; Phosphor escape hatch is
// reserved for AI-brand marketing surfaces, not forum chrome)
// ---------------------------------------------------------------------------

function QuoteGlyph(props: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={props.className}>
      <title>Block quote</title>
      <path d="M4 4h2l-1.5 4H6v4H2V8l2-4Zm6 0h2l-1.5 4H12v4H8V8l2-4Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkdownEditor({
  value,
  onValueChange,
  onChange: legacyOnChange,
  placeholder = "Write your answer here…",
  minHeight = 250,
  className,
  labels,
}: MarkdownEditorProps) {
  // The type admits exactly one of the two; the canonical name wins.
  const onChange = (onValueChange ?? legacyOnChange) as (next: string) => void;
  const mergedLabels = { ...DEFAULT_MARKDOWN_EDITOR_LABELS, ...labels };
  const [tab, setTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback(
    (before: string, after = "", forceNewLine = false) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);
      const needsLeadingNl = forceNewLine && start > 0 && value[start - 1] !== "\n";
      const insert = (needsLeadingNl ? "\n" : "") + before + selected + after;
      const next = value.slice(0, start) + insert + value.slice(end);
      onChange(next);
      // Re-focus and place caret inside the inserted boundaries.
      requestAnimationFrame(() => {
        el.focus();
        const caretStart = start + (needsLeadingNl ? 1 : 0) + before.length;
        el.setSelectionRange(caretStart, caretStart + selected.length);
      });
    },
    [value, onChange],
  );

  return (
    <div
      className={cn("overflow-hidden rounded-[var(--radius-md)] border border-border", className)}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")} className="w-full">
        <div className="flex items-center justify-between gap-2 border-border border-b bg-muted/30 px-3 py-2">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="write" className="text-xs">
              <Pencil className="mr-1 h-3 w-3" aria-hidden="true" />
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <FileText className="mr-1 h-3 w-3" aria-hidden="true" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton
              aria-label={mergedLabels.bold}
              onClick={() => insertMarkdown("**", "**")}
            >
              <TextBold className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.italic}
              onClick={() => insertMarkdown("*", "*")}
            >
              <TextItalic className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.inlineCode}
              onClick={() => insertMarkdown("`", "`")}
            >
              <Code className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.heading}
              onClick={() => insertMarkdown("\n## ", "", true)}
            >
              <Hash className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.blockQuote}
              onClick={() => insertMarkdown("\n> ", "", true)}
            >
              <QuoteGlyph className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.bulletList}
              onClick={() => insertMarkdown("\n- ", "", true)}
            >
              <ListUnordered className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.link}
              onClick={() => insertMarkdown("[", "](url)")}
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.image}
              onClick={() => insertMarkdown("![alt text](", ")")}
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label={mergedLabels.fencedCodeBlock}
              onClick={() => insertMarkdown("\n```javascript\n", "\n```\n", true)}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
          </div>
        </div>

        <TabsContent value="write" className="mt-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            tone="bare"
            className="resize-none rounded-none font-mono text-sm"
            style={{ minHeight }}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-0">
          <div className="bg-background p-4" style={{ minHeight }}>
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground text-sm italic">
                Nothing to preview.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between border-border border-t bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
        <span>Markdown supported</span>
        <span>{value.length} characters</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar button — local helper, keeps the toolbar a single declarative grid
// ---------------------------------------------------------------------------

function ToolbarButton({
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}

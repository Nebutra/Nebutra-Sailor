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

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** @default 250 */
  minHeight?: number;
  className?: string;
}

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
  onChange,
  placeholder = "Write your answer here…",
  minHeight = 250,
  className,
}: MarkdownEditorProps) {
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
            <ToolbarButton aria-label="Bold (Ctrl+B)" onClick={() => insertMarkdown("**", "**")}>
              <TextBold className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton aria-label="Italic (Ctrl+I)" onClick={() => insertMarkdown("*", "*")}>
              <TextItalic className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton aria-label="Inline code" onClick={() => insertMarkdown("`", "`")}>
              <Code className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton aria-label="Heading" onClick={() => insertMarkdown("\n## ", "", true)}>
              <Hash className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label="Block quote"
              onClick={() => insertMarkdown("\n> ", "", true)}
            >
              <QuoteGlyph className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              aria-label="Bullet list"
              onClick={() => insertMarkdown("\n- ", "", true)}
            >
              <ListUnordered className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton aria-label="Link" onClick={() => insertMarkdown("[", "](url)")}>
              <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton aria-label="Image" onClick={() => insertMarkdown("![alt text](", ")")}>
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              aria-label="Fenced code block"
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
            className="resize-none rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
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

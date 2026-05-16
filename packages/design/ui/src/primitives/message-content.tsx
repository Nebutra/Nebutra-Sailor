"use client";

/**
 * MessageContent — streaming-aware markdown renderer for AI responses.
 *
 * Single source-of-truth for rendering AI-generated text across every chat
 * surface in the platform. Wraps `streamdown` (the same engine AI Elements'
 * MessageResponse uses) with our prose tokens + dark-mode parity.
 *
 * Why this exists (not `<Streamdown>` directly):
 *   - Lock prose-typography defaults so every chat looks identical
 *   - One place to swap the underlying renderer (e.g. to AI Elements'
 *     MessageResponse, or a future engine) without touching consumers
 *   - Centralize allow-list of supported markdown features (tables, code,
 *     math, mermaid) so security/perf settings stay consistent
 *
 * Usage:
 *
 *   import { MessageContent } from "@nebutra/ui/primitives";
 *   <MessageContent>{aiResponseText}</MessageContent>
 *
 * For non-streaming static markdown (docs, briefings) the same component
 * works — it just renders the final state.
 */

import * as React from "react";
import { Streamdown } from "streamdown";
import {
  type MessageContentDensity,
  messageContentTokens,
} from "../tokens/components/message-content";
import { cn } from "../utils/cn";

const codeFenceLanguages = new Set<string>([
  "bash",
  "diff",
  "html",
  "js",
  "json",
  "jsx",
  "md",
  "markdown",
  "sh",
  "shell",
  "text",
  "ts",
  "tsx",
  "yml",
  "yaml",
] as const);

type MessageContentCssVars = React.CSSProperties & {
  "--message-content-code-radius"?: string;
  "--message-content-code-padding"?: string;
  "--message-content-inline-code-radius"?: string;
  "--message-content-inline-code-padding-x"?: string;
  "--message-content-inline-code-padding-y"?: string;
  "--message-content-table-radius"?: string;
  "--message-content-paragraph-margin"?: string;
  "--message-content-heading-margin"?: string;
  "--message-content-pre-margin"?: string;
};

export interface MessageContentProps {
  ref?: React.Ref<HTMLDivElement>;
  /** Markdown source. Can be a partial chunk during streaming. */
  children: string;
  /** Visual density. `compact` removes most prose margins. */
  density?: MessageContentDensity;
  /**
   * If true, applies inverted (light-on-dark) prose. Use inside dark message
   * bubbles where the surrounding bg is `bg-blue-9` etc.
   */
  inverted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function fixNumberedListBreaks(markdown: string): string {
  return markdown.replace(/^(\d+)\.\s*\n+\s*\n*/gm, "$1. ");
}

export function normalizeCodeFenceLanguages(markdown: string): string {
  return markdown.replace(/```([^\n]*)/g, (_match, langRaw) => {
    const lang = String(langRaw || "")
      .trim()
      .toLowerCase();
    if (!lang) return "```";

    const normalized = lang.split(/\s+/)[0] ?? "text";
    return codeFenceLanguages.has(normalized) ? `\`\`\`${normalized}` : "```text";
  });
}

export function normalizeMessageMarkdown(markdown: string): string {
  return normalizeCodeFenceLanguages(fixNumberedListBreaks(markdown));
}

function getMessageContentStyle(
  density: MessageContentDensity,
  style: React.CSSProperties | undefined,
): MessageContentCssVars {
  const densityToken = messageContentTokens.density[density];

  return {
    "--message-content-code-radius": `${messageContentTokens.code.radius}px`,
    "--message-content-code-padding": `${messageContentTokens.code.padding}px`,
    "--message-content-inline-code-radius": `${messageContentTokens.inlineCode.radius}px`,
    "--message-content-inline-code-padding-x": `${messageContentTokens.inlineCode.paddingX}px`,
    "--message-content-inline-code-padding-y": `${messageContentTokens.inlineCode.paddingY}px`,
    "--message-content-table-radius": `${messageContentTokens.table.radius}px`,
    "--message-content-paragraph-margin": `${densityToken.paragraphMargin}px`,
    "--message-content-heading-margin": `${densityToken.headingMargin}px`,
    "--message-content-pre-margin": `${densityToken.preMargin}px`,
    ...style,
  };
}

export function MessageContent({
  ref,
  children,
  density = "comfortable",
  inverted = false,
  className,
  style,
}: MessageContentProps) {
  const content = React.useMemo(() => normalizeMessageMarkdown(children), [children]);

  return (
    <div
      ref={ref}
      className={cn(
        // Tailwind Typography (prose) tokens, sized for chat density.
        "prose prose-sm max-w-none leading-relaxed",
        // Dark-mode prose flips heading/text/link colors automatically.
        "dark:prose-invert",
        // Inverted is for user bubbles where bg is brand — force light text.
        inverted && "prose-invert",
        // Compact density: kill prose's default margins between blocks.
        "prose-p:my-[var(--message-content-paragraph-margin)] prose-headings:my-[var(--message-content-heading-margin)] prose-pre:my-[var(--message-content-pre-margin)]",
        // Code blocks inherit our token system rather than prose defaults.
        "prose-pre:rounded-[var(--message-content-code-radius)] prose-pre:bg-neutral-2 prose-pre:p-[var(--message-content-code-padding)] prose-pre:text-xs",
        "dark:prose-pre:bg-white/5",
        "prose-code:rounded-[var(--message-content-inline-code-radius)] prose-code:bg-neutral-2 prose-code:px-[var(--message-content-inline-code-padding-x)] prose-code:py-[var(--message-content-inline-code-padding-y)]",
        "prose-code:text-[0.85em] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
        "dark:prose-code:bg-white/10",
        "prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-table:rounded-[var(--message-content-table-radius)]",
        className,
      )}
      style={getMessageContentStyle(density, style)}
    >
      <Streamdown>{content}</Streamdown>
    </div>
  );
}

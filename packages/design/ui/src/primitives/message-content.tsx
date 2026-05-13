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
import { cn } from "../utils/cn";

export interface MessageContentProps {
  /** Markdown source. Can be a partial chunk during streaming. */
  children: string;
  /** Visual density. `compact` removes most prose margins. */
  density?: "compact" | "comfortable";
  /**
   * If true, applies inverted (light-on-dark) prose. Use inside dark message
   * bubbles where the surrounding bg is `bg-blue-9` etc.
   */
  inverted?: boolean;
  className?: string;
}

export const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ children, density = "comfortable", inverted = false, className }, ref) => {
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
          density === "compact" && "prose-p:my-1 prose-headings:my-1.5 prose-pre:my-2",
          // Code blocks inherit our token system rather than prose defaults.
          "prose-pre:rounded-lg prose-pre:bg-neutral-2 prose-pre:p-3 prose-pre:text-xs",
          "dark:prose-pre:bg-white/5",
          "prose-code:rounded prose-code:bg-neutral-2 prose-code:px-1 prose-code:py-0.5",
          "prose-code:text-[0.85em] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
          "dark:prose-code:bg-white/10",
          className,
        )}
      >
        <Streamdown>{children}</Streamdown>
      </div>
    );
  },
);
MessageContent.displayName = "MessageContent";

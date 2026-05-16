"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  MarkdownRenderer — react-markdown wrapper for Q&A posts.
 *
 *  Why react-markdown (not the runtime-injected CDN script the source used):
 *    - SSR-safe (no DOM access at import time)
 *    - No `dangerouslySetInnerHTML` — react-markdown emits real React nodes,
 *      so the XSS surface that the original `window.marked` + innerHTML
 *      pipeline opened is structurally absent.
 *    - Tree-shakable / cacheable / CSP-friendly.
 *
 *  Why not Streamdown:
 *    Streamdown is our chat-AI markdown engine — optimized for streaming
 *    text from a model. Q&A posts are static long-form prose, so plain
 *    react-markdown + GFM is the right shape.
\* -------------------------------------------------------------------------- */

export interface MarkdownRendererProps {
  /** Markdown source. */
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Inline + block code use semantic tokens so they read in light + dark
          // themes without hardcoded slate/blue.
          code(props) {
            const { className: codeClassName, children, ...rest } = props;
            const isBlock = /language-/.test(codeClassName ?? "");
            if (isBlock) {
              return (
                <code
                  {...rest}
                  className={cn(
                    "block overflow-x-auto rounded-[var(--radius-md)] border border-border bg-muted p-4 font-mono text-foreground text-sm",
                    codeClassName,
                  )}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                {...rest}
                className={cn(
                  "rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-sm",
                  codeClassName,
                )}
              >
                {children}
              </code>
            );
          },
          // Anchor: open external links in a new tab; protect against
          // tabnabbing with rel="noopener noreferrer".
          a({ href, children, ...rest }) {
            const external = typeof href === "string" && /^https?:/.test(href);
            return (
              <a
                href={href}
                className="text-primary underline-offset-4 hover:underline"
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                {...rest}
              >
                {children}
              </a>
            );
          },
          blockquote({ children, ...rest }) {
            return (
              <blockquote
                {...rest}
                className="my-4 border-primary border-l-4 bg-muted py-2 pl-4 text-foreground italic"
              >
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

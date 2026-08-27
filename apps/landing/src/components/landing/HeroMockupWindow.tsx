"use client";

import type { ReactNode } from "react";
import { AnimateIn } from "./AnimateIn";
import { AI_SHOWCASE_ROWS } from "./features/glyphs/ai-showcase.generated";
import { MinimalMonorepoTree } from "./MonorepoFileTree";

/** The OpenAI row from the catalog, so the snippet cannot drift past the
 *  frontier the way "o3" did. */
const SAMPLE_MODEL =
  AI_SHOWCASE_ROWS.find((row) => row.model.startsWith("gpt-"))?.model ?? "gpt-5.5";

const CODE_SNIPPET = `import { Hono } from "hono";
import { streamText } from "ai";
import { openai } from "@nebutra/agents";
import { authMiddleware } from "@nebutra/identity";
import { db } from "@nebutra/db";
import { z } from "zod";

const app = new Hono()
  .use("/*", authMiddleware())
  .post("/chat", async (c) => {
    const { messages, model } = await c.req.json();

    const result = streamText({
      model: openai(model ?? "${SAMPLE_MODEL}"),
      system: "You are Nebutra Intelligence...",
      messages,
      tools: {
        searchDocs: {
          description: "Search knowledge base",
          parameters: z.object({
            query: z.string(),
          }),
        },
      },
    });

    return result.toDataStreamResponse();
  });

export default app;`;

const CODE_TOKEN_REGEX =
  /("(?:[^"\\]|\\.)*"|\/\/.*|\b(?:import|export|const|async|await|return|from|new|default|function|if|else|try|catch)(?=[\s(;,])|\b(?:Hono|z|streamText|openai|authMiddleware)(?=[\s({.])|\b(?:use|post|get|json|toDataStreamResponse)(?=\()|\b(?:model|system|messages|tools|searchDocs|description|parameters|query)(?=:)|\b(?:app|c|req|result|db)\b)/g;

type CodeToken = {
  className?: string;
  id: string;
  value: ReactNode;
};

function getCodeTokenClassName(token: string) {
  if (token.startsWith("//")) return "text-muted-foreground/50 italic";
  if (token.startsWith('"')) return "text-teal-600 dark:text-teal-400";
  if (
    /^(import|export|const|async|await|return|from|new|default|function|if|else|try|catch)$/.test(
      token,
    )
  ) {
    return "text-[#ff7b72] dark:text-[#ff7b72] font-medium";
  }
  if (/^(Hono|z|streamText|openai|authMiddleware)$/.test(token)) {
    return "text-[#d2a8ff] dark:text-[#d2a8ff]";
  }
  if (/^(use|post|get|json|toDataStreamResponse)$/.test(token)) {
    return "text-[#79c0ff] dark:text-[#79c0ff]";
  }
  if (/^(model|system|messages|tools|searchDocs|description|parameters|query)$/.test(token)) {
    return "text-[#7ee787] dark:text-[#7ee787]";
  }
  return "text-[#79c0ff] dark:text-[#79c0ff]";
}

function tokenizeCodeLine(line: string) {
  const tokens: CodeToken[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(CODE_TOKEN_REGEX)) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      tokens.push({
        id: `${lastIndex}:plain`,
        value: line.slice(lastIndex, matchIndex),
      });
    }

    const token = match[0];
    tokens.push({
      className: getCodeTokenClassName(token),
      id: `${matchIndex}:${token}`,
      value: token,
    });
    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < line.length) {
    tokens.push({
      id: `${lastIndex}:plain`,
      value: line.slice(lastIndex),
    });
  }

  return tokens;
}

const CODE_LINES = CODE_SNIPPET.split("\n").map((line, lineNumber) => ({
  id: `${lineNumber + 1}:${line}`,
  lineNumber: lineNumber + 1,
  tokens: tokenizeCodeLine(line),
}));

export function HeroMockupWindow() {
  return (
    <AnimateIn preset="fadeUp" className="w-full max-w-[1400px] mx-auto relative z-20 px-4 group">
      <div
        style={{ boxShadow: "var(--ring-hairline)" }}
        className="relative rounded-[var(--radius-panel)] border border-border bg-background/95 overflow-hidden transition-[background-color,border-color,box-shadow] duration-500"
      >
        {/* Top highlight line */}
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* macOS Title Bar */}
        <div className="relative z-20 flex h-11 w-full items-center justify-between border-b border-border/30 bg-muted/40 px-4">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-[#ff5f56] shadow-sm" />
            <div className="size-3 rounded-full bg-[#ffbd2e] shadow-sm" />
            <div className="size-3 rounded-full bg-[#27c93f] shadow-sm" />
          </div>
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-[12px] font-semibold tracking-wide text-muted-foreground/70 sm:block">
            nebutra-sailor: Code
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>

        <div className="relative z-10 flex h-[360px] w-full flex-col sm:h-[440px] md:h-[520px] md:flex-row">
          {/* Left Sidebar — fixed height, vertical scroll inside */}
          <div className="hidden w-full shrink-0 flex-col overflow-hidden border-border/30 border-b bg-muted/30 md:flex md:w-[420px] md:border-r md:border-b-0">
            <MinimalMonorepoTree />
          </div>

          {/* Right Editor */}
          <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
            {/* Editor tab bar */}
            <div className="flex flex-none items-center h-[38px] border-b border-border/30 bg-muted/20 z-20">
              <div className="flex items-center h-full">
                <div className="flex items-center gap-1.5 px-4 h-full bg-background border-b-2 border-primary text-foreground text-[11px] font-medium">
                  {/* TypeScript, not JavaScript. The tab reads chat.ts and wore
                      the JS logo — a detail that undercuts a snippet whose whole
                      point is that the stack is typed. */}
                  <svg
                    aria-hidden="true"
                    className="size-3 shrink-0 text-[#3178C6]"
                    fill="currentColor"
                    focusable="false"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 3h18v18H3V3zm10.71 12.29c.39.6 1.02.94 1.9.94.74 0 1.21-.29 1.21-.79 0-.54-.42-.73-1.28-1.1l-.47-.2c-1.36-.58-2.26-1.3-2.26-2.83 0-1.41 1.07-2.48 2.75-2.48 1.19 0 2.05.41 2.67 1.5l-1.46.94c-.32-.58-.67-.81-1.21-.81-.55 0-.9.35-.9.81 0 .57.35.8 1.16 1.15l.47.2c1.6.69 2.5 1.38 2.5 2.95 0 1.69-1.33 2.62-3.11 2.62-1.74 0-2.87-.83-3.42-1.92l1.45-.98zM8.6 10.9H5.9V9.35h7.05v1.55h-2.7v7.5H8.6v-7.5z" />
                  </svg>
                  chat.ts
                </div>
                <div className="hidden h-full cursor-default items-center gap-1.5 px-4 font-medium text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground/80 sm:flex">
                  schema.prisma
                </div>
              </div>
            </div>
            {/* Code content */}
            <div className="relative h-full overflow-auto p-4">
              <pre className="text-[12.5px] font-mono leading-[1.7] overflow-x-auto h-full text-foreground/80 selection:bg-primary/10">
                <code>
                  {CODE_LINES.map(({ id, lineNumber, tokens }) => (
                    <div
                      key={id}
                      className="min-w-fit flex hover:bg-muted/30 transition-colors rounded-[var(--radius-sm)] -mx-1 px-1"
                    >
                      <span className="inline-block text-right pr-4 select-none text-[11px] w-7 shrink-0 py-px text-muted-foreground/30">
                        {lineNumber}
                      </span>
                      <span className="whitespace-pre py-px">
                        {tokens.map((token) =>
                          token.className ? (
                            <span key={token.id} className={token.className}>
                              {token.value}
                            </span>
                          ) : (
                            <span key={token.id}>{token.value}</span>
                          ),
                        )}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}

HeroMockupWindow.displayName = "HeroMockupWindow";

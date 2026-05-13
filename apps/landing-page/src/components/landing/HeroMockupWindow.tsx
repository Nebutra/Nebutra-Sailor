"use client";

import type { ReactNode } from "react";
import { AnimateIn } from "./AnimateIn";
import { MinimalMonorepoTree } from "./MonorepoFileTree";

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
      model: openai(model ?? "o3"),
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

const CODE_LINES = CODE_SNIPPET.split("\n").map((line, lineNumber) => ({
  id: `${lineNumber + 1}:${line}`,
  line,
  lineNumber: lineNumber + 1,
}));

const CODE_TOKEN_REGEX =
  /("(?:[^"\\]|\\.)*"|\/\/.*|\b(?:import|export|const|async|await|return|from|new|default|function|if|else|try|catch)(?=[\s(;,])|\b(?:Hono|z|streamText|openai|authMiddleware)(?=[\s({.])|\b(?:use|post|get|json|toDataStreamResponse)(?=\()|\b(?:model|system|messages|tools|searchDocs|description|parameters|query)(?=:)|\b(?:app|c|req|result|db)\b)/g;

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

function renderHighlightedLine(line: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(CODE_TOKEN_REGEX)) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      nodes.push(line.slice(lastIndex, matchIndex));
    }

    const token = match[0];
    nodes.push(
      <span key={`${matchIndex}:${token}`} className={getCodeTokenClassName(token)}>
        {token}
      </span>,
    );
    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes;
}

export function HeroMockupWindow() {
  return (
    <AnimateIn preset="fadeUp" className="w-full max-w-[1400px] mx-auto relative z-20 px-4 group">
      <div
        style={{ boxShadow: "var(--ring-hairline)" }}
        className="relative rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background/95 dark:bg-zinc-950/95 overflow-hidden backdrop-blur-2xl transition-all duration-500"
      >
        {/* Top highlight line */}
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* macOS Title Bar */}
        <div className="relative z-20 flex h-11 w-full items-center justify-between border-b border-border/30 bg-muted/40 px-4 dark:bg-zinc-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ff5f56] shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-[#27c93f] shadow-sm" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] font-semibold tracking-wide text-muted-foreground/70">
            nebutra-sailor — Code
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>

        <div className="relative z-10 flex flex-col md:flex-row h-[520px] w-full">
          {/* Left Sidebar — fixed height, vertical scroll inside */}
          <div className="w-full md:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-border/30 bg-muted/30 dark:bg-zinc-950/50 flex flex-col overflow-hidden">
            <MinimalMonorepoTree />
          </div>

          {/* Right Editor */}
          <div className="flex-1 bg-background dark:bg-zinc-950 flex flex-col overflow-hidden relative">
            {/* Editor tab bar */}
            <div className="flex flex-none items-center h-[38px] border-b border-border/30 bg-muted/20 dark:bg-zinc-900/50 z-20">
              <div className="flex items-center h-full">
                <div className="flex items-center gap-1.5 px-4 h-full bg-background dark:bg-zinc-950 border-b-2 border-primary text-foreground text-[11px] font-medium">
                  <svg
                    className="w-3 h-3 text-blue-500 shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M3 3h18v18H3V3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.167-.438-1.349-.854-.068-.248-.083-.382-.036-.528.126-.611.936-.793 1.553-.625.397.108.77.421.992.813.836-.544.836-.544 1.416-.91-.216-.366-.328-.526-.476-.657-.652-.72-1.528-1.088-2.941-1.055l-.723.099c-.695.17-1.353.552-1.738 1.076-1.124 1.426-.803 3.924.563 4.949 1.351 1.075 3.33 1.312 3.581 2.321.24 1.2-.886 1.583-2.003 1.443-.828-.182-1.285-.672-1.786-1.219l-1.474.85c.174.393.375.57.674.915 1.44 1.479 5.038 1.405 5.685-.852.022-.076.156-.491.044-1.16zm-6.737-5.48h-1.826c0 1.403-.007 2.8-.01 4.205 0 .893.045 1.715-.098 1.967-.237.484-.853.424-1.134.336-.29-.147-.435-.35-.604-.642-.047-.079-.082-.142-.095-.142l-1.46.892c.243.502.583.928 1.017 1.205.644.41 1.508.559 2.413.369.588-.15 1.093-.477 1.36-.964.389-.665.307-1.482.299-2.394.02-1.611.007-3.223.007-4.843l.13.01z" />
                  </svg>
                  chat.ts
                </div>
                <div className="flex items-center gap-1.5 px-4 h-full text-muted-foreground/50 text-[11px] font-medium hover:text-muted-foreground/80 cursor-default transition-colors">
                  schema.prisma
                </div>
              </div>
            </div>
            {/* Code content */}
            <div className="px-4 py-4 overflow-auto h-full relative">
              <pre className="text-[12.5px] font-mono leading-[1.7] overflow-x-auto h-full text-foreground/80 selection:bg-primary/10">
                <code>
                  {CODE_LINES.map(({ id, line, lineNumber }) => (
                    <div
                      key={id}
                      className="min-w-fit flex hover:bg-muted/30 transition-colors rounded-sm -mx-1 px-1"
                    >
                      <span className="inline-block text-right pr-4 select-none text-[11px] w-7 shrink-0 py-px text-muted-foreground/30">
                        {lineNumber}
                      </span>
                      <span className="whitespace-pre py-px">{renderHighlightedLine(line)}</span>
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

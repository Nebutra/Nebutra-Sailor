"use client";

import { Code, Lightning, MagnifyingGlass } from "@nebutra/icons";
import { Badge, Input, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Row = {
  path: string;
  snippet: React.ReactNode;
  score: number;
};

const ROWS: Row[] = [
  {
    path: "packages/iam/auth/src/handler.ts:42",
    snippet: (
      <>
        export async function <mark>handler</mark>(req: Request)
      </>
    ),
    score: 0.91,
  },
  {
    path: "packages/iam/auth/src/middleware.ts:18",
    snippet: (
      <>
        const auth = await <mark>handler</mark>.verify(token)
      </>
    ),
    score: 0.84,
  },
  {
    path: "backends/gateway/src/auth.ts:7",
    snippet: (
      <>
        import {"{"} <mark>handler</mark> {"}"} from "@nebutra/auth"
      </>
    ),
    score: 0.78,
  },
];

export function CodeIndexGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="flex w-full flex-col gap-1.5 overflow-hidden rounded-[var(--radius-md)] bg-neutral-2 p-2"
    >
      <div className="relative">
        <MagnifyingGlass
          className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-10"
          aria-hidden
        />
        <Input
          readOnly
          value="auth.handler"
          aria-label="Symbol search"
          className="h-7 pl-7 font-mono text-[11px]"
        />
      </div>

      <ul className="flex flex-col gap-1">
        {ROWS.map((row) => (
          <li
            key={row.path}
            className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-neutral-6 bg-neutral-1 px-1.5 py-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[9px] text-neutral-11">
                <Code
                  className="mr-1 inline h-2.5 w-2.5 align-[-1px] text-neutral-10"
                  aria-hidden
                />
                {row.path}
              </span>
              <Badge variant="outline" className="h-3.5 px-1 font-mono text-[8px]">
                {row.score.toFixed(2)}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <code className="truncate font-mono text-[9px] text-neutral-12 [&_mark]:bg-[hsl(var(--primary))]/15 [&_mark]:text-[color:hsl(var(--primary))] [&_mark]:rounded-[1px] [&_mark]:px-[1px]">
                {row.snippet}
              </code>
            </div>
            <Progress
              value={row.score * 100}
              className="h-0.5"
              aria-label={`Relevance ${row.score}`}
            />
          </li>
        ))}
      </ul>

      <footer className="mt-auto flex items-center gap-1 font-mono text-[8.5px] text-neutral-10">
        <Lightning className="h-2.5 w-2.5 text-[color:var(--brand-accent)]" aria-hidden />
        <span>12,401 symbols · tree-sitter · 84ms</span>
      </footer>
    </div>
  );
}

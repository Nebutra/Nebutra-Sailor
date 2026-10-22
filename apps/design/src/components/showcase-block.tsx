"use client";

import { CodeBlock, Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/showcase-status";
import type { ShowcaseStatus } from "@/lib/showcase-model";

export interface BlockUseLink {
  id: string;
  name: string;
  href: string | null;
}

export interface BlockEntry {
  id: string;
  title: string;
  product: string;
  blurb: string;
  file: string;
  status: ShowcaseStatus;
  uses: BlockUseLink[];
  /** The block's source file, verbatim. */
  code: string;
  preview: ReactNode;
}

/**
 * One block: the scene at its real size, the Core components it is made of
 * (each a link), and the file it renders from, ready to copy.
 */
export function ShowcaseBlock({ block }: { block: BlockEntry }) {
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card @min-[576px]/grid:col-span-6">
      <div className="flex flex-col gap-3 px-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="font-medium text-base text-foreground">{block.title}</h3>
            <span className="text-muted-foreground text-xs">{block.product}</span>
          </div>
          <StatusBadge status={block.status} />
        </div>
        <p className="max-w-2xl text-neutral-11 text-sm">{block.blurb}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
          <span className="text-foreground">Built from</span>
          {block.uses.map((use, i) => (
            <span key={use.id}>
              {use.href ? (
                <Link className="font-mono underline-offset-4 hover:underline" href={use.href}>
                  {use.name}
                </Link>
              ) : (
                <span className="font-mono">{use.name}</span>
              )}
              {i < block.uses.length - 1 ? "," : ""}
            </span>
          ))}
        </p>
      </div>

      <Tabs className="mt-4 w-full" defaultValue="preview">
        <TabsList aria-label={`${block.title} views`} className="mx-5" variant="line">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent className="m-0" value="preview">
          <div className="border-border border-t bg-background p-5">{block.preview}</div>
        </TabsContent>
        <TabsContent className="m-0" value="code">
          <div className="border-border border-t bg-background">
            <CodeBlock filename={block.file} language="tsx" maxHeight={520}>
              {block.code}
            </CodeBlock>
          </div>
        </TabsContent>
      </Tabs>
    </li>
  );
}

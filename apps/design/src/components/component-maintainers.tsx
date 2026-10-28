"use client";

/**
 * Everything on a component page that is for whoever maintains the component
 * rather than whoever uses it: where the source and story live, which axes were
 * read from source, and the "catches" note each example registered.
 *
 * Collapsed by default. A designer or an agent integrating the component never
 * needs it; a maintainer opens it once.
 */

import { ChevronDown } from "@nebutra/icons";
import { CopyButton } from "@nebutra/ui/primitives";
import * as React from "react";
import { getCatches, getServerCatches, subscribeCatches } from "@/lib/components/catches";

export interface DerivedAxis {
  name: string;
  count: number;
}

export function ComponentMaintainers({
  sourceFile,
  storyFile,
  demoFile,
  registryFile,
  axes,
}: {
  sourceFile: string;
  storyFile: string | null;
  demoFile: string;
  registryFile: string;
  axes: DerivedAxis[];
}) {
  const catches = React.useSyncExternalStore(subscribeCatches, getCatches, getServerCatches);

  return (
    <section
      className="-mx-4 border-hairline border-t px-4 py-8 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12"
      id="maintainers"
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden [&::-webkit-details-marker]:hidden">
          <h2 className="m-0 text-foreground text-lg leading-heading tracking-heading">
            Maintainers
          </h2>
          <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
            Source, story and what each example guards against
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="mt-6 flex flex-col gap-8">
          <dl className="m-0 grid gap-x-6 gap-y-3 text-sm md:grid-cols-[8rem_1fr]">
            <PathRow label="Source" value={sourceFile} />
            <PathRow
              label="Story"
              value={storyFile}
              empty="None — the examples on this page are the only visual coverage."
            />
            <PathRow label="Examples" value={demoFile} />
            <PathRow label="Registry" value={registryFile} />
            <Row label="Read from source">
              {axes.length > 0 ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  {axes.map((axis) => (
                    <span
                      className="inline-flex items-baseline gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-card px-2 py-0.5"
                      key={axis.name}
                    >
                      <code className="font-mono text-foreground text-xs">{axis.name}</code>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {axis.count}
                      </span>
                    </span>
                  ))}
                  <span className="text-muted-foreground text-xs">
                    Add a value in the library and it appears on this page.
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  No cva variant map and no enumerable size or tone union, so every example is
                  composed by hand.
                </span>
              )}
            </Row>
          </dl>

          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-foreground text-sm">
              What the examples guard against
              {catches.length > 0 ? (
                <span className="ms-2 text-muted-foreground tabular-nums">{catches.length}</span>
              ) : null}
            </h3>
            {catches.length > 0 ? (
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {catches.map((note) => (
                  <li
                    className="grid gap-1 border-hairline border-t pt-3 md:grid-cols-[12rem_1fr] md:gap-6"
                    key={note.id}
                  >
                    <a
                      className="text-foreground text-sm underline-offset-4 hover:underline"
                      href={`#${note.id}`}
                    >
                      {note.title}
                    </a>
                    <span className="text-neutral-11 text-sm">{note.breaks}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="m-0 text-muted-foreground text-sm">
                Notes appear here once the examples have loaded.
              </p>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 min-w-0 text-neutral-11">{children}</dd>
    </>
  );
}

function PathRow({ label, value, empty }: { label: string; value: string | null; empty?: string }) {
  return (
    <Row label={label}>
      {value ? (
        <span className="flex items-center gap-2">
          <code className="min-w-0 break-all font-mono text-foreground text-xs">{value}</code>
          <CopyButton
            className="shrink-0 text-muted-foreground"
            showToast={false}
            tooltipText={`Copy ${label.toLowerCase()} path`}
            value={value}
          />
        </span>
      ) : (
        <span className="text-muted-foreground">{empty}</span>
      )}
    </Row>
  );
}

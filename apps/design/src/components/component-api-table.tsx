/**
 * The API section: one table per documented export, read from the library's
 * types (see lib/components/api-docs.ts), with nothing typed in by hand.
 *
 * A component's own props get the table. What it inherits from React, Radix or
 * Base UI is real API too, but 280 DOM attributes in a row would bury the six
 * props the reader came for, so each source is a disclosure of its own.
 *
 * Responsive: a real table at md and up; below that each row becomes a stacked
 * block (explicit ARIA roles keep the table semantics once the display type
 * is overridden).
 */

// biome-ignore-all lint/a11y/noRedundantRoles: Below md the rows are display-overridden to stack, which drops native table semantics in Safari/VoiceOver; the explicit roles restore them.
import { Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import type * as React from "react";
import type { ApiBlock, ApiProp, InheritedGroup } from "@/lib/components/api-docs";

const TH = "px-3 py-2 text-start font-medium text-muted-foreground text-xs";

export function ApiBlocks({ blocks, unresolved }: { blocks: ApiBlock[]; unresolved: string[] }) {
  if (blocks.length === 0) {
    return (
      <p className="m-0 max-w-3xl text-muted-foreground text-sm">
        No component or function signature could be read from the source for{" "}
        {unresolved.map((name) => (
          <code className="font-mono text-xs" key={name}>
            {name}
          </code>
        ))}
        . The registry entry in <code className="font-mono text-xs">registry.ts</code> probably
        points at the wrong file.
      </p>
    );
  }

  const [primary, ...rest] = blocks;

  return (
    <div className="flex flex-col gap-8">
      {primary ? <Block block={primary} primary /> : null}
      {rest.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-foreground text-sm">Related exports</h3>
          {rest.map((block) => (
            <Disclosure
              key={block.name}
              meta={countLabel(block)}
              summary={block.name}
              note={block.description}
            >
              <Block block={block} />
            </Disclosure>
          ))}
        </div>
      ) : null}
      {unresolved.length > 0 ? (
        <p className="m-0 text-muted-foreground text-xs">
          Not a component or function, so not listed:{" "}
          {unresolved.map((name, i) => (
            <span key={name}>
              {i > 0 ? ", " : ""}
              <code className="font-mono">{name}</code>
            </span>
          ))}
          .
        </p>
      ) : null}
    </div>
  );
}

/** A type signature; when it was shortened for the table, the full one opens on hover or focus. */
function TypeCode({ type, full }: { type: string; full?: string | undefined }) {
  const code = <code className="break-words font-mono text-muted-foreground text-xs">{type}</code>;
  if (!full || full === type) return code;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <code
          className="break-words font-mono text-muted-foreground text-xs"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a tooltip trigger has to be reachable by keyboard
          tabIndex={0}
        >
          {type}
        </code>
      </TooltipTrigger>
      <TooltipContent className="max-w-[min(40rem,90vw)] break-words font-mono text-xs">
        {full}
      </TooltipContent>
    </Tooltip>
  );
}

function countLabel(block: ApiBlock): string {
  if (block.kind === "function") return "function";
  const inherited = block.inherited.reduce((sum, g) => sum + g.props.length, 0);
  const own = `${block.props.length} ${block.props.length === 1 ? "prop" : "props"}`;
  return inherited > 0 ? `${own} + ${inherited} inherited` : own;
}

function Block({ block, primary = false }: { block: ApiBlock; primary?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {primary ? <h3 className="m-0 font-mono text-foreground text-base">{block.name}</h3> : null}
        {block.description ? (
          <p className="m-0 max-w-3xl text-neutral-11 text-sm">
            <Prose text={block.description} />
          </p>
        ) : null}
      </div>

      {block.kind === "function" ? (
        <FunctionSignatures block={block} />
      ) : block.props.length > 0 ? (
        <PropsTable props={block.props} />
      ) : (
        <p className="m-0 text-muted-foreground text-sm">
          No props of its own. It takes the props of the primitive it wraps, listed below.
        </p>
      )}

      {block.inherited.length > 0 ? (
        <div className="flex flex-col gap-2">
          {block.inherited.map((group) => (
            <InheritedDisclosure
              group={group}
              key={group.source}
              open={block.props.length === 0 && !group.source.startsWith("React")}
            />
          ))}
        </div>
      ) : null}

      {block.parts.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="m-0 font-medium text-foreground text-sm">Parts</h4>
          {block.parts.map((part) => (
            <Disclosure
              key={part.name}
              meta={countLabel(part)}
              note={part.description}
              summary={part.name}
            >
              <Block block={part} />
            </Disclosure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PropsTable({ props }: { props: ApiProp[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-card shadow-xs">
      <table className="w-full border-collapse text-sm" role="table">
        <thead className="max-md:sr-only" role="rowgroup">
          <tr className="border-hairline border-b bg-background" role="row">
            <th className={cn(TH, "w-[22%]")} role="columnheader" scope="col">
              Prop
            </th>
            <th className={cn(TH, "w-[30%]")} role="columnheader" scope="col">
              Type
            </th>
            <th className={cn(TH, "w-[14%]")} role="columnheader" scope="col">
              Default
            </th>
            <th className={TH} role="columnheader" scope="col">
              Description
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {props.map((prop) => (
            <PropRow key={prop.name} prop={prop} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PropRow({ prop }: { prop: ApiProp }) {
  return (
    <tr
      className="border-hairline border-b align-top last:border-b-0 max-md:flex max-md:flex-col max-md:gap-1 max-md:px-4 max-md:py-3"
      role="row"
    >
      <td className="px-3 py-2.5 max-md:block max-md:p-0" role="cell">
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
          <code
            className={cn(
              "font-medium font-mono text-foreground text-xs",
              prop.deprecated !== null && "line-through decoration-muted-foreground",
            )}
          >
            {prop.name}
          </code>
          {prop.required ? <span className="text-destructive-strong text-xs">required</span> : null}
          {prop.deprecated !== null ? (
            <span className="text-muted-foreground text-xs">deprecated</span>
          ) : null}
        </span>
      </td>
      <td className="px-3 py-2.5 max-md:block max-md:p-0" role="cell">
        <TypeCode full={prop.typeFull} type={prop.type} />
      </td>
      <td className="px-3 py-2.5 max-md:block max-md:p-0" role="cell">
        {prop.defaultValue !== null ? (
          <code className="font-mono text-foreground text-xs">{prop.defaultValue}</code>
        ) : (
          <span className="text-muted-foreground text-xs">
            <span aria-hidden>–</span>
            <span className="sr-only">No default</span>
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-neutral-11 text-xs max-md:block max-md:p-0" role="cell">
        {prop.deprecated !== null && prop.deprecated !== "" ? `${prop.deprecated} ` : ""}
        <Prose text={prop.description} />
      </td>
    </tr>
  );
}

function FunctionSignatures({ block }: { block: ApiBlock }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-hairline bg-card shadow-xs">
        {block.signatures.map((signature) => (
          <pre
            className="m-0 overflow-x-auto border-hairline border-b px-4 py-3 font-mono text-foreground text-xs last:border-b-0"
            key={signature}
          >
            <code>{`${block.name}${signature}`}</code>
          </pre>
        ))}
      </div>
      {block.members.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="m-0 font-medium text-foreground text-sm">Returns</h4>
          <PropsTable props={block.members} />
        </div>
      ) : null}
    </div>
  );
}

function InheritedDisclosure({ group, open }: { group: InheritedGroup; open: boolean }) {
  const namesOnly = group.source.startsWith("React");

  return (
    <Disclosure
      meta={`${group.props.length} props`}
      open={open}
      summary={`Also accepts: ${group.source}`}
    >
      {namesOnly ? (
        <p className="m-0 flex flex-wrap gap-x-3 gap-y-1">
          {group.props.map((p) => (
            <code className="font-mono text-muted-foreground text-xs" key={p.name}>
              {p.name}
            </code>
          ))}
        </p>
      ) : (
        <dl className="m-0 grid gap-x-6 gap-y-1.5 md:grid-cols-[minmax(0,14rem)_1fr]">
          {group.props.map((p) => (
            <div className="contents" key={p.name}>
              <dt>
                <code className="font-mono text-foreground text-xs">{p.name}</code>
              </dt>
              <dd className="m-0 mb-1.5 md:mb-0">
                <TypeCode full={p.typeFull} type={p.type} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Disclosure>
  );
}

function Disclosure({
  summary,
  meta,
  note,
  open,
  children,
}: {
  summary: string;
  meta?: string;
  note?: string | undefined;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-lg border border-hairline bg-card shadow-xs open:bg-card"
      open={open}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="font-medium font-mono text-foreground text-xs">{summary}</span>
        {meta ? <span className="text-muted-foreground text-xs">{meta}</span> : null}
        {note ? (
          <span className="min-w-0 basis-full truncate text-muted-foreground text-xs md:basis-auto">
            {note}
          </span>
        ) : null}
      </summary>
      <div className="border-hairline border-t px-4 py-4">{children}</div>
    </details>
  );
}

/** JSDoc writes code in backticks; render it as code instead of showing the ticks. */
function Prose({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code className="font-mono text-foreground text-xs" key={`${index}:${part}`}>
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

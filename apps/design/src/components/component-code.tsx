"use client";

/**
 * A copyable code block, and the install/import card at the top of a page.
 *
 * Deliberately unhighlighted: a component page has dozens of snippets and a
 * colourful one in every section turns the page into a code editor. Mono,
 * hairline, one copy affordance.
 *
 * Both share one frame (`CodeFrame`): a single hairline card whose rows are
 * separated by hairlines inside it, never boxes inside boxes.
 */

import { CopyButton } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";
import { Segmented } from "./segmented";

/** The one frame for code on this site. */
function CodeFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <figure
      className={cn(
        "m-0 overflow-hidden rounded-lg border border-hairline bg-card shadow-xs",
        className,
      )}
    >
      {children}
    </figure>
  );
}

/** A row's caption bar: a quiet label on the left, controls on the right. */
const BAR = "flex min-h-9 items-center justify-between gap-3 bg-muted/40 px-3 py-1";
const LABEL = "font-medium text-muted-foreground text-xs";

/**
 * Press feedback for the copy buttons. CopyButton appends its own
 * `transition-colors` after Button's list and the merge keeps the later one, so
 * the 0.97 press would snap; restating the list with `transform` keeps it eased.
 */
const PRESS =
  "transition-[background-color,border-color,box-shadow,color,transform] active:scale-[0.97] motion-reduce:transform-none motion-reduce:active:scale-100";

export function CodeBlock({
  code,
  label,
  className,
  bare = false,
}: {
  code: string;
  /** Names what the block is, for assistive tech and the visible caption. */
  label?: string;
  className?: string;
  /** Drop the frame: the block sits inside a container that already draws one. */
  bare?: boolean;
}) {
  const body = (
    <>
      <div className={cn(BAR, "border-hairline border-b")}>
        <figcaption className={LABEL}>{label ?? "Code"}</figcaption>
        <CopyButton
          className={cn("text-muted-foreground", PRESS)}
          showToast={false}
          tooltipText="Copy code"
          value={code}
        />
      </div>
      <pre className="m-0 overflow-x-auto px-4 py-3 font-mono text-foreground text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </>
  );

  return bare ? (
    <figure className={cn("m-0 min-w-0", className)}>{body}</figure>
  ) : (
    <CodeFrame className={className}>{body}</CodeFrame>
  );
}

const MANAGERS = [
  { id: "pnpm", command: "pnpm add @nebutra/ui" },
  { id: "npm", command: "npm install @nebutra/ui" },
  { id: "yarn", command: "yarn add @nebutra/ui" },
] as const;

type Manager = (typeof MANAGERS)[number]["id"];
const MANAGER_IDS = MANAGERS.map((m) => m.id);

/**
 * The two lines a reader needs before anything else: how to get the package
 * and what to import. The package-manager choice is remembered for the page
 * only; it is not worth a persisted preference.
 */
export function InstallCard({ importLine }: { importLine: string }) {
  const [manager, setManager] = React.useState<Manager>("pnpm");
  const command = MANAGERS.find((m) => m.id === manager)?.command ?? MANAGERS[0].command;

  return (
    <CodeFrame>
      <div className={cn(BAR, "border-hairline border-b")}>
        <span className={LABEL}>Install</span>
        <Segmented
          label="Package manager"
          onValueChange={setManager}
          options={MANAGER_IDS}
          value={manager}
        />
      </div>
      <Line copyLabel="Copy install command" value={command} />
      <div className={cn(BAR, "border-hairline border-y")}>
        <span className={LABEL}>Import</span>
      </div>
      <Line copyLabel="Copy import" value={importLine} />
    </CodeFrame>
  );
}

function Line({ value, copyLabel }: { value: string; copyLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-foreground text-sm">
        {value}
      </code>
      <CopyButton
        className={cn("shrink-0 text-muted-foreground", PRESS)}
        showToast={false}
        tooltipText={copyLabel}
        value={value}
      />
    </div>
  );
}

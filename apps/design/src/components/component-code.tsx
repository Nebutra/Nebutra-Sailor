"use client";
// @primitive-exempt: the package-manager switch is an aria-pressed segmented toggle, not an action button.

/**
 * A copyable code block, and the install/import card at the top of a page.
 *
 * Deliberately unhighlighted: a component page has dozens of snippets and a
 * colourful one in every section turns the page into a code editor. Mono,
 * hairline, one copy affordance.
 */

import { CopyButton } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";

export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  /** Names what the block is, for assistive tech and the visible caption. */
  label?: string;
  className?: string;
}) {
  return (
    <figure
      className={cn("m-0 overflow-hidden rounded-lg border border-border bg-card", className)}
    >
      <div className="flex items-center justify-between gap-2 border-border border-b bg-background px-3 py-1.5">
        <figcaption className="text-muted-foreground text-xs">{label ?? "Code"}</figcaption>
        <CopyButton
          className="text-muted-foreground"
          showToast={false}
          tooltipText="Copy code"
          value={code}
        />
      </div>
      <pre className="m-0 overflow-x-auto px-4 py-3 font-mono text-foreground text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

const MANAGERS = [
  { id: "pnpm", command: "pnpm add @nebutra/ui" },
  { id: "npm", command: "npm install @nebutra/ui" },
  { id: "yarn", command: "yarn add @nebutra/ui" },
] as const;

type Manager = (typeof MANAGERS)[number]["id"];

/**
 * The two lines a reader needs before anything else: how to get the package
 * and what to import. The package-manager choice is remembered for the page
 * only; it is not worth a persisted preference.
 */
export function InstallCard({ importLine }: { importLine: string }) {
  const [manager, setManager] = React.useState<Manager>("pnpm");
  const command = MANAGERS.find((m) => m.id === manager)?.command ?? MANAGERS[0].command;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-border border-b bg-background px-3 py-1.5">
        <span className="text-muted-foreground text-xs">Install</span>
        {/* biome-ignore lint/a11y/useSemanticElements: a labelled button group, not a form fieldset */}
        <div aria-label="Package manager" className="flex items-center gap-0.5" role="group">
          {MANAGERS.map((m) => (
            <button
              aria-pressed={manager === m.id}
              className={cn(
                "h-6 rounded-[var(--radius-sm)] px-2 font-medium text-xs transition-colors duration-micro",
                manager === m.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={m.id}
              onClick={() => setManager(m.id)}
              type="button"
            >
              {m.id}
            </button>
          ))}
        </div>
      </div>
      <Line value={command} copyLabel="Copy install command" />
      <div className="border-border border-t bg-background px-3 py-1.5 text-muted-foreground text-xs">
        Import
      </div>
      <Line value={importLine} copyLabel="Copy import" />
    </div>
  );
}

function Line({ value, copyLabel }: { value: string; copyLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-foreground text-sm">
        {value}
      </code>
      <CopyButton
        className="shrink-0 text-muted-foreground"
        showToast={false}
        tooltipText={copyLabel}
        value={value}
      />
    </div>
  );
}

"use client";

import { CopyButton } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";

/**
 * A shell command on one row with its copy button.
 *
 * The command scrolls rather than wraps: wrapped, `npx create-sailor@latest
 * my-app --preset linear` reads as two commands on a phone. The prompt glyph is
 * decoration and is left out of the selection and the copy.
 */
export function CommandLine({ command, className }: { command: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 items-center justify-between gap-1 rounded-[var(--radius-md)] border border-hairline bg-muted/40 pe-1 ps-3",
        className,
      )}
    >
      <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-foreground text-ui">
        <span aria-hidden className="select-none pe-2 text-muted-foreground">
          $
        </span>
        {command}
      </code>
      <CopyButton
        showToast={false}
        size="icon"
        successMessage="Command copied"
        tooltipText="Copy command"
        value={command}
      />
    </div>
  );
}

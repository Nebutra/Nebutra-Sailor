/**
 * Shared Commander typings for CLI register* helpers.
 * Prefer these over `program: any` / `options: any`.
 */

import type { Command } from "commander";

/** Register a top-level or nested command tree on the root program. */
export type RegisterCommand = (program: Command) => void;

/** Common global flags used by most nebutra subcommands. */
export interface GlobalCliOptions {
  quiet?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  format?: string;
}

/**
 * Merge command-local options with globals from `optsWithGlobals` when present.
 * Commander action callbacks receive `(arg..., options, command)` in v12;
 * some handlers still pass the command object as the second arg — support both.
 */
export function mergeGlobalOptions(
  options: Record<string, unknown> & { optsWithGlobals?: () => Record<string, unknown> },
  command?: Command,
): GlobalCliOptions & Record<string, unknown> {
  const fromOpts =
    typeof options.optsWithGlobals === "function" ? options.optsWithGlobals() : undefined;
  const fromCmd =
    command &&
    typeof (command as Command & { optsWithGlobals?: () => Record<string, unknown> })
      .optsWithGlobals === "function"
      ? (command as Command & { optsWithGlobals: () => Record<string, unknown> }).optsWithGlobals()
      : undefined;
  return {
    ...fromCmd,
    ...fromOpts,
    ...options,
  };
}

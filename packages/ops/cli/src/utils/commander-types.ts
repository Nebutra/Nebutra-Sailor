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
 *
 * Why this isn't a plain `{ ...globals, ...options }` spread: several
 * subcommands declare a LOCAL option with the same name as one of the root
 * program's global options (`--format`, `--yes`, `--quiet`). When the same
 * flag is declared at two levels, Commander binds a user-typed value to
 * whichever level's own parser sees it — never both — so the *other* level's
 * local `options` snapshot still carries its own (unset, or defaulted)
 * value for that key. Spreading `options` last, unconditionally, let that
 * stale/default local value silently clobber a real value the user typed at
 * the other level — the exact bug this function exists to prevent, that it
 * was itself still committing.
 *
 * The fix: `command.optsWithGlobals()` already resolves this correctly on
 * its own (it walks the whole command chain and returns whichever level
 * actually holds the effective value per flag), so it's the base. A key
 * from this command's own local `options` is only allowed to override that
 * when it is not `undefined` AND Commander recorded it as explicitly
 * provided at THIS level (`getOptionValueSource(key) !== "default"`) — so a
 * same-named option's untouched local default can never win over a value
 * that already resolved correctly at another level.
 */
export function mergeGlobalOptions(
  options: Record<string, unknown> & { optsWithGlobals?: () => Record<string, unknown> },
  command?: Command,
): GlobalCliOptions & Record<string, unknown> {
  const fromCmd =
    command &&
    typeof (command as Command & { optsWithGlobals?: () => Record<string, unknown> })
      .optsWithGlobals === "function"
      ? (command as Command & { optsWithGlobals: () => Record<string, unknown> }).optsWithGlobals()
      : undefined;
  const fromOpts =
    typeof options.optsWithGlobals === "function" ? options.optsWithGlobals() : undefined;
  const globals = fromCmd ?? fromOpts ?? {};

  const ownExplicit: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (key === "optsWithGlobals") continue;
    // An unset flag with no default is `undefined` here — never let that
    // blank out a value the same key already has from `globals`.
    if (value === undefined) continue;
    // No `command` (so no source info) → fall back to the historical
    // "own always wins when defined" behavior for backward compatibility.
    // With a `command`, only an explicitly-provided value may override —
    // "default" means Commander never saw this flag typed at this level.
    const source = command?.getOptionValueSource?.(key);
    if (source === "default") continue;
    ownExplicit[key] = value;
  }

  return {
    ...globals,
    ...ownExplicit,
  } as GlobalCliOptions & Record<string, unknown>;
}

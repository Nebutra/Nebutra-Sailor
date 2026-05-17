/**
 * Slash-command registry — faithful re-expression of the unified command model.
 *
 * Semantic model:
 *  - A command and a skill are the SAME underlying type. `CommandRecord` is just
 *    a `Definition`. The only differences are carried in the record itself:
 *    `sourceTier`, and the `userInvocable` / `modelInvocable` frontmatter flags.
 *  - Slash invocation (a human types `/deploy`) and model invocation (the model
 *    auto-triggers) are two FRONT-DOORS to ONE expansion path.
 *  - The registry IS a `DefinitionResolver<CommandRecord>` (layered tier merge +
 *    precedence + dual gate are provided by definitions.ts — reused, not rebuilt).
 *    `CommandRegistry` is a thin wrapper exposing the two front-doors; both
 *    recompute per call so entitlement/flag changes apply live.
 *
 * Scope note: the source harness also has `local` / `local-jsx` command kinds
 * that run TUI-side JSX. Those are intentionally DROPPED here — a server runtime
 * only needs the prompt-expansion path. This module models that path only.
 *
 * Multi-tenant: `tenantId` is mandatory at every entry point; an empty tenant
 * throws (fail-closed); cross-tenant resolution is impossible (the underlying
 * resolver rejects foreign-tenant records).
 */

import {
  type Definition,
  DefinitionResolver,
  type ResolveContext,
  substituteArguments,
} from "./definitions";

/**
 * A command IS a Definition. No new fields — the distinction between "command"
 * and "skill" is purely the `sourceTier` + invocability flags already present.
 */
export type CommandRecord = Definition;

/** Lazily loads a command's body text (FS / blob / remote — caller's choice). */
export type BodyLoader = (cmd: CommandRecord) => Promise<string>;

/** One content block destined for the model turn. */
export interface ContentBlock {
  readonly role: "user";
  readonly content: string;
}

/** Result of expanding a command — declarative only; no enforcement here. */
export interface ExpandedCommand {
  /** Prompt blocks to splice into the turn. */
  readonly contentBlocks: readonly ContentBlock[];
  /** Tools the command self-declares for the permission context. */
  readonly allowedTools: readonly string[];
  /** Model alias to switch to, if the command pins one (not "inherit"). */
  readonly modelOverride?: string | undefined;
  /** Reasoning effort hint, if declared. */
  readonly effort?: "low" | "medium" | "high" | undefined;
  /** inline = expand into current turn; fork = isolated child. */
  readonly executionMode: "inline" | "fork";
}

/**
 * Split a positional argument string across declared arg names. Extra tokens
 * beyond the last declared name are folded into that last argument (matches the
 * source's "rest goes to the last positional" behaviour). With no declared
 * names the whole string is exposed as `${ARGUMENTS}` / `$1`.
 */
function bindArgs(input: string, argNames: readonly string[]): Record<string, string> {
  const tokens = input.trim().length > 0 ? input.trim().split(/\s+/) : [];
  const args: Record<string, string> = {};
  if (argNames.length === 0) {
    args.ARGUMENTS = input.trim();
    args["1"] = input.trim();
    return args;
  }
  argNames.forEach((name, i) => {
    if (i === argNames.length - 1) {
      args[name] = tokens.slice(i).join(" ");
    } else {
      args[name] = tokens[i] ?? "";
    }
  });
  return args;
}

/**
 * Pure expansion. Loads the body lazily (exactly once), substitutes named args
 * and a tenant-safe variable map (only the explicitly injected `variables` —
 * never `process.env`), and returns the declarative execution context.
 */
export async function expandCommand(
  cmd: CommandRecord,
  argInput: string,
  variables: Readonly<Record<string, string>>,
  bodyLoader: BodyLoader,
): Promise<ExpandedCommand> {
  const body = await bodyLoader(cmd);
  const args = bindArgs(argInput, cmd.frontmatter.argNames);
  // Only injected variables are visible — host env is deliberately excluded.
  const content = substituteArguments(body, args, { ...variables });

  const model = cmd.frontmatter.model;
  const modelOverride = model && model !== "inherit" ? model : undefined;

  return Object.freeze({
    contentBlocks: Object.freeze([
      Object.freeze({ role: "user" as const, content }),
    ]) as readonly ContentBlock[],
    allowedTools: Object.freeze([...cmd.frontmatter.allowedTools]),
    modelOverride,
    effort: cmd.frontmatter.effort,
    executionMode: cmd.frontmatter.executionMode,
  });
}

/**
 * Thin tenant-scoped wrapper over `DefinitionResolver<CommandRecord>`. Exposes
 * the two front-doors. Tier merge / precedence / dual gate / tenant isolation
 * are delegated to the resolver — this class only filters by invocability.
 */
export class CommandRegistry {
  readonly #resolver: DefinitionResolver<CommandRecord>;

  constructor(commands: readonly CommandRecord[]) {
    this.#resolver = new DefinitionResolver<CommandRecord>(commands);
  }

  /** Commands a human may type as a slash command. */
  listForUser(ctx: ResolveContext): CommandRecord[] {
    return this.#resolver.resolve(ctx).filter((c) => c.frontmatter.userInvocable !== false);
  }

  /** Commands the model may auto-trigger. */
  listForModel(ctx: ResolveContext): CommandRecord[] {
    return this.#resolver.resolve(ctx).filter((c) => c.frontmatter.modelInvocable !== false);
  }

  /** Highest-precedence gated record for a slug (no invocability filter). */
  resolveOne(slug: string, ctx: ResolveContext): CommandRecord | undefined {
    return this.#resolver.resolveOne(slug, ctx);
  }
}

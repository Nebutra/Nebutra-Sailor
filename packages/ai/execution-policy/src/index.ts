/**
 * Permission ruleset evaluator.
 *
 * A small, pure, stateless re-expression of a two-dimensional wildcard
 * permission model plus a bash-command-prefix extractor. No global state,
 * no I/O, no mutation of inputs — every function is referentially transparent.
 *
 * The model has two independent dimensions per rule:
 *   - `permission` — the capability namespace (e.g. "bash", "edit", "net")
 *   - `pattern`    — the concrete subject within that namespace
 * A rule applies only when BOTH dimensions match the query via {@link wildcardMatch}.
 */

/** The decision a rule yields. Unknown queries fail safe to "ask". */
export type Action = "allow" | "deny" | "ask";

/** A single permission rule. Both dimensions are matched as wildcard globs. */
export interface Rule {
  permission: string;
  pattern: string;
  action: Action;
}

/** An ordered list of rules. Earlier rules take precedence. */
export type Ruleset = Rule[];

/**
 * Anchored full-string glob matcher.
 *
 * Semantics:
 *   - `*` matches any run of characters, including the empty run.
 *   - `?` matches exactly one character.
 *   - Every other character is matched literally (regex metacharacters in
 *     `pattern` carry no special meaning).
 *   - The match is anchored: the entire `str` must be consumed.
 *
 * Special rule (ported faithfully): if `pattern` ends with `" *"` (a single
 * space immediately followed by `*`), that trailing ` *` is OPTIONAL. The
 * pattern then matches both `"<head> <rest>"` and exactly `"<head>"` with
 * nothing after it. For example `"git *"` matches `"git"` and `"git status"`.
 *
 * Implemented with a backtracking two-pointer scan whose `*` handling uses a
 * single saved restart position, giving O(|str| * |pattern|) worst case with
 * no catastrophic blow-up.
 */
export function wildcardMatch(str: string, pattern: string): boolean {
  if (isOptionalTrailingStar(pattern)) {
    const head = pattern.slice(0, -2); // drop the trailing " *"
    // Head-only branch: the whole string equals the head, matched as a glob.
    if (globMatch(str, head)) {
      return true;
    }
    // Otherwise the full "<head> *" pattern must match (space is consumed).
    return globMatch(str, pattern);
  }
  return globMatch(str, pattern);
}

/**
 * True when `pattern` ends in a literal space followed by `*`, and that `*`
 * is the final character. A bare `"*"` (no preceding space) is NOT treated
 * as the optional-suffix form.
 */
function isOptionalTrailingStar(pattern: string): boolean {
  return pattern.length >= 2 && pattern.endsWith(" *");
}

/**
 * Core anchored glob match using linear-time backtracking. Only `*` can
 * backtrack, and it uses a single restart marker (the classic two-pointer
 * algorithm), so there is no exponential backtracking.
 */
function globMatch(str: string, pattern: string): boolean {
  let s = 0;
  let p = 0;
  let starP = -1;
  let starS = 0;

  while (s < str.length) {
    const pc = p < pattern.length ? pattern[p] : undefined;
    if (pc === "*") {
      // Record the restart point and tentatively consume zero chars.
      starP = p;
      starS = s;
      p += 1;
    } else if (pc === "?" || pc === str[s]) {
      p += 1;
      s += 1;
    } else if (starP !== -1) {
      // Backtrack: let the last `*` swallow one more character.
      p = starP + 1;
      starS += 1;
      s = starS;
    } else {
      return false;
    }
  }

  // Consume any trailing `*` segments in the pattern.
  while (p < pattern.length && pattern[p] === "*") {
    p += 1;
  }

  return p === pattern.length;
}

/**
 * Resolve a permission query against one or more rulesets.
 *
 * Rulesets are concatenated in argument order (no mutation) and scanned
 * front-to-back. The FIRST rule whose `permission` and `pattern` both match
 * the query (via {@link wildcardMatch}) is returned. If no rule matches, a
 * fail-safe default is returned: the queried permission/pattern with action
 * `"ask"` (unknown → ask, never silently allow).
 */
export function evaluate(permission: string, pattern: string, ...rulesets: Ruleset[]): Rule {
  for (const ruleset of rulesets) {
    for (const rule of ruleset) {
      if (wildcardMatch(permission, rule.permission) && wildcardMatch(pattern, rule.pattern)) {
        return rule;
      }
    }
  }
  return { permission, pattern: "*", action: "ask" };
}

/**
 * Built-in command arity table. Maps a (possibly multi-word) command prefix
 * to the number of leading tokens that constitute its "human-understandable
 * command" for permission matching. Longest matching prefix wins.
 *
 * Frozen so the shared default cannot be mutated by callers.
 */
export const BUILTIN_ARITY: Readonly<Record<string, number>> = Object.freeze({
  git: 2,
  npm: 2,
  "npm run": 3,
  docker: 2,
  kubectl: 2,
  cargo: 2,
  pnpm: 2,
  "pnpm run": 3,
  yarn: 2,
  "yarn run": 3,
  go: 2,
  ls: 1,
  cat: 1,
  cd: 1,
  rm: 1,
  cp: 1,
  mv: 1,
  mkdir: 1,
  echo: 1,
  grep: 1,
  python: 1,
  node: 1,
});

/**
 * Extract the human-understandable command from already-split, flag-free
 * shell tokens.
 *
 * Strategy: try the longest prefix first. For `len` from `tokens.length` down
 * to 1, if `tokens.slice(0, len).join(" ")` is a key in the (merged) arity
 * table, return `tokens.slice(0, arity[thatPrefix])`. If the tokens are empty,
 * return `[]`. Otherwise default to the first token only.
 *
 * `arity` is shallow-merged OVER the built-in table; neither the caller's
 * object nor the built-in table is mutated.
 */
export function commandPrefix(
  tokens: string[],
  arity?: Record<string, number> | undefined,
): string[] {
  if (tokens.length === 0) {
    return [];
  }
  const table: Record<string, number> = { ...BUILTIN_ARITY, ...(arity ?? {}) };

  for (let len = tokens.length; len >= 1; len -= 1) {
    const prefixKey = tokens.slice(0, len).join(" ");
    const take = table[prefixKey];
    if (take !== undefined) {
      // Clamp to the available token count; never expand beyond the input.
      return tokens.slice(0, Math.min(take, tokens.length));
    }
  }

  return tokens.slice(0, 1);
}

/**
 * Derive the `pattern` to feed {@link evaluate} for a bash permission.
 *
 * Splits `command` on arbitrary whitespace, drops tokens that begin with `-`
 * (flags are not conceptually part of the command identity), applies
 * {@link commandPrefix}, and joins the result with single spaces.
 */
export function commandPermissionKey(command: string): string {
  const tokens = command.split(/\s+/).filter((token) => token.length > 0 && !token.startsWith("-"));
  return commandPrefix(tokens).join(" ");
}

export type ShellApprovalMode = "always" | "once_per_session" | "never";

export interface ShellApprovalRule {
  readonly match: string | RegExp;
  readonly requireApproval: ShellApprovalMode;
  readonly reason: string;
}

export const DEFAULT_SHELL_APPROVAL_RULES: readonly ShellApprovalRule[] = Object.freeze([
  { match: /^rm\s+-rf\b/, requireApproval: "always", reason: "destructive recursive removal" },
  {
    match: /\b(format|mkfs)\b/,
    requireApproval: "always",
    reason: "destructive filesystem operation",
  },
  {
    match: /\bDROP\s+(DATABASE|SCHEMA|TABLE)\b/i,
    requireApproval: "always",
    reason: "destructive database operation",
  },
  {
    match: /\b(npm|pnpm|yarn)\s+publish\b/,
    requireApproval: "always",
    reason: "package publishing",
  },
  { match: /^git\s+push\b/, requireApproval: "once_per_session", reason: "remote git mutation" },
]);

export function matchesShellApprovalRule(command: string, rule: ShellApprovalRule): boolean {
  return typeof rule.match === "string" ? command.startsWith(rule.match) : rule.match.test(command);
}

export function shellApprovalRequired(
  command: string,
  rules: readonly ShellApprovalRule[] = DEFAULT_SHELL_APPROVAL_RULES,
): ShellApprovalRule | null {
  return (
    rules.find(
      (rule) => rule.requireApproval !== "never" && matchesShellApprovalRule(command, rule),
    ) ?? null
  );
}

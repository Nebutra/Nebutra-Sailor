import { describe, expect, it } from "vitest";
import {
  type Action,
  BUILTIN_ARITY,
  commandPermissionKey,
  commandPrefix,
  evaluate,
  type Rule,
  type Ruleset,
  wildcardMatch,
} from "./permission-ruleset.js";

describe("wildcardMatch — anchored full-string glob", () => {
  it("matches literal strings exactly", () => {
    expect(wildcardMatch("git", "git")).toBe(true);
    expect(wildcardMatch("git", "npm")).toBe(false);
  });

  it("is anchored (no partial matches)", () => {
    expect(wildcardMatch("git status", "git")).toBe(false);
    expect(wildcardMatch("agit", "git")).toBe(false);
    expect(wildcardMatch("gitx", "git")).toBe(false);
  });

  it("treats * as any run including empty", () => {
    expect(wildcardMatch("", "*")).toBe(true);
    expect(wildcardMatch("anything at all", "*")).toBe(true);
    expect(wildcardMatch("abc", "a*c")).toBe(true);
    expect(wildcardMatch("ac", "a*c")).toBe(true);
    expect(wildcardMatch("abbbbc", "a*c")).toBe(true);
    expect(wildcardMatch("abd", "a*c")).toBe(false);
  });

  it("treats ? as exactly one char", () => {
    expect(wildcardMatch("a", "?")).toBe(true);
    expect(wildcardMatch("", "?")).toBe(false);
    expect(wildcardMatch("ab", "?")).toBe(false);
    expect(wildcardMatch("abc", "a?c")).toBe(true);
    expect(wildcardMatch("ac", "a?c")).toBe(false);
  });

  it("combines * and ? together", () => {
    expect(wildcardMatch("file.test.ts", "*.ts")).toBe(true);
    // `*` swallows "file.test", then ".t" + one `?` (= "s") consumes ".ts"
    expect(wildcardMatch("file.test.ts", "*.t?")).toBe(true);
    // ".t??" needs two trailing chars after ".t" — only one ("s") remains
    expect(wildcardMatch("file.test.ts", "*.t??")).toBe(false);
    expect(wildcardMatch("file.test.tsx", "*.t??")).toBe(true);
  });

  it("treats regex metacharacters in the pattern as literals", () => {
    expect(wildcardMatch("a.b", "a.b")).toBe(true);
    expect(wildcardMatch("axb", "a.b")).toBe(false);
    expect(wildcardMatch("a+b", "a+b")).toBe(true);
    expect(wildcardMatch("(x)", "(x)")).toBe(true);
    expect(wildcardMatch("a$b^", "a$b^")).toBe(true);
    expect(wildcardMatch("a[b]c", "a[b]c")).toBe(true);
  });

  it("empty pattern matches only empty string", () => {
    expect(wildcardMatch("", "")).toBe(true);
    expect(wildcardMatch("x", "")).toBe(false);
  });

  describe("SPECIAL RULE — trailing ' *' is optional", () => {
    it('pattern "git *" matches the head-only "git"', () => {
      expect(wildcardMatch("git", "git *")).toBe(true);
    });

    it('pattern "git *" matches "git <rest>"', () => {
      expect(wildcardMatch("git status", "git *")).toBe(true);
      expect(wildcardMatch("git commit -m x", "git *")).toBe(true);
    });

    it('pattern "git *" still requires the head prefix', () => {
      expect(wildcardMatch("npm", "git *")).toBe(false);
      expect(wildcardMatch("gitx", "git *")).toBe(false);
      expect(wildcardMatch("", "git *")).toBe(false);
    });

    it("the space before * is required for the optional rule (the space is consumed)", () => {
      // "git " (head + trailing space, nothing after) does NOT match the
      // head-only branch (which is exactly "git"), but matches via "git " + empty *
      expect(wildcardMatch("git ", "git *")).toBe(true);
      expect(wildcardMatch("git", "git *")).toBe(true);
    });

    it('multi-token head before " *"', () => {
      expect(wildcardMatch("npm run", "npm run *")).toBe(true);
      expect(wildcardMatch("npm run dev", "npm run *")).toBe(true);
      expect(wildcardMatch("npm", "npm run *")).toBe(false);
    });

    it('a bare "*" pattern is not treated as the optional-suffix rule', () => {
      expect(wildcardMatch("", "*")).toBe(true);
      expect(wildcardMatch("x", "*")).toBe(true);
    });
  });

  it("handles adversarial patterns with many wildcards without catastrophic backtracking", () => {
    const pattern = "*".repeat(30);
    const subject = "a".repeat(200);
    const start = Date.now();
    expect(wildcardMatch(subject, pattern)).toBe(true);
    expect(wildcardMatch("", pattern)).toBe(true);
    // a near-worst-case alternation that would explode under naive regex backtracking
    const mixed = `${"*a".repeat(30)}*`;
    expect(wildcardMatch(`${"a".repeat(100)}`, mixed)).toBe(true);
    expect(wildcardMatch(`${"b".repeat(100)}`, mixed)).toBe(false);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it("is deterministic across repeated calls", () => {
    for (let i = 0; i < 50; i++) {
      expect(wildcardMatch("git push origin main", "git *")).toBe(true);
      expect(wildcardMatch("rm -rf /", "git *")).toBe(false);
    }
  });
});

describe("evaluate — two-dimensional first-match wildcard resolution", () => {
  const allowGitRead: Rule = { permission: "bash", pattern: "git status", action: "allow" };
  const denyRm: Rule = { permission: "bash", pattern: "rm *", action: "deny" };
  const askGit: Rule = { permission: "bash", pattern: "git *", action: "ask" };

  it("returns the first matching rule (order matters)", () => {
    const set: Ruleset = [allowGitRead, askGit, denyRm];
    const r = evaluate("bash", "git status", set);
    expect(r).toEqual(allowGitRead);
  });

  it("falls through to the next rule when the first does not match", () => {
    const set: Ruleset = [allowGitRead, askGit];
    const r = evaluate("bash", "git push", set);
    expect(r).toEqual(askGit);
  });

  it("requires BOTH permission AND pattern to match (two-dimensional)", () => {
    const set: Ruleset = [{ permission: "edit", pattern: "git *", action: "allow" }];
    // pattern matches but permission does not -> no match -> default ask
    const r = evaluate("bash", "git status", set);
    expect(r).toEqual({ permission: "bash", pattern: "*", action: "ask" });
  });

  it("supports wildcard permissions", () => {
    const set: Ruleset = [{ permission: "*", pattern: "git *", action: "allow" }];
    expect(evaluate("bash", "git status", set).action).toBe("allow");
    expect(evaluate("edit", "git status", set).action).toBe("allow");
  });

  it("concatenates multiple rulesets in argument order", () => {
    const base: Ruleset = [{ permission: "bash", pattern: "*", action: "ask" }];
    const overrides: Ruleset = [{ permission: "bash", pattern: "git *", action: "allow" }];
    // base comes first -> its catch-all wins over the later override
    expect(evaluate("bash", "git status", base, overrides).action).toBe("ask");
    // reversed order -> the specific allow is reached first
    expect(evaluate("bash", "git status", overrides, base).action).toBe("allow");
  });

  it("returns the fail-safe default (ask) when nothing matches", () => {
    const r = evaluate("bash", "curl http://evil", []);
    expect(r).toEqual({ permission: "bash", pattern: "*", action: "ask" });
  });

  it("default carries the queried permission and pattern verbatim", () => {
    const r = evaluate("net", "https://example.com/x", [
      { permission: "bash", pattern: "*", action: "allow" },
    ]);
    expect(r.permission).toBe("net");
    expect(r.pattern).toBe("*");
    expect(r.action).toBe("ask");
  });

  it("does not mutate the input rulesets", () => {
    const a: Ruleset = [{ permission: "bash", pattern: "git *", action: "allow" }];
    const b: Ruleset = [{ permission: "bash", pattern: "*", action: "deny" }];
    const aSnap = JSON.stringify(a);
    const bSnap = JSON.stringify(b);
    evaluate("bash", "git status", a, b);
    evaluate("bash", "rm -rf", a, b);
    expect(JSON.stringify(a)).toBe(aSnap);
    expect(JSON.stringify(b)).toBe(bSnap);
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
  });

  it("is deterministic", () => {
    const set: Ruleset = [askGit, denyRm];
    for (let i = 0; i < 25; i++) {
      expect(evaluate("bash", "git pull", set).action).toBe("ask");
      expect(evaluate("bash", "rm x", set).action).toBe("deny");
    }
  });

  it("Action type accepts the three documented values", () => {
    const actions: Action[] = ["allow", "deny", "ask"];
    expect(actions).toHaveLength(3);
  });
});

describe("commandPrefix — longest-prefix-wins extraction", () => {
  it("uses the built-in arity for git (2)", () => {
    expect(commandPrefix(["git", "checkout", "main"])).toEqual(["git", "checkout"]);
    expect(commandPrefix(["git", "status"])).toEqual(["git", "status"]);
  });

  it("prefers the longest matching prefix (npm run = 3 over npm = 2)", () => {
    expect(commandPrefix(["npm", "run", "dev"])).toEqual(["npm", "run", "dev"]);
    expect(commandPrefix(["npm", "install", "left-pad"])).toEqual(["npm", "install"]);
  });

  it("falls back to the first token for unknown commands", () => {
    expect(commandPrefix(["foobar", "a", "b", "c"])).toEqual(["foobar"]);
  });

  it("returns an empty array for empty tokens", () => {
    expect(commandPrefix([])).toEqual([]);
  });

  it("clamps the slice when arity exceeds the token count", () => {
    expect(commandPrefix(["git"])).toEqual(["git"]);
  });

  it("respects single-arity commands", () => {
    expect(commandPrefix(["ls", "-la", "src"])).toEqual(["ls"]);
    expect(commandPrefix(["cat", "file.ts"])).toEqual(["cat"]);
    expect(commandPrefix(["rm", "x", "y"])).toEqual(["rm"]);
  });

  it("merges a caller-supplied arity over the built-in table", () => {
    expect(commandPrefix(["git", "checkout", "main"], { git: 1 })).toEqual(["git"]);
    // extend with a new command
    expect(commandPrefix(["terraform", "apply", "-auto"], { terraform: 2 })).toEqual([
      "terraform",
      "apply",
    ]);
    // a multi-word override
    expect(commandPrefix(["pnpm", "dlx", "create-x", "y"], { "pnpm dlx": 3 })).toEqual([
      "pnpm",
      "dlx",
      "create-x",
    ]);
  });

  it("does not mutate the caller arity or the built-in table", () => {
    const override = { git: 1 };
    const snap = JSON.stringify(override);
    const builtinSnap = JSON.stringify(BUILTIN_ARITY);
    commandPrefix(["git", "a", "b"], override);
    expect(JSON.stringify(override)).toBe(snap);
    expect(JSON.stringify(BUILTIN_ARITY)).toBe(builtinSnap);
  });

  it("is deterministic", () => {
    for (let i = 0; i < 25; i++) {
      expect(commandPrefix(["docker", "compose", "up"])).toEqual(["docker", "compose"]);
    }
  });
});

describe("commandPermissionKey — flag-stripped prefix key", () => {
  it("strips dash-prefixed tokens then applies the prefix", () => {
    // Faithful model: tokens starting with "-" are dropped wholesale. There
    // is no flag-argument awareness, so non-dash operands survive.
    expect(commandPermissionKey("git --no-pager commit -m x")).toBe("git commit");
    // "." is not a flag, so it survives and fills the git:2 slot.
    expect(commandPermissionKey("git -C . commit -m x")).toBe("git .");
  });

  it("derives a simple key for unknown commands (first token)", () => {
    expect(commandPermissionKey("curl -sSL https://example.com")).toBe("curl");
  });

  it("handles npm run with flags interleaved", () => {
    expect(commandPermissionKey("npm --silent run build --prod")).toBe("npm run build");
  });

  it("collapses arbitrary whitespace between tokens", () => {
    expect(commandPermissionKey("git   checkout\tmain")).toBe("git checkout");
  });

  it("returns an empty string for an empty/whitespace command", () => {
    expect(commandPermissionKey("")).toBe("");
    expect(commandPermissionKey("   ")).toBe("");
    expect(commandPermissionKey("--only --flags")).toBe("");
  });

  it("feeds cleanly into evaluate as the pattern dimension", () => {
    const set: Ruleset = [{ permission: "bash", pattern: "git commit", action: "ask" }];
    const key = commandPermissionKey("git -C /repo commit -m 'msg'");
    expect(evaluate("bash", key, set).action).toBe("ask");
  });

  it("is deterministic", () => {
    for (let i = 0; i < 25; i++) {
      // No flag-argument awareness: "-n" is dropped, "ns" survives and fills
      // the kubectl:2 slot, yielding a stable "kubectl ns".
      expect(commandPermissionKey("kubectl -n ns get pods")).toBe("kubectl ns");
    }
  });
});

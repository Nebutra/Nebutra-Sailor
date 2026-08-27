import { describe, expect, it } from "vitest";
import {
  type Action,
  BUILTIN_ARITY,
  commandPermissionKey,
  commandPrefix,
  DEFAULT_SHELL_APPROVAL_RULES,
  evaluate,
  type Rule,
  type Ruleset,
  shellApprovalRequired,
  wildcardMatch,
} from "./index";

describe("wildcardMatch", () => {
  it("matches anchored globs with optional trailing space-star", () => {
    expect(wildcardMatch("git", "git")).toBe(true);
    expect(wildcardMatch("git status", "git")).toBe(false);
    expect(wildcardMatch("git", "git *")).toBe(true);
    expect(wildcardMatch("git status", "git *")).toBe(true);
    expect(wildcardMatch("npm", "git *")).toBe(false);
  });
});

describe("evaluate", () => {
  it("resolves first matching permission and pattern pair", () => {
    const allowGitRead: Rule = { permission: "bash", pattern: "git status", action: "allow" };
    const askGit: Rule = { permission: "bash", pattern: "git *", action: "ask" };
    const denyRm: Rule = { permission: "bash", pattern: "rm *", action: "deny" };
    const ruleset: Ruleset = [allowGitRead, askGit, denyRm];

    expect(evaluate("bash", "git status", ruleset)).toEqual(allowGitRead);
    expect(evaluate("bash", "git push", ruleset)).toEqual(askGit);
    expect(evaluate("edit", "git status", ruleset)).toEqual({
      permission: "edit",
      pattern: "*",
      action: "ask",
    });
  });

  it("keeps the documented action vocabulary", () => {
    const actions: Action[] = ["allow", "deny", "ask"];
    expect(actions).toHaveLength(3);
  });
});

describe("commandPermissionKey", () => {
  it("uses the shared command arity table", () => {
    expect(BUILTIN_ARITY.git).toBe(2);
    expect(commandPrefix(["git", "checkout", "main"])).toEqual(["git", "checkout"]);
    expect(commandPermissionKey("pnpm run test -- --watch")).toBe("pnpm run test");
    expect(commandPermissionKey("rm -rf build")).toBe("rm");
  });
});

describe("shellApprovalRequired", () => {
  it("keeps destructive defaults in the shared execution policy contract", () => {
    expect(DEFAULT_SHELL_APPROVAL_RULES.length).toBeGreaterThanOrEqual(5);
    expect(shellApprovalRequired("rm -rf build")).toMatchObject({
      requireApproval: "always",
      reason: "destructive recursive removal",
    });
    expect(shellApprovalRequired("git push origin main")).toMatchObject({
      requireApproval: "once_per_session",
    });
    expect(shellApprovalRequired("pnpm test")).toBeNull();
  });
});

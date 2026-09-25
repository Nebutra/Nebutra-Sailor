import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "../cn";
import { TW_MERGE_CLASS_GROUPS, TW_MERGE_THEME } from "../tw-merge-theme.generated";

/**
 * Every utility the tokens add must behave like a Tailwind one inside cn():
 * a later class of the same kind replaces it, and a class of a different kind
 * (usually a colour sharing the prefix) leaves it alone.
 */
const UTILITY: Record<string, { prefix: string; same: string; sibling?: string }> = {
  text: { prefix: "text", same: "text-sm", sibling: "text-foreground" },
  shadow: { prefix: "shadow", same: "shadow-none", sibling: "shadow-primary" },
  radius: { prefix: "rounded", same: "rounded-none" },
  font: { prefix: "font", same: "font-serif", sibling: "font-medium" },
  tracking: { prefix: "tracking", same: "tracking-normal" },
  leading: { prefix: "leading", same: "leading-6" },
  ease: { prefix: "ease", same: "ease-linear" },
  container: { prefix: "max-w", same: "max-w-none" },
};

describe("cn knows every token utility", () => {
  const cases = Object.entries(TW_MERGE_THEME).flatMap(([ns, keys]) =>
    UTILITY[ns] ? keys.map((key) => [ns, key] as const) : [],
  );

  it.each(cases)("%s-%s: replaced by its own kind, kept beside another", (ns, key) => {
    const { prefix, same, sibling } = UTILITY[ns]!;
    const cls = `${prefix}-${key}`;
    if (cls !== same) expect(cn(cls, same)).toBe(same);
    if (sibling) expect(cn(cls, sibling)).toBe(`${cls} ${sibling}`);
  });

  it.each(TW_MERGE_CLASS_GROUPS.duration[0].duration)("duration-%s is a duration", (key) => {
    expect(cn(`duration-${key}`, "duration-200")).toBe("duration-200");
  });

  it("the generated theme matches the token CSS", () => {
    const script = join(import.meta.dirname, "../../../scripts/gen-tw-merge-theme.mjs");
    expect(() =>
      execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" }),
    ).not.toThrow();
  });
});

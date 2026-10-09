import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findLocalhostUrls } from "../../scripts/lib/localhost-urls.mjs";

/**
 * A public URL env var must not default to localhost in a production build.
 * the template demo site shipped "Sign in" -> http://localhost:3001/sign-in because
 * `NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001")`
 * silently filled in a variable the deploy never set. Schemas declare such a
 * variable through `publicUrl()` / `localhostFallback()` (@nebutra/brand), which
 * yields the default only outside production.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const envSchemas = execFileSync(
  "git",
  ["ls-files", "apps/*/src/**/env.ts", "apps/*/env.ts", "packages/*/*/src/**/env.ts"],
  {
    cwd: ROOT,
    encoding: "utf8",
  },
)
  .split("\n")
  .filter(Boolean)
  // The scaffold's .env writer lists local preview origins on purpose.
  .filter((f) => !f.startsWith("packages/ops/create-sailor/"));

describe("public URL env schemas", () => {
  it("finds the schemas it is meant to police", () => {
    expect(envSchemas).toContain("apps/landing/src/lib/env.ts");
    expect(envSchemas).toContain("apps/web/src/lib/env.ts");
  });

  it.each(envSchemas)("%s has no unconditional localhost default", (file) => {
    const source = readFileSync(join(ROOT, file), "utf8");
    const offenders = source
      .split("\n")
      .filter((line) => /\.default\(\s*["'`]https?:\/\/(localhost|127\.0\.0\.1)/.test(line));
    expect(offenders, `${file}: use publicUrl(name, devDefault) so production requires it`).toEqual(
      [],
    );
  });

  it.each([
    "apps/landing/src/lib/env.ts",
    "apps/web/src/lib/env.ts",
  ])("%s routes every NEXT_PUBLIC_*_URL localhost default through publicUrl()", (file) => {
    const source = readFileSync(join(ROOT, file), "utf8");
    expect(source).toMatch(/publicUrl\("NEXT_PUBLIC_APP_URL"/);
    expect(source).toMatch(/publicUrl\("NEXT_PUBLIC_API_URL"/);
  });
});

describe("rendered-HTML localhost detector", () => {
  it("catches the incident and ignores clean pages", () => {
    expect(
      findLocalhostUrls('<a href="http://localhost:3001/sign-in?x=1">Sign in</a>'),
    ).toHaveLength(1);
    expect(findLocalhostUrls('{"u":"http:\\u002F\\u002F127.0.0.1:3002/x"}')).toHaveLength(1);
    expect(
      findLocalhostUrls('<a href="https://example.com/sailor">Sign in</a> localhost is a word'),
    ).toEqual([]);
  });
});

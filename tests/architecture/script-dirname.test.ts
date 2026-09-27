import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The root package has no `"type": "module"`, so tsx loads scripts/*.ts as
 * CommonJS, where `import.meta.dirname` is undefined. `pnpm brand:init` and
 * `pnpm setup` crashed on their first line for that reason — in the template
 * too, where the welcome page tells every new project to run brand:init.
 * brand-apply.ts had already been fixed; the other two were missed. Plain
 * .mjs scripts run as ESM and may use it.
 */
describe("scripts/*.ts", () => {
  const dir = join(import.meta.dirname, "../../scripts");
  const offenders = readdirSync(dir)
    .filter((name) => name.endsWith(".ts"))
    .filter((name) =>
      readFileSync(join(dir, name), "utf8")
        .split("\n")
        .some((line) => !/^\s*(\/\/|\*)/.test(line) && line.includes("import.meta.dirname")),
    );

  it("derive their directory from import.meta.url, not import.meta.dirname", () => {
    expect(offenders).toEqual([]);
  });
});

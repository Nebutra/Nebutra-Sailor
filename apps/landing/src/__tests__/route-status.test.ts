import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A missing page must answer 404 (and a moved one a redirect) in the HTTP
 * status, not only in the rendered document. Under Cache Components that holds
 * only while the page decides before the response is committed:
 *
 *  - a `loading.tsx` is a <Suspense> boundary around everything below it, so
 *    the shell (its fallback) is flushed as a 200 and a later notFound() can
 *    only reach the reader as a 404 document inside that 200. app/loading.tsx
 *    did this to every route — /blog/<missing>, /features/<missing>,
 *    /changelog/<missing> all answered 200.
 *  - a dynamic segment with no static params makes the param runtime data:
 *    the shell streams before the page runs. Each `[param]` page that can 404
 *    exports generateStaticParams (a sentinel is enough).
 *
 * The one exception reads live data: an incident page must call connection()
 * before it can know whether the id exists, which commits the shell, so an
 * unknown incident id is still a 404 document inside a 200.
 */
const REQUEST_TIME_ROUTES = new Set(["[lang]/(status)/status/incidents/[id]/page.tsx"]);

const APP = join(process.cwd(), "src/app");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const files = walk(APP);

describe("route status codes", () => {
  it("has no loading.tsx committing the shell before a page can 404", () => {
    const loading = files
      .filter((file) => /\/loading\.(tsx|ts|jsx|js)$/u.test(file))
      .map((file) => relative(APP, file));
    expect(loading).toEqual([]);
  });

  const dynamicPages = files.filter(
    (file) =>
      /\/page\.tsx$/u.test(file) &&
      /\[(?!lang\])[^\]/]+\]/u.test(relative(join(APP, "[lang]"), file)) &&
      readFileSync(file, "utf8").includes("notFound(") &&
      !REQUEST_TIME_ROUTES.has(relative(APP, file)),
  );

  it("finds the dynamic marketing routes", () => {
    expect(dynamicPages.map((file) => relative(APP, file))).toContain(
      "[lang]/(marketing)/blog/[slug]/page.tsx",
    );
  });

  it.each(
    dynamicPages.map((file) => [relative(APP, file), file]),
  )("%s decides 404 before the shell is committed", (_name, file) => {
    const source = readFileSync(file, "utf8");
    expect(source).toMatch(/export (async )?function generateStaticParams/u);
  });
});

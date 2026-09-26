import { describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs helper shared by the lint scripts
import { stripComments } from "../../scripts/lib/strip-comments.mjs";

/**
 * The guards' comment stripper must not eat code.
 *
 * The regex it replaced read "/api/*" as an open block comment and deleted
 * 3,006 characters of HeroMockupWindow.tsx up to the next "*\/" — raw palette
 * classes included — and a line-comment regex cut every line after https://.
 */
describe("stripComments", () => {
  const keeps = (src: string, needle: string) => expect(stripComments(src)).toContain(needle);

  it("blanks real comments and keeps positions", () => {
    const src = 'const a = 1; // bg-white\n/* bg-black */ const b = "x";';
    const out = stripComments(src);
    expect(out).not.toMatch(/bg-(white|black)/);
    expect(out).toHaveLength(src.length);
    expect(out.split("\n")).toHaveLength(2);
  });

  it('does not read "/api/*" in a string as a comment', () => {
    keeps('app.use("/api/*", auth());\nconst k = "bg-white";\n/* x */', "bg-white");
  });

  it("does not cut a line at a URL scheme", () => {
    keeps('<a href="https://x.com">y</a><span className="bg-black" />', "bg-black");
  });

  it("does not read a glob in JSX text as a comment", () => {
    keeps('<p>packages/tokens/** then</p>\n<i className="text-white" />\n/* x */', "text-white");
  });

  it("skips quotes and // inside a regex literal", () => {
    keeps(
      'const r = /("(?:[^"\\\\]|\\\\.)*"|\\/\\/.*)/g;\nconst k = "text-teal-600";',
      "text-teal-600",
    );
  });

  it("does not take a JSX closing tag for a regex", () => {
    keeps('</span><span className="bg-red-500">', "bg-red-500");
  });
});

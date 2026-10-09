import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const braces = require(process.env.BRACES_TEST_PATH || "braces");
const deep = "{".repeat(3000) + "a,b" + "}".repeat(3000);
for (const method of ["parse", "compile", "expand", "stringify"]) {
  test(`${method} rejects deep strings before recursive walking`, () => {
    assert.throws(() => braces[method](deep), { name: "SyntaxError", message: /nesting limit/ });
  });
}
test("rejects deeply nested parentheses and mixed blocks", () => {
  for (const pattern of [
    "(".repeat(3000) + "x" + ")".repeat(3000),
    "{(".repeat(1000) + "a,b" + ")}".repeat(1000),
  ]) {
    assert.throws(() => braces.compile(pattern), /nesting limit/);
  }
});
test("AST callers cannot bypass depth and cycle checks", () => {
  let ast = { type: "text", value: "a" };
  for (let i = 0; i < 5000; i++) ast = { type: "root", nodes: [ast] };
  const cycle = { type: "root", nodes: [] };
  cycle.nodes.push(cycle);
  for (const method of ["compile", "expand", "stringify"]) {
    assert.throws(() => braces[method](ast), /nesting limit/);
    assert.throws(() => braces[method](cycle), /cyclic AST/);
  }
});
test("preserves regular glob, range, nested and literal patterns", () => {
  assert.deepEqual(braces.expand("src/{a,{b,c}}/{1..3}.ts"), [
    "src/a/1.ts",
    "src/a/2.ts",
    "src/a/3.ts",
    "src/b/1.ts",
    "src/b/2.ts",
    "src/b/3.ts",
    "src/c/1.ts",
    "src/c/2.ts",
    "src/c/3.ts",
  ]);
  assert.equal(braces.compile("{a,b}"), "(a|b)");
  assert.equal(braces.stringify(braces.parse("src/{a,b}/*.ts")), "src/{a,b}/*.ts");
  assert.doesNotThrow(() => braces.parse('"' + "{".repeat(3000) + '"'));
  assert.doesNotThrow(() => braces.parse("\\{".repeat(3000)));
});

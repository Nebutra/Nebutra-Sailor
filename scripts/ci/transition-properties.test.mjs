import { strict as assert } from "node:assert";
import { test } from "node:test";
import { classExpressions, missingTransitionProperties } from "../lint-transition-properties.mjs";

test("hover translate with a transform-only list misses translate", () => {
  assert.deepEqual(
    missingTransitionProperties("transition-[opacity,transform] hover:-translate-y-0.5"),
    ["translate"],
  );
});

test("scale and rotate are separate properties too", () => {
  assert.deepEqual(
    missingTransitionProperties(
      "transition-[transform] group-hover:translate-x-[var(--tx)] group-hover:rotate-[var(--r)] lg:group-hover:scale-75",
    ),
    ["translate", "rotate", "scale"],
  );
});

test("listing the property, or transition-transform, passes", () => {
  assert.deepEqual(
    missingTransitionProperties("transition-[transform,translate] hover:translate-x-1"),
    [],
  );
  assert.deepEqual(
    missingTransitionProperties("transition-transform group-hover:translate-x-1"),
    [],
  );
});

test("static utilities and lists without transform are left alone", () => {
  assert.deepEqual(
    missingTransitionProperties("transition-[transform] translate-x-0 rtl:rotate-180"),
    [],
  );
  assert.deepEqual(missingTransitionProperties("transition-[opacity] hover:translate-y-1"), []);
  assert.deepEqual(
    missingTransitionProperties("transform-gpu transition-[transform] hover:opacity-50"),
    [],
  );
});

test("rtl and other direction variants are not state changes", () => {
  assert.deepEqual(
    missingTransitionProperties("transition-[transform] rtl:rotate-180 ltr:scale-x-100"),
    [],
  );
});

test("collects whole className expressions, including multi-line cn()", () => {
  const src =
    'const a = <div className="x hover:translate-x-1" />;\nconst b = <span className={cn(\n  "transition-[transform]",\n  "group-hover:rotate-3",\n)} />;';
  const exprs = classExpressions(src).map((e) => e.text);
  assert.equal(exprs.length, 2);
  assert.match(exprs[1], /transition-\[transform\][\s\S]*group-hover:rotate-3/);
});

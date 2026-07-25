/**
 * Unit tests for pure helpers — run with: node --test scripts/translate-sensenova.test.mjs
 * (helpers inlined here to avoid exporting CLI side effects)
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

function flatten(obj, prefix = "", out = new Map()) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    out.set(prefix, obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) flatten(v, path, out);
    else out.set(path, v);
  }
  return out;
}

function unflatten(map) {
  const root = {};
  for (const [path, value] of map) {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur) || typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

describe("translate-sensenova helpers", () => {
  it("flatten/unflatten round-trips nested objects", () => {
    const src = { a: { b: "x", c: "y" }, d: "z" };
    const flat = flatten(src);
    assert.equal(flat.get("a.b"), "x");
    assert.equal(flat.get("d"), "z");
    assert.deepEqual(unflatten(flat), src);
  });

  it("chunks batches for concurrent workers", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const batches = chunk(items, 20);
    assert.equal(batches.length, 3);
    assert.equal(batches[0].length, 20);
    assert.equal(batches[2].length, 10);
  });
});

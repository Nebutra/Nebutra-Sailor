import { describe, expect, it } from "vitest";
import {
  diffYaml,
  pickIdentityField,
  validateYamlText,
  w3YamlDiffTools,
  yamlDiffInputSchema,
  yamlDiffTool,
  yamlTypeOf,
} from "./w3-yaml-diff";

/** Parse through the published schema, the way the API and the page both do. */
function run(input: Record<string, unknown>) {
  return diffYaml(yamlDiffInputSchema.parse(input));
}

function pathsOf(output: ReturnType<typeof run>, changeType?: string) {
  return output.changes
    .filter((change) => changeType === undefined || change.changeType === changeType)
    .map((change) => change.path);
}

function noteCodes(output: ReturnType<typeof run>) {
  return output.notes.map((note) => note.code);
}

describe("yaml-diff · tool declaration", () => {
  it("declares the pure, dual-runtime contract the brief fixes in §9.6", () => {
    expect(yamlDiffTool.id).toBe("data/yaml-diff");
    expect(yamlDiffTool.slug).toBe("yaml-diff");
    expect(yamlDiffTool.sideEffect).toBe("pure");
    expect(yamlDiffTool.meterId).toBe("forge.data.yaml_diff");
    expect(yamlDiffTool.roots).toContain("comparator");
    expect(yamlDiffTool.runtime).toContain("client");
    // Engine metadata names the spec implemented, not a fake library (gate 10).
    expect(yamlDiffTool.engine.upstream).toContain("YAML 1.2.2");
    expect(w3YamlDiffTools).toContain(yamlDiffTool);
  });

  it("is deterministic — the same input twice gives the same output", () => {
    const input = { original: "a: 1\nb: [1, 2]\n", changed: "b: [1, 3]\na: 1\n" };
    expect(run(input)).toEqual(run(input));
  });
});

describe("yaml-diff · schema rejects bad input", () => {
  it("rejects an empty side", () => {
    expect(() => yamlDiffInputSchema.parse({ original: "", changed: "a: 1" })).toThrow();
    expect(() => yamlDiffInputSchema.parse({ original: "a: 1" })).toThrow();
  });

  it("rejects an unknown mode and a non-string document", () => {
    expect(() =>
      yamlDiffInputSchema.parse({ original: "a: 1", changed: "a: 2", mode: "fuzzy" }),
    ).toThrow();
    expect(() => yamlDiffInputSchema.parse({ original: 1, changed: "a: 2" })).toThrow();
  });

  it("rejects an oversized identity-field list and non-boolean resolveAnchors", () => {
    expect(() =>
      yamlDiffInputSchema.parse({
        original: "a: 1",
        changed: "a: 2",
        matchSequencesBy: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
      }),
    ).toThrow();
    expect(() =>
      yamlDiffInputSchema.parse({ original: "a: 1", changed: "a: 2", resolveAnchors: "yes" }),
    ).toThrow();
  });

  it("applies the documented defaults", () => {
    const parsed = yamlDiffInputSchema.parse({ original: "a: 1", changed: "a: 2" });
    expect(parsed.mode).toBe("semantic");
    expect(parsed.resolveAnchors).toBe(true);
    expect(parsed.matchSequencesBy).toEqual(["name", "id", "key"]);
  });
});

describe("yaml-diff · know-how #1 · map key order is noise, sequence order is meaning", () => {
  it("calls a re-ordered mapping semantically equivalent", () => {
    const output = run({
      original: "kind: ConfigMap\nmetadata:\n  name: app\n  namespace: prod\n",
      changed: "metadata:\n  namespace: prod\n  name: app\nkind: ConfigMap\n",
    });
    expect(output.equivalent).toBe(true);
    expect(output.changes).toHaveLength(0);
  });

  it("ignores quoting, indentation and flow-vs-block style", () => {
    const output = run({
      original: "args: [--v, '2']\nname: web\n",
      changed: 'args:\n    - --v\n    - "2"\nname: "web"\n',
    });
    expect(output.equivalent).toBe(true);
    expect(output.changes).toHaveLength(0);
  });

  it("reports a re-ordered sequence of scalars as a real change", () => {
    const output = run({ original: "steps: [a, b]\n", changed: "steps: [b, a]\n" });
    expect(output.equivalent).toBe(false);
    expect(pathsOf(output, "value")).toEqual(["steps[0]", "steps[1]"]);
  });

  it("reports a re-ordered identity-matched sequence as an order change", () => {
    const output = run({
      original: "containers:\n  - name: app\n    image: a:1\n  - name: log\n    image: b:1\n",
      changed: "containers:\n  - name: log\n    image: b:1\n  - name: app\n    image: a:1\n",
    });
    expect(output.equivalent).toBe(false);
    const order = output.changes.find((change) => change.path === "containers[order]");
    expect(order?.note).toBe("sequence-order-changed");
    expect(order?.before).toEqual(["app", "log"]);
    expect(order?.after).toEqual(["log", "app"]);
  });
});

describe("yaml-diff · know-how #2 · anchors and aliases", () => {
  const original = "base: &img nginx:1.25\nweb:\n  image: *img\nlog:\n  image: *img\n";
  const changed = "base: &img nginx:1.26\nweb:\n  image: *img\nlog:\n  image: *img\n";

  it("resolves aliases so a change behind an anchor lands at every alias site", () => {
    const output = run({ original, changed });
    expect(pathsOf(output, "value").sort()).toEqual(["base", "log.image", "web.image"]);
  });

  it("reports an alias that was inlined to the same value as structural, not as a value change", () => {
    const output = run({
      original: "base: &b\n  image: nginx:1.25\nweb: *b\n",
      changed: "base: &b\n  image: nginx:1.25\nweb:\n  image: nginx:1.25\n",
    });
    expect(output.equivalent).toBe(true);
    const structural = output.changes.filter((change) => change.changeType === "structural");
    expect(structural.map((change) => change.path)).toEqual(["web"]);
    expect(structural[0]?.before).toBe("*b");
  });

  it("compares unexpanded references when resolveAnchors is off", () => {
    const output = run({
      original: "base: &b\n  image: nginx:1.25\nweb: *b\n",
      changed: "base: &b\n  image: nginx:1.25\nweb:\n  image: nginx:1.25\n",
      resolveAnchors: false,
    });
    expect(output.equivalent).toBe(false);
    expect(output.changes.some((change) => change.changeType === "type-change")).toBe(true);
    expect(noteCodes(output)).toContain("anchors-unresolved");
  });
});

describe("yaml-diff · know-how #3 · merge keys are expanded before diffing", () => {
  const withMerge =
    "defaults: &d\n  replicas: 2\n  image: nginx:1.25\nweb:\n  <<: *d\n  replicas: 3\n";
  const inlined =
    "defaults:\n  replicas: 2\n  image: nginx:1.25\nweb:\n  replicas: 3\n  image: nginx:1.25\n";

  it("does not report an inherited key as missing", () => {
    const output = run({ original: withMerge, changed: inlined });
    // `web.image` is inherited via `<<: *d` on the left and written out on the
    // right — the same resolved document, so no added/removed row.
    expect(output.summary.added).toBe(0);
    expect(output.summary.removed).toBe(0);
    expect(noteCodes(output)).toContain("merge-keys-expanded");
  });

  it("lets a node's own key win over the merged one regardless of `<<` position", () => {
    const output = run({
      original: "d: &d\n  replicas: 2\nweb:\n  <<: *d\n  replicas: 3\n",
      changed: "d: &d\n  replicas: 2\nweb:\n  replicas: 3\n  <<: *d\n",
    });
    expect(output.equivalent).toBe(true);
  });

  it("sees through a merge key to a genuinely changed inherited value", () => {
    const output = run({
      original: "d: &d\n  image: nginx:1.25\nweb:\n  <<: *d\n",
      changed: "d: &d\n  image: nginx:1.26\nweb:\n  <<: *d\n",
    });
    expect(pathsOf(output, "value").sort()).toEqual(["d.image", "web.image"]);
  });
});

describe("yaml-diff · know-how #4 · the Norway problem", () => {
  it("resolves unquoted NO as a string under the YAML 1.2 Core Schema", () => {
    const output = run({ original: "country: NO\n", changed: 'country: "NO"\n' });
    // Core Schema: only true/false are booleans, so both sides are the string
    // "NO" — the *values* match and only the quoting differs.
    expect(output.summary.typeChanged).toBe(0);
    expect(output.equivalent).toBe(true);
  });

  it("flags the ambiguity so a YAML 1.1 consumer is not silently surprised", () => {
    const output = run({
      original: "country: NO\nship: yes\n",
      changed: "country: NO\nship: no\n",
    });
    const note = output.notes.find((n) => n.code === "yaml11-ambiguous-scalars");
    expect(note).toBeDefined();
    expect(note?.detail).toContain("country");
    expect(note?.detail).toContain("ship");
  });

  it("does not flag a quoted token", () => {
    const output = run({ original: 'country: "NO"\n', changed: 'country: "NO"\n' });
    expect(noteCodes(output)).not.toContain("yaml11-ambiguous-scalars");
  });
});

describe("yaml-diff · know-how #5 · type change is its own class", () => {
  it("separates a number becoming a quoted string from a value change", () => {
    const output = run({ original: "port: 8080\n", changed: 'port: "8080"\n' });
    expect(output.summary.typeChanged).toBe(1);
    expect(output.summary.changed).toBe(0);
    expect(output.changes[0]).toMatchObject({
      path: "port",
      changeType: "type-change",
      beforeType: "number",
      afterType: "string",
    });
  });

  it("reports an explicit !!str tag whose resolved value is unchanged as structural", () => {
    const output = run({ original: 'port: "8080"\n', changed: "port: !!str 8080\n" });
    expect(output.equivalent).toBe(true);
    expect(output.changes).toMatchObject([{ path: "port", changeType: "structural" }]);
    expect(output.changes[0]?.after).toContain("str");
  });

  it("treats null, false and an empty string as three different values", () => {
    const nulled = run({ original: "a: null\n", changed: "a: false\n" });
    expect(nulled.summary.typeChanged).toBe(1);
    const emptied = run({ original: "a: null\n", changed: 'a: ""\n' });
    expect(emptied.summary.typeChanged).toBe(1);
  });

  it("reports a map replaced by a list as a type change, not a wall of rows", () => {
    const output = run({ original: "env:\n  A: 1\n", changed: "env:\n  - A=1\n" });
    expect(output.changes).toHaveLength(1);
    expect(output.changes[0]).toMatchObject({
      path: "env",
      changeType: "type-change",
      beforeType: "map",
      afterType: "array",
    });
  });
});

describe("yaml-diff · know-how #6 · sequence identity beats position", () => {
  const original = [
    "spec:",
    "  containers:",
    "    - name: app",
    "      image: app:1.0",
    "    - name: sidecar",
    "      image: envoy:1.28",
  ].join("\n");
  const changed = [
    "spec:",
    "  containers:",
    "    - name: init",
    "      image: busybox:1.36",
    "    - name: app",
    "      image: app:1.1",
    "    - name: sidecar",
    "      image: envoy:1.28",
  ].join("\n");

  it("does not cascade when an item is inserted in the middle", () => {
    const output = run({ original, changed });
    expect(output.summary.added).toBe(1);
    expect(output.summary.removed).toBe(0);
    expect(pathsOf(output, "added")).toEqual(["spec.containers[name=init]"]);
    expect(pathsOf(output, "value")).toEqual(["spec.containers[name=app].image"]);
    expect(noteCodes(output)).toContain("sequence-matched-by-identity");
  });

  it("falls back to positional pairing when no candidate field is unique on both sides", () => {
    const output = run({
      original: "items:\n  - name: a\n    v: 1\n  - name: a\n    v: 2\n",
      changed: "items:\n  - name: a\n    v: 1\n  - name: a\n    v: 3\n",
    });
    expect(pathsOf(output, "value")).toEqual(["items[1].v"]);
    expect(noteCodes(output)).not.toContain("sequence-matched-by-identity");
  });

  it("honours an explicit matchSequencesBy field", () => {
    const output = run({
      original: "rules:\n  - port: 80\n    action: allow\n  - port: 443\n    action: allow\n",
      changed: "rules:\n  - port: 443\n    action: deny\n  - port: 80\n    action: allow\n",
      matchSequencesBy: ["port"],
    });
    expect(pathsOf(output, "value")).toContain("rules[port=443].action");
  });

  it("pickIdentityField refuses a field that is missing, non-scalar or duplicated", () => {
    const left = [{ name: "a" }, { name: "b" }];
    expect(pickIdentityField(left, [{ name: "a" }], ["name"])).toBe("name");
    expect(pickIdentityField(left, [{ id: "a" }], ["name"])).toBeNull();
    expect(pickIdentityField(left, [{ name: { deep: 1 } }], ["name"])).toBeNull();
    expect(pickIdentityField(left, [{ name: "a" }, { name: "a" }], ["name"])).toBeNull();
    expect(pickIdentityField([], left, ["name"])).toBeNull();
  });
});

describe("yaml-diff · know-how #7 · block scalar style and chomping", () => {
  it("catches the trailing newline that `|-` strips and `|` keeps", () => {
    const output = run({ original: "script: |\n  run me\n", changed: "script: |-\n  run me\n" });
    expect(output.equivalent).toBe(false);
    expect(output.changes[0]).toMatchObject({ path: "script", changeType: "value" });
    expect(output.changes[0]?.before).toBe("run me\n");
    expect(output.changes[0]?.after).toBe("run me");
  });

  it("reports a literal→folded restyle with an identical resolved value as structural", () => {
    const output = run({ original: "note: |-\n  one line\n", changed: "note: >-\n  one line\n" });
    expect(output.equivalent).toBe(true);
    expect(output.changes).toMatchObject([
      { path: "note", changeType: "structural", before: "literal", after: "folded" },
    ]);
  });
});

describe("yaml-diff · know-how #8 · comments are not compared", () => {
  it("ignores an added comment", () => {
    const output = run({
      original: "key: value\n",
      changed: "# TODO: rotate this key\nkey: value\n",
    });
    expect(output.equivalent).toBe(true);
    expect(output.changes).toHaveLength(0);
  });
});

describe("yaml-diff · know-how #9 · multi-document streams", () => {
  it("pairs `---` documents positionally instead of comparing only the first", () => {
    const output = run({
      original: "kind: A\nv: 1\n---\nkind: B\nv: 1\n",
      changed: "kind: A\nv: 1\n---\nkind: B\nv: 2\n",
    });
    expect(output.documents).toEqual({ original: 2, changed: 2 });
    expect(pathsOf(output, "value")).toEqual(["doc[1].v"]);
  });

  it("says so explicitly when the document counts differ, and never truncates silently", () => {
    const output = run({
      original: "kind: A\n---\nkind: B\n",
      changed: "kind: A\n",
    });
    expect(output.documentCountMismatch).toEqual({ originalCount: 2, changedCount: 1 });
    expect(noteCodes(output)).toContain("document-count-mismatch");
    expect(pathsOf(output, "removed")).toEqual(["doc[1]"]);
  });
});

describe("yaml-diff · know-how #10 · duplicate keys are surfaced, not swallowed", () => {
  it("uses the last occurrence and warns with the path", () => {
    const output = run({ original: "a: 1\na: 2\n", changed: "a: 2\n" });
    expect(output.equivalent).toBe(true);
    expect(output.duplicateKeyWarnings).toEqual([
      {
        document: "original",
        path: "a",
        message: "Duplicate mapping key in the source document; the last occurrence was used.",
      },
    ]);
    expect(noteCodes(output)).toContain("duplicate-keys");
  });
});

describe("yaml-diff · parse errors", () => {
  it("reports the failing side with a location instead of a false verdict", () => {
    const output = run({ original: "a:\n\t- 1\n", changed: "a:\n  - 1\n" });
    expect(output.equivalent).toBe(false);
    expect(output.changes).toHaveLength(0);
    expect(output.parseErrors.original?.line).toBe(2);
    expect(output.parseErrors.original?.message).toContain("tab");
    expect(output.parseErrors.changed).toBeUndefined();
    expect(noteCodes(output)).toContain("parse-error");
  });

  it("validateYamlText answers the per-pane badge with the same parser", () => {
    expect(validateYamlText("a: 1\n---\nb: 2\n")).toEqual({ ok: true, documents: 2 });
    const bad = validateYamlText("a:\n\t- 1\n");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.line).toBe(2);
  });
});

describe("yaml-diff · JSON is compared as the YAML subset it is", () => {
  it("finds a YAML document and its JSON twin equivalent", () => {
    const output = run({
      original: '{"name": "web", "ports": [80, 443]}',
      changed: "name: web\nports:\n  - 80\n  - 443\n",
    });
    expect(output.equivalent).toBe(true);
  });
});

describe("yaml-diff · raw-text mode", () => {
  it("reports the formatting churn semantic mode deliberately hides", () => {
    const args = { original: "b: 2\na: 1\n", changed: "a: 1\nb: 2\n" };
    expect(run(args).equivalent).toBe(true);
    const raw = run({ ...args, mode: "raw-text" });
    expect(raw.equivalent).toBe(false);
    expect(raw.summary.added + raw.summary.removed).toBeGreaterThan(0);
    expect(noteCodes(raw)).toContain("raw-text-mode");
  });

  it("compares unparseable text without a parse error", () => {
    const raw = run({ original: "a:\n\t- 1\n", changed: "a:\n\t- 2\n", mode: "raw-text" });
    expect(raw.parseErrors).toEqual({});
    expect(raw.changes.length).toBeGreaterThan(0);
    expect(raw.changes[0]?.path).toMatch(/^line \d+$/);
  });

  it("is equivalent only when the characters match exactly", () => {
    const same = run({ original: "a: 1\n", changed: "a: 1\n", mode: "raw-text" });
    expect(same.equivalent).toBe(true);
    expect(same.changes).toHaveLength(0);
  });
});

describe("yaml-diff · the summary is a fact about the documents, not about the list", () => {
  it("counts every change even when the list is capped", () => {
    const doc = (v: number) =>
      `${Array.from({ length: 2100 }, (_, i) => `k${i}: ${v}`).join("\n")}\n`;
    const output = run({ original: doc(1), changed: doc(2) });
    expect(output.truncated).toBe(true);
    expect(output.changes).toHaveLength(2000);
    // A capped list must not silently cap the answer.
    expect(output.summary.changed).toBe(2100);
    expect(noteCodes(output)).toContain("truncated");
  });
});

describe("yaml-diff · a `structural` row must never contradict a value row", () => {
  it("does not also report structure-only for a node whose value changed", () => {
    // The value diff addresses this node as items[name=a].v; the AST scan
    // addresses the same node as items[0].v. Both must resolve to one row.
    const output = run({
      original: "items:\n  - name: a\n    v: 1\n",
      changed: "items:\n  - name: a\n    v: !!str 1\n",
    });
    expect(output.changes).toHaveLength(1);
    expect(output.changes[0]).toMatchObject({ path: "items[name=a].v", changeType: "type-change" });
    expect(output.summary.structural).toBe(0);
  });

  it("does not compare positional structure under a re-ordered identity sequence", () => {
    const output = run({
      original: "l:\n  - name: a\n    v: &x 1\n  - name: b\n    v: 2\n",
      changed: "l:\n  - name: b\n    v: 2\n  - name: a\n    v: &x 1\n",
    });
    // Only the reorder itself is reported; `&x` moved index but not meaning.
    expect(output.changes.filter((c) => c.changeType === "structural")).toHaveLength(0);
    expect(output.changes.map((c) => c.path)).toEqual(["l[order]"]);
  });
});

describe("yaml-diff · a `$alias` key in the data is data, not an alias marker", () => {
  it("reports a real value change under a literal $alias key", () => {
    const output = run({ original: "a:\n  $alias: x\n", changed: "a:\n  $alias: y\n" });
    expect(output.equivalent).toBe(false);
    expect(output.summary.changed).toBe(1);
    expect(output.summary.structural).toBe(0);
    expect(output.changes[0]).toMatchObject({ changeType: "value", before: "x", after: "y" });
  });

  it("still resolves real aliases when resolveAnchors is off", () => {
    const output = run({
      original: "base: &b 1\nweb: *b\n",
      changed: "base: &c 1\nweb: *c\n",
      resolveAnchors: false,
    });
    const alias = output.changes.find((c) => c.note === "alias-target-changed");
    expect(alias).toMatchObject({ path: "web", before: "*b", after: "*c" });
    // The unexpanded patch renders the reference, not a `[object Object]`.
    expect(output.unified).toContain("*b");
  });
});

describe("yaml-diff · exits", () => {
  it("returns a unified patch over normalised YAML so key order never shows up in it", () => {
    const output = run({ original: "b: 2\na: 1\n", changed: "a: 1\nb: 3\n" });
    expect(output.unified).toContain("-b: 2");
    expect(output.unified).toContain("+b: 3");
    expect(output.unified).not.toContain("-a: 1");
  });

  it("yamlTypeOf names the resolved type an agent asserts on", () => {
    expect(yamlTypeOf(null)).toBe("null");
    expect(yamlTypeOf(8080)).toBe("number");
    expect(yamlTypeOf("8080")).toBe("string");
    expect(yamlTypeOf(false)).toBe("boolean");
    expect(yamlTypeOf([])).toBe("array");
    expect(yamlTypeOf({})).toBe("map");
    expect(yamlTypeOf(new Date(0))).toBe("timestamp");
  });
});

import { describe, expect, it } from "vitest";
import {
  type CsvDiffResult,
  csvDiffTool,
  decodeBytes,
  detectDelimiter,
  detectEncoding,
  normalizeHeader,
  parseCsv,
  summarizeCsvDiff,
  w3CsvDiffTools,
} from "./w3-csv-diff";

function run(input: unknown): CsvDiffResult {
  const parsed = csvDiffTool.inputSchema.parse(input);
  return csvDiffTool.execute(parsed) as CsvDiffResult;
}

function finding(result: CsvDiffResult, code: string) {
  return result.findings.find((f) => f.code === code);
}

function b64(bytes: number[]): string {
  return Buffer.from(Uint8Array.from(bytes)).toString("base64");
}

/* ── declaration ───────────────────────────────────────────────────────── */

describe("csv-diff · declaration", () => {
  it("declares the Comparator-root contract the brief fixes", () => {
    expect(csvDiffTool.id).toBe("data/csv-diff");
    expect(csvDiffTool.slug).toBe("csv-diff");
    expect(csvDiffTool.category).toBe("data");
    expect(csvDiffTool.meterId).toBe("forge.data.csv_diff");
    expect(csvDiffTool.sideEffect).toBe("pure");
    expect(csvDiffTool.roots).toContain("comparator");
    expect(csvDiffTool.title.zh).not.toBe(csvDiffTool.title.en);
    expect(csvDiffTool.seoKeywords.zh.length).toBeGreaterThan(0);
    expect(csvDiffTool.seoKeywords.en).toContain("compare two csv files");
    // Engine metadata names the specs implemented, not an imaginary library.
    expect(csvDiffTool.engine.upstream).toContain("RFC 4180");
    expect(csvDiffTool.engine.upstream).toContain("windows-1252");
    expect(w3CsvDiffTools).toEqual([csvDiffTool]);
  });

  it("is deterministic: the same input yields a byte-identical result", () => {
    const input = { original: "id,v\n1,a\n2,b\n", updated: "id,v\n2,b\n1,c\n" };
    expect(JSON.stringify(run(input))).toBe(JSON.stringify(run(input)));
  });
});

/* ── schema ────────────────────────────────────────────────────────────── */

describe("csv-diff · schema", () => {
  it("rejects a missing side — a one-sided compare is not a question", () => {
    expect(csvDiffTool.inputSchema.safeParse({}).success).toBe(false);
    expect(csvDiffTool.inputSchema.safeParse({ original: "id\n1\n" }).success).toBe(false);
  });

  it("rejects text and bytes for the same side — one authoritative source only", () => {
    const parsed = csvDiffTool.inputSchema.safeParse({
      original: "id\n1\n",
      originalBase64: b64([0x69, 0x64]),
      updated: "id\n1\n",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-contract options", () => {
    const base = { original: "id\n1\n", updated: "id\n1\n" };
    expect(csvDiffTool.inputSchema.safeParse({ ...base, joinType: "outer" }).success).toBe(false);
    expect(csvDiffTool.inputSchema.safeParse({ ...base, maxPreviewRows: 0 }).success).toBe(false);
    expect(csvDiffTool.inputSchema.safeParse({ ...base, maxPreviewRows: 999_999 }).success).toBe(
      false,
    );
    expect(csvDiffTool.inputSchema.safeParse({ ...base, keyColumns: [""] }).success).toBe(false);
    expect(
      csvDiffTool.inputSchema.safeParse({ ...base, dialect: { delimiter: "~" } }).success,
    ).toBe(false);
    expect(
      csvDiffTool.inputSchema.safeParse({ ...base, dialect: { encoding: "shift-jis" } }).success,
    ).toBe(false);
  });

  it("defaults to a full outer join, no ignore-options and a bounded preview", () => {
    const parsed = csvDiffTool.inputSchema.parse({ original: "id\n1\n", updated: "id\n1\n" });
    expect(parsed.joinType).toBe("full");
    expect(parsed.maxPreviewRows).toBe(200);
    expect(parsed.options).toEqual({
      ignoreWhitespace: false,
      ignoreCase: false,
      treatEmptyAsNull: false,
      allowRaggedRows: false,
      includeUnchanged: false,
    });
    expect(parsed.dialect.quoteChar).toBe('"');
    expect(parsed.dialect.delimiter).toBeUndefined();
  });
});

/* ── RFC 4180 parsing ──────────────────────────────────────────────────── */

describe("csv-diff · RFC 4180 §2 parsing", () => {
  it("keeps a delimiter inside a quoted field and unescapes a doubled quote", () => {
    // RFC 4180 §2 rule 7: a quote inside a quoted field is escaped by doubling.
    expect(parseCsv('a,"b,c""d"\r\n1,2\n', ",", '"')).toEqual([
      ["a", 'b,c"d'],
      ["1", "2"],
    ]);
  });

  it("keeps a record separator inside a quoted field (RFC 4180 §2 rule 6)", () => {
    expect(parseCsv('a,b\n"x\ny",2', ",", '"')).toEqual([
      ["a", "b"],
      ["x\ny", "2"],
    ]);
  });

  it("treats a single trailing newline as a terminator, not an empty record", () => {
    const result = run({ original: "id,v\n1,a\n", updated: "id,v\n1,a\n" });
    expect(result.summary.totalOriginalRows).toBe(1);
    expect(result.summary.unchanged).toBe(1);
  });

  it("counts a CRLF file the same as an LF file", () => {
    const result = run({ original: "id,v\r\n1,a\r\n", updated: "id,v\n1,a\n" });
    expect(result.summary).toMatchObject({ changed: 0, unchanged: 1 });
  });
});

/* ── know-how #7: dialect and encoding are correctness ─────────────────── */

describe("csv-diff · dialect and encoding (know-how #7)", () => {
  it("detects a semicolon, tab and pipe dialect instead of assuming comma", () => {
    expect(detectDelimiter("a;b;c\n1;2;3\n", '"')).toBe(";");
    expect(detectDelimiter("a\tb\n1\t2\n", '"')).toBe("\t");
    expect(detectDelimiter("a|b\n1|2\n", '"')).toBe("|");
    // A single-column file has no separator to find; the contract stays stable.
    expect(detectDelimiter("a\n1\n", '"')).toBe(",");
  });

  it("parses a semicolon export as fields, not as one garbled column", () => {
    const result = run({ original: "id;qty\n1;10\n", updated: "id;qty\n1;11\n" });
    expect(result.original.delimiter).toBe(";");
    expect(result.original.delimiterSource).toBe("detected");
    expect(result.comparedColumns).toEqual(["id", "qty"]);
    expect(result.summary.changed).toBe(1);
    expect(result.rows[0]?.changedFields).toEqual([
      { field: "qty", oldValue: "10", newValue: "11" },
    ]);
  });

  it("flags a delimiter that differs between the two files", () => {
    const result = run({ original: "id,qty\n1,10\n", updated: "id;qty\n1;10\n" });
    expect(finding(result, "delimiter_mismatch")?.level).toBe("warning");
  });

  it("detects the byte order marks and the UTF-16 null pattern", () => {
    expect(detectEncoding(Uint8Array.from([0xef, 0xbb, 0xbf, 0x61]))).toBe("utf8-bom");
    expect(detectEncoding(Uint8Array.from([0xff, 0xfe, 0x61, 0x00]))).toBe("utf16le");
    expect(detectEncoding(Uint8Array.from([0xfe, 0xff, 0x00, 0x61]))).toBe("utf16be");
    // No BOM: "ab\ncd" as UTF-16LE is half NUL on the odd offsets.
    expect(detectEncoding(Uint8Array.from([0x61, 0x00, 0x62, 0x00, 0x0a, 0x00, 0x63, 0x00]))).toBe(
      "utf16le",
    );
    expect(detectEncoding(Uint8Array.from([0x69, 0x64, 0x0a, 0x31]))).toBe("utf8");
    // 0xE9 alone is not well-formed UTF-8 (RFC 3629 §4) — it is a legacy byte.
    expect(detectEncoding(Uint8Array.from([0x63, 0x61, 0x66, 0xe9]))).toBe("windows-1252");
  });

  it("decodes windows-1252 0x80–0x9F where latin-1 would not (WHATWG Encoding §12.2.2)", () => {
    const bytes = Uint8Array.from([0x93, 0x61, 0x94, 0xe9]);
    expect(decodeBytes(bytes, "windows-1252")).toBe("“a”é");
    expect(decodeBytes(bytes, "latin1")).toBe("aé");
  });

  it("reads a windows-1252 byte payload without garbling the accented cell", () => {
    // "name\ncaf\xE9" — a Latin-1/1252 export, the classic European Excel case.
    const original = b64([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x63, 0x61, 0x66, 0xe9]);
    const updated = b64([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x63, 0x61, 0x66, 0x65]);
    const result = run({ originalBase64: original, updatedBase64: updated });
    expect(result.original.encoding).toBe("windows-1252");
    expect(result.original.encodingSource).toBe("detected");
    expect(result.summary).toMatchObject({ added: 1, removed: 1 });
    expect(result.rows.find((r) => r.status === "removed")?.original).toEqual({ name: "café" });
  });

  it("reads a UTF-16 LE payload with a BOM and strips the BOM from the header", () => {
    // "id,v\n1,a\n" as UTF-16LE with a BOM.
    const text = "id,v\n1,a\n";
    const bytes = [0xff, 0xfe];
    for (const ch of text) {
      bytes.push(ch.charCodeAt(0) & 0xff, ch.charCodeAt(0) >> 8);
    }
    const result = run({ originalBase64: b64(bytes), updated: "id,v\n1,a\n" });
    expect(result.original.encoding).toBe("utf16le");
    expect(result.original.headers).toEqual(["id", "v"]);
    expect(result.summary.unchanged).toBe(1);
  });

  it("strips a UTF-8 BOM from the first header name on the text path too", () => {
    const result = run({ original: "﻿id,v\n1,a\n", updated: "id,v\n1,a\n" });
    expect(result.original.headers).toEqual(["id", "v"]);
    expect(result.summary.unchanged).toBe(1);
  });

  it("honours an explicit encoding override over detection", () => {
    const bytes = b64([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x93]);
    const result = run({
      originalBase64: bytes,
      updated: "name\n“\n",
      dialect: { encoding: "windows-1252" },
    });
    expect(result.original.encodingSource).toBe("provided");
    expect(result.summary.unchanged).toBe(1);
  });

  it("rejects a payload that is not base64 rather than diffing dropped bytes", () => {
    expect(() => run({ originalBase64: "not base64!!", updated: "id\n1\n" })).toThrow(
      /not valid base64/,
    );
  });
});

/* ── know-how #1: row identity, not row position ───────────────────────── */

describe("csv-diff · row identity (know-how #1)", () => {
  it("does not cascade after an inserted row — the classic positional-diff failure", () => {
    const original = "id,name\n1,a\n2,b\n3,c\n";
    const updated = "id,name\n0,z\n1,a\n2,b\n3,c\n";
    const result = run({ original, updated });
    expect(result.keyColumnsUsed).toEqual(["id"]);
    expect(result.summary).toMatchObject({ added: 1, removed: 0, changed: 0, unchanged: 3 });
  });

  it("does not report a re-sorted export as changed", () => {
    const result = run({ original: "id,name\n1,a\n2,b\n", updated: "id,name\n2,b\n1,a\n" });
    expect(result.summary).toMatchObject({ added: 0, removed: 0, changed: 0, unchanged: 2 });
  });

  it("auto-suggests a key by header name and reports where the key came from", () => {
    const result = run({ original: "sku,qty\nA1,1\n", updated: "sku,qty\nA1,2\n" });
    expect(result.keyColumnsUsed).toEqual(["sku"]);
    expect(result.keySource).toBe("auto");
  });
});

/* ── know-how #2: no fixed first-column key ────────────────────────────── */

describe("csv-diff · key selection is suggestion, never assumption (know-how #2)", () => {
  it("ignores a non-identifying first column instead of keying on it", () => {
    // AllFileTools would key on `status` here and mispair every row.
    const original = "status,id,qty\nopen,1,10\nopen,2,20\n";
    const updated = "status,id,qty\nclosed,2,20\nopen,1,11\n";
    const result = run({ original, updated });
    expect(result.keyColumnsUsed).toEqual(["id"]);
    expect(result.summary).toMatchObject({ added: 0, removed: 0, changed: 2, unchanged: 0 });
  });

  it("rejects a key candidate that is not unique and records why", () => {
    const original = "id,email\n1,a@x.io\n1,b@x.io\n";
    const updated = "id,email\n1,a@x.io\n1,b@x.io\n";
    const result = run({ original, updated });
    expect(result.keyColumnsUsed).toEqual(["email"]);
    expect(result.keyCandidatesRejected).toEqual([
      { column: "id", reason: "original: duplicate value" },
    ]);
  });

  it("rejects a key candidate with an empty value", () => {
    const original = "id,email\n1,a@x.io\n,b@x.io\n";
    const updated = "id,email\n1,a@x.io\n2,b@x.io\n";
    const result = run({ original, updated });
    expect(result.keyColumnsUsed).toEqual(["email"]);
    expect(result.keyCandidatesRejected[0]).toEqual({
      column: "id",
      reason: "original: empty value",
    });
  });

  it("falls back to whole-row comparison — never to positional pairing", () => {
    const original = "name,city\nA,X\nB,Y\n";
    const updated = "name,city\nA,X\nB,Z\n";
    const result = run({ original, updated });
    expect(result.keyColumnsUsed).toBeNull();
    expect(result.keySource).toBe("full-row");
    expect(finding(result, "full_row_fallback_auto")?.level).toBe("warning");
    // Under the fallback nothing can be "changed": B,Y left and B,Z arrived.
    expect(result.summary).toMatchObject({ added: 1, removed: 1, changed: 0, unchanged: 1 });
    expect(result.rows.every((r) => r.key === null)).toBe(true);
  });

  it("takes an explicit empty keyColumns as a deliberate whole-row request", () => {
    const result = run({ original: "id,v\n1,a\n", updated: "id,v\n1,b\n", keyColumns: [] });
    expect(result.keyColumnsUsed).toBeNull();
    expect(finding(result, "full_row_fallback_explicit")).toBeDefined();
    expect(result.summary).toMatchObject({ added: 1, removed: 1, changed: 0 });
  });

  it("honours a caller-chosen key, including a composite one", () => {
    const original = "region,sku,qty\neu,A1,1\nus,A1,5\n";
    const updated = "region,sku,qty\nus,A1,5\neu,A1,2\n";
    const result = run({ original, updated, keyColumns: ["region", "sku"] });
    expect(result.keySource).toBe("provided");
    expect(result.summary).toMatchObject({ added: 0, removed: 0, changed: 1, unchanged: 1 });
    expect(result.rows[0]?.key).toEqual({ region: "eu", sku: "A1" });
  });

  it("refuses a key column that is not comparable in both files", () => {
    expect(() =>
      run({ original: "id,v\n1,a\n", updated: "id,w\n1,a\n", keyColumns: ["v"] }),
    ).toThrow(/not a comparable column/);
  });

  it("names a non-unique caller key instead of hiding it, and pairs in file order", () => {
    const original = "id,v\n1,a\n1,b\n";
    const updated = "id,v\n1,a\n1,c\n";
    const result = run({ original, updated, keyColumns: ["id"] });
    expect(finding(result, "key_not_unique")?.level).toBe("warning");
    expect(result.summary).toMatchObject({ changed: 1, unchanged: 1 });
    expect(result.rows[0]?.changedFields).toEqual([{ field: "v", oldValue: "b", newValue: "c" }]);
  });
});

/* ── know-how #3 + #8: column drift and header-set mismatch ────────────── */

describe("csv-diff · column drift (know-how #3, #8)", () => {
  it("pairs a renamed column instead of reporting a whole column added and removed", () => {
    const original = "customer_id,qty\n7,3\n";
    const updated = "Customer ID,qty\n7,3\n";
    const result = run({ original, updated });
    expect(result.columnMapping).toEqual({ customer_id: "Customer ID", qty: "qty" });
    expect(result.columnMappingSource).toBe("auto");
    expect(result.columnSetMismatch).toBeNull();
    expect(result.summary).toMatchObject({ added: 0, removed: 0, changed: 0, unchanged: 1 });
    expect(finding(result, "column_renamed")).toBeDefined();
  });

  it("accepts an explicit mapping and still pairs the untouched columns", () => {
    const original = "id,qty\n7,3\n";
    const updated = "id,quantity\n7,4\n";
    const result = run({ original, updated, columnMapping: { qty: "quantity" } });
    expect(result.columnMappingSource).toBe("provided");
    expect(result.columnMapping).toEqual({ qty: "quantity", id: "id" });
    expect(result.rows[0]?.changedFields).toEqual([{ field: "qty", oldValue: "3", newValue: "4" }]);
  });

  it("refuses a mapping that names a column neither file has", () => {
    expect(() =>
      run({
        original: "id,qty\n7,3\n",
        updated: "id,quantity\n7,3\n",
        columnMapping: { q: "quantity" },
      }),
    ).toThrow(/Original CSV: mapped column "q" does not exist/);
    expect(() =>
      run({
        original: "id,qty\n7,3\n",
        updated: "id,quantity\n7,3\n",
        columnMapping: { qty: "nope" },
      }),
    ).toThrow(/Updated CSV: mapped column "nope" does not exist/);
  });

  it("refuses a mapping that aims two original columns at one updated column", () => {
    // Fanning out would compare `b` against `z`'s cells as well, so one of the
    // two columns silently gets a wrong verdict. Refuse instead.
    expect(() =>
      run({ original: "a,b\n1,2\n", updated: "z\n1\n", columnMapping: { a: "z", b: "z" } }),
    ).toThrow(/ambiguous/);
  });

  it("surfaces a header-set mismatch as its own fact, not as per-row noise", () => {
    const original = "id,a,b\n1,x,DROPPED\n";
    const updated = "id,a,c\n1,x,NEW\n";
    const result = run({ original, updated });
    expect(result.columnSetMismatch).toEqual({ onlyInOriginal: ["b"], onlyInUpdated: ["c"] });
    expect(result.comparedColumns).toEqual(["id", "a"]);
    expect(finding(result, "column_set_mismatch")?.level).toBe("warning");
    // The uncompared columns are excluded from the cell comparison, so the row
    // is unchanged — the column fact carries the difference instead.
    expect(result.summary).toMatchObject({ changed: 0, unchanged: 1 });
  });

  it("refuses two files with no column in common rather than diffing nothing", () => {
    expect(() => run({ original: "a\n1\n", updated: "b\n1\n" })).toThrow(/No comparable columns/);
  });

  it("does not guess when a rename is ambiguous", () => {
    // Two updated headers normalise to "userid" — a coin flip is not an answer.
    const result = run({ original: "user_id,v\n1,a\n", updated: "userid,user id,v\n1,2,a\n" });
    expect(result.columnMapping.user_id).toBeUndefined();
    expect(result.columnSetMismatch?.onlyInOriginal).toEqual(["user_id"]);
  });
});

/* ── know-how #4: cell-level granularity ───────────────────────────────── */

describe("csv-diff · changed means which cells (know-how #4)", () => {
  it("names only the columns that actually differ, with old and new values", () => {
    const original = "id,name,qty,note\n1,Ada,10,keep\n";
    const updated = "id,name,qty,note\n1,Ada,11,keep\n";
    const result = run({ original, updated });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.status).toBe("changed");
    expect(result.rows[0]?.changedFields).toEqual([
      { field: "qty", oldValue: "10", newValue: "11" },
    ]);
    // Both full rows still travel, so a caller can render context around the cell.
    expect(result.rows[0]?.original).toEqual({ id: "1", name: "Ada", qty: "10", note: "keep" });
    expect(result.rows[0]?.updated?.qty).toBe("11");
  });

  it("reports the raw values, not the normalised ones, when an ignore option is on", () => {
    const result = run({
      original: "id,name\n1, Ada \n",
      updated: "id,name\n1,ADA\n",
      options: { ignoreWhitespace: true },
    });
    expect(result.rows[0]?.changedFields).toEqual([
      { field: "name", oldValue: " Ada ", newValue: "ADA" },
    ]);
  });
});

/* ── know-how #5: "empty" is not one value ─────────────────────────────── */

describe("csv-diff · empty-value equivalence (know-how #5)", () => {
  it('reports "" vs NULL as a change by default — the distinction can be the point', () => {
    const result = run({ original: "id,note\n1,\n", updated: "id,note\n1,NULL\n" });
    expect(result.summary.changed).toBe(1);
  });

  it("folds empty, whitespace, NULL and N/A together only when asked", () => {
    const base = { options: { treatEmptyAsNull: true } };
    expect(
      run({ original: "id,n\n1,\n", updated: "id,n\n1,NULL\n", ...base }).summary,
    ).toMatchObject({
      changed: 0,
      unchanged: 1,
    });
    expect(
      run({ original: "id,n\n1,   \n", updated: "id,n\n1,N/A\n", ...base }).summary,
    ).toMatchObject({ changed: 0, unchanged: 1 });
    // A real value is still a real value.
    expect(
      run({ original: "id,n\n1,0\n", updated: "id,n\n1,NULL\n", ...base }).summary.changed,
    ).toBe(1);
  });

  it("applies ignoreWhitespace and ignoreCase only when asked", () => {
    const original = "id,name\n1, Ada  Lovelace \n";
    const updated = "id,name\n1,ada lovelace\n";
    expect(run({ original, updated }).summary.changed).toBe(1);
    expect(run({ original, updated, options: { ignoreWhitespace: true } }).summary.changed).toBe(1);
    expect(
      run({ original, updated, options: { ignoreWhitespace: true, ignoreCase: true } }).summary,
    ).toMatchObject({ changed: 0, unchanged: 1 });
  });
});

/* ── know-how #6: join type is the question, not a filter ──────────────── */

describe("csv-diff · join semantics (know-how #6)", () => {
  const original = "id,qty\n1,10\n2,20\n3,30\n";
  const updated = "id,qty\n1,10\n2,25\n4,40\n";

  it("full outer join sees every row on both sides", () => {
    const result = run({ original, updated, joinType: "full" });
    expect(result.summary).toMatchObject({ added: 1, removed: 1, changed: 1, unchanged: 1 });
    expect(result.rows.map((r) => r.status)).toEqual(["changed", "removed", "added"]);
  });

  it("inner join asks only about records present on both sides", () => {
    const result = run({ original, updated, joinType: "inner" });
    expect(result.summary).toMatchObject({ added: 0, removed: 0, changed: 1, unchanged: 1 });
    expect(result.rows.map((r) => r.status)).toEqual(["changed"]);
  });

  it("left join treats the original as the authoritative row set", () => {
    const result = run({ original, updated, joinType: "left" });
    expect(result.summary).toMatchObject({ added: 0, removed: 1, changed: 1, unchanged: 1 });
    expect(result.rows.map((r) => r.status)).toEqual(["changed", "removed"]);
  });

  it("keeps the input row totals honest under every join", () => {
    for (const joinType of ["full", "inner", "left"] as const) {
      const result = run({ original, updated, joinType });
      expect(result.summary.totalOriginalRows).toBe(3);
      expect(result.summary.totalUpdatedRows).toBe(3);
    }
  });
});

/* ── parse failures, malformed input, and the preview cap ──────────────── */

describe("csv-diff · malformed input and limits", () => {
  it("names the file and the row when a record does not match the header width", () => {
    expect(() => run({ original: "a,b\n1,2\n1\n", updated: "a,b\n1,2\n" })).toThrow(
      "Original CSV: row 3 has 1 fields, expected 2 based on the header row",
    );
    expect(() => run({ original: "a,b\n1,2\n", updated: "a,b\n1,2,3\n" })).toThrow(
      "Updated CSV: row 2 has 3 fields, expected 2 based on the header row",
    );
  });

  it("pads a ragged row instead only when explicitly allowed, and says so", () => {
    const result = run({
      original: "a,b\n1,2\n1\n",
      updated: "a,b\n1,2\n1,\n",
      options: { allowRaggedRows: true },
    });
    expect(finding(result, "ragged_row")?.level).toBe("warning");
    expect(result.summary.unchanged).toBe(2);
  });

  it("says the surplus fields were dropped, not padded, when a row is too long", () => {
    // The row loses a real cell here; calling that "padded" would hide the loss
    // behind a verdict of "unchanged".
    const result = run({
      original: "a,b\n1,2,3\n",
      updated: "a,b\n1,2\n",
      options: { allowRaggedRows: true },
    });
    const found = finding(result, "ragged_row_truncated");
    expect(found?.level).toBe("danger");
    expect(found?.message).toContain("dropped");
    expect(found?.message).toContain('"3"');
    expect(finding(result, "ragged_row")).toBeUndefined();
  });

  it("refuses an ambiguous duplicate column header", () => {
    expect(() => run({ original: "id,id\n1,2\n", updated: "id,v\n1,2\n" })).toThrow(
      /duplicate column header "id"/,
    );
  });

  it("refuses a file with no header row", () => {
    expect(() => run({ original: "", updated: "id\n1\n" })).toThrow(
      "Original CSV: no header row found",
    );
  });

  it("accepts a header-only file — zero rows is a legitimate answer", () => {
    const result = run({ original: "id,v\n", updated: "id,v\n1,a\n" });
    expect(result.summary).toMatchObject({ added: 1, removed: 0, totalOriginalRows: 0 });
  });

  it("caps the preview while keeping the summary complete", () => {
    const rows = (v: string) =>
      `id,qty\n${Array.from({ length: 5 }, (_, i) => `${i + 1},${v}${i}`).join("\n")}\n`;
    const result = run({ original: rows("a"), updated: rows("b"), maxPreviewRows: 2 });
    expect(result.summary.changed).toBe(5);
    expect(result.rows).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.previewLimit).toBe(2);
    expect(finding(result, "preview_truncated")).toBeDefined();
  });

  it("omits unchanged rows from the payload by default, and emits them on request", () => {
    const input = { original: "id,v\n1,a\n2,b\n", updated: "id,v\n1,a\n2,c\n" };
    expect(run(input).rows.map((r) => r.status)).toEqual(["changed"]);
    const withUnchanged = run({ ...input, options: { includeUnchanged: true } });
    expect(withUnchanged.rows.map((r) => r.status)).toEqual(["unchanged", "changed"]);
    expect(withUnchanged.summary.unchanged).toBe(1);
  });
});

/* ── helpers used by the page ──────────────────────────────────────────── */

describe("csv-diff · helpers", () => {
  it("normalises header names for drift matching", () => {
    expect(normalizeHeader("Customer ID")).toBe("customerid");
    expect(normalizeHeader("customer_id")).toBe("customerid");
    expect(normalizeHeader("qty")).not.toBe(normalizeHeader("quantity"));
  });

  it("summarises the verdict in one line", () => {
    const same = run({ original: "id,v\n1,a\n", updated: "id,v\n1,a\n" });
    expect(summarizeCsvDiff(same)).toBe("No differences (1 rows unchanged)");
    const differs = run({ original: "id,v\n1,a\n", updated: "id,v\n1,b\n" });
    expect(summarizeCsvDiff(differs)).toBe("0 added · 0 removed · 1 changed · 0 unchanged");
  });
});

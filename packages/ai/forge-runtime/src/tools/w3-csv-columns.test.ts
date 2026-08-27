import { describe, expect, it } from "vitest";
import {
  type CsvColumnsResult,
  csvColumnsTool,
  encodeCsvField,
  parseCsv,
  w3CsvColumnsTools,
} from "./w3-csv-columns";

function run(input: unknown): CsvColumnsResult {
  const parsed = csvColumnsTool.inputSchema.parse(input);
  return csvColumnsTool.execute(parsed) as CsvColumnsResult;
}

function fails(input: unknown): string {
  try {
    run(input);
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  throw new Error("expected the call to fail, but it returned a result");
}

const BASE = "id,name,email\n1,Ada,ada@example.com\n2,Linus,linus@example.com";

describe("definition", () => {
  it("declares a pure, deterministic contract filed under its id namespace", () => {
    expect(csvColumnsTool.id).toBe("data/csv-columns");
    expect(csvColumnsTool.id.split("/")[0]).toBe(csvColumnsTool.category);
    expect(csvColumnsTool.slug).toBe("csv-columns");
    expect(csvColumnsTool.meterId).toBe("forge.data.csv_columns");
    expect(csvColumnsTool.sideEffect).toBe("pure");
    expect(csvColumnsTool.roots).toEqual(["editor"]);
    // The engine names the spec it implements, not an invented library.
    expect(csvColumnsTool.engine.upstream).toContain("RFC 4180");
    expect(w3CsvColumnsTools).toContain(csvColumnsTool);
  });

  it("is deterministic — same input, byte-identical output", () => {
    const input = { csv: BASE, operations: { drop: ["email"], order: ["name"] } };
    expect(run(input).csv).toBe(run(input).csv);
  });
});

describe("identity", () => {
  it("returns the same logical CSV when no operation is given", () => {
    const out = run({ csv: BASE });
    expect(out.columns).toEqual(["id", "name", "email"]);
    expect(out.originalColumns).toEqual(["id", "name", "email"]);
    expect(out.rowCount).toBe(2);
    expect(out.csv).toBe(BASE);
    expect(out.warnings).toEqual({});
  });

  it("reads the header even when the file has no data rows", () => {
    const out = run({ csv: "a,b,c" });
    expect(out.rowCount).toBe(0);
    expect(out.csv).toBe("a,b,c");
  });
});

describe("keep / drop (§9.6, know-how #1)", () => {
  it("drops by original header name", () => {
    const out = run({ csv: BASE, operations: { drop: ["email"] } });
    expect(out.columns).toEqual(["id", "name"]);
    expect(out.csv).toBe("id,name\n1,Ada\n2,Linus");
  });

  it("drops by 0-based original index", () => {
    const out = run({ csv: BASE, operations: { drop: [0] } });
    expect(out.columns).toEqual(["name", "email"]);
  });

  it("treats keep as an allow-list that preserves the original relative order", () => {
    const out = run({ csv: BASE, operations: { keep: ["email", "id"] } });
    expect(out.columns).toEqual(["id", "email"]);
    expect(out.csv).toBe("id,email\n1,ada@example.com\n2,linus@example.com");
  });

  it("lets drop win when keep and drop name the same column", () => {
    const out = run({ csv: BASE, operations: { keep: ["id", "name"], drop: ["name"] } });
    expect(out.columns).toEqual(["id"]);
  });

  it("refuses a configuration that leaves no columns", () => {
    expect(fails({ csv: BASE, operations: { drop: [0, 1, 2] } })).toContain("no_columns_selected");
  });

  it("names an unknown column instead of silently ignoring it", () => {
    expect(fails({ csv: BASE, operations: { drop: ["phone"] } })).toContain("unknown_column");
    expect(fails({ csv: BASE, operations: { drop: [7] } })).toContain("unknown_column");
  });
});

describe("rename", () => {
  it("renames by original header name", () => {
    const out = run({
      csv: BASE,
      operations: { rename: [{ from: "email", to: "Email Address" }] },
    });
    expect(out.columns).toEqual(["id", "name", "Email Address"]);
    expect(out.csv.split("\n")[0]).toBe("id,name,Email Address");
  });

  it("renames by original index", () => {
    const out = run({ csv: BASE, operations: { rename: [{ from: 1, to: "full_name" }] } });
    expect(out.columns).toEqual(["id", "full_name", "email"]);
  });

  it("quotes a new header that contains the delimiter (RFC 4180 §2)", () => {
    const out = run({ csv: BASE, operations: { rename: [{ from: "name", to: "last,first" }] } });
    expect(out.csv.split("\n")[0]).toBe('id,"last,first",email');
  });

  it("reports a rename whose column the output does not carry", () => {
    const out = run({
      csv: BASE,
      operations: { drop: ["email"], rename: [{ from: "email", to: "mail" }] },
    });
    expect(out.columns).toEqual(["id", "name"]);
    expect(out.warnings.unusedRenames).toEqual(["email"]);
  });
});

describe("fixed drop → rename → reorder order (know-how #2)", () => {
  /**
   * The exact trap the brief names: a request that renames `phone` to `email`
   * and drops `email` in the same call. Resolving against the original header
   * drops the column that arrived as `email`; resolving against a
   * partially-renamed intermediate would drop the renamed `phone`.
   */
  it("resolves drop against the ORIGINAL header, never a renamed intermediate", () => {
    const csv = "id,email,phone\n1,a@x.com,555\n2,b@x.com,556";
    const out = run({
      csv,
      operations: { rename: [{ from: "phone", to: "email" }], drop: ["email"] },
    });
    expect(out.columns).toEqual(["id", "email"]);
    // The surviving "email" column carries the phone values — the rename hit
    // the phone column, the drop hit the original email column.
    expect(out.csv).toBe("id,email\n1,555\n2,556");
  });

  it("resolves order against the ORIGINAL header, not the renamed one", () => {
    const out = run({
      csv: BASE,
      operations: { rename: [{ from: "id", to: "z_id" }], order: ["id"] },
    });
    expect(out.columns).toEqual(["z_id", "name", "email"]);
  });
});

describe("reorder", () => {
  it("puts named columns first and appends the rest in original relative order", () => {
    const out = run({ csv: BASE, operations: { order: ["email"] } });
    expect(out.columns).toEqual(["email", "id", "name"]);
    expect(out.csv).toBe("email,id,name\nada@example.com,1,Ada\nlinus@example.com,2,Linus");
  });

  it("accepts indices and ignores a repeated reference", () => {
    const out = run({ csv: BASE, operations: { order: [2, 0, 2] } });
    expect(out.columns).toEqual(["email", "id", "name"]);
  });

  it("ignores an order reference to a dropped column", () => {
    const out = run({ csv: BASE, operations: { drop: ["email"], order: ["email", "name"] } });
    expect(out.columns).toEqual(["name", "id"]);
  });
});

describe("RFC 4180 parsing (know-how #4)", () => {
  it("keeps a delimiter that sits inside a quoted field", () => {
    const csv = 'id,note\n1,"Ada, Lovelace"';
    const out = run({ csv, operations: { drop: ["id"] } });
    expect(out.columns).toEqual(["note"]);
    expect(out.csv).toBe('note\n"Ada, Lovelace"');
    expect(out.rowCount).toBe(1);
  });

  it("keeps a doubled quote as one literal quote", () => {
    const csv = 'id,note\n1,"a ""quoted"" word"';
    const out = run({ csv, operations: { drop: [0] } });
    expect(parseCsv(csv, ",")[1]?.fields[1]).toBe('a "quoted" word');
    expect(out.csv).toBe('note\n"a ""quoted"" word"');
  });

  it("keeps a CRLF that sits inside a quoted field as one record", () => {
    const csv = 'id,note\r\n1,"line one\r\nline two"\r\n2,plain';
    const out = run({ csv });
    expect(out.rowCount).toBe(2);
    expect(parseCsv(csv, ",")[1]?.fields[1]).toBe("line one\r\nline two");
  });

  it("splits a semicolon or tab file on the declared delimiter only", () => {
    const out = run({ csv: "a;b\n1;2", delimiter: ";", operations: { drop: ["a"] } });
    expect(out.csv).toBe("b\n2");
    const tsv = run({ csv: "a\tb\n1\t2", delimiter: "\t", operations: { order: ["b"] } });
    expect(tsv.csv).toBe("b\ta\n2\t1");
  });

  it("strips a leading UTF-8 BOM from the first header name", () => {
    const out = run({ csv: "\uFEFFid,name\n1,Ada" });
    expect(out.originalColumns).toEqual(["id", "name"]);
  });

  it("does not emit a phantom row for a trailing newline", () => {
    expect(run({ csv: "a,b\n1,2\n" }).rowCount).toBe(1);
  });
});

describe("CRLF normalisation is global (know-how #5)", () => {
  it("handles every line of a CRLF file, not just the first", () => {
    const csv = "a,b,c\r\n1,2,3\r\n4,5,6\r\n7,8,9";
    const out = run({ csv, operations: { drop: ["b"] } });
    expect(out.rowCount).toBe(3);
    expect(out.csv).toBe("a,c\n1,3\n4,6\n7,9");
    // A single non-global \r\n replace would leave a stray CR on lines 2+.
    expect(out.csv).not.toContain("\r");
  });

  it("emits CRLF when the wire form is requested", () => {
    expect(run({ csv: "a,b\n1,2", lineEnding: "crlf" }).csv).toBe("a,b\r\n1,2");
  });
});

describe("duplicate headers (know-how #3)", () => {
  const DUP = "a,a,b\n1,2,3";

  it("matches a duplicated name on its first occurrence and says so", () => {
    const out = run({ csv: DUP, operations: { rename: [{ from: "a", to: "first" }] } });
    expect(out.columns).toEqual(["first", "a", "b"]);
    expect(out.warnings.duplicateHeaders).toEqual(["a"]);
  });

  it("lets an index address the second occurrence unambiguously", () => {
    const out = run({ csv: DUP, operations: { rename: [{ from: 1, to: "second" }] } });
    expect(out.columns).toEqual(["a", "second", "b"]);
    expect(out.warnings.duplicateHeaders).toBeUndefined();
  });

  it("drops the first occurrence when a duplicated name is dropped by name", () => {
    const out = run({ csv: DUP, operations: { drop: ["a"] } });
    expect(out.columns).toEqual(["a", "b"]);
    expect(out.csv).toBe("a,b\n2,3");
    expect(out.warnings.duplicateHeaders).toEqual(["a"]);
  });

  it("stays silent about a duplicate nobody referenced by name", () => {
    expect(run({ csv: DUP, operations: { drop: [2] } }).warnings.duplicateHeaders).toBeUndefined();
  });
});

describe("ragged rows (know-how #6)", () => {
  const RAGGED = "a,b,c\n1,2\n3,4,5,6\n7,8,9";

  it('pads short rows and truncates long ones under the default "pad" policy', () => {
    const out = run({ csv: RAGGED });
    expect(out.csv).toBe("a,b,c\n1,2,\n3,4,5\n7,8,9");
    expect(out.warnings.raggedRows).toEqual([
      { line: 2, expected: 3, actual: 2 },
      { line: 3, expected: 3, actual: 4 },
    ]);
  });

  it('leaves a short row short under "truncate" while still cutting the long one', () => {
    const out = run({ csv: RAGGED, raggedRowPolicy: "truncate" });
    expect(out.csv).toBe("a,b,c\n1,2\n3,4,5\n7,8,9");
    expect(out.warnings.raggedRows).toHaveLength(2);
  });

  it('fails loudly under "reject", naming the line', () => {
    const message = fails({ csv: RAGGED, raggedRowPolicy: "reject" });
    expect(message).toContain("ragged_row");
    expect(message).toContain("line 2");
  });

  it("reports the physical line even when an earlier record spans two lines", () => {
    const csv = 'a,b,c\n1,"x\ny",3\n4,5';
    const out = run({ csv });
    expect(out.warnings.raggedRows).toEqual([{ line: 4, expected: 3, actual: 2 }]);
  });

  it("caps the reported list and flags the cap", () => {
    const rows = Array.from({ length: 60 }, () => "1,2").join("\n");
    const out = run({ csv: `a,b,c\n${rows}` });
    expect(out.warnings.raggedRows).toHaveLength(50);
    expect(out.warnings.raggedRowsTruncated).toBe(true);
  });
});

describe("schema rejects bad input", () => {
  it("requires a non-empty csv", () => {
    expect(csvColumnsTool.inputSchema.safeParse({}).success).toBe(false);
    expect(csvColumnsTool.inputSchema.safeParse({ csv: "" }).success).toBe(false);
  });

  it("requires a single-character delimiter that is not a quote or a line break", () => {
    expect(csvColumnsTool.inputSchema.safeParse({ csv: BASE, delimiter: ",," }).success).toBe(
      false,
    );
    expect(csvColumnsTool.inputSchema.safeParse({ csv: BASE, delimiter: '"' }).success).toBe(false);
    expect(csvColumnsTool.inputSchema.safeParse({ csv: BASE, delimiter: "\n" }).success).toBe(
      false,
    );
  });

  it("rejects a negative or fractional column index", () => {
    expect(
      csvColumnsTool.inputSchema.safeParse({ csv: BASE, operations: { drop: [-1] } }).success,
    ).toBe(false);
    expect(
      csvColumnsTool.inputSchema.safeParse({ csv: BASE, operations: { drop: [1.5] } }).success,
    ).toBe(false);
  });

  it("rejects a rename without a target and an unknown ragged-row policy", () => {
    expect(
      csvColumnsTool.inputSchema.safeParse({ csv: BASE, operations: { rename: [{ from: "id" }] } })
        .success,
    ).toBe(false);
    expect(
      csvColumnsTool.inputSchema.safeParse({ csv: BASE, raggedRowPolicy: "skip" }).success,
    ).toBe(false);
  });

  it("applies the documented defaults", () => {
    const parsed = csvColumnsTool.inputSchema.parse({ csv: BASE });
    expect(parsed.delimiter).toBe(",");
    expect(parsed.raggedRowPolicy).toBe("pad");
    expect(parsed.lineEnding).toBe("lf");
    expect(parsed.operations).toEqual({});
  });
});

describe("header-less input", () => {
  it("refuses an input with nothing that can serve as a header", () => {
    expect(fails({ csv: "   " })).toContain("empty_input");
  });
});

describe("encodeCsvField", () => {
  it("quotes only what RFC 4180 §2 requires", () => {
    expect(encodeCsvField("plain", ",")).toBe("plain");
    expect(encodeCsvField("a,b", ",")).toBe('"a,b"');
    expect(encodeCsvField("a,b", ";")).toBe("a,b");
    expect(encodeCsvField('say "hi"', ",")).toBe('"say ""hi"""');
    expect(encodeCsvField("two\nlines", ",")).toBe('"two\nlines"');
  });
});

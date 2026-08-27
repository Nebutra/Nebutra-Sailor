import { describe, expect, it } from "vitest";
import {
  checkIsbn,
  type IsbnCheckResult,
  isbn10CheckDigit,
  isbn10To13,
  isbn13CheckDigit,
  isbn13To10,
  isbnTool,
  normalizeIsbn,
  splitIsbnRows,
} from "./w3-isbn";

function run(input: Record<string, unknown>): IsbnCheckResult {
  const parsed = isbnTool.inputSchema.parse(input);
  return isbnTool.execute(parsed) as IsbnCheckResult;
}

const only = (text: string) => run({ text }).results[0];

describe("checkIsbn (single-row entry point)", () => {
  it("returns the same row the batch path produces", () => {
    expect(checkIsbn("0-306-40615-2")).toEqual(only("0-306-40615-2"));
  });
});

/* ── check-digit arithmetic (know-how #1) ──────────────────────────────── */

describe("ISBN-10 check digit — ISO 2108, weights 10…2, mod 11", () => {
  it("computes 2 for 0-306-40615-?", () => {
    // 0·10 + 3·9 + 0·8 + 6·7 + 4·6 + 0·5 + 6·4 + 1·3 + 5·2
    //  = 0 + 27 + 0 + 42 + 24 + 0 + 24 + 3 + 10 = 130
    // 130 mod 11 = 9  →  (11 − 9) mod 11 = 2
    expect(isbn10CheckDigit("030640615")).toBe("2");
  });

  it("writes a remainder of 10 as the literal X, never '10' (know-how #1)", () => {
    // 0·10 + 8·9 + 0·8 + 4·7 + 4·6 + 2·5 + 9·4 + 5·3 + 7·2
    //  = 0 + 72 + 0 + 28 + 24 + 10 + 36 + 15 + 14 = 199
    // 199 mod 11 = 1  →  (11 − 1) mod 11 = 10  →  "X"
    expect(isbn10CheckDigit("080442957")).toBe("X");
  });

  it("writes a remainder of 0 as 0, not 11", () => {
    // 0·10 + 0·9 + 0·8 + 0·7 + 0·6 + 0·5 + 0·4 + 0·3 + 0·2 = 0
    // (11 − 0) mod 11 = 0
    expect(isbn10CheckDigit("000000000")).toBe("0");
  });
});

describe("ISBN-13 check digit — EAN-13, weights 1/3 alternating, mod 10", () => {
  it("computes 7 for 978-0-306-40615-?", () => {
    // 9·1 + 7·3 + 8·1 + 0·3 + 3·1 + 0·3 + 6·1 + 4·3 + 0·1 + 6·3 + 1·1 + 5·3
    //  = 9 + 21 + 8 + 0 + 3 + 0 + 6 + 12 + 0 + 18 + 1 + 15 = 93
    // 93 mod 10 = 3  →  (10 − 3) mod 10 = 7
    expect(isbn13CheckDigit("978030640615")).toBe("7");
  });

  it("uses a different algorithm from ISBN-10, not the same one re-modded", () => {
    // The ISBN-10 formula over the same nine leading digits gives a different
    // answer — proof the two are not one scheme with a swapped modulus.
    expect(isbn13CheckDigit("978030640615")).not.toBe(isbn10CheckDigit("978030640"));
  });

  it("never produces X (know-how #1: ISBN-13 check digits are 0-9)", () => {
    for (let d = 0; d < 10; d += 1) {
      expect(isbn13CheckDigit(`97800000000${d}`)).toMatch(/^[0-9]$/);
    }
  });
});

/* ── conversion (know-how #3, #4) ──────────────────────────────────────── */

describe("conversion", () => {
  it("recomputes the check digit on 10 → 13 rather than reusing it (know-how #4)", () => {
    // 0306406152 → drop "2", prefix 978 → 978030640615 → fresh check digit 7.
    expect(isbn10To13("0306406152")).toBe("9780306406157");
    expect(isbn10To13("0306406152").endsWith("2")).toBe(false);
  });

  it("converts an X-checked ISBN-10 by dropping the X entirely", () => {
    // 978 + 080442957 → 9·1+7·3+8·1+0·3+8·1+0·3+4·1+4·3+2·1+9·3+5·1+7·3
    //  = 9+21+8+0+8+0+4+12+2+27+5+21 = 117 → (10 − 7) mod 10 = 3
    expect(isbn10To13("080442957X")).toBe("9780804429573");
  });

  it("round-trips 13 → 10 for a 978 prefix", () => {
    expect(isbn13To10("9780306406157")).toBe("0306406152");
  });

  it("refuses 13 → 10 for a 979 prefix (know-how #3)", () => {
    expect(isbn13To10("9791234567896")).toBeNull();
  });
});

/* ── normalisation (know-how #6) ───────────────────────────────────────── */

describe("normalisation", () => {
  it("strips hyphens and spaces before the math", () => {
    expect(normalizeIsbn("0-306-40615-2")).toBe("0306406152");
    expect(normalizeIsbn("978 0 306 40615 7")).toBe("9780306406157");
  });

  it("strips the en/em dashes a spreadsheet substitutes for a hyphen", () => {
    expect(normalizeIsbn("0–306—40615−2")).toBe("0306406152");
  });

  it("upper-cases a lowercase x check character", () => {
    expect(normalizeIsbn("080442957x")).toBe("080442957X");
  });

  it("drops an 'ISBN' label glued to a pasted column", () => {
    expect(normalizeIsbn("ISBN-13: 978-0-306-40615-7")).toBe("9780306406157");
    expect(normalizeIsbn("isbn 0-306-40615-2")).toBe("0306406152");
  });

  it("does not split on plain spaces — they are ISBN group separators", () => {
    expect(splitIsbnRows("978 0 306 40615 7")).toEqual(["978 0 306 40615 7"]);
  });

  it("splits on newlines, commas, semicolons and tabs", () => {
    expect(splitIsbnRows("0306406152,080442957X\n9780306406157;\t9791234567896")).toEqual([
      "0306406152",
      "080442957X",
      "9780306406157",
      "9791234567896",
    ]);
  });

  it("drops blank lines instead of reporting them as errors", () => {
    expect(splitIsbnRows("0306406152\n\n   \n080442957X")).toEqual(["0306406152", "080442957X"]);
  });
});

/* ── single-row verdicts ───────────────────────────────────────────────── */

describe("valid ISBNs", () => {
  it("accepts a hyphenated ISBN-10 and offers its ISBN-13 form", () => {
    const r = only("0-306-40615-2");
    expect(r).toMatchObject({
      input: "0-306-40615-2",
      normalized: "0306406152",
      detectedType: "isbn10",
      valid: true,
      converted: { type: "isbn13", value: "9780306406157" },
    });
    expect(r?.noteCode).toBeUndefined();
  });

  it("accepts an X check digit at the tenth position (know-how #2)", () => {
    expect(only("0-8044-2957-X")).toMatchObject({ detectedType: "isbn10", valid: true });
  });

  it("accepts a lowercase x", () => {
    expect(only("080442957x")).toMatchObject({ normalized: "080442957X", valid: true });
  });

  it("accepts a 978 ISBN-13 and offers its ISBN-10 form", () => {
    expect(only("978-0-306-40615-7")).toMatchObject({
      detectedType: "isbn13",
      valid: true,
      converted: { type: "isbn10", value: "0306406152" },
    });
  });

  it("accepts a 979 ISBN-13 as valid but offers no ISBN-10 (know-how #3)", () => {
    // 9·1+7·3+9·1+1·3+2·1+3·3+4·1+5·3+6·1+7·3+8·1+9·3
    //  = 9+21+9+3+2+9+4+15+6+21+8+27 = 134 → (10 − 4) mod 10 = 6
    const r = only("979-1-234-56789-6");
    expect(r?.valid).toBe(true);
    expect(r?.converted).toBeUndefined();
    expect(r?.noteCode).toBe("no-isbn10-equivalent");
    expect(r?.note).toMatch(/979/);
  });
});

describe("rejections", () => {
  it("rejects a wrong ISBN-10 check digit and says what it should be", () => {
    const r = only("0-306-40615-3");
    expect(r?.valid).toBe(false);
    expect(r?.noteCode).toBe("check-digit-mismatch");
    expect(r?.checkDigitExpected).toBe("2");
    expect(r?.converted).toBeUndefined();
  });

  it("rejects a wrong ISBN-13 check digit and says what it should be", () => {
    const r = only("9780306406158");
    expect(r?.valid).toBe(false);
    expect(r?.checkDigitExpected).toBe("7");
  });

  it("catches a transposition the eye misses", () => {
    // 0306406152 with the middle digits transposed: 0306460152.
    // 0·10+3·9+0·8+6·7+4·6+6·5+0·4+1·3+5·2 = 0+27+0+42+24+30+0+3+10 = 136
    // 136 mod 11 = 4 → (11 − 4) mod 11 = 7, so the trailing 2 is wrong.
    const r = only("0306460152");
    expect(r?.valid).toBe(false);
    expect(r?.checkDigitExpected).toBe("7");
  });

  it("rejects 9 digits as invalid length rather than 'completing' it (know-how #7)", () => {
    const r = only("030640615");
    expect(r).toMatchObject({ detectedType: "invalid-length", valid: false });
    expect(r?.checkDigitExpected).toBeUndefined();
    expect(r?.noteCode).toBe("invalid-length");
  });

  it("rejects 12 digits as invalid length (know-how #7)", () => {
    const r = only("978030640615");
    expect(r).toMatchObject({ detectedType: "invalid-length", valid: false });
    expect(r?.checkDigitExpected).toBeUndefined();
  });

  it("rejects an X anywhere but the tenth position (know-how #2)", () => {
    const r = only("X306406152");
    expect(r?.valid).toBe(false);
    expect(r?.noteCode).toBe("x-misplaced");
    expect(r?.checkDigitExpected).toBeUndefined();
  });

  it("rejects an X inside an ISBN-13 (know-how #2)", () => {
    const r = only("978030640615X");
    expect(r?.valid).toBe(false);
    expect(r?.noteCode).toBe("invalid-character");
  });

  it("rejects a letter that is not X", () => {
    const r = only("03064O6152");
    expect(r?.valid).toBe(false);
    expect(r?.noteCode).toBe("invalid-character");
    expect(r?.checkDigitExpected).toBeUndefined();
  });

  it("rejects a 13-digit EAN whose check digit passes but whose prefix is not Bookland", () => {
    // 977… is the ISSN barcode range. 9·1+7·3+7·1+1·3+2·1+3·3+4·1+5·3+6·1+7·3+8·1+9·3
    //  = 9+21+7+3+2+9+4+15+6+21+8+27 = 132 → (10 − 2) mod 10 = 8, so the EAN
    // check digit is correct and only the prefix rule rejects it.
    const r = only("9771234567898");
    expect(r?.valid).toBe(false);
    expect(r?.noteCode).toBe("non-bookland-prefix");
  });

  it("rejects a 979-0 number as ISMN, not ISBN", () => {
    // 9·1+7·3+9·1+0·3+1·1+2·3+3·1+4·3+5·1+6·3+7·1+8·3
    //  = 9+21+9+0+1+6+3+12+5+18+7+24 = 115 → (10 − 5) mod 10 = 5
    const r = only("9790123456785");
    expect(r?.valid).toBe(false);
    expect(r?.noteCode).toBe("ismn-prefix");
  });
});

/* ── batch behaviour (know-how #8) ─────────────────────────────────────── */

describe("batch", () => {
  it("isolates errors per row — a bad line never aborts the batch", () => {
    const out = run({
      text: ["0-306-40615-2", "not-an-isbn", "9780306406157", "0306406153"].join("\n"),
    });
    expect(out.results.map((r) => r.valid)).toEqual([true, false, true, false]);
    expect(out.results[1]?.detectedType).toBe("invalid-length");
    expect(out.results[3]?.checkDigitExpected).toBe("2");
  });

  it("summarises valid vs invalid counts", () => {
    const out = run({ text: "0306406152\n0306406153\n9780306406157" });
    expect(out.summary).toEqual({ total: 3, valid: 2, invalid: 1 });
    expect(out.truncated).toBe(false);
  });

  it("keeps every row verbatim in `input` while normalising separately", () => {
    const out = run({ text: "  0-306-40615-2  " });
    expect(out.results[0]?.input).toBe("0-306-40615-2");
    expect(out.results[0]?.normalized).toBe("0306406152");
  });

  it("returns an empty batch for empty text — an empty box is not an error", () => {
    const out = run({ text: "   \n\n  " });
    expect(out.results).toEqual([]);
    expect(out.summary).toEqual({ total: 0, valid: 0, invalid: 0 });
  });

  it("truncates past maxRows and flags it instead of silently dropping rows", () => {
    const out = run({ text: Array.from({ length: 5 }, () => "0306406152").join("\n"), maxRows: 3 });
    expect(out.results).toHaveLength(3);
    expect(out.truncated).toBe(true);
  });

  it("handles a thousand rows without capping by default", () => {
    const out = run({ text: Array.from({ length: 1000 }, () => "0306406152").join("\n") });
    expect(out.summary.total).toBe(1000);
    expect(out.truncated).toBe(false);
  });
});

/* ── determinism + declared metadata ───────────────────────────────────── */

describe("tool declaration", () => {
  it("is pure and deterministic", () => {
    expect(isbnTool.sideEffect).toBe("pure");
    const a = run({ text: "0306406152\n9791234567896" });
    const b = run({ text: "0306406152\n9791234567896" });
    expect(a).toEqual(b);
  });

  it("declares the spec it implements, not a fake library", () => {
    expect(isbnTool.engine.upstream).toMatch(/ISO 2108/);
    expect(isbnTool.meterId).toBe("forge.text.isbn");
    expect(isbnTool.roots).toContain("verifier");
  });
});

/* ── schema ────────────────────────────────────────────────────────────── */

describe("inputSchema", () => {
  it("defaults maxRows", () => {
    expect(isbnTool.inputSchema.parse({ text: "0306406152" })).toMatchObject({ maxRows: 1000 });
  });

  it("rejects a missing text field", () => {
    expect(() => isbnTool.inputSchema.parse({})).toThrow();
  });

  it("rejects a non-string text field", () => {
    expect(() => isbnTool.inputSchema.parse({ text: 9780306406157 })).toThrow();
  });

  it("rejects maxRows below 1 and above 10000", () => {
    expect(() => isbnTool.inputSchema.parse({ text: "x", maxRows: 0 })).toThrow();
    expect(() => isbnTool.inputSchema.parse({ text: "x", maxRows: 10_001 })).toThrow();
  });

  it("rejects a fractional maxRows", () => {
    expect(() => isbnTool.inputSchema.parse({ text: "x", maxRows: 2.5 })).toThrow();
  });

  it("rejects text past the 500k cap", () => {
    expect(() => isbnTool.inputSchema.parse({ text: "0".repeat(500_001) })).toThrow();
  });
});

/* ── scope honesty (know-how #5) ───────────────────────────────────────── */

describe("scope", () => {
  it("never claims registry assignment — output carries no registration field", () => {
    const r = only("0306406152");
    expect(r).not.toHaveProperty("registered");
    expect(r).not.toHaveProperty("title");
    expect(Object.keys(r ?? {}).sort()).toEqual([
      "converted",
      "detectedType",
      "input",
      "normalized",
      "valid",
    ]);
  });

  it("states what a pass means in the payload, not only in page copy", () => {
    // The sibling verifiers (iban `caveat`, ean-upc-gtin `note`, vin `notices`)
    // all carry their scope structurally; an agent must not have to read the
    // human page to learn that a valid check digit is not a registry hit.
    const out = run({ text: "978-0-306-40615-7" });
    expect(out.note).toMatch(/does not prove an ISBN agency ever assigned/i);
    // Present on every response, never conditional on the verdict.
    expect(run({ text: "0-306-40615-3" }).note).toBe(out.note);
    expect(run({ text: "" }).note).toBe(out.note);
    // Hyphenation is explicitly out of scope rather than silently unchecked.
    expect(out.note).toMatch(/hyphen placement is not checked/i);
  });
});

import { describe, expect, it } from "vitest";
import {
  type EanUpcGtinResult,
  eanUpcGtinTool,
  gs1CheckDigit,
  VALIDITY_SCOPE_NOTE,
  w3EanUpcGtinTools,
} from "./w3-ean-upc-gtin";

function run(input: unknown): EanUpcGtinResult {
  const parsed = eanUpcGtinTool.inputSchema.parse(input);
  return eanUpcGtinTool.execute(parsed) as EanUpcGtinResult;
}

function one(code: string, extra: Record<string, unknown> = {}) {
  const result = run({ codes: [code], ...extra });
  const first = result.results[0];
  if (!first) throw new Error("expected exactly one result");
  return first;
}

describe("ean-upc-gtin · declaration", () => {
  it("declares the Verifier-root contract the brief fixes", () => {
    expect(eanUpcGtinTool.id).toBe("life/ean-upc-gtin");
    expect(eanUpcGtinTool.slug).toBe("ean-upc-gtin");
    expect(eanUpcGtinTool.meterId).toBe("forge.life.ean_upc_gtin");
    expect(eanUpcGtinTool.sideEffect).toBe("pure");
    expect(eanUpcGtinTool.roots).toContain("verifier");
    expect(eanUpcGtinTool.title.zh).not.toBe(eanUpcGtinTool.title.en);
    expect(eanUpcGtinTool.seoKeywords.zh.length).toBeGreaterThan(0);
    expect(eanUpcGtinTool.seoKeywords.en.length).toBeGreaterThan(0);
    // Engine metadata names the spec implemented, not an imaginary library.
    expect(eanUpcGtinTool.engine.upstream).toContain("GS1 General Specifications");
    expect(eanUpcGtinTool.engine.upstream).toContain("mod 10");
    expect(w3EanUpcGtinTools).toEqual([eanUpcGtinTool]);
  });

  it("is deterministic: the same input yields a byte-identical result", () => {
    const input = { codes: ["4006381333931", "036000291452"] };
    expect(JSON.stringify(run(input))).toBe(JSON.stringify(run(input)));
  });
});

describe("ean-upc-gtin · schema", () => {
  it("rejects an empty batch — there is nothing to answer about", () => {
    expect(eanUpcGtinTool.inputSchema.safeParse({ codes: [] }).success).toBe(false);
  });

  it("rejects a bare string where an array of codes is required", () => {
    expect(eanUpcGtinTool.inputSchema.safeParse({ codes: "4006381333931" }).success).toBe(false);
  });

  it("rejects an unknown operation and an unknown forced type", () => {
    expect(
      eanUpcGtinTool.inputSchema.safeParse({ codes: ["96385074"], operation: "repair" }).success,
    ).toBe(false);
    expect(
      eanUpcGtinTool.inputSchema.safeParse({ codes: ["96385074"], type: "UPC-E" }).success,
    ).toBe(false);
  });

  it("rejects an entry longer than any separator-padded GS1 identifier", () => {
    expect(eanUpcGtinTool.inputSchema.safeParse({ codes: ["0".repeat(65)] }).success).toBe(false);
  });

  it("rejects a batch beyond the declared bulk ceiling", () => {
    const codes = new Array(20_001).fill("96385074");
    expect(eanUpcGtinTool.inputSchema.safeParse({ codes }).success).toBe(false);
  });

  it("defaults to validating with auto-detected types", () => {
    const parsed = eanUpcGtinTool.inputSchema.parse({ codes: ["96385074"] });
    expect(parsed.operation).toBe("validate");
    expect(parsed.type).toBe("auto");
  });
});

describe("ean-upc-gtin · check digit arithmetic (hand-verified)", () => {
  // GTIN-8 96385074, payload 9638507.
  // Weights from the right: 7×3=21, 0×1=0, 5×3=15, 8×1=8, 3×3=9, 6×1=6, 9×3=27.
  // Sum 86 → (10 − 86 mod 10) mod 10 = 4, the digit the code carries.
  it("GTIN-8: 9638507 → 4", () => {
    expect(gs1CheckDigit("9638507")).toBe(4);
    expect(one("96385074")).toMatchObject({ detectedType: "GTIN-8", verdict: "valid" });
  });

  // UPC-A 036000291452, payload 03600029145.
  // From the right: 5×3=15, 4×1=4, 1×3=3, 9×1=9, 2×3=6, 0, 0, 0, 6×3=18, 3×1=3, 0.
  // Sum 58 → (10 − 8) mod 10 = 2.
  it("UPC-A: 03600029145 → 2", () => {
    expect(gs1CheckDigit("03600029145")).toBe(2);
    expect(one("036000291452")).toMatchObject({ detectedType: "UPC-A", verdict: "valid" });
  });

  // EAN-13 4006381333931, payload 400638133393.
  // From the right: 3×3=9, 9×1=9, 3×3=9, 3×1=3, 3×3=9, 1×1=1, 8×3=24, 3×1=3,
  // 6×3=18, 0×1=0, 0×3=0, 4×1=4. Sum 89 → (10 − 9) mod 10 = 1.
  it("EAN-13: 400638133393 → 1", () => {
    expect(gs1CheckDigit("400638133393")).toBe(1);
    expect(one("4006381333931")).toMatchObject({ detectedType: "EAN-13", verdict: "valid" });
  });

  // GTIN-14 14006381333938, payload 1400638133393 (the EAN-13 above with
  // indicator digit 1). Odd payload length, so the alternation reaches the
  // leading digit with weight 3 where the 12-digit payload reached it with 1 —
  // the parity flip know-how §7.2 exists for.
  // From the right: 3×3=9, 9×1=9, 3×3=9, 3×1=3, 3×3=9, 1×1=1, 8×3=24, 3×1=3,
  // 6×3=18, 0×1=0, 0×3=0, 4×1=4, 1×3=3. Sum 92 → (10 − 2) mod 10 = 8.
  it("GTIN-14: 1400638133393 → 8", () => {
    expect(gs1CheckDigit("1400638133393")).toBe(8);
    expect(one("14006381333938")).toMatchObject({ detectedType: "GTIN-14", verdict: "valid" });
  });

  // SSCC-18 006141411234567890, payload 00614141123456789.
  // From the right: 9×3=27, 8×1=8, 7×3=21, 6×1=6, 5×3=15, 4×1=4, 3×3=9, 2×1=2,
  // 1×3=3, 1×1=1, 4×3=12, 1×1=1, 4×3=12, 1×1=1, 6×3=18, 0×1=0, 0×3=0.
  // Sum 140 → (10 − 0) mod 10 = 0.
  it("SSCC-18: 00614141123456789 → 0", () => {
    expect(gs1CheckDigit("00614141123456789")).toBe(0);
    expect(one("006141411234567890")).toMatchObject({
      detectedType: "SSCC-18",
      verdict: "valid",
    });
  });

  // GLN 0614141000012, payload 061414100001.
  // From the right: 1×3=3, 0, 0, 0, 0, 1×1=1, 4×3=12, 1×1=1, 4×3=12, 1×1=1,
  // 6×3=18, 0×1=0. Sum 48 → (10 − 8) mod 10 = 2.
  it("GLN-13: 061414100001 → 2", () => {
    expect(gs1CheckDigit("061414100001")).toBe(2);
    expect(one("0614141000012", { type: "GLN-13" })).toMatchObject({
      detectedType: "GLN-13",
      verdict: "valid",
    });
  });

  // ISBN-13 9780306406157, payload 978030640615.
  // From the right: 5×3=15, 1×1=1, 6×3=18, 0×1=0, 4×3=12, 6×1=6, 0×3=0, 3×1=3,
  // 0×3=0, 8×1=8, 7×3=21, 9×1=9. Sum 93 → (10 − 3) mod 10 = 7.
  it("ISBN-13 is an EAN-13: 978030640615 → 7", () => {
    expect(gs1CheckDigit("978030640615")).toBe(7);
    expect(one("9780306406157")).toMatchObject({ detectedType: "EAN-13", verdict: "valid" });
  });
});

describe("ean-upc-gtin · validate rejects wrong check digits", () => {
  it("rejects a transposed EAN-13 and hands back the fix, not just the fault", () => {
    // 4006381333931 with the last two payload digits transposed (…9 3 → …3 9)
    // — the classic scanner/typing failure the checksum exists to catch.
    const r = one("4006381333391");
    expect(r.verdict).toBe("invalid");
    expect(r.reason).toBe("check-digit-mismatch");
    // Payload 400638133339: 9×3=27, 3×1=3, 3×3=9, 3×1=3, 3×3=9, 1×1=1, 8×3=24,
    // 3×1=3, 6×3=18, 0, 0, 4×1=4 → sum 101 → (10 − 1) mod 10 = 9.
    expect(r.checkDigit).toBe(9);
    expect(r.correctedCode).toBe("4006381333399");
  });

  it("rejects a single-digit typo in a UPC-A", () => {
    const r = one("036000291453");
    expect(r.verdict).toBe("invalid");
    expect(r.checkDigit).toBe(2);
    expect(r.correctedCode).toBe("036000291452");
  });

  it("counts a mixed batch without losing anybody", () => {
    const result = run({
      codes: ["96385074", "036000291453", "4006381333931", "12345", "not-a-code"],
    });
    expect(result.summary).toEqual({
      total: 5,
      valid: 2,
      invalid: 2,
      calculated: 0,
      unrecognized: 1,
    });
  });
});

describe("ean-upc-gtin · calculate appends the missing digit (§7.6, the verb nobody else has)", () => {
  it("calculates GTIN-8, UPC-A, EAN-13, GTIN-14 and SSCC-18 payloads", () => {
    const result = run({
      operation: "calculate",
      codes: ["9638507", "03600029145", "400638133393", "1400638133393", "00614141123456789"],
    });
    expect(result.results.map((r) => r.correctedCode)).toEqual([
      "96385074",
      "036000291452",
      "4006381333931",
      "14006381333938",
      "006141411234567890",
    ]);
    expect(result.results.map((r) => r.detectedType)).toEqual([
      "GTIN-8",
      "UPC-A",
      "EAN-13",
      "GTIN-14",
      "SSCC-18",
    ]);
    expect(result.summary).toMatchObject({ total: 5, calculated: 5, valid: 0, invalid: 0 });
  });

  it("warns when a calculate payload is itself a complete code length", () => {
    // 12 digits in calculate mode is a legitimate payload for an EAN-13 — and
    // also a complete UPC-A. Warn rather than silently producing a 13th digit.
    expect(one("036000291452", { operation: "calculate" }).warnings).toContain(
      "payload-is-also-a-complete-code",
    );
    // 11 digits cannot be a complete code, so there is nothing to warn about.
    expect(one("03600029145", { operation: "calculate" }).warnings).toBeUndefined();
  });
});

describe("ean-upc-gtin · know-how the brief names", () => {
  it("§7.1 right-aligns GTINs in a 14-digit field, and only GTINs", () => {
    expect(one("96385074").gtin14).toBe("00000096385074");
    expect(one("036000291452").gtin14).toBe("00036000291452");
    expect(one("4006381333931").gtin14).toBe("04006381333931");
    expect(one("14006381333938").gtin14).toBe("14006381333938");
    // SSCC and GLN are not GTINs — no 14-digit form exists for them.
    expect(one("006141411234567890").gtin14).toBeUndefined();
    expect(one("0614141000012", { type: "GLN-13" }).gtin14).toBeUndefined();
  });

  it("§7.2 anchors the 3/1 weighting on the right, not the left", () => {
    // A left-anchored implementation weights the *leading* digit 3 for every
    // length. It coincides with the standard whenever the payload length is
    // odd — which covers GTIN-8 (7), UPC-A (11), GTIN-14 (13) and SSCC-18 (17),
    // four of the five payload lengths in this family. The one even payload is
    // EAN-13/GLN-13's 12 digits, so a left-anchored clone passes almost every
    // spot check and is wrong on the single most common barcode in the world.
    const leftAnchored = (payload: string) => {
      let sum = 0;
      for (let i = 0; i < payload.length; i += 1) sum += Number(payload[i]) * (i % 2 === 0 ? 3 : 1);
      return (10 - (sum % 10)) % 10;
    };
    for (const oddPayload of ["9638507", "03600029145", "1400638133393", "00614141123456789"]) {
      expect(leftAnchored(oddPayload)).toBe(gs1CheckDigit(oddPayload));
    }
    expect(leftAnchored("400638133393")).not.toBe(gs1CheckDigit("400638133393"));
    expect(leftAnchored("061414100001")).not.toBe(gs1CheckDigit("061414100001"));
    expect(gs1CheckDigit("400638133393")).toBe(1);
    expect(gs1CheckDigit("1400638133393")).toBe(8);
  });

  it("§7.3 states valid ≠ registered in the payload itself", () => {
    const result = run({ codes: ["96385074"] });
    expect(result.note).toBe(VALIDITY_SCOPE_NOTE);
    expect(result.note).toContain("does not prove");
    expect(result.note).toContain("GEPIR");
  });

  it("§7.4 offers ISBN-13 for a Bookland prefix and GLN-13 otherwise", () => {
    expect(one("9780306406157").alternateTypes).toEqual(["ISBN-13"]);
    expect(one("4006381333931").alternateTypes).toEqual(["GLN-13"]);
    // Nothing else in the family is length-ambiguous, so nothing else gets an
    // alternate reading.
    expect(one("96385074").alternateTypes).toBeUndefined();
    expect(one("006141411234567890").alternateTypes).toBeUndefined();
  });

  it("§7.5 preserves input order and per-line addressability", () => {
    const codes = ["4006381333931", "", "96385074", "036000291453"];
    const result = run({ codes });
    expect(result.results.map((r) => r.index)).toEqual([0, 1, 2, 3]);
    expect(result.results.map((r) => r.input)).toEqual(codes);
    expect(result.results.map((r) => r.verdict)).toEqual([
      "valid",
      "unrecognized-length",
      "valid",
      "invalid",
    ]);
  });

  it("§7.7 detects the family by length, and refuses lengths outside it", () => {
    expect(one("96385074").detectedType).toBe("GTIN-8");
    expect(one("036000291452").detectedType).toBe("UPC-A");
    expect(one("4006381333931").detectedType).toBe("EAN-13");
    expect(one("14006381333938").detectedType).toBe("GTIN-14");
    expect(one("006141411234567890").detectedType).toBe("SSCC-18");
    for (const wrong of ["1234567", "1234567890", "123456789012345", "1234567890123456789"]) {
      const r = one(wrong);
      expect(r.verdict).toBe("unrecognized-length");
      expect(r.reason).toBe("unsupported-length");
      // An unrecognised length is not a wrong code — no verdict is invented.
      expect(r.checkDigit).toBeUndefined();
    }
  });

  it("§7.8 strips display separators and says it did", () => {
    const r = one("4 006381-333.931");
    expect(r.normalized).toBe("4006381333931");
    expect(r.verdict).toBe("valid");
    expect(r.warnings).toContain("separators-stripped");
    expect(one("4006381333931").warnings).toBeUndefined();
  });

  it("§7.8 rejects anything else non-digit instead of mangling it", () => {
    const r = one("40063813339X1");
    expect(r.verdict).toBe("invalid");
    expect(r.reason).toBe("non-digit-characters");
    expect(r.detectedType).toBe("unrecognized-length");
    // ISBN-10's mod-11 'X' check character belongs to a different algorithm
    // and is deliberately out of scope (§9.4) — it is not quietly accepted.
    expect(one("043942089X").reason).toBe("non-digit-characters");
  });

  it("§9.6 defaults a 13-digit code to EAN-13 and relabels to GLN only when asked", () => {
    const auto = one("0614141000012");
    expect(auto.detectedType).toBe("EAN-13");
    expect(auto.alternateTypes).toEqual(["GLN-13"]);
    const forced = one("0614141000012", { type: "GLN-13" });
    expect(forced.detectedType).toBe("GLN-13");
    expect(forced.alternateTypes).toEqual(["EAN-13"]);
    // The relabel is semantic only — the arithmetic is identical.
    expect(forced.checkDigit).toBe(auto.checkDigit);
    expect(forced.verdict).toBe(auto.verdict);
  });

  it("a forced type also fixes the expected length", () => {
    const r = one("96385074", { type: "EAN-13" });
    expect(r.verdict).toBe("unrecognized-length");
    expect(r.reason).toBe("length-mismatch");
    // Forcing works in calculate mode too, against the payload length.
    expect(one("9638507", { type: "GTIN-8", operation: "calculate" }).correctedCode).toBe(
      "96385074",
    );
    expect(one("9638507", { type: "EAN-13", operation: "calculate" }).reason).toBe(
      "length-mismatch",
    );
  });

  it("flags an all-zero code, which passes the checksum and means nothing", () => {
    const r = one("00000000");
    expect(r.verdict).toBe("valid");
    expect(r.warnings).toContain("all-zero");
  });

  it("treats a blank entry as nothing to answer, never as an invalid code", () => {
    const r = one("   ");
    expect(r.verdict).toBe("unrecognized-length");
    expect(r.reason).toBe("empty");
    expect(r.normalized).toBeUndefined();
  });
});

/**
 * Every "valid" fixture below was verified outside this implementation: the
 * MOD 97-10 remainder was recomputed with BigInt arithmetic
 * (`BigInt(transliterated) % 97n`) from the raw string, and the arithmetic is
 * shown in the comment next to the first of each shape. `referenceRemainder`
 * in this file is that independent second implementation — it shares no code
 * with the chunked folding in w3-iban.ts, so a bug in one cannot hide in both.
 */
import { describe, expect, it } from "vitest";
import {
  bbanStructureMismatch,
  formatIban,
  IBAN_COUNTRIES,
  type IbanValidateResult,
  ibanCheckDigits,
  ibanRemainder,
  ibanTool,
  normalizeIban,
  validateIban,
  w3IbanTools,
} from "./w3-iban";

/* ── independent reference implementation (BigInt, whole-string) ───────── */

function transliterate(chars: string): string {
  let out = "";
  for (const ch of chars) out += /[0-9]/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
  return out;
}

/** ISO 13616-1 6.2 by the book, with no chunking: rotate, convert, mod 97. */
function referenceRemainder(iban: string): number {
  return Number(BigInt(transliterate(iban.slice(4) + iban.slice(0, 4))) % 97n);
}

function run(input: Record<string, unknown>): IbanValidateResult {
  const parsed = ibanTool.inputSchema.parse(input);
  return ibanTool.execute(parsed) as IbanValidateResult;
}

/**
 * Published IBAN examples, one per structural shape worth covering: shortest
 * (NO, 15), longest in the registry table (LC, 32), letters inside the BBAN
 * (GB, FR, IT, MT), leading-zero check digits (XK "05", SA "03").
 */
const VALID = [
  "GB82WEST12345698765432",
  "DE89370400440532013000",
  "FR1420041010050500013M02606",
  "NO9386011117947",
  "LC55HEMM000100010012001200023015",
  "BE71096123456769",
  "CH9300762011623852957",
  "IT60X0542811101000000123456",
  "MT84MALT011000012345MTLCAST001S",
  "XK051212012345678906",
  "SA0380000000608010167519",
  // 4a + 20n, check digits derived by the BigInt reference: NI has no bank
  // code field in the registry table, which the bank-code test relies on.
  "NI35BAMC11112222333344445555",
] as const;

/* ── know-how #1 — MOD 97-10 over the *rearranged* string ──────────────── */

describe("checksum (ISO 13616-1 Clause 6.2)", () => {
  it("accepts the canonical example and lands on remainder 1", () => {
    // GB82WEST12345698765432
    //   → rearranged: WEST12345698765432GB82
    //   → transliterated: 3214282912345698765432161182
    //   → 3214282912345698765432161182 mod 97 = 1  (verified with BigInt)
    expect(transliterate("WEST12345698765432GB82")).toBe("3214282912345698765432161182");
    expect(BigInt("3214282912345698765432161182") % 97n).toBe(1n);
    expect(ibanRemainder("GB82WEST12345698765432")).toBe(1);
    expect(run({ iban: "GB82WEST12345698765432" }).valid).toBe(true);
  });

  it("agrees with the whole-string BigInt reference on every fixture", () => {
    for (const iban of VALID) {
      expect(referenceRemainder(iban)).toBe(1);
      expect(ibanRemainder(iban)).toBe(1);
      expect(run({ iban }).valid).toBe(true);
    }
  });

  it("does not fold the string as typed — order matters", () => {
    // The naive bug: mod 97 over the IBAN without moving the first four
    // characters to the end. For the canonical example that gives 85, not 1.
    expect(Number(BigInt(transliterate("GB82WEST12345698765432")) % 97n)).toBe(85);
    expect(ibanRemainder("GB82WEST12345698765432")).toBe(1);
  });

  it("rejects a single-digit typo and names the check digits that would fit", () => {
    // Last digit 2 → 3. BigInt reference: remainder 28, so not 1.
    const r = run({ iban: "GB82WEST12345698765433" });
    expect(referenceRemainder("GB82WEST12345698765433")).toBe(28);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("checksum_failed");
    expect(r.checks.checksum).toBe("fail");
    expect(r.checks.structure).toBe("pass");
    // 98 − (BBAN‖"GB00" mod 97) for this BBAN = 55, verified with BigInt.
    expect(r.expectedCheckDigits).toBe("55");
  });

  it("rejects transposed check digits", () => {
    const r = run({ iban: "GB28WEST12345698765432" });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("checksum_failed");
    expect(r.expectedCheckDigits).toBe("82");
  });
});

/* ── know-how #2 — check digits are generated, not only checked ────────── */

describe("check-digit generation (Clause 6.3)", () => {
  it("regenerates the published check digits of every valid fixture", () => {
    for (const iban of VALID) {
      expect(ibanCheckDigits(iban.slice(0, 2), iban.slice(4))).toBe(iban.slice(2, 4));
    }
  });

  it("keeps leading zeros — XK is 05, not 5", () => {
    expect(ibanCheckDigits("XK", "1212012345678906")).toBe("05");
    expect(ibanCheckDigits("SA", "80000000608010167519")).toBe("03");
  });

  it("emits 98 and 97 at the ends of the range instead of wrapping", () => {
    // Norway, 11n BBAN. Both derived with the BigInt reference, then checked
    // by round-trip: the assembled IBAN must have remainder 1.
    expect(ibanCheckDigits("NO", "00000000022")).toBe("98");
    expect(ibanCheckDigits("NO", "00000000040")).toBe("97");
    expect(ibanCheckDigits("NO", "00000000004")).toBe("02");
    expect(referenceRemainder("NO9800000000022")).toBe(1);
    expect(referenceRemainder("NO9700000000040")).toBe(1);
    expect(referenceRemainder("NO0200000000004")).toBe(1);
  });

  it("never produces 00 or 01, per the range the standard states", () => {
    for (let i = 0; i < 2000; i += 1) {
      const digits = ibanCheckDigits(
        "NO",
        String(i * 7919)
          .padStart(11, "0")
          .slice(-11),
      );
      expect(Number(digits)).toBeGreaterThanOrEqual(2);
      expect(Number(digits)).toBeLessThanOrEqual(98);
    }
  });

  it("round-trips: generated digits always yield a valid IBAN", () => {
    for (let i = 0; i < 500; i += 1) {
      const bban = String(i * 104729)
        .padStart(11, "0")
        .slice(-11);
      const iban = `NO${ibanCheckDigits("NO", bban)}${bban}`;
      expect(referenceRemainder(iban)).toBe(1);
      expect(run({ iban }).valid).toBe(true);
    }
  });
});

/* ── know-how #6 — normalise before judging ────────────────────────────── */

describe("normalisation", () => {
  it("accepts print format, lowercase, hyphens, NBSP and stray dots alike", () => {
    const variants = [
      "GB82 WEST 1234 5698 7654 32",
      "gb82west12345698765432",
      "GB82-WEST-1234-5698-7654-32",
      "GB82 WEST​1234 5698 7654 32",
      "GB82.WEST.1234.5698.7654.32",
      "  GB82WEST12345698765432  ",
    ];
    for (const variant of variants) {
      const r = run({ iban: variant });
      expect(r.valid).toBe(true);
      expect(r.normalized).toBe("GB82WEST12345698765432");
    }
  });

  it("returns both forms, so the caller never has to re-derive either", () => {
    const r = run({ iban: "gb82west12345698765432" });
    expect(r.normalized).toBe("GB82WEST12345698765432");
    expect(r.formatted).toBe("GB82 WEST 1234 5698 7654 32");
    expect(formatIban("NO9386011117947")).toBe("NO93 8601 1117 947");
  });

  it("does not turn an all-separator input into an empty pass", () => {
    expect(normalizeIban("  -- ")).toBe("");
    const r = run({ iban: "  -- " });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("bad_charset");
  });
});

/* ── staged failure reasons (brief §9.1 step 2 / §9.3) ─────────────────── */

describe("failure reasons", () => {
  it("bad_charset for characters an IBAN cannot contain", () => {
    for (const iban of ["GB82_WEST12345698765432", "GB82WEST!2345698765432", "中国1234567890"]) {
      const r = run({ iban });
      expect(r.valid).toBe(false);
      expect(r.reason).toBe("bad_charset");
      expect(r.checks.charset).toBe("fail");
    }
  });

  it("bad_charset when the head is not 2!a2!n", () => {
    // Clause 5 fixes the head: two letters then two digits.
    expect(run({ iban: "1B82WEST12345698765432" }).reason).toBe("bad_charset");
    expect(run({ iban: "GBX2WEST12345698765432" }).reason).toBe("bad_charset");
  });

  it("country_unsupported for a code outside the registered set", () => {
    // IBAN is not universal (know-how #7): the US has no registered format.
    const r = run({ iban: "US64SVBKUS6S3300958879" });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("country_unsupported");
    expect(r.country).toEqual({ code: "US" });
    expect(r.checks.country).toBe("fail");
    expect(r.checks.length).toBe("skipped");
    expect(run({ iban: "ZZ82WEST12345698765432" }).reason).toBe("country_unsupported");
  });

  it("wrong_length_for_country when the string overshoots the registry length", () => {
    const r = run({ iban: "GB82WEST123456987654321" });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("wrong_length_for_country");
    expect(r.country?.expectedLength).toBe(22);
    expect(r.length).toBe(23);
    expect(r.checks.length).toBe("fail");
    expect(r.checks.checksum).toBe("skipped");
  });

  it("structure_mismatch when the shape is wrong at the right length", () => {
    // GB is 4a,14n — digits where the bank code must be letters. Structure is
    // judged before the arithmetic, so this is not reported as a checksum bug.
    const r = run({ iban: "GB8212ST12345698765432" });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("structure_mismatch");
    expect(r.checks.structure).toBe("fail");
    expect(r.checks.checksum).toBe("skipped");
  });

  it("structure_mismatch also catches letters where the tail must be digits", () => {
    const r = run({ iban: "GB82WEST1234569876543A" });
    expect(r.reason).toBe("structure_mismatch");
  });

  it("locates the offending BBAN segment", () => {
    expect(bbanStructureMismatch("WEST12345698765432", "4a,14n")).toBe(-1);
    expect(bbanStructureMismatch("12ST12345698765432", "4a,14n")).toBe(0);
    expect(bbanStructureMismatch("WESTA2345698765432", "4a,14n")).toBe(4);
  });
});

/* ── brief §9.1 step 6 — partial input is not a failure ────────────────── */

describe("incomplete input", () => {
  it("keeps a half-typed IBAN neutral rather than flashing a red verdict", () => {
    for (const prefix of ["G", "GB", "GB8", "GB82", "GB82WEST", "GB82WEST1234569876543"]) {
      const r = run({ iban: prefix });
      expect(r.valid).toBe(false);
      expect(r.incomplete).toBe(true);
      expect(r.reason).toBe("incomplete");
      expect(r.checks.length).not.toBe("fail");
    }
  });

  it("still resolves the country while the rest is being typed", () => {
    const r = run({ iban: "GB82WE" });
    expect(r.country?.code).toBe("GB");
    expect(r.country?.expectedLength).toBe(22);
    expect(r.incomplete).toBe(true);
  });

  it("does not call a complete IBAN incomplete", () => {
    expect(run({ iban: "GB82WEST12345698765432" }).incomplete).toBe(false);
    expect(run({ iban: "GB82WEST123456987654321" }).incomplete).toBe(false);
  });

  it("treats a wrong country code as wrong immediately, not as incomplete", () => {
    const r = run({ iban: "ZZ8" });
    expect(r.reason).toBe("country_unsupported");
    expect(r.incomplete).toBe(false);
  });
});

/* ── know-how #4 — well-formed is never proof of existence ─────────────── */

describe("caveat", () => {
  it("carries the caveat on a pass, in a field rather than a footnote", () => {
    const r = run({ iban: "GB82WEST12345698765432" });
    expect(r.valid).toBe(true);
    expect(r.caveat).toMatch(/does not confirm that the account exists/);
  });

  it("carries it on failures too, so the field is never conditional", () => {
    for (const iban of ["GB82WEST12345698765433", "US64SVBKUS6S3300958879", "!!"]) {
      expect(run({ iban }).caveat.length).toBeGreaterThan(0);
    }
  });
});

/* ── know-how #5 — bank code only where the format encodes one ─────────── */

describe("bank code", () => {
  it("reports the bank code from the registered BBAN position", () => {
    expect(run({ iban: "GB82WEST12345698765432" }).bankCode).toBe("WEST");
    expect(run({ iban: "DE89370400440532013000" }).bankCode).toBe("37040044");
    // Italy's BBAN starts with a national check character, so the bank code
    // sits at offset 1 — a naive "first five" would return "X0542".
    expect(run({ iban: "IT60X0542811101000000123456" }).bankCode).toBe("05428");
  });

  it("omits the field entirely for a country whose BBAN encodes no bank code", () => {
    const r = run({ iban: "NI35BAMC11112222333344445555" });
    expect(r.valid).toBe(true);
    expect(IBAN_COUNTRIES.NI?.bank).toBeUndefined();
    expect(r.bankCode).toBeUndefined();
    expect("bankCode" in r).toBe(false);
  });

  it("never claims a bank name — that needs a registry we do not ship", () => {
    expect(JSON.stringify(run({ iban: "GB82WEST12345698765432" }))).not.toContain("bankName");
  });
});

/* ── know-how #3/#7 — the country table, and what it claims ────────────── */

describe("country table", () => {
  const entries = Object.entries(IBAN_COUNTRIES);

  it("covers the 89 registry countries and no invented codes", () => {
    expect(entries).toHaveLength(89);
    for (const [code] of entries) expect(code).toMatch(/^[A-Z]{2}$/);
    expect(IBAN_COUNTRIES.US).toBeUndefined();
    expect(IBAN_COUNTRIES.CN).toBeUndefined();
  });

  it("keeps every BBAN mask consistent with its declared length", () => {
    for (const [code, spec] of entries) {
      const segments = spec.bban.split(",").map((s) => {
        const m = /^(\d+)([nac])$/.exec(s.trim());
        expect(m, `${code} mask ${spec.bban}`).not.toBeNull();
        return Number(m?.[1]);
      });
      expect(
        segments.reduce((a, b) => a + (b ?? 0), 0),
        code,
      ).toBe(spec.length - 4);
    }
  });

  it("stays inside the ISO 13616 Clause 5 envelope of 2+2+30 characters", () => {
    for (const [code, spec] of entries) {
      expect(spec.length, code).toBeGreaterThanOrEqual(15);
      expect(spec.length, code).toBeLessThanOrEqual(34);
    }
    expect(Math.min(...entries.map(([, s]) => s.length))).toBe(15);
  });

  it("keeps every declared bank-code window inside its BBAN", () => {
    for (const [code, spec] of entries) {
      if (!spec.bank) continue;
      const [offset, len] = spec.bank;
      expect(offset, code).toBeGreaterThanOrEqual(0);
      expect(offset + len, code).toBeLessThanOrEqual(spec.length - 4);
    }
  });

  it("labels the structure layer as the secondary source it is", () => {
    const r = run({ iban: "GB82WEST12345698765432" });
    expect(r.source.checksum).toBe("iso-13616-1-2020");
    expect(r.source.structure).toBe("third-party-reference");
    expect(r.source.countriesCovered).toBe(89);
  });
});

/* ── schema contract (served to agents as JSON Schema) ─────────────────── */

describe("input schema", () => {
  it("rejects an empty, missing, over-long or non-string iban", () => {
    expect(ibanTool.inputSchema.safeParse({ iban: "" }).success).toBe(false);
    expect(ibanTool.inputSchema.safeParse({}).success).toBe(false);
    expect(ibanTool.inputSchema.safeParse({ iban: 42 }).success).toBe(false);
    expect(ibanTool.inputSchema.safeParse({ iban: null }).success).toBe(false);
    expect(ibanTool.inputSchema.safeParse({ iban: "G".repeat(65) }).success).toBe(false);
  });

  it("accepts print format up to the separator slack", () => {
    expect(ibanTool.inputSchema.safeParse({ iban: "GB82 WEST 1234 5698 7654 32" }).success).toBe(
      true,
    );
  });
});

/* ── tool declaration (ship gate §6.5) ─────────────────────────────────── */

describe("tool declaration", () => {
  it("declares itself pure, metered and rooted in Verifier", () => {
    expect(ibanTool.sideEffect).toBe("pure");
    expect(ibanTool.meterId).toBe("forge.finance.iban");
    expect(ibanTool.slug).toBe("iban");
    expect(ibanTool.roots).toContain("verifier");
    expect(ibanTool.runtime).toContain("client");
    expect(ibanTool.engine.upstream).toContain("ISO 13616-1:2020");
    expect(ibanTool.title.zh.length).toBeGreaterThan(0);
    expect(ibanTool.seoKeywords.en).toContain("iban validator");
    expect(w3IbanTools).toEqual([ibanTool]);
  });

  it("exposes the same engine to a direct caller as to the invoke path", () => {
    // The exported pure function is what a client-side composition would call;
    // it must not drift from what the metered tool executes.
    expect(validateIban("GB82 WEST 1234 5698 7654 32")).toEqual(
      run({ iban: "GB82 WEST 1234 5698 7654 32" }),
    );
    expect(validateIban("US64SVBKUS6S3300958879")).toEqual(run({ iban: "US64SVBKUS6S3300958879" }));
  });

  it("is deterministic — the same input answers identically", () => {
    const once = JSON.stringify(run({ iban: "GB82 west 1234 5698 7654 32" }));
    const twice = JSON.stringify(run({ iban: "GB82WEST12345698765432" }));
    expect(once).toBe(twice);
  });
});

import { describe, expect, it } from "vitest";
import {
  generateUscc,
  legacyOrgCodeCheckChar,
  normalizeUscc,
  ORG_CATEGORIES,
  PROVINCE_CODES,
  REGISTRATION_DEPARTMENTS,
  USCC_ALPHABET,
  USCC_WEIGHTS,
  unifiedSocialCreditCodeTool,
  usccCheckDigit,
  verifyUscc,
} from "./w3-unified-social-credit-code";

/**
 * Reference codes. These are published codes of well-known registrants, used
 * here only as arithmetic fixtures — the point is that an independently issued
 * code satisfies the algorithm implemented from the standard.
 *   91110108717743469K — 北京百度网讯科技有限公司
 *   91330100799655058B — 阿里巴巴(中国)有限公司
 *   91350100M000100Y43 — the Fujian example used across the standard's write-ups
 */
const REAL_CODES = ["91110108717743469K", "91330100799655058B", "91350100M000100Y43"] as const;

describe("code character set and weights (GB 32100-2015)", () => {
  it("carries 31 characters and excludes the ambiguous I, O, S, V, Z", () => {
    expect(USCC_ALPHABET).toHaveLength(31);
    for (const excluded of ["I", "O", "S", "V", "Z"]) {
      expect(USCC_ALPHABET).not.toContain(excluded);
    }
    // 0-9 then A-Y minus the five: values must be positional.
    expect(USCC_ALPHABET.indexOf("A")).toBe(10);
    expect(USCC_ALPHABET.indexOf("Y")).toBe(30);
  });

  it("uses W(i) = 3^(i-1) mod 31 — Table 4 of the standard", () => {
    const derived = Array.from({ length: 17 }, (_, i) => 3 ** i % 31);
    expect(USCC_WEIGHTS).toEqual(derived);
    expect(USCC_WEIGHTS).toEqual([1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28]);
  });
});

describe("usccCheckDigit — ISO 7064 MOD 31-3", () => {
  /**
   * Worked by hand for 91110108717743469K (first 17 = 91110108717743469):
   *   9*1=9  1*3=3  1*9=9  1*27=27  0*19=0  1*26=26  0*16=0  8*17=136
   *   7*20=140  1*29=29  7*25=175  7*13=91  4*8=32  3*24=72  4*10=40
   *   6*30=180  9*28=252
   *   Σ = 1221 ; 1221 mod 31 = 12 ; 31 - 12 = 19 ; alphabet[19] = "K"
   */
  it("reproduces the published check digit of real codes", () => {
    for (const code of REAL_CODES) {
      expect(usccCheckDigit(code.slice(0, 17))).toBe(code.slice(17));
    }
  });

  it("writes a remainder of 31 as 0 rather than overflowing the alphabet", () => {
    // Search the fixture space for a body whose remainder lands on 31; the
    // mapped character must be "0", never undefined.
    let found = false;
    for (let n = 0; n < 5000 && !found; n += 1) {
      const body = `9111010871774${String(n).padStart(4, "0")}`;
      const digit = usccCheckDigit(body);
      expect(digit).not.toBeUndefined();
      if (digit === "0") found = true;
    }
    expect(found).toBe(true);
  });

  it("refuses a body of the wrong length or with an out-of-set character", () => {
    expect(usccCheckDigit("9111010871774346")).toBeNull();
    // I is excluded from the code character set, so no digit can be computed.
    expect(usccCheckDigit("9111010871774346I")).toBeNull();
  });
});

describe("legacyOrgCodeCheckChar — GB 11714-1997", () => {
  it("matches the embedded 9-character organisation code of real USCCs", () => {
    // Positions 9-17 of each reference code; the 9th character is its own check.
    for (const code of REAL_CODES) {
      const nine = code.slice(8, 17);
      expect(legacyOrgCodeCheckChar(nine.slice(0, 8))).toBe(nine.slice(8));
    }
  });

  it("writes 11 as 0 and 10 as X", () => {
    // 00000000 → Σ = 0 → 11 - 0 = 11 → "0"
    expect(legacyOrgCodeCheckChar("00000000")).toBe("0");
    // 00000001 → Σ = 1*2 = 2 → 11 - 2 = 9
    expect(legacyOrgCodeCheckChar("00000001")).toBe("9");
    // 00000004 → Σ = 8 → 11 - 8 = 3
    expect(legacyOrgCodeCheckChar("00000004")).toBe("3");
    // Σ mod 11 = 1 gives 10, written X: 00000006 → Σ = 12 → 12 mod 11 = 1 → X
    expect(legacyOrgCodeCheckChar("00000006")).toBe("X");
  });
});

describe("normalizeUscc", () => {
  it("strips separators, a label and case", () => {
    expect(normalizeUscc(" 91110108-7177-43469k ")).toBe("91110108717743469K");
    expect(normalizeUscc("统一社会信用代码：91330100799655058B")).toBe("91330100799655058B");
    expect(normalizeUscc("USCC 9133 0100 7996 5505 8B")).toBe("91330100799655058B");
    // An en dash from a spreadsheet is formatting, not a character of the code.
    expect(normalizeUscc("91110108–71774—3469K")).toBe("91110108717743469K");
  });
});

describe("verifyUscc — accepts real codes", () => {
  it.each(REAL_CODES)("%s is valid with every field resolved", (code) => {
    const r = verifyUscc(code);
    expect(r.valid).toBe(true);
    expect(r.checksumValid).toBe(true);
    expect(r.complete).toBe(true);
    expect(r.errorCode).toBeUndefined();
    expect(r.fields?.registrationDept.valid).toBe(true);
    expect(r.fields?.orgCategory.valid).toBe(true);
    expect(r.fields?.adminDivision.valid).toBe(true);
    expect(r.fields?.checkDigit.valid).toBe(true);
    // Scope is stated in the payload, not only in prose on the page.
    expect(r.verifyRealEntityAt).toContain("cods.org.cn");
  });

  it("names the department, the category and the region", () => {
    const r = verifyUscc("91110108717743469K");
    expect(r.fields?.registrationDept.label?.zh).toBe("工商");
    expect(r.fields?.orgCategory.label?.zh).toBe("企业");
    expect(r.fields?.adminDivision.region?.zh).toBe("北京市");
    expect(r.fields?.adminDivision.provinceCode).toBe("11");
    expect(r.fields?.adminDivision.depth).toBe("county");
  });
});

describe("verifyUscc — rejection cases", () => {
  it("reports a check-digit mismatch with the digit that was expected", () => {
    // Last character bumped K → L; the first 17 characters are untouched.
    const r = verifyUscc("91110108717743469L");
    expect(r.valid).toBe(false);
    expect(r.checksumValid).toBe(false);
    expect(r.errorCode).toBe("check-digit-mismatch");
    expect(r.fields?.checkDigit).toMatchObject({ expected: "K", actual: "L", valid: false });
  });

  it("is neutral, not wrong, while the code is still being typed", () => {
    const r = verifyUscc("9111010871");
    expect(r.errorCode).toBe("incomplete");
    expect(r.valid).toBe(false);
    expect(r.complete).toBe(false);
    expect(r.fields).toBeUndefined();
    expect(r.illegalCharacters).toEqual([]);
  });

  it("treats an empty box as empty, not as invalid input", () => {
    expect(verifyUscc("   ").errorCode).toBe("empty");
  });

  it("flags an excluded letter at its position before 18 characters exist", () => {
    // I is one of the five letters the standard removes; O likewise.
    const r = verifyUscc("91I1O108");
    expect(r.errorCode).toBe("illegal-character");
    expect(r.illegalCharacters).toEqual([
      { position: 3, char: "I" },
      { position: 5, char: "O" },
    ]);
  });

  it("rejects a code longer than 18 characters", () => {
    expect(verifyUscc("91110108717743469KK").errorCode).toBe("too-long");
  });

  it("rejects an unknown registration department even when the checksum passes", () => {
    // "Q" is not in GB 32100-2015 表2 at all; the check digit is recomputed so
    // the failure is purely the department field.
    const body = `Q1${"110108"}717743469`;
    const code = body + (usccCheckDigit(body) as string);
    const r = verifyUscc(code);
    expect(r.checksumValid).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("department-unknown");
    expect(r.fields?.registrationDept.valid).toBe(false);
  });

  /**
   * The regression this suite previously encoded: 表2 lists twelve departments,
   * not the four (1/5/9/Y) that get quoted in blog posts. A law firm opens `31`,
   * a 基层工会 `81`, a 宗教活动场所 `71`, a 村级集体经济组织 `N2` — all real,
   * all checksum-correct, all rejected by a truncated table.
   */
  it.each([
    ["31", "司法行政", "律师执业机构"],
    ["21", "外交", "外国常驻新闻机构"],
    ["41", "文化", "外国在华文化中心"],
    ["62", "旅游", "港澳台地区旅游部门常驻内地（大陆）代表机构"],
    ["71", "宗教", "宗教活动场所"],
    ["81", "工会", "基层工会"],
    ["A1", "中央军委改革和编制办公室", "军队事业单位"],
    ["N2", "农业", "村级集体经济组织"],
  ])("accepts department/category %s (%s · %s) from GB 32100-2015 表2/表3", (head, dept, cat) => {
    const body = `${head}110108717743469`;
    const r = verifyUscc(body + (usccCheckDigit(body) as string));
    expect(r.errorCode).toBeUndefined();
    expect(r.valid).toBe(true);
    expect(r.fields?.registrationDept.label?.zh).toBe(dept);
    expect(r.fields?.orgCategory.label?.zh).toBe(cat);
  });

  it("carries every one of the twelve departments GB 32100-2015 表2 defines", () => {
    expect(Object.keys(REGISTRATION_DEPARTMENTS)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "N",
      "Y",
    ]);
    // 表3 scopes a category list to every one of them — no department is a stub.
    for (const dept of Object.keys(REGISTRATION_DEPARTMENTS)) {
      expect(Object.keys(ORG_CATEGORIES[dept] ?? {}).length).toBeGreaterThan(0);
    }
  });

  it("rejects a category that department does not define", () => {
    // Department 5 (民政) defines 1/2/3/9 — never 4. 司法行政 (3) does define 4,
    // which is the whole point of scoping the table by department.
    const body = `54${"110108"}717743469`;
    const code = body + (usccCheckDigit(body) as string);
    const r = verifyUscc(code);
    expect(r.checksumValid).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("category-unknown-for-department");
    expect(r.fields?.orgCategory.valid).toBe(false);
  });

  it("accepts the same category character under a department that does define it", () => {
    // 9 (其他) is defined for 民政 but the pairing above (4) is not — same
    // position, different verdict, which is the point of the per-department table.
    const body = `59${"110108"}717743469`;
    const code = body + (usccCheckDigit(body) as string);
    expect(verifyUscc(code).fields?.orgCategory.valid).toBe(true);
  });
});

describe("know-how #1 — the division digits are checked, not just the charset", () => {
  it("rejects a nonsense province whose overall checksum is correct", () => {
    // 99 is not a GB/T 2260 province. A checksum-only validator accepts this.
    const body = `91${"990108"}717743469`;
    const code = body + (usccCheckDigit(body) as string);
    const r = verifyUscc(code);
    expect(r.checksumValid).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("division-unknown-province");
    expect(r.fields?.adminDivision.depth).toBe("none");
  });

  it("rejects a county nested under no prefecture", () => {
    // 11 00 08 — GB/T 2260 nests strictly, so a county under prefecture 00
    // cannot exist even though every character is a legal digit.
    const body = `91${"110008"}717743469`;
    const code = body + (usccCheckDigit(body) as string);
    const r = verifyUscc(code);
    expect(r.checksumValid).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("division-malformed");
  });

  it("reports how deep the division check actually went", () => {
    const at = (division: string) => {
      const body = `91${division}717743469`;
      return verifyUscc(body + (usccCheckDigit(body) as string)).fields?.adminDivision;
    };
    expect(at("110000")?.depth).toBe("province");
    expect(at("110100")?.depth).toBe("prefecture");
    expect(at("110108")?.depth).toBe("county");
  });

  it("accepts the central-level 10 division that real codes carry", () => {
    const body = `11${"100000"}000004013`;
    const code = body + (usccCheckDigit(body) as string);
    const r = verifyUscc(code);
    expect(r.valid).toBe(true);
    expect(r.fields?.adminDivision.region?.en).toContain("Central");
  });

  it("covers the 34 province-level codes", () => {
    expect(Object.keys(PROVINCE_CODES)).toHaveLength(34);
    for (const p of ["11", "54", "65", "71", "81", "82"]) {
      expect(PROVINCE_CODES[p]).toBeDefined();
    }
  });
});

describe("know-how #6 — the legacy organisation code is advisory, never a gate", () => {
  it("reports a legacy mismatch without failing the code", () => {
    // Take a real code and perturb one digit inside positions 9-17, then fix
    // the outer check digit. GB 11714 now disagrees; GB 32100 does not.
    const body = "91110108717743468";
    const code = body + (usccCheckDigit(body) as string);
    const r = verifyUscc(code);
    expect(r.valid).toBe(true);
    expect(r.fields?.orgIdentifier.valid).toBe(true);
    expect(r.fields?.orgIdentifier.legacyChecksumChecked).toBe(true);
    expect(r.fields?.orgIdentifier.legacyChecksumValid).toBe(false);
    expect(r.fields?.orgIdentifier.noteCode).toBe("legacy-checksum-mismatch");
  });

  it("states honestly when the legacy check could not be computed", () => {
    // A letter outside A-Z cannot occur, but a body carrying the USCC-only
    // shape still has to answer the "did you check it" question.
    const r = verifyUscc("91350100M000100Y43");
    expect(r.fields?.orgIdentifier.legacyChecksumChecked).toBe(true);
    expect(r.fields?.orgIdentifier.legacyChecksumValid).toBe(true);
  });
});

describe("generateUscc — seeded, valid by construction, marked as test data", () => {
  it("is deterministic: the same seed yields the same batch", () => {
    const a = generateUscc({ count: 5, seed: 42 });
    const b = generateUscc({ count: 5, seed: 42 });
    expect(a.codes.map((c) => c.code)).toEqual(b.codes.map((c) => c.code));
  });

  it("yields a different batch for a different seed", () => {
    const a = generateUscc({ count: 5, seed: 1 });
    const b = generateUscc({ count: 5, seed: 2 });
    expect(a.codes.map((c) => c.code)).not.toEqual(b.codes.map((c) => c.code));
  });

  it("produces codes its own verifier accepts (know-how #3)", () => {
    const batch = generateUscc({ count: 50, seed: 7 });
    for (const entry of batch.codes) {
      expect(entry.code).toHaveLength(18);
      const r = verifyUscc(entry.code);
      expect(r.valid).toBe(true);
      // Not merely "checksum works": every field resolves too.
      expect(r.fields?.adminDivision.valid).toBe(true);
      expect(r.fields?.registrationDept.valid).toBe(true);
      expect(r.fields?.orgCategory.valid).toBe(true);
      // And the embedded legacy organisation code is consistent as well.
      expect(r.fields?.orgIdentifier.legacyChecksumValid).toBe(true);
    }
  });

  it("marks every code as test data structurally, not only in prose", () => {
    const batch = generateUscc({ count: 3, seed: 3 });
    expect(batch.isTestData).toBe(true);
    for (const entry of batch.codes) expect(entry.isTestData).toBe(true);
    expect(batch.disclaimer).toMatch(/no registered organisation/i);
    expect(batch.verifyRealEntityAt).toContain("cods.org.cn");
  });

  it("honours the requested department, category and province", () => {
    const batch = generateUscc({
      registrationDept: "5",
      orgCategory: "3",
      adminDivision: "44",
      count: 4,
      seed: 11,
    });
    for (const entry of batch.codes) {
      expect(entry.code.slice(0, 2)).toBe("53");
      expect(entry.code.slice(2, 8)).toBe("440000");
      expect(entry.fields.adminDivision.region?.zh).toBe("广东省");
    }
  });

  it("accepts a full six-digit division as well as a province", () => {
    const batch = generateUscc({ adminDivision: "110108", count: 1, seed: 5 });
    expect(batch.codes[0]?.code.slice(2, 8)).toBe("110108");
  });

  it("rejects a department/category pairing the standard does not define", () => {
    // Y (其他) defines only category 1.
    expect(() => generateUscc({ registrationDept: "Y", orgCategory: "3" })).toThrow(
      /not defined for registration department/i,
    );
  });

  it("rejects a division that is not a GB/T 2260 code", () => {
    expect(() => generateUscc({ adminDivision: "99" })).toThrow(/Invalid adminDivision/i);
    expect(() => generateUscc({ adminDivision: "110008" })).toThrow(/Invalid adminDivision/i);
  });

  it("rejects an unknown registration department", () => {
    expect(() => generateUscc({ registrationDept: "Q" })).toThrow(/Unknown registrationDept/i);
  });

  it("generates for a department outside the four everyone quotes", () => {
    // 司法行政 (3) · 司法鉴定机构 (4) — a pairing a four-department table cannot
    // express at all, and one its own verifier must then accept.
    const batch = generateUscc({ registrationDept: "3", orgCategory: "4", count: 3, seed: 17 });
    for (const entry of batch.codes) {
      expect(entry.code.slice(0, 2)).toBe("34");
      expect(verifyUscc(entry.code).valid).toBe(true);
    }
  });
});

describe("tool contract", () => {
  const schema = unifiedSocialCreditCodeTool.inputSchema;

  it("declares the spec it implements, a pure side effect and the verifier root", () => {
    expect(unifiedSocialCreditCodeTool.sideEffect).toBe("pure");
    expect(unifiedSocialCreditCodeTool.meterId).toBe("forge.cn.unified_social_credit_code");
    expect(unifiedSocialCreditCodeTool.roots).toContain("verifier");
    expect(unifiedSocialCreditCodeTool.engine.upstream).toContain("GB 32100-2015");
    expect(unifiedSocialCreditCodeTool.engine.upstream).toContain("ISO 7064 MOD 31-3");
  });

  it("defaults to verify with a batch of one and a fixed seed", () => {
    const parsed = schema.parse({ code: "91110108717743469K" });
    expect(parsed).toMatchObject({ mode: "verify", count: 1, seed: 1 });
  });

  it("rejects bad input at the schema boundary", () => {
    expect(() => schema.parse({ mode: "audit" })).toThrow();
    expect(() => schema.parse({ mode: "generate", count: 0 })).toThrow();
    expect(() => schema.parse({ mode: "generate", count: 1001 })).toThrow();
    expect(() => schema.parse({ mode: "generate", registrationDept: "Q" })).toThrow();
    // …but every department 表2 actually defines passes the boundary.
    for (const dept of Object.keys(REGISTRATION_DEPARTMENTS)) {
      expect(schema.safeParse({ mode: "generate", registrationDept: dept }).success).toBe(true);
    }
    expect(() => schema.parse({ mode: "generate", adminDivision: "1101" })).toThrow();
    expect(() => schema.parse({ mode: "generate", seed: -1 })).toThrow();
    expect(() => schema.parse({ code: "x".repeat(65) })).toThrow();
  });

  it("verifies through execute", () => {
    const out = unifiedSocialCreditCodeTool.execute(
      schema.parse({ code: "91330100799655058B" }),
    ) as { valid: boolean };
    expect(out.valid).toBe(true);
  });

  it("generates through execute", () => {
    const out = unifiedSocialCreditCodeTool.execute(
      schema.parse({ mode: "generate", count: 2, seed: 9 }),
    ) as { codes: { code: string }[]; count: number };
    expect(out.count).toBe(2);
    expect(verifyUscc(out.codes[0]?.code ?? "").valid).toBe(true);
  });

  it("refuses to verify nothing rather than inventing a verdict", () => {
    expect(() => unifiedSocialCreditCodeTool.execute(schema.parse({}))).toThrow(/required/i);
  });
});

import { describe, expect, it } from "vitest";
import {
  checkVin,
  normalizeVin,
  remainderToCheckDigit,
  VIN_LETTER_VALUES,
  VIN_WEIGHTS,
  type VinCheckResult,
  vinCharValue,
  vinCheckDigit,
  vinMath,
  vinTool,
} from "./w3-vin";

function run(input: Record<string, unknown>): VinCheckResult {
  const parsed = vinTool.inputSchema.parse(input);
  return vinTool.execute(parsed) as VinCheckResult;
}

/**
 * Reference VIN used throughout, worked by hand from 49 CFR §565.15.
 *
 *   VIN      1  M  8  G  D  M  9  A  X  K  P  0  4  2  7  8  8
 *   value    1  4  8  7  4  4  9  1  -  2  7  0  4  2  7  8  8   (Table III)
 *   weight   8  7  6  5  4  3  2 10  0  9  8  7  6  5  4  3  2   (Table IV)
 *   product  8 28 48 35 16 12 18 10  0 18 56  0 24 10 28 24 16
 *
 *   sum = 8+28+48+35+16+12+18+10+0+18+56+0+24+10+28+24+16 = 351
 *   351 mod 11 = 351 − 341 (= 31×11) = 10  →  Table V: 10 is written "X"
 *   position 9 holds "X"  →  valid
 */
const VALID_X = "1M8GDM9AXKP042788";

/**
 * Second hand-worked VIN (remainder in the ordinary 0-9 range).
 *
 *   VIN      5  G  Z  C  Z  4  3  D  1  3  S  8  1  2  7  1  5
 *   value    5  7  9  3  9  4  3  4  -  3  2  8  1  2  7  1  5
 *   weight   8  7  6  5  4  3  2 10  0  9  8  7  6  5  4  3  2
 *   product 40 49 54 15 36 12  6 40  0 27 16 56  6 10 28  3 10
 *
 *   sum = 408;  408 mod 11 = 408 − 407 (= 37×11) = 1  →  check digit "1"
 *   position 9 holds "1"  →  valid
 */
const VALID_1 = "5GZCZ43D13S812715";

/* ── Table III — transliteration (know-how §7.2) ───────────────────────── */

describe("Table III transliteration — not an alphabet-position map", () => {
  it("maps A-H to 1-8", () => {
    expect(["A", "B", "C", "D", "E", "F", "G", "H"].map(vinCharValue)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("restarts at J: J-N map to 1-5, not 9-13", () => {
    expect(["J", "K", "L", "M", "N"].map(vinCharValue)).toEqual([1, 2, 3, 4, 5]);
  });

  it("gives P 7 and R 9 — R does not continue from P", () => {
    // The single most likely naive bug: continuing the run would make R = 8.
    expect(vinCharValue("P")).toBe(7);
    expect(vinCharValue("R")).toBe(9);
  });

  it("maps S-Z to 2-9", () => {
    expect(["S", "T", "U", "V", "W", "X", "Y", "Z"].map(vinCharValue)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("has no value for I, O or Q — they are not VIN characters at all", () => {
    expect(VIN_LETTER_VALUES.I).toBeUndefined();
    expect(VIN_LETTER_VALUES.O).toBeUndefined();
    expect(VIN_LETTER_VALUES.Q).toBeUndefined();
    expect(vinCharValue("I")).toBeNull();
    expect(vinCharValue("O")).toBeNull();
    expect(vinCharValue("Q")).toBeNull();
  });

  it("gives every digit its own mathematical value", () => {
    expect(["0", "1", "5", "9"].map(vinCharValue)).toEqual([0, 1, 5, 9]);
  });
});

/* ── Table IV — weights (know-how §7.3) ────────────────────────────────── */

describe("Table IV weights", () => {
  it("is 8 7 6 5 4 3 2 10 0 9 8 7 6 5 4 3 2", () => {
    expect(VIN_WEIGHTS).toEqual([8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]);
  });

  it("weights the check digit itself 0 — it never feeds its own calculation", () => {
    expect(VIN_WEIGHTS[8]).toBe(0);
  });

  it("weights position 10 as 10, not as a continuation of the descending run", () => {
    expect(VIN_WEIGHTS[9]).toBe(9);
    expect(VIN_WEIGHTS[7]).toBe(10);
  });

  it("sums to 89 over the sixteen weighted positions (the all-1s VIN sanity check)", () => {
    // Every character of "1111…" transliterates to 1, so the sum is the sum of
    // the weights: 89. 89 mod 11 = 1, so the check digit of an all-1s VIN is 1.
    const total = VIN_WEIGHTS.reduce((n, w) => n + w, 0);
    expect(total).toBe(89);
    expect(remainderToCheckDigit(total % 11)).toBe("1");
    expect(checkVin("1".repeat(17)).valid).toBe(true);
  });
});

/* ── Table V — remainder to check digit (know-how §7.4) ────────────────── */

describe("Table V remainder mapping", () => {
  it("maps 0-9 to themselves", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(remainderToCheckDigit)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
  });

  it("writes a remainder of 10 as the letter X, never as '10'", () => {
    expect(remainderToCheckDigit(10)).toBe("X");
  });
});

/* ── the arithmetic end to end ─────────────────────────────────────────── */

describe("vinMath / vinCheckDigit", () => {
  it("reproduces the hand-worked sum and remainder for the X reference VIN", () => {
    const math = vinMath(VALID_X);
    expect(math.sum).toBe(351);
    expect(math.remainder).toBe(10);
    expect(vinCheckDigit(VALID_X)).toBe("X");
  });

  it("reproduces the hand-worked sum and remainder for the second reference VIN", () => {
    const math = vinMath(VALID_1);
    expect(math.sum).toBe(408);
    expect(math.remainder).toBe(1);
    expect(vinCheckDigit(VALID_1)).toBe("1");
  });

  it("shows the check-digit position contributing nothing", () => {
    const nine = vinMath(VALID_X).positions[8];
    expect(nine).toMatchObject({ position: 9, char: "X", weight: 0, product: 0 });
  });

  it("emits one row per position, in order, with product = value × weight", () => {
    const { positions } = vinMath(VALID_1);
    expect(positions).toHaveLength(17);
    expect(positions.map((p) => p.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    for (const p of positions) expect(p.product).toBe(p.value * p.weight);
  });

  it("computes 0 for an all-zero VIN: sum 0, remainder 0", () => {
    expect(vinMath("0".repeat(17)).sum).toBe(0);
    expect(vinCheckDigit("0".repeat(17))).toBe("0");
  });

  it("refuses to compute for a wrong-length string rather than guessing", () => {
    expect(() => vinMath("1M8GDM9AXKP04278")).toThrow(/17 characters/);
  });

  it("refuses to compute over a non-VIN character", () => {
    expect(() => vinMath("1M8GDM9AXKP04278O")).toThrow(/non-VIN character at position 17/);
  });
});

/* ── normalisation ─────────────────────────────────────────────────────── */

describe("normalizeVin", () => {
  it("uppercases — VINs are case-insensitive by convention", () => {
    expect(normalizeVin("1m8gdm9axkp042788")).toBe(VALID_X);
    expect(checkVin("1m8gdm9axkp042788").valid).toBe(true);
  });

  it("drops whitespace, including the NBSP a PDF copy leaves behind", () => {
    expect(normalizeVin("1M8GDM9AX KP042788")).toBe(VALID_X);
    expect(normalizeVin("1M8GDM9AX KP042788")).toBe(VALID_X);
  });

  it("drops a leading VIN: label", () => {
    expect(normalizeVin("VIN: 1M8GDM9AXKP042788")).toBe(VALID_X);
    expect(normalizeVin("vin1M8GDM9AXKP042788")).toBe(VALID_X);
  });

  it("does NOT strip hyphens — a hyphen is never part of a VIN, so it is reported", () => {
    expect(normalizeVin("1M8GDM9AX-KP042788")).toBe("1M8GDM9AX-KP042788");
  });

  it("keeps the caller's original string on the result", () => {
    expect(checkVin("  vin: 1m8gdm9axkp042788 ").input).toBe("  vin: 1m8gdm9axkp042788 ");
  });
});

/* ── verdicts ──────────────────────────────────────────────────────────── */

describe("checkVin — valid", () => {
  it("accepts the X reference VIN and reports both check digits", () => {
    const r = checkVin(VALID_X);
    expect(r.valid).toBe(true);
    expect(r.reason).toBe("ok");
    expect(r.expectedCheckDigit).toBe("X");
    expect(r.foundCheckDigit).toBe("X");
  });

  it("treats a check digit of X as valid, not as an error (know-how §7.4)", () => {
    // The whole point of the X case: a validator that rejects non-digits at
    // position 9 rejects one VIN in eleven.
    expect(checkVin(VALID_X).reason).not.toBe("invalid-character");
  });

  it("accepts the second reference VIN", () => {
    expect(checkVin(VALID_1)).toMatchObject({ valid: true, reason: "ok", foundCheckDigit: "1" });
  });

  it("cuts the VIN into WMI / VDS / check digit / year / plant / serial", () => {
    expect(checkVin(VALID_X).segments).toEqual({
      wmi: "1M8",
      vds: "GDM9A",
      checkDigit: "X",
      modelYearCode: "K",
      plantCode: "P",
      serial: "042788",
    });
  });

  it("carries the 'checksum is not provenance' notice on EVERY pass (know-how §7.5)", () => {
    // A cloned VIN copies a real VIN, so it passes this check trivially. The
    // caveat must be structural, not something a user has to scroll to find.
    const codes = checkVin(VALID_X).notices.map((n) => n.code);
    expect(codes).toContain("checksum-is-not-provenance");
    expect(checkVin(VALID_1).notices.map((n) => n.code)).toContain("checksum-is-not-provenance");
  });
});

describe("checkVin — check-digit mismatch", () => {
  const mistyped = `${VALID_X.slice(0, 8)}0${VALID_X.slice(9)}`; // X → 0 at position 9

  it("names the mismatch and both digits rather than a generic 'invalid'", () => {
    expect(checkVin(mistyped)).toMatchObject({
      valid: false,
      reason: "check-digit-mismatch",
      expectedCheckDigit: "X",
      foundCheckDigit: "0",
    });
  });

  it("catches a single-character typo elsewhere in the VIN", () => {
    // Position 17: 8 → 7. Weight 2, so the sum drops by 2: 351 → 349.
    // 349 mod 11 = 349 − 341 = 8, so the implied check digit becomes "8".
    const r = checkVin(`${VALID_X.slice(0, 16)}7`);
    expect(r.reason).toBe("check-digit-mismatch");
    expect(r.math?.sum).toBe(349);
    expect(r.expectedCheckDigit).toBe("8");
  });

  it("attaches the pre-1981 / non-North-American soft notice (know-how §7.1)", () => {
    // A mismatch is arithmetic; "therefore this VIN is fake" is not — imported
    // and pre-1981 vehicles never used this scheme.
    expect(checkVin(mistyped).notices.map((n) => n.code)).toEqual(["pre-1981-or-non-na-scheme"]);
  });

  it("does not claim provenance safety on a failing VIN", () => {
    expect(checkVin(mistyped).notices.map((n) => n.code)).not.toContain(
      "checksum-is-not-provenance",
    );
  });

  it("still shows the full working so the user can check it by hand", () => {
    expect(checkVin(mistyped).math?.positions).toHaveLength(17);
    expect(checkVin(mistyped).segments?.checkDigit).toBe("0");
  });
});

describe("checkVin — invalid character (know-how §7.2, §7.6)", () => {
  it("rejects O and suggests the 0 it is mistaken for", () => {
    const r = checkVin("1M8GDM9AXKPO42788");
    expect(r).toMatchObject({
      valid: false,
      reason: "invalid-character",
      invalidCharacterPosition: 12,
      confusableHint: "0",
    });
  });

  it("rejects I and suggests 1", () => {
    expect(checkVin("1M8GDM9AXKPI42788")).toMatchObject({
      reason: "invalid-character",
      invalidCharacterPosition: 12,
      confusableHint: "1",
    });
  });

  it("rejects Q and suggests 0", () => {
    expect(checkVin("1M8GDM9AXKPQ42788")).toMatchObject({
      reason: "invalid-character",
      invalidCharacterPosition: 12,
      confusableHint: "0",
    });
  });

  it("reports every offending position, not only the first", () => {
    const r = checkVin("IM8GDM9AXKPO42788");
    expect(r.invalidCharacters).toEqual([
      { position: 1, char: "I", confusableHint: "1" },
      { position: 12, char: "O", confusableHint: "0" },
    ]);
  });

  it("offers no hint for a character with no VIN look-alike", () => {
    const r = checkVin("1M8GDM9AXKP*42788");
    expect(r.invalidCharacters).toEqual([{ position: 12, char: "*" }]);
    expect(r.confusableHint).toBeUndefined();
  });

  it("does not attempt the checksum over an invalid character set (know-how §7.8)", () => {
    const r = checkVin("1M8GDM9AXKPO42788");
    expect(r.math).toBeUndefined();
    expect(r.expectedCheckDigit).toBeUndefined();
  });
});

describe("checkVin — wrong length (know-how §7.7, §7.8)", () => {
  it("reports a short VIN as wrong-length, not as a bad check digit", () => {
    expect(checkVin("1M8GDM9AXKP04278")).toMatchObject({
      valid: false,
      reason: "wrong-length",
      length: 16,
    });
  });

  it("tells a partial-VIN user the check digit needs all 17 characters", () => {
    expect(checkVin("1M8GDM9").notices.map((n) => n.code)).toEqual(["partial-vin-needs-17"]);
  });

  it("reports an over-long VIN as wrong-length without the partial-VIN notice", () => {
    const r = checkVin(`${VALID_X}9`);
    expect(r).toMatchObject({ reason: "wrong-length", length: 18 });
    expect(r.notices).toEqual([]);
  });

  it("checks length BEFORE the character set — 16 characters including an O is a length error", () => {
    // Collapsing the two would hide which of two very different problems the
    // user actually has.
    expect(checkVin("1M8GDM9AXKPO4278").reason).toBe("wrong-length");
  });

  it("reports a hyphenated VIN as wrong-length rather than silently repairing it", () => {
    expect(checkVin("1M8GDM9AX-KP042788").reason).toBe("wrong-length");
  });

  it("emits no segments or math when there is nothing 17 characters long to cut up", () => {
    const r = checkVin("1M8GDM9");
    expect(r.segments).toBeUndefined();
    expect(r.math).toBeUndefined();
  });

  it("gives every reason its own prose, never a shared generic string", () => {
    const texts = new Set(
      [checkVin(VALID_X), checkVin("1M8GDM9"), checkVin("1M8GDM9AXKPO42788")].map(
        (r) => r.reasonText,
      ),
    );
    expect(texts.size).toBe(3);
  });
});

/* ── determinism + tool surface ────────────────────────────────────────── */

describe("vinTool", () => {
  it("is declared pure and needs no network", () => {
    expect(vinTool.sideEffect).toBe("pure");
    expect(vinTool.meterId).toBe("forge.text.vin");
    expect(vinTool.roots).toContain("verifier");
  });

  it("names the specification it implements, not a library", () => {
    expect(vinTool.engine?.upstream).toContain("49 CFR");
    expect(vinTool.engine?.upstream).toContain("ISO 3779");
  });

  it("runs the same engine as the direct entry point", () => {
    expect(run({ vin: VALID_X })).toEqual(checkVin(VALID_X));
  });

  it("returns the identical result on repeat calls (no clock, no randomness)", () => {
    expect(run({ vin: VALID_1 })).toEqual(run({ vin: VALID_1 }));
  });

  it("rejects an empty VIN at the schema, not with a verdict", () => {
    expect(() => vinTool.inputSchema.parse({ vin: "" })).toThrow();
  });

  it("rejects a missing VIN", () => {
    expect(() => vinTool.inputSchema.parse({})).toThrow();
  });

  it("rejects a non-string VIN", () => {
    expect(() => vinTool.inputSchema.parse({ vin: 12345 })).toThrow();
    expect(() => vinTool.inputSchema.parse({ vin: ["1M8GDM9AXKP042788"] })).toThrow();
  });

  it("rejects an absurdly long payload rather than working over it", () => {
    expect(() => vinTool.inputSchema.parse({ vin: "1".repeat(65) })).toThrow();
  });

  it("takes no options — this category has no configuration surface", () => {
    const parsed = vinTool.inputSchema.parse({ vin: VALID_X }) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["vin"]);
  });
});

/**
 * Every payment figure asserted here was recomputed outside the engine: the
 * reference below evaluates the annuity payment through a different algebraic
 * arrangement — `M = P·r / (1 − (1+r)^−n)` instead of the engine's
 * `P·r·(1+r)^n / ((1+r)^n − 1)` — so a transcription bug in one cannot hide in
 * both. The three headline cases are also the figures a lender quotes for those
 * terms ($100,000 / 6% / 30y → $599.55).
 *
 * Tests are organised by the know-how rules in docs/plans/tools/loan-amortization.md §7.
 */
import { describe, expect, it } from "vitest";
import {
  addMonths,
  amortize,
  calendarMonthOf,
  type LoanAmortizationResult,
  loanAmortizationTool,
  periodicRateOf,
} from "./w3-loan-amortization";

/* ── independent reference for the payment (different arrangement) ─────── */

function referencePayment(principal: number, annualRatePercent: number, n: number): number {
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - (1 + r) ** -n);
}

function run(input: Record<string, unknown>): LoanAmortizationResult {
  const parsed = loanAmortizationTool.inputSchema.parse(input);
  return loanAmortizationTool.execute(parsed) as LoanAmortizationResult;
}

function rejects(input: Record<string, unknown>): boolean {
  return !loanAmortizationTool.inputSchema.safeParse(input).success;
}

const BASE = { principal: 100_000, annualRatePercent: 6, termMonths: 360 };

/* ── know-how #1: the annuity formula ──────────────────────────────────── */

describe("know-how #1 — fixed-payment annuity formula", () => {
  it.each([
    [100_000, 6, 360, 599.55],
    [200_000, 6.5, 360, 1264.14],
    [25_000, 4.5, 60, 466.08],
  ])("quotes the lender payment for %i at %s%% over %i months", (p, rate, n, expected) => {
    const result = run({ principal: p, annualRatePercent: rate, termMonths: n });
    expect(result.monthlyPayment).toBe(expected);
    // Independently: the same payment through the other arrangement, to the cent.
    expect(result.monthlyPayment).toBe(Math.round(referencePayment(p, rate, n) * 100) / 100);
  });

  it("uses the straight-line limit at a 0% rate rather than dividing by zero", () => {
    const result = run({ principal: 12_000, annualRatePercent: 0, termMonths: 24 });
    expect(result.monthlyPayment).toBe(500);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(12_000);
    expect(result.schedule).toHaveLength(24);
  });

  it("handles a single-period loan", () => {
    const result = run({ principal: 1_000, annualRatePercent: 12, termMonths: 1 });
    // One period at 1% monthly: 10.00 interest, the whole principal back.
    expect(result.schedule[0]).toMatchObject({ interest: 10, principal: 1_000, balance: 0 });
    expect(result.totalPaid).toBe(1_010);
  });
});

/* ── know-how #2: interest on the remaining balance ────────────────────── */

describe("know-how #2 — interest accrues on the outstanding balance", () => {
  const result = run(BASE);

  it("charges the first period on the full principal", () => {
    // 100,000 × 0.06/12 = 500.00
    expect(result.schedule[0]?.interest).toBe(500);
  });

  it("charges every later period on the balance carried into it", () => {
    for (let i = 1; i < result.schedule.length; i += 1) {
      const previous = result.schedule[i - 1];
      const row = result.schedule[i];
      if (!previous || !row) throw new Error("schedule gap");
      expect(row.interest).toBeCloseTo(
        Math.round(previous.balance * 100 * periodicRateOf(6)) / 100,
        10,
      );
    }
  });

  it("shrinks interest and grows principal monotonically with no extra payments", () => {
    for (let i = 1; i < result.schedule.length; i += 1) {
      const previous = result.schedule[i - 1];
      const row = result.schedule[i];
      if (!previous || !row) throw new Error("schedule gap");
      expect(row.interest).toBeLessThanOrEqual(previous.interest);
      expect(row.balance).toBeLessThan(previous.balance);
    }
  });
});

/* ── know-how #3: nominal APR, not an effective monthly rate ───────────── */

describe("know-how #3 — nominal APR convention", () => {
  it("divides the annual rate by 12", () => {
    expect(periodicRateOf(6)).toBe(0.06 / 12);
    expect(run(BASE).periodicRate).toBe(0.005);
  });

  it("does not use the effective monthly rate", () => {
    const effectiveMonthly = 1.06 ** (1 / 12) - 1; // ≈ 0.004867
    const effectiveFirstInterest = Math.round(100_000 * effectiveMonthly * 100) / 100;
    const first = run(BASE).schedule[0]?.interest;
    expect(first).toBe(500);
    expect(first).not.toBe(effectiveFirstInterest);
  });
});

/* ── know-how #4: forced final-payment rounding ────────────────────────── */

describe("know-how #4 — the schedule ends at exactly zero", () => {
  const cases: [number, number, number][] = [
    [100_000, 6, 360],
    [200_000, 6.5, 360],
    [333_333.33, 7.125, 180],
    [1_234.56, 19.99, 37],
    [25_000, 4.5, 60],
    [12_000, 0, 24],
  ];

  it.each(cases)("leaves no residue for %s at %s%% over %i months", (p, rate, n) => {
    const result = run({ principal: p, annualRatePercent: rate, termMonths: n });
    const last = result.schedule.at(-1);
    expect(last?.balance).toBe(0);
    // No negative residue either — the final principal is exactly what was left.
    expect(last?.principal).toBeGreaterThan(0);
    // Cent-exact conservation: everything paid is principal plus interest.
    expect(Math.round(result.totalPaid * 100)).toBe(
      Math.round(p * 100) + Math.round(result.totalInterest * 100),
    );
  });

  it("never books the payoff period's rounding residue as a prepayment", () => {
    // Regression: the payoff period pays `balance + interest`, which lands a
    // few cents *above* the level payment whenever the quote rounded down
    // (100,000 at 6% over 360 ends on a 600.00 payment against a 599.55 quote).
    // Counting that gap as an extra payment made the default page report
    // prepayments the user never entered — up to 204.75 at the worst point of
    // the schema-valid grid, not just cents.
    for (const [p, rate, n] of cases) {
      const result = run({ principal: p, annualRatePercent: rate, termMonths: n });
      expect(result.totalExtra, `${p}@${rate}%/${n}`).toBe(0);
      expect(result.monthsSaved, `${p}@${rate}%/${n}`).toBe(0);
    }
    // The two cases that used to leak the most.
    expect(run({ principal: 250_000, annualRatePercent: 6.5, termMonths: 360 }).totalExtra).toBe(0);
    expect(run({ principal: 476_316, annualRatePercent: 12, termMonths: 600 }).totalExtra).toBe(0);
  });

  it("quotes a payment that can actually amortize on a long, high-rate term", () => {
    // Regression: 1,000 at 30% over 360 months has an exact payment of 25.0034
    // and a first-period interest of exactly 25.00, so rounding the quote to
    // the nearest cent produced a payment that paid no principal at all and the
    // engine threw "payment does not cover the interest" on a schema-valid
    // loan. The quote is now floored at the smallest cent that amortizes.
    const result = run({ principal: 1_000, annualRatePercent: 30, termMonths: 360 });
    expect(result.monthlyPayment).toBe(25.01);
    expect(result.schedule[0]?.interest).toBe(25);
    expect(result.schedule[0]?.principal).toBeGreaterThan(0);
    expect(result.schedule.at(-1)?.balance).toBe(0);
    // Every schema-valid corner produces a schedule rather than an error.
    for (const n of [240, 360, 480, 600, 720, 1_200]) {
      for (const rate of [8, 12, 20, 30, 60, 100]) {
        for (const p of [50, 100, 1_000, 50_000]) {
          expect(
            () => run({ principal: p, annualRatePercent: rate, termMonths: n }),
            `${p}@${rate}%/${n}`,
          ).not.toThrow();
        }
      }
    }
  });

  it("still quotes the lender's cent when the plain rounding already amortizes", () => {
    // The floor above must not push a normal loan off its quoted payment.
    expect(run(BASE).monthlyPayment).toBe(599.55);
    expect(
      run({ principal: 200_000, annualRatePercent: 6.5, termMonths: 360 }).monthlyPayment,
    ).toBe(1264.14);
  });

  it("keeps the scheduled payment level and only bends the last one", () => {
    const result = run(BASE);
    const body = result.schedule.slice(0, -1);
    for (const row of body) expect(row.payment).toBe(result.monthlyPayment);
    const last = result.schedule.at(-1);
    if (!last) throw new Error("empty schedule");
    expect(Math.abs(last.payment - result.monthlyPayment)).toBeLessThan(1);
  });
});

/* ── know-how #5: extra payments ───────────────────────────────────────── */

describe("know-how #5 — extra payments cut principal, never the rate", () => {
  const plain = run(BASE);

  it("shortens the term and cuts total interest with a monthly extra", () => {
    const extra = run({ ...BASE, extraPayments: { monthly: 200 } });
    expect(extra.payoffPeriod).toBeLessThan(plain.payoffPeriod);
    expect(extra.monthsSaved).toBe(360 - extra.payoffPeriod);
    expect(extra.totalInterest).toBeLessThan(plain.totalInterest);
    expect(extra.schedule.at(-1)?.balance).toBe(0);
  });

  it("leaves the rate and the scheduled payment untouched", () => {
    const extra = run({ ...BASE, extraPayments: { monthly: 200 } });
    expect(extra.monthlyPayment).toBe(plain.monthlyPayment);
    expect(extra.periodicRate).toBe(plain.periodicRate);
    // The first period's interest is set before any extra can matter.
    expect(extra.schedule[0]?.interest).toBe(plain.schedule[0]?.interest);
  });

  it("charges less interest from the very next period after an extra lands", () => {
    const extra = run({ ...BASE, extraPayments: { oneTime: [{ amount: 10_000, period: 1 }] } });
    expect(extra.schedule[0]?.interest).toBe(plain.schedule[0]?.interest);
    const second = extra.schedule[1]?.interest ?? 0;
    expect(second).toBeLessThan(plain.schedule[1]?.interest ?? 0);
    expect(extra.schedule[0]?.payment).toBe(plain.monthlyPayment + 10_000);
  });

  it("applies a yearly extra in its calendar month only", () => {
    const result = run({
      ...BASE,
      startYearMonth: "2026-01",
      extraPayments: { yearly: { amount: 1_200, month: 3 } },
    });
    const march = result.schedule.find((row) => row.date === "2026-03");
    const april = result.schedule.find((row) => row.date === "2026-04");
    expect(march?.payment).toBe(result.monthlyPayment + 1_200);
    expect(april?.payment).toBe(result.monthlyPayment);
    // Every March, not just the first one.
    expect(result.schedule.find((row) => row.date === "2027-03")?.payment).toBe(
      result.monthlyPayment + 1_200,
    );
  });

  it("counts the yearly extra from the start month, not from period 1", () => {
    const result = run({
      ...BASE,
      startYearMonth: "2026-11",
      extraPayments: { yearly: { amount: 1_200, month: 1 } },
    });
    // Period 1 is November; January is period 3.
    expect(calendarMonthOf(3, "2026-11")).toBe(1);
    expect(result.schedule[0]?.payment).toBe(result.monthlyPayment);
    expect(result.schedule[2]?.payment).toBe(result.monthlyPayment + 1_200);
  });

  it("ignores a one-time extra scheduled after the loan is already paid off", () => {
    const early = run({
      ...BASE,
      extraPayments: { monthly: 5_000, oneTime: [{ amount: 50_000, period: 300 }] },
    });
    expect(early.payoffPeriod).toBeLessThan(300);
    expect(early.schedule.at(-1)?.balance).toBe(0);
    expect(Math.round(early.totalPaid * 100)).toBe(
      Math.round(100_000 * 100) + Math.round(early.totalInterest * 100),
    );
  });

  it("counts only the prepayment money as extra, and only its months as saved", () => {
    const plainRun = run(BASE);
    const extra = run({ ...BASE, extraPayments: { monthly: 200 } });
    // Extra applied = 200 on every full period, plus whatever of the last 200
    // the payoff period actually needed — never the level payment's rounding.
    expect(extra.totalExtra).toBeGreaterThan(200 * (extra.payoffPeriod - 1));
    expect(extra.totalExtra).toBeLessThanOrEqual(200 * extra.payoffPeriod);
    // Months saved is measured against the same loan with no prepayment, so a
    // term that rounds short on its own cannot be booked as a saving.
    expect(extra.monthsSaved).toBe(plainRun.payoffPeriod - extra.payoffPeriod);

    // The corner where the quote alone retires the loan early: 0 with no
    // extras, and the prepayment's own months once there are some.
    const corner = { principal: 6_013, annualRatePercent: 24, termMonths: 360 };
    const bare = run(corner);
    expect(bare.payoffPeriod).toBeLessThan(360);
    expect(bare.monthsSaved).toBe(0);
    const prepaid = run({ ...corner, extraPayments: { monthly: 50 } });
    expect(prepaid.monthsSaved).toBe(bare.payoffPeriod - prepaid.payoffPeriod);
  });

  it("never overpays on the payoff period", () => {
    const result = run({ ...BASE, extraPayments: { monthly: 3_000 } });
    const last = result.schedule.at(-1);
    if (!last) throw new Error("empty schedule");
    expect(last.principal).toBeLessThanOrEqual(result.monthlyPayment + 3_000);
    // Compared in cents: adding two dollar floats in the test would itself drift.
    expect(Math.round(last.payment * 100)).toBe(
      Math.round(last.principal * 100) + Math.round(last.interest * 100),
    );
  });
});

/* ── know-how #6: crossover is read off the schedule ───────────────────── */

describe("know-how #6 — crossover period", () => {
  it("names the first period whose principal exceeds its interest", () => {
    const result = run(BASE);
    const at = result.crossoverPeriod;
    expect(at).not.toBeNull();
    if (at === null) throw new Error("no crossover");
    const row = result.schedule[at - 1];
    const before = result.schedule[at - 2];
    if (!row || !before) throw new Error("crossover out of range");
    expect(row.principal).toBeGreaterThan(row.interest);
    expect(before.principal).toBeLessThanOrEqual(before.interest);
  });

  it("moves earlier as the rate drops", () => {
    const high = run({ ...BASE, annualRatePercent: 8 }).crossoverPeriod ?? 0;
    const low = run({ ...BASE, annualRatePercent: 3 }).crossoverPeriod ?? 0;
    expect(low).toBeLessThan(high);
  });

  it("moves earlier as the term shortens", () => {
    const long = run(BASE).crossoverPeriod ?? 0;
    const short = run({ ...BASE, termMonths: 120 }).crossoverPeriod ?? 0;
    expect(short).toBeLessThan(long);
  });

  it("is period 1 on a 0% loan, where no interest is ever charged", () => {
    expect(run({ principal: 12_000, annualRatePercent: 0, termMonths: 24 }).crossoverPeriod).toBe(
      1,
    );
  });
});

/* ── know-how #7: the start month is a label ───────────────────────────── */

describe("know-how #7 — start month changes labels, not money", () => {
  it("produces identical amounts with and without a start month", () => {
    const dated = run({ ...BASE, startYearMonth: "2026-07" });
    const undated = run(BASE);
    expect(dated.monthlyPayment).toBe(undated.monthlyPayment);
    expect(dated.totalInterest).toBe(undated.totalInterest);
    expect(dated.schedule.map((r) => [r.payment, r.interest, r.principal, r.balance])).toEqual(
      undated.schedule.map((r) => [r.payment, r.interest, r.principal, r.balance]),
    );
  });

  it("labels periods from the start month and rolls the year over", () => {
    const result = run({
      principal: 10_000,
      annualRatePercent: 5,
      termMonths: 14,
      startYearMonth: "2026-11",
    });
    expect(result.schedule[0]?.date).toBe("2026-11");
    expect(result.schedule[1]?.date).toBe("2026-12");
    expect(result.schedule[2]?.date).toBe("2027-01");
    expect(result.schedule[13]?.date).toBe("2027-12");
  });

  it("omits dates entirely when no start month is given — no clock is read", () => {
    for (const row of run(BASE).schedule) expect(row.date).toBeUndefined();
    expect(run(BASE).startYearMonth).toBeNull();
  });

  it("rolls month arithmetic across year boundaries", () => {
    expect(addMonths("2026-01", 0)).toBe("2026-01");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-03", 24)).toBe("2028-03");
  });
});

/* ── know-how #8: one term, one period count ───────────────────────────── */

describe("know-how #8 — years and months are summed into one period count", () => {
  it("treats 30 years and 360 months as the same loan", () => {
    const years = run({ ...BASE, termMonths: 30 * 12 });
    const months = run({ ...BASE, termMonths: 360 });
    expect(years).toEqual(months);
  });

  it("treats 29 years + 12 months as 360 months, not as two separate terms", () => {
    expect(run({ ...BASE, termMonths: 29 * 12 + 12 })).toEqual(run({ ...BASE, termMonths: 360 }));
  });
});

/* ── determinism (the `pure` declaration) ──────────────────────────────── */

describe("purity", () => {
  it("returns identical output for identical input", () => {
    expect(run({ ...BASE, startYearMonth: "2026-01" })).toEqual(
      run({ ...BASE, startYearMonth: "2026-01" }),
    );
  });

  it("exposes the same engine through the exported function and the tool", () => {
    expect(amortize({ principal: 100_000, annualRatePercent: 6, termMonths: 360 })).toEqual(
      run(BASE),
    );
  });
});

/* ── schema rejects bad input ──────────────────────────────────────────── */

describe("input schema", () => {
  it.each([
    ["zero principal", { ...BASE, principal: 0 }],
    ["negative principal", { ...BASE, principal: -1 }],
    ["absurd principal", { ...BASE, principal: 1e15 }],
    ["negative rate", { ...BASE, annualRatePercent: -0.1 }],
    ["rate above 100%", { ...BASE, annualRatePercent: 101 }],
    ["zero term", { ...BASE, termMonths: 0 }],
    ["fractional term", { ...BASE, termMonths: 1.5 }],
    ["term beyond 100 years", { ...BASE, termMonths: 1_201 }],
    ["missing principal", { annualRatePercent: 6, termMonths: 360 }],
    ["principal as a string", { ...BASE, principal: "100000" }],
    ["malformed start month", { ...BASE, startYearMonth: "2026-13" }],
    ["start month without a month", { ...BASE, startYearMonth: "2026" }],
    ["start month with a day", { ...BASE, startYearMonth: "2026-07-01" }],
    ["yearly extra in month 0", { ...BASE, extraPayments: { yearly: { amount: 100, month: 0 } } }],
    [
      "yearly extra in month 13",
      { ...BASE, extraPayments: { yearly: { amount: 100, month: 13 } } },
    ],
    ["yearly extra with no month", { ...BASE, extraPayments: { yearly: { amount: 100 } } }],
    ["negative monthly extra", { ...BASE, extraPayments: { monthly: -50 } }],
    ["one-time at period 0", { ...BASE, extraPayments: { oneTime: [{ amount: 100, period: 0 }] } }],
    [
      "one-time at a fractional period",
      { ...BASE, extraPayments: { oneTime: [{ amount: 100, period: 2.5 }] } },
    ],
  ])("rejects %s", (_label, input) => {
    expect(rejects(input as Record<string, unknown>)).toBe(true);
  });

  it("accepts the minimum viable loan and defaults the monthly extra to 0", () => {
    const parsed = loanAmortizationTool.inputSchema.parse({
      principal: 1,
      annualRatePercent: 0,
      termMonths: 1,
      extraPayments: {},
    }) as { extraPayments: { monthly: number } };
    expect(parsed.extraPayments.monthly).toBe(0);
  });

  it("describes every field it serves to agents over MCP/OpenAPI", () => {
    const shape = (
      loanAmortizationTool.inputSchema as unknown as {
        shape: Record<string, { description?: string }>;
      }
    ).shape;
    for (const key of Object.keys(shape)) {
      expect(shape[key]?.description, key).toBeTruthy();
    }
  });
});

/* ── registry metadata (ship gates §6.5 #5, #6, #10) ───────────────────── */

describe("tool metadata", () => {
  it("files the id under its own category namespace", () => {
    expect(loanAmortizationTool.id).toBe("finance/loan-amortization");
    expect(loanAmortizationTool.id.split("/")[0]).toBe(loanAmortizationTool.category);
    expect(loanAmortizationTool.slug).toBe("loan-amortization");
  });

  it("declares the meter, the side-effect class and the Simulator root", () => {
    expect(loanAmortizationTool.meterId).toBe("forge.finance.loan_amortization");
    expect(loanAmortizationTool.sideEffect).toBe("pure");
    expect(loanAmortizationTool.roots).toContain("simulator");
  });

  it("carries bilingual copy and keywords", () => {
    for (const field of [
      loanAmortizationTool.title,
      loanAmortizationTool.description,
      loanAmortizationTool.seoKeywords,
    ]) {
      expect(field.zh.length).toBeGreaterThan(0);
      expect(field.en.length).toBeGreaterThan(0);
    }
  });
});

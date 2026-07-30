/**
 * loan-amortization — fixed-payment loan schedule projection (Simulator root).
 *
 * Brief: docs/plans/tools/loan-amortization.md. Archetype: configure-then-generate
 * (§8) — the loan terms *are* the product, and the whole schedule regenerates
 * from scratch whenever one of them changes.
 *
 * What the brief demands beyond a naive clone (§7 know-how):
 *  1. The standard annuity payment `M = P·r·(1+r)^n / ((1+r)^n − 1)`, with the
 *     `r === 0` limit `M = P/n` handled separately — the closed form divides by
 *     zero at a 0% rate. The quote is rounded to the cent to agree with the
 *     lender's own figure, then floored at the smallest cent that still
 *     amortizes: on a long, high-rate term the plain rounding can land exactly
 *     on the first period's interest and pay no principal at all.
 *  2. Interest accrues on the *remaining* balance every period
 *     (`interest = balance × r`), never on the original principal, so the
 *     interest share shrinks and the principal share grows.
 *  3. The periodic rate is the nominal/APR convention `r = annualRate / 12`,
 *     NOT the effective monthly rate `(1+annualRate)^(1/12) − 1`. Every US
 *     lender statement and every competitor in the teardown uses the nominal
 *     one; the "mathematically purer" effective rate would disagree with all
 *     of them.
 *  4. Final-payment rounding is *forced*, not accumulated. All money is held
 *     as integer cents, and on the payoff period the principal paid is
 *     whatever balance remains — so the schedule ends at exactly 0, never at
 *     a residual few cents.
 *  5. Extra payments reduce principal immediately, which reduces every later
 *     period's interest (see #2) and can retire the loan before `termMonths`.
 *     They never change the rate and never change the scheduled payment.
 *  6. The crossover period (principal portion first exceeds interest portion)
 *     is *read off* the generated schedule, not computed separately.
 *  7. The start month shifts calendar labels only — it changes no monetary
 *     amount. It is an optional input rather than a clock read, because this
 *     tool is declared `pure` and must be deterministic for agents.
 *  8. Term is one period count. Years and months are summed into `termMonths`
 *     by the caller before this engine runs, so "30 years" and "360 months"
 *     cannot diverge.
 *
 * Spec: there is no RFC or ISO standard for loan amortization. What is
 * implemented is the standard fixed-payment (annuity) amortization of ordinary
 * financial mathematics under the US nominal-APR convention described above;
 * no upstream library is wrapped.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── limits ────────────────────────────────────────────────────────────── */

/** 100 years of monthly periods — beyond any real consumer loan, and bounded so a schedule can never be unbounded work. */
const MAX_TERM_MONTHS = 1200;
/** Enough headroom for national-scale debt in any currency unit while keeping cent arithmetic inside Number.MAX_SAFE_INTEGER. */
const MAX_PRINCIPAL = 1_000_000_000_000;
const MAX_ONE_TIME_ENTRIES = 120;

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export interface AmortizationRow {
  readonly period: number;
  /** "YYYY-MM". Present only when `startYearMonth` was supplied (know-how #7). */
  readonly date?: string;
  readonly payment: number;
  readonly interest: number;
  readonly principal: number;
  /** Exactly 0 on the payoff period (know-how #4). */
  readonly balance: number;
}

export interface LoanAmortizationResult {
  /** The scheduled fixed payment, extras excluded. */
  readonly monthlyPayment: number;
  readonly totalInterest: number;
  readonly totalPaid: number;
  /** Prepayments actually applied. 0 when none were supplied — cent-rounding on the payoff period is not an extra payment. */
  readonly totalExtra: number;
  /** Below `termMonths` when extra payments retire the loan early (know-how #5). */
  readonly payoffPeriod: number;
  readonly termMonths: number;
  /** Periods the prepayments bought, measured against the same loan with none — 0 when nothing was prepaid. */
  readonly monthsSaved: number;
  /** First period whose principal portion exceeds its interest portion (know-how #6). */
  readonly crossoverPeriod: number | null;
  readonly periodicRate: number;
  readonly startYearMonth: string | null;
  readonly schedule: readonly AmortizationRow[];
}

export interface ExtraPayments {
  readonly monthly?: number;
  readonly yearly?: { readonly amount: number; readonly month: number };
  readonly oneTime?: readonly { readonly amount: number; readonly period: number }[];
}

export interface LoanAmortizationInput {
  readonly principal: number;
  readonly annualRatePercent: number;
  readonly termMonths: number;
  readonly startYearMonth?: string;
  readonly extraPayments?: ExtraPayments;
}

/* ── money is integer cents, start to finish ───────────────────────────── */

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

/* ── calendar labels (know-how #7 — labels only, never amounts) ────────── */

/** Month 1-12 of the period, counting from the start month (January when none is given). */
export function calendarMonthOf(period: number, startYearMonth: string | null): number {
  const startMonth = startYearMonth ? Number(startYearMonth.slice(5, 7)) : 1;
  return ((startMonth - 1 + (period - 1)) % 12) + 1;
}

/** "YYYY-MM" advanced by `offset` whole months, rolling the year over. */
export function addMonths(startYearMonth: string, offset: number): string {
  const year = Number(startYearMonth.slice(0, 4));
  const month = Number(startYearMonth.slice(5, 7));
  const zeroBased = year * 12 + (month - 1) + offset;
  const nextYear = Math.floor(zeroBased / 12);
  const nextMonth = zeroBased - nextYear * 12 + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

/* ── the formula (know-how #1 + #3) ────────────────────────────────────── */

/** Nominal/APR convention: annual rate divided by 12, not compounded (know-how #3). */
export function periodicRateOf(annualRatePercent: number): number {
  return annualRatePercent / 100 / 12;
}

/**
 * Scheduled level payment, rounded to the cent — what a lender quotes.
 * At a 0% rate the annuity formula is 0/0, so the straight-line limit is used.
 *
 * Rounding to the nearest cent is what keeps the quote agreeing with every
 * competitor (100,000 at 6% over 360 → 599.55, not 599.56), but on a long,
 * high-rate term it can round the level payment *down* to exactly the first
 * period's interest: 1,000 at 30% over 360 months has an exact payment of
 * 25.0034 and a first-period interest of 25.00. That rounded payment can never
 * amortize, so the smallest cent that can is used instead — a lender never
 * quotes a payment that leaves the balance standing still, and refusing a
 * schedule for an otherwise valid loan is worse than the extra cent.
 */
export function scheduledPaymentCents(
  principalCents: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  const r = periodicRateOf(annualRatePercent);
  if (r === 0) return Math.round(principalCents / termMonths);
  const growth = (1 + r) ** termMonths;
  const rounded = Math.round((principalCents * r * growth) / (growth - 1));
  const firstInterest = Math.round(principalCents * r);
  if (principalCents > 0 && rounded <= firstInterest) return firstInterest + 1;
  return rounded;
}

/* ── engine ────────────────────────────────────────────────────────────── */

function extraCentsFor(
  period: number,
  startYearMonth: string | null,
  extra: ExtraPayments | undefined,
): number {
  if (!extra) return 0;
  let cents = toCents(extra.monthly ?? 0);
  if (extra.yearly && calendarMonthOf(period, startYearMonth) === extra.yearly.month) {
    cents += toCents(extra.yearly.amount);
  }
  for (const entry of extra.oneTime ?? []) {
    if (entry.period === period) cents += toCents(entry.amount);
  }
  return cents;
}

/**
 * Payoff period for the same terms with *no* prepayment — the baseline
 * `monthsSaved` is measured against.
 *
 * Rounding the level payment to the cent can retire a loan a period or two
 * short of its term on its own (1,000 at 24% over 480 months quotes 25.01 and
 * lands 10 periods early with nobody prepaying a thing). Measuring against
 * `termMonths` would book that as a saving and light up the "months saved"
 * badge on a schedule with no extras in it. Measuring against this baseline
 * cancels the rounding out of both sides, so the number is exactly the months
 * the prepayments bought.
 *
 * Balance-only mirror of the loop below: no rows, no allocation, ≤ termMonths
 * iterations.
 */
function baselinePayoffPeriod(
  principalCents: number,
  r: number,
  paymentCents: number,
  termMonths: number,
): number {
  let balance = principalCents;
  for (let period = 1; period <= termMonths; period += 1) {
    const interest = Math.round(balance * r);
    if (balance + interest <= paymentCents || period === termMonths) return period;
    balance -= paymentCents - interest;
  }
  return termMonths;
}

export function amortize(input: LoanAmortizationInput): LoanAmortizationResult {
  const { principal, annualRatePercent, termMonths } = input;
  const startYearMonth = input.startYearMonth ?? null;
  const r = periodicRateOf(annualRatePercent);
  const paymentCents = scheduledPaymentCents(toCents(principal), annualRatePercent, termMonths);

  if (paymentCents <= 0) {
    // A payment that rounds to zero can never retire the loan. Say so instead
    // of emitting a schedule whose balance never moves.
    throw new Error(
      "Scheduled payment rounds to 0 — the principal is too small for this term to produce a payable schedule.",
    );
  }

  const schedule: AmortizationRow[] = [];
  let balance = toCents(principal);
  let interestTotal = 0;
  let paidTotal = 0;
  let extraTotal = 0;
  let crossoverPeriod: number | null = null;

  for (let period = 1; period <= termMonths && balance > 0; period += 1) {
    // Know-how #2: interest is always on what is still owed.
    const interest = Math.round(balance * r);
    const extra = extraCentsFor(period, startYearMonth, input.extraPayments);
    const available = paymentCents + extra;
    const isFinalScheduled = period === termMonths;
    const payoffNow = balance + interest <= available;

    let principalPaid: number;
    let payment: number;
    if (payoffNow || isFinalScheduled) {
      // Know-how #4: the last period pays off exactly what is left, so the
      // schedule terminates at 0 rather than at accumulated rounding dust.
      principalPaid = balance;
      payment = balance + interest;
    } else {
      principalPaid = available - interest;
      if (principalPaid <= 0) {
        throw new Error(
          "Payment does not cover the interest for this period — the balance would grow instead of amortizing.",
        );
      }
      payment = available;
    }

    balance -= principalPaid;
    interestTotal += interest;
    paidTotal += payment;
    // Only money the caller actually asked to prepay counts as extra. The
    // payoff period pays `balance + interest`, which can sit a few cents above
    // the level payment purely from cent-rounding (know-how #4) — capping at
    // the extra configured for this period keeps that residue out of
    // `totalExtra` instead of reporting prepayments nobody made.
    extraTotal += Math.min(extra, Math.max(0, payment - paymentCents));
    if (crossoverPeriod === null && principalPaid > interest) crossoverPeriod = period;

    schedule.push({
      period,
      ...(startYearMonth ? { date: addMonths(startYearMonth, period - 1) } : {}),
      payment: fromCents(payment),
      interest: fromCents(interest),
      principal: fromCents(principalPaid),
      balance: fromCents(balance),
    });
  }

  const payoffPeriod = schedule.length;
  const baseline = baselinePayoffPeriod(toCents(principal), r, paymentCents, termMonths);
  return {
    monthlyPayment: fromCents(paymentCents),
    totalInterest: fromCents(interestTotal),
    totalPaid: fromCents(paidTotal),
    totalExtra: fromCents(extraTotal),
    payoffPeriod,
    termMonths,
    monthsSaved: baseline - payoffPeriod,
    crossoverPeriod,
    periodicRate: r,
    startYearMonth,
    schedule,
  };
}

/* ── tool ──────────────────────────────────────────────────────────────── */

const extraPaymentsSchema = z
  .object({
    monthly: z
      .number()
      .min(0)
      .max(MAX_PRINCIPAL)
      .default(0)
      .describe(
        "Extra amount paid on top of every scheduled payment. Reduces principal immediately.",
      ),
    yearly: z
      .object({
        amount: z.number().min(0).max(MAX_PRINCIPAL).describe("Extra amount paid once a year."),
        month: z
          .number()
          .int()
          .min(1)
          .max(12)
          .describe(
            "Calendar month (1-12) the yearly extra lands in. Counted from startYearMonth; January when no start month is given.",
          ),
      })
      .optional(),
    oneTime: z
      .array(
        z.object({
          amount: z.number().min(0).max(MAX_PRINCIPAL).describe("One-off extra amount."),
          period: z
            .number()
            .int()
            .min(1)
            .max(MAX_TERM_MONTHS)
            .describe(
              "1-based payment index the one-off lands on. Ignored if the loan is already paid off.",
            ),
        }),
      )
      .max(MAX_ONE_TIME_ENTRIES)
      .optional()
      .describe("One-off extra payments, each pinned to a payment number."),
  })
  .optional()
  .describe(
    "Optional prepayments. They cut principal on the period they land, which cuts every later period's interest and can retire the loan before termMonths. They never change the rate or the scheduled payment.",
  );

export const loanAmortizationTool = tool({
  id: "finance/loan-amortization",
  slug: "loan-amortization",
  category: "finance",
  title: { zh: "贷款还款计划表", en: "Loan Amortization Schedule" },
  description: {
    zh: "按等额本息公式生成逐期还款计划：每期利息/本金/余额、总利息、提前还款后的提前结清期数，以及本金首次超过利息的交叉点",
    en: "Fixed-payment loan schedule: per-period interest, principal and balance, total interest, early payoff with extra payments, and the crossover period where principal first exceeds interest",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.finance.loan_amortization",
  roots: ["simulator", "calculator"],
  engine: {
    // No RFC/ISO governs this: it is the standard annuity amortization of
    // financial mathematics under the nominal-APR (rate/12) convention, in
    // integer cents. Naming a library here would be an invention.
    name: "annuity-amortization",
    upstream:
      "Fixed-payment (annuity) amortization, nominal APR convention r = annualRate/12, integer-cent arithmetic with forced final-period payoff",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "房贷还款计划表,等额本息计算器,贷款摊销表,提前还款计算器,本金利息拆分",
    en: "loan amortization schedule calculator, amortization calculator, mortgage amortization schedule, extra payment calculator, principal and interest breakdown",
  },
  inputSchema: z.object({
    principal: z
      .number()
      .positive()
      .max(MAX_PRINCIPAL)
      .describe("Loan amount borrowed, in currency units (not cents). Must be greater than 0."),
    annualRatePercent: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Nominal annual rate as a percent, e.g. 6.5 for 6.5%. The periodic rate is this divided by 12 — the APR convention lenders quote, not an effective compounded rate. 0 is allowed (interest-free loan).",
      ),
    termMonths: z
      .number()
      .int()
      .min(1)
      .max(MAX_TERM_MONTHS)
      .describe(
        "Total number of monthly payments. Sum years and months into this one count before calling (30 years = 360).",
      ),
    startYearMonth: z
      .string()
      .regex(YEAR_MONTH, "startYearMonth must be YYYY-MM")
      .optional()
      .describe(
        "First payment month as YYYY-MM. Affects calendar labels and which period the yearly extra lands in — never any monetary amount. Omit for an unlabelled schedule; this tool never reads the clock.",
      ),
    extraPayments: extraPaymentsSchema,
  }),
  execute: (input: LoanAmortizationInput): LoanAmortizationResult => amortize(input),
});

export const w3LoanAmortizationTools: readonly AnyForgeToolDefinition[] = [loanAmortizationTool];

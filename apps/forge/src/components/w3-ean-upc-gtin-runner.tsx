"use client";

/**
 * EAN / UPC / GTIN check digit — instant transform (brief §8).
 *
 * Paste one code or five thousand, get the verdict as you type. No Calculate
 * button: all nine researched competitors gate one code behind one click, and
 * the click buys nothing when the arithmetic is a mod-10 sum (§6.7.10). The
 * shell escalates to an explicit run only past ~1 M characters.
 *
 * The two verbs are a toggle, not two tools — validate a complete code, or
 * calculate the missing final digit — because they are the same math on the
 * same input and nobody researched offers both (§9.5).
 *
 * Bulk is the default shape: results come back in input order, one row per
 * line, each row addressable, and the copy exit is CSV-shaped so a catalog
 * spreadsheet can be joined straight back onto it.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BatchWorkspace } from "@/components/batch-workspace";
import {
  InstantTransformShell,
  ShellBadge,
  ShellDrill,
  ShellNote,
  type ShellTone,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-select";
import { type CodeSegment, gtinSegments, SegmentedCodeSpecimen } from "@/components/specimens";

/* ── the tool's I/O contract, mirrored ─────────────────────────────────── */

type Verdict = "valid" | "invalid" | "calculated" | "unrecognized-length";
type Operation = "validate" | "calculate";

interface CodeResult {
  index: number;
  input: string;
  normalized?: string;
  detectedType: string;
  alternateTypes?: string[];
  verdict: Verdict;
  checkDigit?: number;
  correctedCode?: string;
  gtin14?: string;
  reason?: string;
  warnings?: string[];
}

interface Output {
  operation: Operation;
  results: CodeResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    calculated: number;
    unrecognized: number;
  };
  note: string;
}

const FORCED_TYPES = ["GTIN-8", "UPC-A", "EAN-13", "GTIN-14", "SSCC-18", "GLN-13"] as const;

/** Rows rendered before the list stops helping. The exits always carry all of them. */
const MAX_ROWS = 200;
/** Above this, per-row worked math is noise rather than teaching. */
const MAX_MATH_ROWS = 25;

const VERDICT_TONE: Record<Verdict, ShellTone> = {
  valid: "success",
  invalid: "danger",
  calculated: "info",
  "unrecognized-length": "warning",
};

/** One code per line, or comma-separated, or both — the paste shape people have. */
function splitCodes(text: string): string[] {
  return text
    .split(/[\n,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const CSV_HEADER = "index,input,detectedType,verdict,checkDigit,correctedCode,gtin14,reason";

function csvCell(value: string | number | undefined): string {
  if (value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(output: Output): string {
  const rows = output.results.map((r) =>
    [r.index, r.input, r.detectedType, r.verdict, r.checkDigit, r.correctedCode, r.gtin14, r.reason]
      .map(csvCell)
      .join(","),
  );
  return [CSV_HEADER, ...rows].join("\n");
}

const SAMPLE = [
  "4006381333931",
  "036000291452",
  "96385074",
  "14006381333938",
  "006141411234567890",
  "4006381333391",
].join("\n");

/* ── worked math, on demand ────────────────────────────────────────────── */

/** Weights alternate 3/1 from the rightmost payload digit — never from the left. */
function weightsFor(payload: string): { digit: string; weight: number; product: number }[] {
  const cells: { digit: string; weight: number; product: number }[] = [];
  let weight = 3;
  for (let i = payload.length - 1; i >= 0; i -= 1) {
    const digit = payload[i] ?? "0";
    cells.unshift({ digit, weight, product: Number(digit) * weight });
    weight = weight === 3 ? 1 : 3;
  }
  return cells;
}

function WorkedMath({ result, operation }: { result: CodeResult; operation: Operation }) {
  const t = useTranslations("runners");
  const digits = result.normalized;
  if (!digits || result.checkDigit === undefined) return null;
  const payload = operation === "calculate" ? digits : digits.slice(0, -1);
  const cells = weightsFor(payload);
  const sum = cells.reduce((acc, cell) => acc + cell.product, 0);
  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="flex gap-1 font-mono text-xs">
        {cells.map((cell, i) => (
          // Position in the payload is this cell's identity — the list is a
          // fixed-length projection of one code, never reordered.
          <span
            key={`${i}-${cell.digit}`}
            className="flex w-8 shrink-0 flex-col items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--neutral-3)] py-1"
          >
            <span className="text-[var(--neutral-12)]">{cell.digit}</span>
            <span className="text-[var(--neutral-10)]">×{cell.weight}</span>
            <span className="text-[var(--neutral-11)]">{cell.product}</span>
          </span>
        ))}
      </div>
      <p className="font-mono text-xs text-[var(--neutral-11)]">
        {t("eanUpcGtin.mathSum", { sum, check: result.checkDigit })}
      </p>
    </div>
  );
}

/* ── runner ────────────────────────────────────────────────────────────── */

export function W3EanUpcGtinRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [operation, setOperation] = useState<Operation>("validate");
  const [forcedType, setForcedType] = useState<string>("auto");

  const buildInput = (text: string): Record<string, unknown> | null => {
    const codes = splitCodes(text);
    if (codes.length === 0) return null;
    return { codes, operation, type: forcedType };
  };

  const renderResult = (output: Output) => {
    const { summary } = output;
    const shown = output.results.slice(0, MAX_ROWS);
    const withMath = output.results.length <= MAX_MATH_ROWS;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ShellBadge>{t("eanUpcGtin.total", { n: summary.total })}</ShellBadge>
          {summary.valid > 0 ? (
            <ShellBadge tone="success">
              {t("eanUpcGtin.validCount", { n: summary.valid })}
            </ShellBadge>
          ) : null}
          {summary.invalid > 0 ? (
            <ShellBadge tone="danger">
              {t("eanUpcGtin.invalidCount", { n: summary.invalid })}
            </ShellBadge>
          ) : null}
          {summary.calculated > 0 ? (
            <ShellBadge tone="info">
              {t("eanUpcGtin.calculatedCount", { n: summary.calculated })}
            </ShellBadge>
          ) : null}
          {summary.unrecognized > 0 ? (
            <ShellBadge tone="warning">
              {t("eanUpcGtin.unrecognizedCount", { n: summary.unrecognized })}
            </ShellBadge>
          ) : null}
        </div>

        <ol className="space-y-2">
          {shown.map((r) => (
            <li
              key={r.index}
              className="space-y-2 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-[var(--neutral-10)]">{r.index + 1}</span>
                {/* Calculate answers with the completed code; every other verdict
                    must show what the user actually gave, never a silent fix. */}
                <span className="font-mono text-sm text-[var(--neutral-12)]">
                  {r.verdict === "calculated"
                    ? (r.correctedCode ?? r.input)
                    : (r.normalized ?? r.input)}
                </span>
                <ShellBadge tone={VERDICT_TONE[r.verdict]}>
                  {t(`eanUpcGtin.verdict.${r.verdict}` as never)}
                </ShellBadge>
                {r.detectedType !== "unrecognized-length" ? (
                  <ShellBadge>{r.detectedType}</ShellBadge>
                ) : null}
                {r.alternateTypes?.map((alt) => (
                  <ShellBadge key={alt} tone="info">
                    {t("eanUpcGtin.alsoReadsAs", { type: alt })}
                  </ShellBadge>
                ))}
              </div>

              {(() => {
                const code =
                  r.verdict === "calculated"
                    ? (r.correctedCode ?? r.normalized ?? r.input)
                    : (r.normalized ?? r.input);
                const { segments, complete } = gtinSegments(code);
                const checkFail = complete && r.verdict === "invalid";
                const labeled: CodeSegment[] = [
                  {
                    id: "payload",
                    label: t("eanUpcGtin.segPayload"),
                    value: segments[0]?.value ?? "",
                    tone: r.verdict === "valid" || r.verdict === "calculated" ? "info" : "neutral",
                  },
                  {
                    id: "check",
                    label: t("eanUpcGtin.segCheck"),
                    value:
                      segments[1]?.value ??
                      (r.checkDigit !== undefined ? String(r.checkDigit) : ""),
                    error: checkFail,
                    tone:
                      r.verdict === "valid" || r.verdict === "calculated"
                        ? "success"
                        : checkFail
                          ? "danger"
                          : "warning",
                  },
                ];
                return (
                  <SegmentedCodeSpecimen
                    title={t("eanUpcGtin.specimenTitle")}
                    subtitle={t("honesty.algorithmOnly")}
                    segments={labeled}
                    statusTone={VERDICT_TONE[r.verdict]}
                    statusLabel={t(`eanUpcGtin.verdict.${r.verdict}` as never)}
                  />
                );
              })()}

              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                {r.checkDigit !== undefined ? (
                  <Field label={t("eanUpcGtin.checkDigit")} value={String(r.checkDigit)} />
                ) : null}
                {r.verdict === "invalid" && r.correctedCode ? (
                  <Field label={t("eanUpcGtin.corrected")} value={r.correctedCode} />
                ) : null}
                {r.gtin14 ? <Field label={t("eanUpcGtin.gtin14")} value={r.gtin14} /> : null}
              </dl>

              {r.reason ? (
                <p className="text-xs text-[var(--neutral-11)]">
                  {t(`eanUpcGtin.reason.${r.reason}` as never)}
                </p>
              ) : null}
              {r.warnings?.map((w) => (
                <p key={w} className="text-xs text-[var(--neutral-10)]">
                  {t(`eanUpcGtin.warning.${w}` as never)}
                </p>
              ))}

              {withMath && r.checkDigit !== undefined ? (
                <ShellDrill summary={t("eanUpcGtin.math")}>
                  <WorkedMath result={r} operation={output.operation} />
                </ShellDrill>
              ) : null}
            </li>
          ))}
        </ol>

        {output.results.length > shown.length ? (
          <ShellNote>
            {t("eanUpcGtin.truncatedRows", {
              shown: shown.length,
              total: output.results.length,
            })}
          </ShellNote>
        ) : null}
        <ShellNote>{t("eanUpcGtin.privacy")}</ShellNote>
      </div>
    );
  };

  return (
    <BatchWorkspace
      toolId={toolId}
      accept="lines"
      resultKind="json"
      maxItems={200}
      buildItemInput={(raw) => ({
        codes: [String(raw).trim()].filter(Boolean),
        operation,
        type: forcedType,
      })}
      sharedHint={`${operation} · ${forcedType}`}
    >
      <InstantTransformShell<Output>
        engine={{ toolId, parse: (raw) => raw as unknown as Output }}
        inputLabel={t("eanUpcGtin.inputLabel")}
        inputPlaceholder={t("eanUpcGtin.placeholder")}
        rows={8}
        sample={SAMPLE}
        buildInput={buildInput}
        renderResult={renderResult}
        idle={<ShellNote>{t("eanUpcGtin.idle")}</ShellNote>}
        exit={(output) => ({
          text: toCsv(output),
          json: output,
          filename: "gtin-check.csv",
          mimeType: "text/csv;charset=utf-8",
        })}
        options={
          <>
            <RunnerSelect
              id="ean-upc-gtin-operation"
              label={t("eanUpcGtin.operationLabel")}
              value={operation}
              onChange={(next) => setOperation(next as Operation)}
              options={[
                { value: "validate", label: t("eanUpcGtin.operationValidate") },
                { value: "calculate", label: t("eanUpcGtin.operationCalculate") },
              ]}
            />
            <RunnerSelect
              id="ean-upc-gtin-type"
              label={t("eanUpcGtin.typeLabel")}
              value={forcedType}
              onChange={setForcedType}
              options={[
                { value: "auto", label: t("eanUpcGtin.typeAuto") },
                ...FORCED_TYPES.map((type) => ({ value: type, label: type })),
              ]}
            />
          </>
        }
        optionsKey={`${operation}|${forcedType}`}
        note={t("eanUpcGtin.scopeNote")}
      />
    </BatchWorkspace>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[var(--neutral-10)]">{label}</dt>
      <dd className="font-mono text-[var(--neutral-12)]">{value}</dd>
    </div>
  );
}

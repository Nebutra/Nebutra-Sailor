"use client";

/**
 * CSV diff — two-pane compare (brief §8).
 *
 * Two payloads in, one synchronized structured verdict out. The settings do not
 * generate anything; they change how the two sides are reconciled, so they sit
 * between the panes and the result and the diff re-runs live as they move —
 * no "Run compare" tax on a deterministic in-memory operation.
 *
 * Summary first (always complete), then the change list at cell granularity:
 * a changed row shows the columns that actually differ with old beside new,
 * never the whole row re-rendered as a blob (brief §7 know-how #4).
 */
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  ShellBadge,
  type ShellChange,
  ShellDrill,
  ShellExitActions,
  ShellNote,
  type ShellTone,
  TwoPaneCompareShell,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-select";

/* ── the API contract, mirrored ─────────────────────────────────────────── */

type RowStatus = "added" | "removed" | "changed" | "unchanged";

interface ChangedField {
  field: string;
  oldValue: string;
  newValue: string;
}

interface DiffRow {
  status: RowStatus;
  key: Record<string, string> | null;
  original?: Record<string, string>;
  updated?: Record<string, string>;
  changedFields?: ChangedField[];
}

interface Finding {
  code: string;
  level: "info" | "warning" | "danger";
  message: string;
}

interface Output {
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
    totalOriginalRows: number;
    totalUpdatedRows: number;
  };
  keyColumnsUsed: string[] | null;
  keySource: "provided" | "auto" | "full-row";
  keyCandidatesRejected: { column: string; reason: string }[];
  joinType: "full" | "inner" | "left";
  columnMapping: Record<string, string>;
  columnSetMismatch: { onlyInOriginal: string[]; onlyInUpdated: string[] } | null;
  comparedColumns: string[];
  rows: DiffRow[];
  truncated: boolean;
  previewLimit: number;
  original: { delimiter: string; headers: string[]; rowCount: number };
  updated: { delimiter: string; headers: string[]; rowCount: number };
  findings: Finding[];
}

const KEY_AUTO = "__auto__";
const KEY_NONE = "__none__";
const PREVIEW_ROWS = 500;
const DELIMITERS = [",", ";", "\t", "|"] as const;

/* ── cheap projections (no parsing, no diffing) ─────────────────────────── */

/** First line only — enough to offer a key-column picker, never a full parse. */
function sniffHeaders(text: string): string[] {
  const end = text.search(/\r|\n/);
  const line = end === -1 ? text : text.slice(0, end);
  if (!line) return [];
  let best = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = line.split(delimiter).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return line
    .split(best)
    .map((h) => h.trim().replace(/^"|"$/g, ""))
    .filter((h) => h.length > 0);
}

function fieldCount(text: string): number {
  return sniffHeaders(text).length;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function rowValues(row: Record<string, string> | undefined, columns: readonly string[]): string[] {
  return columns.map((c) => row?.[c] ?? "");
}

function changedRowsCsv(output: Output): string {
  const columns = output.comparedColumns;
  const header = ["status", ...columns];
  const body = output.rows
    .filter((r) => r.status === "changed")
    .map((r) => [r.status, ...columns.map((c) => r.updated?.[output.columnMapping[c] ?? c] ?? "")]);
  return toCsv([header, ...body]);
}

function fullDiffCsv(output: Output): string {
  const columns = output.comparedColumns;
  const header = ["status", ...columns.flatMap((c) => [`${c} (original)`, `${c} (updated)`])];
  const body = output.rows.map((r) => [
    r.status,
    ...columns.flatMap((c) => [
      r.original?.[c] ?? "",
      r.updated?.[output.columnMapping[c] ?? c] ?? "",
    ]),
  ]);
  return toCsv([header, ...body]);
}

/* ── extra exports (memoized so a render never rebuilds them) ───────────── */

function CsvDiffExports({ output }: { output: Output }) {
  const t = useTranslations("runners");
  const changed = useMemo(() => changedRowsCsv(output), [output]);
  const full = useMemo(() => fullDiffCsv(output), [output]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--neutral-10)]">{t("csvDiff.exportChanged")}</span>
        <ShellExitActions
          exit={{ text: changed, filename: "changed-rows.csv", mimeType: "text/csv;charset=utf-8" }}
          idPrefix="csv-diff-changed"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--neutral-10)]">{t("csvDiff.exportFull")}</span>
        <ShellExitActions
          exit={{ text: full, filename: "csv-diff.csv", mimeType: "text/csv;charset=utf-8" }}
          idPrefix="csv-diff-full"
        />
      </div>
    </div>
  );
}

/* ── runner ─────────────────────────────────────────────────────────────── */

export function W3CsvDiffRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [headers, setHeaders] = useState<string[]>([]);
  const [keyChoice, setKeyChoice] = useState(KEY_AUTO);
  const [joinType, setJoinType] = useState("full");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [treatEmptyAsNull, setTreatEmptyAsNull] = useState(false);

  const optionsKey = [keyChoice, joinType, ignoreWhitespace, ignoreCase, treatEmptyAsNull].join(
    "|",
  );

  const keyLabel = (row: DiffRow, index: number): string => {
    if (!row.key) return t("csvDiff.wholeRow", { n: index + 1 });
    return Object.entries(row.key)
      .map(([column, value]) => `${column}=${value}`)
      .join(" · ");
  };

  const toggle = (id: string, label: string, value: boolean, set: (next: boolean) => void) => (
    <Button
      key={id}
      type="button"
      variant={value ? "ink" : "ghost"}
      size="sm"
      aria-pressed={value}
      onClick={() => set(!value)}
    >
      {label}
    </Button>
  );

  return (
    <TwoPaneCompareShell<Output>
      engine={{ toolId, parse: (o) => o as unknown as Output }}
      leftLabel={t("csvDiff.originalLabel")}
      rightLabel={t("csvDiff.updatedLabel")}
      leftPlaceholder={t("csvDiff.originalPlaceholder")}
      rightPlaceholder={t("csvDiff.updatedPlaceholder")}
      rows={10}
      emptyHint={t("csvDiff.emptyHint")}
      note={t("csvDiff.note")}
      optionsKey={optionsKey}
      sample={{
        left: "id,name,qty\n1,Ada,10\n2,Grace,20\n3,Alan,30\n",
        right: "id,name,qty\n2,Grace,20\n1,Ada,11\n4,Edsger,40\n",
      }}
      paneStatus={(text) => {
        const n = fieldCount(text);
        return n > 0 ? { tone: "neutral" as ShellTone, label: t("csvDiff.columns", { n }) } : null;
      }}
      buildInput={(left, right) => {
        if (!left.trim() || !right.trim()) return null;
        const detected = sniffHeaders(left);
        if (detected.join("\u0000") !== headers.join("\u0000")) setHeaders(detected);
        const named = keyChoice !== KEY_AUTO && keyChoice !== KEY_NONE;
        const usable = named && detected.includes(keyChoice);
        return {
          original: left,
          updated: right,
          joinType,
          maxPreviewRows: PREVIEW_ROWS,
          options: { ignoreWhitespace, ignoreCase, treatEmptyAsNull },
          ...(keyChoice === KEY_NONE ? { keyColumns: [] } : {}),
          ...(usable ? { keyColumns: [keyChoice] } : {}),
        };
      }}
      options={
        <>
          <RunnerSelect
            id="csv-diff-key"
            label={t("csvDiff.keyLabel")}
            value={keyChoice}
            onChange={setKeyChoice}
            options={[
              { value: KEY_AUTO, label: t("csvDiff.keyAuto") },
              ...headers.map((h) => ({ value: h, label: h })),
              { value: KEY_NONE, label: t("csvDiff.keyNone") },
            ]}
          />
          <RunnerSelect
            id="csv-diff-join"
            label={t("csvDiff.joinLabel")}
            value={joinType}
            onChange={setJoinType}
            options={[
              { value: "full", label: t("csvDiff.joinFull") },
              { value: "inner", label: t("csvDiff.joinInner") },
              { value: "left", label: t("csvDiff.joinLeft") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {toggle("ws", t("csvDiff.ignoreWhitespace"), ignoreWhitespace, setIgnoreWhitespace)}
            {toggle("case", t("csvDiff.ignoreCase"), ignoreCase, setIgnoreCase)}
            {toggle("null", t("csvDiff.treatEmptyAsNull"), treatEmptyAsNull, setTreatEmptyAsNull)}
          </div>
        </>
      }
      summary={(o) => {
        const { added, removed, changed } = o.summary;
        if (added + removed + changed === 0) {
          return { tone: "success" as ShellTone, headline: t("csvDiff.noDifferences") };
        }
        return {
          tone: "warning" as ShellTone,
          headline: t("csvDiff.differences", { added, removed, changed }),
        };
      }}
      changes={(o) =>
        o.rows.flatMap((row, index): ShellChange[] => {
          const label = keyLabel(row, index);
          if (row.status === "changed") {
            return (row.changedFields ?? []).map((field) => ({
              id: `${index}-${field.field}`,
              path: `${label} · ${field.field}`,
              kind: row.status,
              before: field.oldValue,
              after: field.newValue,
            }));
          }
          if (row.status === "unchanged") return [];
          // Both sides must read out in the *same* column order, so an added
          // row is projected through comparedColumns (original-side order) and
          // then mapped, never through columnMapping's own insertion order —
          // auto-mapping inserts exact matches before renamed ones, so
          // Object.values would reshuffle the columns of added rows only.
          const values =
            row.status === "added"
              ? rowValues(
                  row.updated,
                  o.comparedColumns.map((c) => o.columnMapping[c] ?? c),
                )
              : rowValues(row.original, o.comparedColumns);
          return [
            {
              id: `${index}`,
              path: label,
              kind: row.status,
              ...(row.status === "added"
                ? { after: values.join(", ") }
                : { before: values.join(", ") }),
            },
          ];
        })
      }
      exit={(o) => ({
        text: [
          t("csvDiff.differences", {
            added: o.summary.added,
            removed: o.summary.removed,
            changed: o.summary.changed,
          }),
          t("csvDiff.unchangedCount", { n: o.summary.unchanged }),
          t("csvDiff.totals", {
            original: o.summary.totalOriginalRows,
            updated: o.summary.totalUpdatedRows,
          }),
          o.keyColumnsUsed
            ? t("csvDiff.matchedBy", {
                columns: o.keyColumnsUsed.join(" + "),
                source: t(`csvDiff.keySource.${o.keySource}`),
              })
            : t("csvDiff.matchedWholeRow"),
        ].join("\n"),
        json: o,
        filename: "csv-diff.txt",
        mimeType: "text/plain;charset=utf-8",
      })}
      renderResult={(o) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <ShellBadge tone="success">{t("csvDiff.added", { n: o.summary.added })}</ShellBadge>
            <ShellBadge tone="danger">{t("csvDiff.removed", { n: o.summary.removed })}</ShellBadge>
            <ShellBadge tone="warning">{t("csvDiff.changed", { n: o.summary.changed })}</ShellBadge>
            <ShellBadge>{t("csvDiff.unchangedCount", { n: o.summary.unchanged })}</ShellBadge>
            <ShellBadge>
              {t("csvDiff.totals", {
                original: o.summary.totalOriginalRows,
                updated: o.summary.totalUpdatedRows,
              })}
            </ShellBadge>
          </div>

          <ShellNote>
            {o.keyColumnsUsed
              ? t("csvDiff.matchedBy", {
                  columns: o.keyColumnsUsed.join(" + "),
                  source: t(`csvDiff.keySource.${o.keySource}`),
                })
              : t("csvDiff.matchedWholeRow")}
          </ShellNote>

          {o.keyCandidatesRejected.length > 0 ? (
            <ShellNote>
              {t("csvDiff.keyRejected", {
                items: o.keyCandidatesRejected.map((c) => `${c.column} (${c.reason})`).join(", "),
              })}
            </ShellNote>
          ) : null}

          {o.columnSetMismatch ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <ShellBadge tone="warning">
                {t("csvDiff.columnMismatch", {
                  original: o.columnSetMismatch.onlyInOriginal.join(", ") || "—",
                  updated: o.columnSetMismatch.onlyInUpdated.join(", ") || "—",
                })}
              </ShellBadge>
            </div>
          ) : null}

          {o.truncated ? (
            <ShellNote>
              {t("csvDiff.truncated", { shown: o.rows.length, limit: o.previewLimit })}
            </ShellNote>
          ) : null}

          {o.findings.length > 0 ? (
            <ShellDrill summary={t("csvDiff.findings", { n: o.findings.length })}>
              <ul className="space-y-1.5">
                {o.findings.map((f) => (
                  <li key={f.code} className="flex flex-wrap gap-2">
                    <ShellBadge
                      tone={
                        f.level === "danger" ? "danger" : f.level === "warning" ? "warning" : "info"
                      }
                    >
                      {t(`csvDiff.level.${f.level}`)}
                    </ShellBadge>
                    <span className="flex-1 text-sm text-[var(--neutral-11)]">{f.message}</span>
                  </li>
                ))}
              </ul>
            </ShellDrill>
          ) : null}

          <CsvDiffExports output={o} />
        </div>
      )}
    />
  );
}

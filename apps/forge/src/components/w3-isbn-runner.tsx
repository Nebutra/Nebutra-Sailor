"use client";

import { useTranslations } from "next-intl";
import { BatchWorkspace } from "@/components/batch-workspace";
import {
  InstantTransformShell,
  ShellBadge,
  ShellNote,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";
import { type CodeSegment, isbnSegments, SegmentedCodeSpecimen } from "@/components/specimens";

/** Mirrors the `text/isbn` output contract. */
type IsbnType = "isbn10" | "isbn13";

interface IsbnRow {
  input: string;
  normalized: string;
  detectedType: IsbnType | "invalid-length";
  valid: boolean;
  checkDigitExpected?: string;
  converted?: { type: IsbnType; value: string };
  noteCode?: string;
  note?: string;
}

interface IsbnOutput {
  results: IsbnRow[];
  summary: { total: number; valid: number; invalid: number };
  truncated: boolean;
}

const SAMPLE = [
  "978-0-306-40615-7",
  "0-306-40615-2",
  "0-8044-2957-X",
  "0-306-40615-3",
  "979-1-234-56789-6",
].join("\n");

function toneFor(summary: IsbnOutput["summary"]): ShellTone {
  if (summary.total === 0) return "neutral";
  if (summary.invalid === 0) return "success";
  if (summary.valid === 0) return "danger";
  return "warning";
}

function csv(output: IsbnOutput): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = "input,normalized,type,valid,converted,note";
  const rows = output.results.map((r) =>
    [
      cell(r.input),
      r.normalized,
      r.detectedType,
      r.valid ? "valid" : "invalid",
      r.converted?.value ?? "",
      cell(r.note ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export function W3IsbnRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");

  const typeLabel = (row: IsbnRow): string => {
    if (row.detectedType === "isbn10") return t("isbn.type.isbn10");
    if (row.detectedType === "isbn13") return t("isbn.type.isbn13");
    return t("isbn.type.invalidLength");
  };

  const noteLabel = (row: IsbnRow): string | null => {
    switch (row.noteCode) {
      case "check-digit-mismatch":
        return t("isbn.note.checkDigit", { expected: row.checkDigitExpected ?? "" });
      case "invalid-length":
        return t("isbn.note.invalidLength");
      case "invalid-character":
        return t("isbn.note.invalidCharacter");
      case "x-misplaced":
        return t("isbn.note.xMisplaced");
      case "no-isbn10-equivalent":
        return t("isbn.note.noIsbn10");
      case "non-bookland-prefix":
        return t("isbn.note.nonBookland");
      case "ismn-prefix":
        return t("isbn.note.ismn");
      default:
        return null;
    }
  };

  const renderResult = (output: IsbnOutput) => {
    const single = output.results.length === 1 ? output.results[0] : undefined;
    return (
      <div className="space-y-3">
        <ShellVerdict
          tone={toneFor(output.summary)}
          headline={
            single
              ? single.valid
                ? t("isbn.singleValid")
                : t("isbn.singleInvalid")
              : t("isbn.summary", { valid: output.summary.valid, total: output.summary.total })
          }
          caveat={single ? (noteLabel(single) ?? undefined) : undefined}
          badges={
            single ? (
              <>
                <ShellBadge tone={single.valid ? "success" : "neutral"}>
                  {typeLabel(single)}
                </ShellBadge>
                {single.converted ? (
                  <ShellBadge tone="info">
                    {t("isbn.convertedTo", {
                      type:
                        single.converted.type === "isbn10"
                          ? t("isbn.type.isbn10")
                          : t("isbn.type.isbn13"),
                      value: single.converted.value,
                    })}
                  </ShellBadge>
                ) : null}
              </>
            ) : output.summary.invalid > 0 ? (
              <ShellBadge tone="danger">
                {t("isbn.invalidCount", { n: output.summary.invalid })}
              </ShellBadge>
            ) : null
          }
        />

        {output.results.slice(0, 5).map((row, i) => {
          const { segments, kind } = isbnSegments(row.normalized || row.input);
          const checkFail = !row.valid && row.noteCode === "check-digit-mismatch";
          const labeled: CodeSegment[] =
            kind === "isbn13"
              ? [
                  {
                    id: "prefix",
                    label: t("isbn.segPrefix"),
                    value: segments[0]?.value ?? "",
                    tone: row.valid ? "info" : "neutral",
                  },
                  {
                    id: "body",
                    label: t("isbn.segBody"),
                    value: segments[1]?.value ?? "",
                    tone: "neutral",
                  },
                  {
                    id: "check",
                    label: t("isbn.segCheck"),
                    value: segments[2]?.value ?? "",
                    error: checkFail,
                    tone: row.valid ? "success" : checkFail ? "danger" : "warning",
                  },
                ]
              : [
                  {
                    id: "body",
                    label: t("isbn.segBody"),
                    value: segments[0]?.value ?? "",
                    tone: "neutral",
                  },
                  {
                    id: "check",
                    label: t("isbn.segCheck"),
                    value: segments[1]?.value ?? "",
                    error: checkFail,
                    tone: row.valid ? "success" : checkFail ? "danger" : "warning",
                  },
                ];
          return (
            <SegmentedCodeSpecimen
              key={`${i}-${row.normalized}`}
              title={t("isbn.specimenTitle")}
              subtitle={t("honesty.algorithmOnly")}
              segments={labeled}
              statusTone={row.valid ? "success" : "danger"}
              statusLabel={row.valid ? t("isbn.valid") : t("isbn.invalid")}
            />
          );
        })}

        {output.results.length > 0 ? (
          <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="text-xs text-[var(--neutral-10)]">
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t("isbn.col.input")}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t("isbn.col.normalized")}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t("isbn.col.type")}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t("isbn.col.status")}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t("isbn.col.converted")}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t("isbn.col.note")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {output.results.map((row, i) => (
                  <tr
                    // Rows are positional: the same ISBN may legitimately repeat.
                    key={`${i}-${row.normalized}`}
                    className={i % 2 === 1 ? "bg-[var(--neutral-3)]" : undefined}
                  >
                    <td className="px-4 py-2 font-mono text-[var(--neutral-11)]">{row.input}</td>
                    <td className="px-4 py-2 font-mono text-[var(--neutral-12)]">
                      {row.normalized}
                    </td>
                    <td className="px-4 py-2 text-[var(--neutral-11)]">{typeLabel(row)}</td>
                    <td className="px-4 py-2">
                      <ShellBadge tone={row.valid ? "success" : "danger"}>
                        {row.valid ? t("isbn.valid") : t("isbn.invalid")}
                      </ShellBadge>
                    </td>
                    <td className="px-4 py-2 font-mono text-[var(--neutral-11)]">
                      {row.converted?.value ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-[var(--neutral-11)]">{noteLabel(row) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {output.truncated ? (
          <ShellNote>{t("isbn.truncated", { shown: output.results.length })}</ShellNote>
        ) : null}
      </div>
    );
  };

  return (
    <BatchWorkspace
      toolId={toolId}
      accept="lines"
      resultKind="json"
      maxItems={200}
      buildItemInput={(raw) => ({ text: String(raw) })}
      sharedHint="One ISBN per line · batch API"
    >
      <InstantTransformShell<IsbnOutput>
        engine={{ toolId }}
        inputLabel={t("isbn.inputLabel")}
        inputKind="block"
        inputPlaceholder={t("isbn.placeholder")}
        rows={6}
        sample={SAMPLE}
        buildInput={(text) => (text.trim().length > 0 ? { text } : null)}
        renderResult={renderResult}
        idle={<ShellNote>{t("isbn.idle")}</ShellNote>}
        exit={(output) => ({
          text: csv(output),
          json: output,
          filename: "isbn-results.csv",
          mimeType: "text/csv;charset=utf-8",
        })}
        note={t("isbn.scope")}
      />
    </BatchWorkspace>
  );
}

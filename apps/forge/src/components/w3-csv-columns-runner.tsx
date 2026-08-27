"use client";

/**
 * CSV column editor — configure-then-generate (brief docs/plans/tools/csv-columns.md §8).
 *
 * The column list *is* the product: one row per column with keep / rename /
 * reorder, and the output regenerates on every change. There is no run button
 * — the one competitor that reached the full three-operation scope arrived at
 * the same shape, and a button here would be a step tax on a keystroke.
 *
 * The runner never parses CSV itself. It learns the header from the tool's own
 * `originalColumns`, so the human page and an agent call go through exactly one
 * RFC 4180 implementation — the ambiguity rules (first-match names, duplicate
 * headers) can never drift between the two.
 */
import { ArrowDown, ArrowUp } from "@nebutra/icons";
import { Button, Checkbox, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ConfigureGenerateShell,
  ShellBadge,
  ShellCode,
  ShellNote,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-ui";

interface RaggedRow {
  line: number;
  expected: number;
  actual: number;
}

interface Output {
  csv: string;
  columns: string[];
  originalColumns: string[];
  rowCount: number;
  warnings: {
    duplicateHeaders?: string[];
    raggedRows?: RaggedRow[];
    raggedRowsTruncated?: boolean;
    unusedRenames?: string[];
  };
}

/** One row of the configuration surface — bound to an original index, never a name. */
interface ColumnState {
  index: number;
  original: string;
  name: string;
  keep: boolean;
}

/** Typing in a rename box must stay responsive on a long file, so the preview is capped. */
const PREVIEW_LINES = 30;
const MAX_LISTED_RAGGED = 5;

const SAMPLE = [
  "order_id,customer_email,internal_note,total,currency",
  '1001,ada@example.com,"VIP, do not discount",249.00,USD',
  "1002,linus@example.com,,89.50,USD",
  "1003,grace@example.com,follow up,412.75,EUR",
].join("\n");

const DELIMITERS = [
  { value: ",", labelKey: "comma" },
  { value: ";", labelKey: "semicolon" },
  { value: "\t", labelKey: "tab" },
  { value: "|", labelKey: "pipe" },
] as const;

function identityColumns(headers: readonly string[]): ColumnState[] {
  return headers.map((original, index) => ({ index, original, name: original, keep: true }));
}

function signature(headers: readonly string[]): string {
  return `${headers.length}\u0000${headers.join("\u0000")}`;
}

/**
 * Adopts the header the engine reported. Rendered inside the result so the sync
 * happens in an effect, never during a render pass.
 */
function HeaderSync({
  headers,
  onHeaders,
}: {
  headers: readonly string[];
  onHeaders: (headers: readonly string[]) => void;
}) {
  const key = signature(headers);
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (seen.current === key) return;
    seen.current = key;
    onHeaders(headers);
  }, [key, headers, onHeaders]);
  return null;
}

export function W3CsvColumnsRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [csv, setCsv] = useState("");
  const [delimiter, setDelimiter] = useState<string>(",");
  const [raggedRowPolicy, setRaggedRowPolicy] = useState<"pad" | "truncate" | "reject">("pad");
  const [columns, setColumns] = useState<ColumnState[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // A new payload invalidates every column reference — reset rather than send
  // operations that point at the previous file's header.
  const loadCsv = useCallback((next: string) => {
    setCsv(next);
    setColumns([]);
    setFileError(null);
  }, []);

  const adoptHeaders = useCallback((headers: readonly string[]) => {
    setColumns((prev) => {
      if (prev.length > 0 && signature(prev.map((c) => c.original)) === signature(headers)) {
        return prev;
      }
      return identityColumns(headers);
    });
  }, []);

  const patch = useCallback((index: number, next: Partial<ColumnState>) => {
    setColumns((prev) => prev.map((c) => (c.index === index ? { ...c, ...next } : c)));
  }, []);

  const move = useCallback((position: number, delta: number) => {
    setColumns((prev) => {
      const target = position + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const moved = next[position] as ColumnState;
      next[position] = next[target] as ColumnState;
      next[target] = moved;
      return next;
    });
  }, []);

  const readFile = useCallback(
    async (file: File) => {
      try {
        loadCsv(await file.text());
      } catch {
        setFileError(t("csvColumns.fileFailed", { name: file.name }));
      }
    },
    [loadCsv, t],
  );

  const input = useMemo(() => {
    if (csv.trim() === "") return null;
    const base = { csv, delimiter, raggedRowPolicy };
    // Before the header is known there is nothing to configure: the identity
    // call is what teaches the page which columns exist.
    if (columns.length === 0) return base;
    const drop = columns.filter((c) => !c.keep).map((c) => c.index);
    const rename = columns
      .filter((c) => c.keep && c.name !== c.original)
      .map((c) => ({ from: c.index, to: c.name }));
    const order = columns.filter((c) => c.keep).map((c) => c.index);
    return {
      ...base,
      operations: {
        ...(drop.length > 0 ? { drop } : {}),
        ...(rename.length > 0 ? { rename } : {}),
        ...(order.length > 0 ? { order } : {}),
      },
    };
  }, [csv, delimiter, raggedRowPolicy, columns]);

  const keptCount = columns.filter((c) => c.keep).length;

  return (
    <ConfigureGenerateShell<Output>
      engine={{ toolId, parse: (o) => o as unknown as Output }}
      input={input}
      emptyHint={t("csvColumns.emptyHint")}
      note={t("csvColumns.note")}
      exit={(o) => ({
        text: o.csv,
        json: o,
        filename: "columns.csv",
        mimeType: "text/csv;charset=utf-8",
      })}
      renderResult={(o) => {
        const lines = o.csv.split("\n");
        const preview = lines.slice(0, PREVIEW_LINES).join("\n");
        const ragged = o.warnings.raggedRows ?? [];
        return (
          <div className="space-y-3">
            <HeaderSync headers={o.originalColumns} onHeaders={adoptHeaders} />
            <div className="flex flex-wrap items-center gap-1.5">
              <ShellBadge>{t("csvColumns.columnCount", { n: o.columns.length })}</ShellBadge>
              <ShellBadge>{t("csvColumns.rowCount", { n: o.rowCount })}</ShellBadge>
              {o.warnings.duplicateHeaders?.length ? (
                <ShellBadge tone="warning">
                  {t("csvColumns.duplicateHeaders", {
                    names: o.warnings.duplicateHeaders.join(", "),
                  })}
                </ShellBadge>
              ) : null}
              {ragged.length > 0 ? (
                <ShellBadge tone="warning">
                  {t("csvColumns.raggedCount", {
                    n: ragged.length,
                    more: o.warnings.raggedRowsTruncated ? "+" : "",
                  })}
                </ShellBadge>
              ) : null}
            </div>

            <ShellCode label={t("csvColumns.previewLabel")}>{preview}</ShellCode>
            {lines.length > PREVIEW_LINES ? (
              <ShellNote>
                {t("csvColumns.previewTruncated", { shown: PREVIEW_LINES, total: lines.length })}
              </ShellNote>
            ) : null}

            {ragged.length > 0 ? (
              <ul className="space-y-1" aria-label={t("csvColumns.raggedListLabel")}>
                {ragged.slice(0, MAX_LISTED_RAGGED).map((r) => (
                  <li key={r.line} className="text-sm text-[var(--neutral-11)]">
                    {t("csvColumns.raggedRow", {
                      line: r.line,
                      actual: r.actual,
                      expected: r.expected,
                    })}
                  </li>
                ))}
              </ul>
            ) : null}

            {o.warnings.unusedRenames?.length ? (
              <ShellNote>
                {t("csvColumns.unusedRenames", { names: o.warnings.unusedRenames.join(", ") })}
              </ShellNote>
            ) : null}
          </div>
        );
      }}
    >
      <div className="space-y-3">
        <Textarea
          id={`${uid}-csv`}
          label={t("csvColumns.csvLabel")}
          value={csv}
          placeholder={t("csvColumns.csvPlaceholder")}
          rows={8}
          onChange={(e) => loadCsv(e.target.value)}
          // Dropping a file on a textarea otherwise pastes its path; taking the
          // drop here is the "or drop a file" half of the placeholder.
          onDrop={(e) => {
            const file = e.dataTransfer.files[0];
            if (!file) return;
            e.preventDefault();
            void readFile(file);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="font-mono text-sm"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => loadCsv(SAMPLE)}>
            {t("csvColumns.sample")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            {t("csvColumns.chooseFile")}
          </Button>
          {csv ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => loadCsv("")}>
              {t("common.clear")}
            </Button>
          ) : null}
          <input
            data-allow-native
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,text/csv,text/plain"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {fileError ? <ShellNote>{fileError}</ShellNote> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <RunnerSelect
          id={`${uid}-delimiter`}
          label={t("csvColumns.delimiterLabel")}
          value={delimiter}
          onChange={setDelimiter}
          options={DELIMITERS.map((d) => ({
            value: d.value,
            label: t(`csvColumns.delimiter.${d.labelKey}`),
          }))}
        />
        <RunnerSelect
          id={`${uid}-ragged`}
          label={t("csvColumns.raggedPolicyLabel")}
          value={raggedRowPolicy}
          onChange={(value) => setRaggedRowPolicy(value as "pad" | "truncate" | "reject")}
          options={[
            { value: "pad", label: t("csvColumns.ragged.pad") },
            { value: "truncate", label: t("csvColumns.ragged.truncate") },
            { value: "reject", label: t("csvColumns.ragged.reject") },
          ]}
        />
      </div>

      {columns.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-xs font-medium text-[var(--neutral-11)]">
              {t("csvColumns.columnsTitle", { kept: keptCount, total: columns.length })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setColumns((prev) => identityColumns(prev.map((c) => c.original)))}
            >
              {t("csvColumns.reset")}
            </Button>
          </div>
          <ShellNote>{t("csvColumns.columnsHint")}</ShellNote>
          <ul className="space-y-2">
            {columns.map((column, position) => (
              <li
                key={column.index}
                className="flex flex-wrap items-end gap-2 rounded-[var(--radius-lg)] bg-[var(--neutral-3)] p-2"
              >
                <Checkbox
                  id={`${uid}-keep-${column.index}`}
                  checked={column.keep}
                  onChange={(checked) => patch(column.index, { keep: checked })}
                >
                  <span className="sr-only">{t("csvColumns.keep", { name: column.original })}</span>
                </Checkbox>
                <Input
                  id={`${uid}-name-${column.index}`}
                  label={t("csvColumns.renameLabel", { name: column.original })}
                  value={column.name}
                  disabled={!column.keep}
                  onChange={(e) => patch(column.index, { name: e.target.value })}
                  className="font-mono"
                  spellCheck={false}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("csvColumns.moveUp", { name: column.original })}
                  disabled={position === 0}
                  onClick={() => move(position, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("csvColumns.moveDown", { name: column.original })}
                  disabled={position === columns.length - 1}
                  onClick={() => move(position, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          {keptCount === 0 ? <ShellNote>{t("csvColumns.noneKept")}</ShellNote> : null}
        </div>
      ) : null}
    </ConfigureGenerateShell>
  );
}

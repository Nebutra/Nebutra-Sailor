"use client";

/**
 * list-set-compare — two-pane compare (brief docs/plans/tools/list-set-compare.md §8).
 *
 * Two lists side by side, one synchronized structured result, and no "Compare"
 * button: the comparison is a Map walk over a few thousand short strings, so
 * gating it behind a click is a pure step tax (§9.2) — the two competitors that
 * gate it are the two we are not copying.
 *
 * The comparison runs **in this component**, not over the network: pasted
 * subscriber exports and SKU dumps are exactly the data a user should not have
 * to upload to answer "what changed" (ship gate §6.5 #8). It is the identical
 * `compareLists` the agent API runs server-side, through the identical zod
 * schema, so the human page and the OpenAPI/MCP surface cannot drift.
 *
 * Four primary panels (Only in A / Only in B / Intersection / Union) carry the
 * set-theory-precise names; symmetric difference, within-list duplicates and
 * per-item multiplicity are detail-on-demand rather than a seventh box
 * competing for the same visual weight (§9.2).
 */
import {
  compareLists,
  type ListSetCompareResult,
  listSetCompareInputSchema,
  resolveDelimiter,
  unescapeLiteral,
} from "@nebutra/forge-runtime/list-set-compare";
import { Checkbox, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import {
  ShellBadge,
  ShellDrill,
  ShellExitActions,
  ShellNote,
  type ShellTone,
  TwoPaneCompareShell,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-ui";

type DelimiterMode = "auto" | "newline" | "comma" | "tab" | "custom";
type SortMode = "original" | "asc" | "desc" | "byCount";

/** Rendering 50k lines into the DOM helps nobody; copy/download still carry all of them. */
const MAX_VISIBLE_ITEMS = 200;
/** Above this, counting items on every render costs more than the badge is worth. */
const PANE_COUNT_LIMIT = 200_000;
/** A short one-item paste is a one-item list, not a delimiter mistake. */
const SINGLE_ITEM_SUSPECT_CHARS = 40;

const SAMPLE_A = [
  "SKU-1001",
  "SKU-1002",
  "SKU-1002",
  "SKU-1003",
  "SKU-1007",
  "café-latte",
  "007",
].join("\n");

const SAMPLE_B = ["SKU-1002", "SKU-1003", "SKU-1004", "sku-1007", "café-latte", "7"].join("\n");

export function W3ListSetCompareRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();
  const [delimiter, setDelimiter] = useState<DelimiterMode>("auto");
  const [customDelimiter, setCustomDelimiter] = useState("|");
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [collapseInternalWhitespace, setCollapseInternalWhitespace] = useState(false);
  const [ignoreLeadingZeros, setIgnoreLeadingZeros] = useState(false);
  const [sort, setSort] = useState<SortMode>("original");

  const options = {
    caseSensitive,
    trimWhitespace,
    collapseInternalWhitespace,
    ignoreLeadingZeros,
    unicodeNormalize: "nfc" as const,
    sort,
  };

  const report = (output: ListSetCompareResult): string =>
    [
      `# ${t("listSetCompare.reportTitle")}`,
      "",
      `- ${t("listSetCompare.panel.onlyInA")}: ${output.counts.onlyInA}`,
      `- ${t("listSetCompare.panel.onlyInB")}: ${output.counts.onlyInB}`,
      `- ${t("listSetCompare.panel.intersection")}: ${output.counts.intersection}`,
      `- ${t("listSetCompare.panel.union")}: ${output.counts.union}`,
      `- ${t("listSetCompare.panel.symmetricDifference")}: ${output.counts.symmetricDifference}`,
      "",
      `## ${t("listSetCompare.panel.onlyInA")}`,
      output.onlyInA.join("\n"),
      "",
      `## ${t("listSetCompare.panel.onlyInB")}`,
      output.onlyInB.join("\n"),
      "",
      `## ${t("listSetCompare.panel.intersection")}`,
      output.intersection.join("\n"),
    ].join("\n");

  return (
    <TwoPaneCompareShell<ListSetCompareResult>
      engine={{
        // `compute` wins over `toolId` in the shell — that is the point: the
        // lists stay local. `toolId` still names the identical server
        // operation an agent would call.
        toolId,
        compute: (input) => compareLists(listSetCompareInputSchema.parse(input)),
      }}
      leftLabel={t("listSetCompare.listA")}
      rightLabel={t("listSetCompare.listB")}
      leftPlaceholder={t("listSetCompare.placeholder")}
      rightPlaceholder={t("listSetCompare.placeholder")}
      sample={{ left: SAMPLE_A, right: SAMPLE_B }}
      rows={12}
      optionsKey={`${delimiter}|${customDelimiter}|${caseSensitive}|${trimWhitespace}|${collapseInternalWhitespace}|${ignoreLeadingZeros}|${sort}`}
      options={
        <>
          <RunnerSelect
            label={t("listSetCompare.delimiter")}
            value={delimiter}
            onChange={(next) => setDelimiter(next as DelimiterMode)}
            options={[
              { value: "auto", label: t("listSetCompare.delimiterOption.auto") },
              { value: "newline", label: t("listSetCompare.delimiterOption.newline") },
              { value: "comma", label: t("listSetCompare.delimiterOption.comma") },
              { value: "tab", label: t("listSetCompare.delimiterOption.tab") },
              { value: "custom", label: t("listSetCompare.delimiterOption.custom") },
            ]}
          />
          {delimiter === "custom" ? (
            <Input
              id={`${uid}-custom-delimiter`}
              label={t("listSetCompare.customDelimiter")}
              value={customDelimiter}
              onChange={(e) => setCustomDelimiter(e.target.value)}
              placeholder={t("listSetCompare.customDelimiterPlaceholder")}
              className="w-32 font-mono"
              spellCheck={false}
              autoComplete="off"
            />
          ) : null}
          <RunnerSelect
            label={t("listSetCompare.sort")}
            value={sort}
            onChange={(next) => setSort(next as SortMode)}
            options={[
              { value: "original", label: t("listSetCompare.sortOption.original") },
              { value: "asc", label: t("listSetCompare.sortOption.asc") },
              { value: "desc", label: t("listSetCompare.sortOption.desc") },
              { value: "byCount", label: t("listSetCompare.sortOption.byCount") },
            ]}
          />
          <Checkbox checked={caseSensitive} onChange={setCaseSensitive}>
            {t("listSetCompare.optCaseSensitive")}
          </Checkbox>
          <Checkbox checked={trimWhitespace} onChange={setTrimWhitespace}>
            {t("listSetCompare.optTrim")}
          </Checkbox>
          <Checkbox checked={collapseInternalWhitespace} onChange={setCollapseInternalWhitespace}>
            {t("listSetCompare.optCollapse")}
          </Checkbox>
          <Checkbox checked={ignoreLeadingZeros} onChange={setIgnoreLeadingZeros}>
            {t("listSetCompare.optIgnoreZeros")}
          </Checkbox>
        </>
      }
      buildInput={(left, right) =>
        left.trim() && right.trim()
          ? {
              listA: left,
              listB: right,
              delimiter,
              ...(delimiter === "custom" ? { customDelimiter } : {}),
              options,
            }
          : null
      }
      paneStatus={(text) => {
        if (!text.trim()) return null;
        // Cheap by contract: one split, only under a size ceiling. The real
        // parse lives in `engine`, which runs once per input change.
        if (text.length > PANE_COUNT_LIMIT) return null;
        const n = countItems(text, delimiter, customDelimiter);
        if (n <= 1 && text.length >= SINGLE_ITEM_SUSPECT_CHARS) {
          return { tone: "warning", label: t("listSetCompare.paneSingle") };
        }
        return { tone: "neutral", label: t("listSetCompare.paneItems", { n }) };
      }}
      emptyHint={t("listSetCompare.emptyHint")}
      summary={(output) => ({
        tone: output.counts.symmetricDifference === 0 ? "success" : "warning",
        headline:
          output.counts.symmetricDifference === 0
            ? t("listSetCompare.summaryIdentical", { n: output.counts.intersection })
            : t("listSetCompare.summaryDiff", {
                a: output.counts.onlyInA,
                b: output.counts.onlyInB,
                shared: output.counts.intersection,
              }),
      })}
      renderResult={(output) => (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultPanel
              title={t("listSetCompare.panel.onlyInA")}
              tone="danger"
              items={output.onlyInA}
              filename="only-in-a.txt"
              emptyLabel={t("listSetCompare.none")}
              moreLabel={(n) => t("listSetCompare.more", { n })}
              countLabel={(n) => t("listSetCompare.items", { n })}
            />
            <ResultPanel
              title={t("listSetCompare.panel.onlyInB")}
              tone="success"
              items={output.onlyInB}
              filename="only-in-b.txt"
              emptyLabel={t("listSetCompare.none")}
              moreLabel={(n) => t("listSetCompare.more", { n })}
              countLabel={(n) => t("listSetCompare.items", { n })}
            />
            <ResultPanel
              title={t("listSetCompare.panel.intersection")}
              tone="info"
              items={output.intersection}
              filename="intersection.txt"
              emptyLabel={t("listSetCompare.none")}
              moreLabel={(n) => t("listSetCompare.more", { n })}
              countLabel={(n) => t("listSetCompare.items", { n })}
            />
            <ResultPanel
              title={t("listSetCompare.panel.union")}
              tone="neutral"
              items={output.union}
              filename="union.txt"
              emptyLabel={t("listSetCompare.none")}
              moreLabel={(n) => t("listSetCompare.more", { n })}
              countLabel={(n) => t("listSetCompare.items", { n })}
            />
          </div>

          <ShellDrill
            summary={t("listSetCompare.drill.symmetricDifference", {
              n: output.counts.symmetricDifference,
            })}
          >
            <ItemList items={output.symmetricDifference} empty={t("listSetCompare.none")} />
            <div className="mt-2">
              <ShellExitActions
                exit={{
                  text: output.symmetricDifference.join("\n"),
                  filename: "symmetric-difference.txt",
                }}
                idPrefix="symdiff"
              />
            </div>
          </ShellDrill>

          <ShellDrill
            summary={t("listSetCompare.drill.duplicates", {
              n: output.duplicates.inA.length + output.duplicates.inB.length,
            })}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CountList
                title={t("listSetCompare.duplicatesInA")}
                rows={output.duplicates.inA}
                empty={t("listSetCompare.none")}
              />
              <CountList
                title={t("listSetCompare.duplicatesInB")}
                rows={output.duplicates.inB}
                empty={t("listSetCompare.none")}
              />
            </div>
          </ShellDrill>

          <ShellDrill
            summary={t("listSetCompare.drill.multiplicities", { n: output.multiplicities.length })}
          >
            <ul className="space-y-1 font-mono text-xs text-[var(--neutral-11)]">
              <li className="flex flex-wrap gap-3 text-[var(--neutral-10)]">
                <span className="min-w-40">{t("listSetCompare.colValue")}</span>
                <span>{t("listSetCompare.colCountA")}</span>
                <span>{t("listSetCompare.colCountB")}</span>
              </li>
              {output.multiplicities.map((m) => (
                <li key={m.value} className="flex flex-wrap gap-3">
                  <span className="min-w-40 text-[var(--neutral-12)]">{m.value}</span>
                  <span>{m.countInA}</span>
                  <span>{m.countInB}</span>
                </li>
              ))}
            </ul>
            {output.multiplicitiesTruncated ? (
              <ShellNote>{t("listSetCompare.detailTruncated")}</ShellNote>
            ) : null}
          </ShellDrill>

          {output.warnings.length > 0 ? (
            <ShellDrill
              summary={t("listSetCompare.drill.warnings", { n: output.warnings.length })}
              defaultOpen
            >
              <ul className="space-y-1.5">
                {output.warnings.map((message, i) => (
                  <li
                    key={output.warningCodes[i] ?? message}
                    className="flex flex-wrap items-start gap-2"
                  >
                    <ShellBadge tone="warning">{output.warningCodes[i] ?? "notice"}</ShellBadge>
                    <span className="flex-1 text-sm text-[var(--neutral-11)]">{message}</span>
                  </li>
                ))}
              </ul>
            </ShellDrill>
          ) : null}

          <ShellNote>{output.notes.join(" ")}</ShellNote>
        </div>
      )}
      exit={(output) => ({
        text: report(output),
        json: output,
        filename: "list-compare.md",
        mimeType: "text/markdown;charset=utf-8",
      })}
      note={t("listSetCompare.privacy")}
    />
  );
}

/** Item count for the pane badge — same delimiter resolution the engine uses. */
function countItems(text: string, delimiter: DelimiterMode, custom: string): number {
  const resolved = resolveDelimiter(text, delimiter);
  const separator =
    resolved === "newline"
      ? /\r\n|\r|\n/
      : resolved === "comma"
        ? ","
        : resolved === "tab"
          ? "\t"
          : unescapeLiteral(custom);
  if (separator === "") return text.trim() ? 1 : 0;
  return text.split(separator).filter((part) => part.trim() !== "").length;
}

function ResultPanel({
  title,
  tone,
  items,
  filename,
  emptyLabel,
  moreLabel,
  countLabel,
}: {
  title: string;
  tone: ShellTone;
  items: readonly string[];
  filename: string;
  emptyLabel: string;
  moreLabel: (n: number) => string;
  countLabel: (n: number) => string;
}) {
  const hidden = Math.max(0, items.length - MAX_VISIBLE_ITEMS);
  return (
    <section
      aria-label={title}
      className="space-y-2 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--neutral-11)]">{title}</span>
        <ShellBadge tone={tone}>{countLabel(items.length)}</ShellBadge>
      </div>
      <ItemList items={items.slice(0, MAX_VISIBLE_ITEMS)} empty={emptyLabel} />
      {hidden > 0 ? <ShellNote>{moreLabel(hidden)}</ShellNote> : null}
      {items.length > 0 ? (
        <ShellExitActions exit={{ text: items.join("\n"), filename }} idPrefix={filename} />
      ) : null}
    </section>
  );
}

function ItemList({ items, empty }: { items: readonly string[]; empty: string }): ReactNode {
  if (items.length === 0) return <p className="text-sm text-[var(--neutral-10)]">{empty}</p>;
  return (
    <ul className="max-h-64 space-y-0.5 overflow-y-auto font-mono text-xs text-[var(--neutral-12)]">
      {items.map((value, i) => (
        <li key={`${value}-${i}`} className="whitespace-pre-wrap break-all">
          {value}
        </li>
      ))}
    </ul>
  );
}

function CountList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: readonly { value: string; count: number }[];
  empty: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-[var(--neutral-11)]">{title}</span>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--neutral-10)]">{empty}</p>
      ) : (
        <ul className="max-h-64 space-y-0.5 overflow-y-auto font-mono text-xs text-[var(--neutral-11)]">
          {rows.map((row) => (
            <li key={row.value} className="flex flex-wrap gap-3">
              <span className="text-[var(--neutral-12)]">{row.value}</span>
              <span>×{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

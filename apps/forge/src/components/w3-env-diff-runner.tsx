"use client";

/**
 * env-diff — two-pane compare (brief docs/plans/tools/env-diff.md §8).
 *
 * Two environments side by side, one synchronized key-level result, and no
 * "Compare" button: the union-of-keys merge is an O(n) map walk, so gating it
 * behind a click is a pure step tax (§9.5). The shell owns layout, the
 * idle/running/error states, the change cursor and the exits.
 *
 * The diff runs **in this component**, not over the network. A `.env` paste is
 * the one artifact developers are trained never to upload, so the credentials
 * never leave the browser (§9.2, ship gate §6.5 #8). It is the identical
 * `diffEnv` the agent API runs server-side, parsed through the identical zod
 * schema, so the human page and the OpenAPI/MCP surface cannot drift.
 */
import {
  diffEnv,
  type EnvDiffEntry,
  type EnvDiffInput,
  type EnvDiffResult,
  envDiffInputSchema,
} from "@nebutra/forge-runtime/env-diff";
import { Checkbox } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  ShellBadge,
  type ShellChange,
  ShellDrill,
  ShellNote,
  type ShellTone,
  TwoPaneCompareShell,
} from "@/components/journey-shells";

const SAMPLE_A = `# staging
APP_ENV=staging
APP_DEBUG=true
DATABASE_URL=postgres://user@staging-db:5432/app
STRIPE_WEBHOOK_SECRET=whsec_staging_abc123
REDIS_URL=redis://staging-cache:6379
# MAIL_DRIVER=smtp
`;

const SAMPLE_B = `# production
APP_ENV=production
APP_DEBUG=false
DATABASE_URL="postgres://user@prod-db:5432/app"
REDIS_URL=redis://prod-cache:6379
MAIL_DRIVER=ses
SENTRY_DSN=https://examplePublicKey@o0.ingest.example/0
`;

const COUNT_KEYS = ["unchanged", "changed", "added", "removed", "commentedOut"] as const;
type CountKey = (typeof COUNT_KEYS)[number];

const COUNT_TONE: Record<CountKey, ShellTone> = {
  unchanged: "neutral",
  changed: "warning",
  added: "success",
  removed: "danger",
  commentedOut: "info",
};

/** Placeholder for "this key has no assignment on that side" — never a fake empty string. */
const ABSENT = "—";

export function W3EnvDiffRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [ignoreComments, setIgnoreComments] = useState(true);
  const [caseInsensitiveKeys, setCaseInsensitiveKeys] = useState(false);
  const [redactSecrets, setRedactSecrets] = useState(true);

  const statusNote = (e: EnvDiffEntry): string => {
    const base = t(`envDiff.note.${e.status}`);
    if (!e.isSecret) return base;
    return `${base} · ${t(e.secretChanged ? "envDiff.secretChanged" : "envDiff.secretSame")}`;
  };

  const markdown = (output: EnvDiffResult): string => {
    const header = `| ${t("envDiff.colKey")} | ${t("envDiff.colA")} | ${t("envDiff.colB")} | ${t("envDiff.colStatus")} |`;
    const rows = output.entries
      .filter((e) => e.status !== "unchanged")
      .map(
        (e) =>
          `| \`${e.key}\` | ${e.valueA === null ? ABSENT : `\`${e.valueA}\``} | ${
            e.valueB === null ? ABSENT : `\`${e.valueB}\``
          } | ${e.status} |`,
      );
    const summary =
      output.differences === 0
        ? t("envDiff.summaryNone", { total: output.totalKeys })
        : t("envDiff.summaryDiff", { n: output.differences, total: output.totalKeys });
    return [summary, "", header, `| --- | --- | --- | --- |`, ...rows].join("\n");
  };

  return (
    <TwoPaneCompareShell<EnvDiffResult>
      engine={{
        // `compute` wins over `toolId` in the shell — that is the point: the
        // secrets stay local. `toolId` still names the identical server
        // operation an agent would call.
        toolId,
        compute: (input) => diffEnv(envDiffInputSchema.parse(input) as EnvDiffInput),
      }}
      leftLabel={t("envDiff.envA")}
      rightLabel={t("envDiff.envB")}
      leftPlaceholder={t("envDiff.placeholderA")}
      rightPlaceholder={t("envDiff.placeholderB")}
      sample={{ left: SAMPLE_A, right: SAMPLE_B }}
      rows={12}
      optionsKey={`${ignoreComments}|${caseInsensitiveKeys}|${redactSecrets}`}
      options={
        <>
          <Checkbox checked={ignoreComments} onChange={setIgnoreComments}>
            {t("envDiff.optIgnoreComments")}
          </Checkbox>
          <Checkbox checked={caseInsensitiveKeys} onChange={setCaseInsensitiveKeys}>
            {t("envDiff.optCaseInsensitive")}
          </Checkbox>
          <Checkbox checked={redactSecrets} onChange={setRedactSecrets}>
            {t("envDiff.optRedactSecrets")}
          </Checkbox>
        </>
      }
      buildInput={(left, right) =>
        left.trim() && right.trim()
          ? {
              envA: left,
              envB: right,
              options: { ignoreComments, caseInsensitiveKeys, redactSecrets },
            }
          : null
      }
      paneStatus={(text) => {
        if (!text.trim()) return null;
        // Cheap by contract — one native scan, no parse. The real parse lives
        // in `engine`, which runs once per input change rather than per render.
        if (!text.includes("=")) return { tone: "warning", label: t("envDiff.paneNoAssignment") };
        return null;
      }}
      emptyHint={t("envDiff.emptyHint")}
      summary={(output) => ({
        tone: output.differences === 0 ? "success" : "warning",
        headline:
          output.differences === 0
            ? t("envDiff.summaryNone", { total: output.totalKeys })
            : t("envDiff.summaryDiff", { n: output.differences, total: output.totalKeys }),
      })}
      changes={(output): ShellChange[] =>
        output.entries
          .filter((e) => e.status !== "unchanged")
          .map((e) => ({
            id: e.key,
            path: e.key,
            // The raw status token, so the badge reads as the same vocabulary
            // the JSON payload carries and the shell can tone it correctly.
            kind: e.status,
            before: e.valueA === null ? ABSENT : e.valueA,
            after: e.valueB === null ? ABSENT : e.valueB,
            note: statusNote(e),
          }))
      }
      renderResult={(output) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {COUNT_KEYS.filter((k) => output.counts[k] > 0).map((k) => (
              <ShellBadge key={k} tone={COUNT_TONE[k]}>
                {t(`envDiff.count.${k}`, { n: output.counts[k] })}
              </ShellBadge>
            ))}
          </div>

          {output.warnings.length > 0 ? (
            <ShellDrill summary={t("envDiff.warnings", { n: output.warnings.length })}>
              <ul className="space-y-1.5">
                {output.warnings.map((w) => (
                  <li
                    key={`${w.file}-${w.type}-${w.line ?? 0}-${w.key ?? ""}`}
                    className="flex flex-wrap items-start gap-2"
                  >
                    <ShellBadge tone={w.type === "unparsableLine" ? "danger" : "warning"}>
                      {t(`envDiff.warningType.${w.type}`, { file: w.file })}
                    </ShellBadge>
                    <span className="flex-1 text-sm text-[var(--neutral-11)]">{w.message}</span>
                  </li>
                ))}
              </ul>
            </ShellDrill>
          ) : null}

          {output.counts.unchanged > 0 ? (
            <ShellDrill summary={t("envDiff.showUnchanged", { n: output.counts.unchanged })}>
              <ul className="space-y-1 font-mono text-xs text-[var(--neutral-11)]">
                {output.entries
                  .filter((e) => e.status === "unchanged")
                  .map((e) => (
                    <li key={e.key} className="flex flex-wrap gap-2">
                      <span className="text-[var(--neutral-12)]">{e.key}</span>
                      <span>{e.valueA ?? e.valueB ?? ABSENT}</span>
                      {e.commentedIn ? (
                        <span>{t(`envDiff.commentedIn.${e.commentedIn}`)}</span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </ShellDrill>
          ) : null}

          {output.redacted ? <ShellNote>{t("envDiff.redactedNote")}</ShellNote> : null}
          {output.entries.some((e) => e.interpolated) ? (
            <ShellNote>{t("envDiff.interpolationNote")}</ShellNote>
          ) : null}
          {output.entriesTruncated ? <ShellNote>{t("envDiff.truncated")}</ShellNote> : null}
        </div>
      )}
      exit={(output) => ({
        text: markdown(output),
        json: output,
        filename: "env-diff.md",
        mimeType: "text/markdown;charset=utf-8",
      })}
      note={t("envDiff.privacy")}
    />
  );
}

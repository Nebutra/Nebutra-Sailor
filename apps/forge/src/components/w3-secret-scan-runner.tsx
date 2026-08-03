"use client";

import {
  type SecretFinding,
  type SecretScanInput,
  type SecretScanOutput,
  scanSecrets,
  secretRuleLabel,
  secretScanInputSchema,
} from "@nebutra/forge-runtime/secret-scan";
import { useTranslations } from "next-intl";
import { BatchWorkspace } from "@/components/batch-workspace";
import {
  DropVerdictShell,
  ShellBadge,
  ShellCode,
  ShellDrill,
  ShellNote,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";

const CONFIDENCE_TONE: Record<SecretFinding["confidence"], ShellTone> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

/** Clean is green; anything high-confidence is red, everything else amber. */
function verdictTone(output: SecretScanOutput): ShellTone {
  if (output.verdict === "clean") return "success";
  return output.counts.high > 0 ? "danger" : "warning";
}

/**
 * Detector · secret-scan (brief: docs/plans/tools/secret-scan.md, archetype §8).
 *
 * Drop-and-verdict with an explicit first Scan: a security tool should not
 * flash "no secrets found" at a half-typed paste, but once the user has asked
 * the question, edits re-answer it on a short debounce (§9.1 step 3).
 *
 * The engine runs *in this component*, not over the network — the paste never
 * leaves the browser, which is the whole trust proposition of the category
 * (§9.3, ship gate §6.5 #8). It is byte-for-byte the same `scanSecrets` the
 * agent API runs server-side, parsed through the same zod schema, so the human
 * page and the OpenAPI/MCP surface cannot drift.
 */
export function W3SecretScanRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");

  const confidenceLabel = (confidence: SecretFinding["confidence"]) =>
    t(`secretScan.confidence.${confidence}`);

  const single = (
    <DropVerdictShell<SecretScanOutput>
      engine={{
        // `compute` wins over `toolId` in the shell, which is the point: the
        // paste stays local. `toolId` is carried anyway so the page names the
        // identical server operation an agent would call.
        toolId,
        compute: (input) => scanSecrets(secretScanInputSchema.parse(input) as SecretScanInput),
      }}
      dropLabel={t("secretScan.dropLabel")}
      privacyNote={t("secretScan.privacy")}
      accept=".env,.txt,.json,.yml,.yaml,.log,.conf,.ini,.js,.ts,.py,.go,.rb,.sh,text/*"
      paste={{
        label: t("secretScan.pasteLabel"),
        placeholder: t("secretScan.pastePlaceholder"),
        rows: 12,
      }}
      action={{
        label: t("secretScan.scan"),
        runningLabel: t("secretScan.scanning"),
        mode: "first",
      }}
      debounceMs={300}
      buildInput={(source) => {
        const text =
          source.kind === "text"
            ? source.text
            : new TextDecoder("utf-8", { fatal: false }).decode(source.bytes);
        // An empty box is not an error and not a clean bill of health — the
        // shell's idle state is the only honest answer here (§9.1 step 6).
        return text.trim().length === 0 ? null : { text };
      }}
      idle={
        <div className="space-y-1">
          <p className="text-sm text-[var(--neutral-11)]">{t("secretScan.idleTitle")}</p>
          <ShellNote>{t("secretScan.idleHint")}</ShellNote>
        </div>
      }
      note={t("secretScan.scopeNote")}
      exit={(output) => ({
        text: [
          t("secretScan.reportTitle"),
          ...output.findings.map(
            (f) =>
              `L${f.line}:${f.column}\t[${f.confidence}]\t${f.label}\t${f.maskedValue}\t${f.reason}`,
          ),
        ].join("\n"),
        json: output,
        filename: "secret-scan-findings.txt",
        mimeType: "text/plain;charset=utf-8",
      })}
      renderVerdict={(output) => (
        <div className="space-y-3">
          <ShellVerdict
            tone={verdictTone(output)}
            headline={
              output.verdict === "clean"
                ? t("secretScan.clean")
                : t("secretScan.found", { n: output.findingCount })
            }
            caveat={
              output.verdict === "clean" ? t("secretScan.cleanCaveat") : t("secretScan.foundCaveat")
            }
            badges={
              output.verdict === "found" ? (
                <>
                  {output.counts.high > 0 ? (
                    <ShellBadge tone="danger">
                      {t("secretScan.countHigh", { n: output.counts.high })}
                    </ShellBadge>
                  ) : null}
                  {output.counts.medium > 0 ? (
                    <ShellBadge tone="warning">
                      {t("secretScan.countMedium", { n: output.counts.medium })}
                    </ShellBadge>
                  ) : null}
                  {output.counts.low > 0 ? (
                    <ShellBadge>{t("secretScan.countLow", { n: output.counts.low })}</ShellBadge>
                  ) : null}
                </>
              ) : null
            }
          />
          {output.findings.length > 0 ? (
            <ul className="space-y-2">
              {output.findings.map((finding) => (
                <li
                  key={`${finding.line}-${finding.column}-${finding.type}`}
                  className="space-y-2 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ShellBadge tone={CONFIDENCE_TONE[finding.confidence]}>
                      {confidenceLabel(finding.confidence)}
                    </ShellBadge>
                    <span className="text-sm font-medium text-[var(--neutral-12)]">
                      {finding.label}
                    </span>
                    <ShellBadge>
                      {t("secretScan.position", { line: finding.line, column: finding.column })}
                    </ShellBadge>
                    <ShellBadge>{t("secretScan.length", { n: finding.valueLength })}</ShellBadge>
                  </div>
                  <ShellCode label={t("secretScan.maskedLabel")}>{finding.maskedValue}</ShellCode>
                  <ShellDrill summary={t("secretScan.why")}>
                    <div className="space-y-2">
                      <p className="text-sm text-[var(--neutral-11)]">{finding.reason}</p>
                      <p className="font-mono text-xs text-[var(--neutral-10)]">{finding.type}</p>
                      {finding.candidates && finding.candidates.length > 0 ? (
                        <div className="space-y-1">
                          <ShellNote>{t("secretScan.candidates")}</ShellNote>
                          <div className="flex flex-wrap gap-1.5">
                            {finding.candidates.map((id) => (
                              <ShellBadge key={id}>{secretRuleLabel(id) ?? id}</ShellBadge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </ShellDrill>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      detailLabel={t("secretScan.scanDetail")}
      renderDetail={(output) => (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <ShellBadge>{t("secretScan.lines", { n: output.lineCount })}</ShellBadge>
            <ShellBadge>{t("secretScan.bytes", { n: output.scannedBytes })}</ShellBadge>
            {output.suppressedCount > 0 ? (
              <ShellBadge tone="info">
                {t("secretScan.suppressed", { n: output.suppressedCount })}
              </ShellBadge>
            ) : null}
            {output.omittedCount > 0 ? (
              <ShellBadge tone="warning">
                {t("secretScan.omitted", { n: output.omittedCount })}
              </ShellBadge>
            ) : null}
            {output.truncated ? (
              <ShellBadge tone="warning">{t("secretScan.truncated")}</ShellBadge>
            ) : null}
          </div>
          <ShellNote>{t("secretScan.suppressedNote")}</ShellNote>
        </div>
      )}
    />
  );

  return (
    <BatchWorkspace
      toolId={toolId}
      accept="files"
      resultKind="json"
      maxItems={50}
      buildItemInput={async (raw) => {
        if (typeof raw === "string") return { text: raw };
        const text = await raw.text();
        return { text };
      }}
      sharedHint={t("secretScan.privacy")}
    >
      {single}
    </BatchWorkspace>
  );
}

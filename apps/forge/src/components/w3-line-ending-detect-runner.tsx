"use client";

/**
 * Line ending detector — drop-and-verdict (brief §8).
 *
 * File (or paste) in, one headline answer out: LF / CRLF / CR, consistent or
 * mixed. The per-style counts, the stray line numbers, the trailing-newline
 * state and the BOM sit under the disclosure — present, but subordinate to the
 * one sentence the user came for.
 *
 * No convert buttons: this tool diagnoses, the Converter root rewrites. When
 * the bytes do not look like UTF-8 the verdict hands off to the encoding
 * detector instead of emitting a confident wrong count.
 */
import { useTranslations } from "next-intl";
import {
  bytesToBase64,
  DropVerdictShell,
  ShellBadge,
  ShellNote,
  type ShellSource,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";

interface Counts {
  lf: number;
  crlf: number;
  cr: number;
}

interface Finding {
  code: string;
  level: "info" | "warning" | "danger";
  message: string;
}

interface Output {
  dominant: "LF" | "CRLF" | "CR" | "none";
  isMixed: boolean;
  counts: Counts;
  ratios: Counts;
  totalLines: number;
  byteSize: number;
  trailingNewline: "present" | "absent";
  bom: "utf8" | "none";
  decodeWarning?: string;
  source: "text" | "file";
  sampled: boolean;
  sourceBytes: number;
  minorityLines: number[];
  minorityLinesTruncated: boolean;
  findings: Finding[];
}

/** Matches the tool's default detection window, so the shell reads what the API scans. */
const READ_BYTES = 262_144;

const STYLES = ["lf", "crlf", "cr"] as const;
type StyleKey = (typeof STYLES)[number];

function pct(ratio: number): string {
  return (ratio * 100).toFixed(1);
}

function toneOf(output: Output): ShellTone {
  if (output.findings.some((f) => f.level === "danger") || output.decodeWarning) return "danger";
  if (output.isMixed || output.findings.some((f) => f.level === "warning")) return "warning";
  if (output.dominant === "none") return "neutral";
  return "success";
}

export function W3LineEndingDetectRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");

  const headline = (o: Output): string => {
    if (o.byteSize === 0) return t("lineEndingDetect.empty");
    if (o.dominant === "none") return t("lineEndingDetect.noTerminator");
    if (!o.isMixed) {
      return t("lineEndingDetect.consistent", { style: t(`lineEndingDetect.style.${o.dominant}`) });
    }
    const parts = STYLES.filter((s) => o.counts[s] > 0).map((s) =>
      t("lineEndingDetect.sharePart", { style: s.toUpperCase(), pct: pct(o.ratios[s]) }),
    );
    return t("lineEndingDetect.mixed", { parts: parts.join(", ") });
  };

  const exitText = (o: Output): string => {
    const lines = [
      headline(o),
      t("lineEndingDetect.lines", { n: o.totalLines }),
      t("lineEndingDetect.bytes", { n: o.byteSize }),
      t(`lineEndingDetect.trailing.${o.trailingNewline}`),
      o.bom === "utf8" ? t("lineEndingDetect.bomUtf8") : t("lineEndingDetect.bomNone"),
      ...STYLES.filter((s) => o.counts[s] > 0).map((s) =>
        t("lineEndingDetect.countRow", {
          style: s.toUpperCase(),
          n: o.counts[s],
          pct: pct(o.ratios[s]),
        }),
      ),
      ...o.findings.map((f) => `[${f.level}] ${f.message}`),
    ];
    return lines.join("\n");
  };

  return (
    <DropVerdictShell<Output>
      engine={{ toolId, parse: (o) => o as unknown as Output }}
      dropLabel={t("lineEndingDetect.dropLabel")}
      privacyNote={t("lineEndingDetect.privacy")}
      maxReadBytes={READ_BYTES}
      paste={{
        label: t("lineEndingDetect.pasteLabel"),
        placeholder: t("lineEndingDetect.pastePlaceholder"),
        rows: 8,
      }}
      buildInput={(source: ShellSource) => {
        if (source.kind === "text") return source.text ? { text: source.text } : null;
        return source.bytes.length > 0
          ? { fileBase64: bytesToBase64(source.bytes), filename: source.name }
          : null;
      }}
      idle={<ShellNote>{t("lineEndingDetect.idle")}</ShellNote>}
      detailLabel={t("lineEndingDetect.detail")}
      note={t("lineEndingDetect.note")}
      exit={(o) => ({
        text: exitText(o),
        json: o,
        filename: "line-endings.txt",
        mimeType: "text/plain;charset=utf-8",
      })}
      renderVerdict={(o) => (
        <ShellVerdict
          tone={toneOf(o)}
          headline={headline(o)}
          caveat={
            o.decodeWarning ? (
              <>
                {o.decodeWarning}{" "}
                <a className="text-[var(--blue-11)] underline" href="/t/encoding-detect">
                  {t("lineEndingDetect.encodingLink")}
                </a>
              </>
            ) : undefined
          }
          badges={
            <>
              <ShellBadge>{t("lineEndingDetect.lines", { n: o.totalLines })}</ShellBadge>
              <ShellBadge>{t("lineEndingDetect.bytes", { n: o.byteSize })}</ShellBadge>
              <ShellBadge tone={o.trailingNewline === "present" ? "neutral" : "warning"}>
                {t(`lineEndingDetect.trailing.${o.trailingNewline}`)}
              </ShellBadge>
              {o.bom === "utf8" ? (
                <ShellBadge tone="warning">{t("lineEndingDetect.bomUtf8")}</ShellBadge>
              ) : null}
            </>
          }
        />
      )}
      renderDetail={(o) => (
        <div className="space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--neutral-10)]">
                <th className="py-1 font-medium">{t("lineEndingDetect.colStyle")}</th>
                <th className="py-1 font-medium">{t("lineEndingDetect.colCount")}</th>
                <th className="py-1 font-medium">{t("lineEndingDetect.colShare")}</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[var(--neutral-12)]">
              {STYLES.map((style: StyleKey) => (
                <tr key={style}>
                  <td className="py-1">{t(`lineEndingDetect.style.${style.toUpperCase()}`)}</td>
                  <td className="py-1">{o.counts[style]}</td>
                  <td className="py-1">{`${pct(o.ratios[style])}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {o.minorityLines.length > 0 ? (
            <p className="text-sm text-[var(--neutral-11)]">
              {t("lineEndingDetect.minorityLines", {
                lines: o.minorityLines.join(", "),
              })}
              {o.minorityLinesTruncated ? ` ${t("lineEndingDetect.andMore")}` : ""}
            </p>
          ) : null}

          {o.findings.length > 0 ? (
            <ul className="space-y-1.5" aria-label={t("lineEndingDetect.findings")}>
              {o.findings.map((f) => (
                <li key={f.code} className="flex flex-wrap gap-2">
                  <ShellBadge
                    tone={
                      f.level === "danger" ? "danger" : f.level === "warning" ? "warning" : "info"
                    }
                  >
                    {t(`lineEndingDetect.level.${f.level}`)}
                  </ShellBadge>
                  <span className="flex-1 text-sm text-[var(--neutral-11)]">{f.message}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {o.sampled ? (
            <ShellNote>
              {t("lineEndingDetect.sampled", { n: o.byteSize, total: o.sourceBytes })}
            </ShellNote>
          ) : null}
        </div>
      )}
    />
  );
}

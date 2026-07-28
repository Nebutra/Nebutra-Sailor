"use client";

import { useTranslations } from "next-intl";
import {
  bytesToBase64,
  DropVerdictShell,
  ShellBadge,
  ShellCode,
  ShellNote,
  type ShellSource,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";

/** Mirrors the `text/encoding-detect` output contract. */
interface EncodingCandidate {
  encoding: string;
  confidence: number;
}

interface EncodingDetectOutput {
  primary: {
    encoding: string;
    confidence: number;
    bomDetected: boolean;
    bomBytes?: string;
  };
  candidates: EncodingCandidate[];
  lineEndings: { lf: number; cr: number; crlf: number; mixed: boolean };
  byteStats: {
    totalBytes: number;
    asciiCount: number;
    highByteCount: number;
    nullByteCount: number;
  };
  languageGuess?: { language: string; confidence: number };
  sampled: boolean;
  sourceBytes: number;
  warnings?: string[];
  warning?: string;
  mojibake?: { suspected: true; recovered: string };
}

/** Detection reads a bounded head sample: encoding is a file-level property. */
const SAMPLE_BYTES = 262_144;

function toneFor(confidence: number, encoding: string): ShellTone {
  if (encoding === "binary") return "warning";
  if (confidence >= 90) return "success";
  if (confidence >= 60) return "info";
  return "warning";
}

function barColor(confidence: number): string {
  if (confidence >= 90) return "var(--status-success)";
  if (confidence >= 60) return "var(--status-warning)";
  return "var(--status-danger)";
}

function reportText(o: EncodingDetectOutput): string {
  const lines = [
    `encoding: ${o.primary.encoding} (${o.primary.confidence}%)`,
    `bom: ${o.primary.bomDetected ? (o.primary.bomBytes ?? "yes") : "none"}`,
    `line endings: LF ${o.lineEndings.lf} / CR ${o.lineEndings.cr} / CRLF ${o.lineEndings.crlf}${
      o.lineEndings.mixed ? " (mixed)" : ""
    }`,
    `bytes: ${o.byteStats.totalBytes} total / ${o.byteStats.asciiCount} ascii / ${o.byteStats.highByteCount} high / ${o.byteStats.nullByteCount} nul`,
    `candidates: ${o.candidates.map((c) => `${c.encoding} ${c.confidence}%`).join(", ")}`,
  ];
  if (o.languageGuess) {
    lines.push(`language: ${o.languageGuess.language} (${o.languageGuess.confidence}%)`);
  }
  if (o.mojibake) lines.push(`mojibake recovered: ${o.mojibake.recovered}`);
  if (o.warning) lines.push(`note: ${o.warning}`);
  return lines.join("\n");
}

export function W3EncodingDetectRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");

  const buildInput = (source: ShellSource): Record<string, unknown> | null => {
    if (source.kind === "text") {
      return source.text.length > 0 ? { text: source.text, sampleBytes: SAMPLE_BYTES } : null;
    }
    if (source.bytes.length === 0) return null;
    return {
      fileBase64: bytesToBase64(source.bytes),
      filename: source.name,
      sampleBytes: SAMPLE_BYTES,
    };
  };

  const renderVerdict = (o: EncodingDetectOutput) => {
    const isBinary = o.primary.encoding === "binary";
    const eol =
      o.lineEndings.crlf > 0 && o.lineEndings.lf === 0 && o.lineEndings.cr === 0
        ? "CRLF"
        : o.lineEndings.lf > 0 && o.lineEndings.crlf === 0 && o.lineEndings.cr === 0
          ? "LF"
          : o.lineEndings.cr > 0 && o.lineEndings.lf === 0 && o.lineEndings.crlf === 0
            ? "CR"
            : null;
    return (
      <ShellVerdict
        tone={toneFor(o.primary.confidence, o.primary.encoding)}
        headline={
          isBinary
            ? t("encodingDetect.notText")
            : t("encodingDetect.headline", {
                encoding: o.primary.encoding,
                confidence: o.primary.confidence,
              })
        }
        caveat={o.warning}
        badges={
          <>
            <ShellBadge tone={o.primary.bomDetected ? "info" : "neutral"}>
              {o.primary.bomDetected
                ? t("encodingDetect.bomPresent", { bytes: o.primary.bomBytes ?? "" })
                : t("encodingDetect.bomAbsent")}
            </ShellBadge>
            <ShellBadge tone={o.lineEndings.mixed ? "warning" : "neutral"}>
              {o.lineEndings.mixed
                ? t("encodingDetect.eolMixed")
                : t("encodingDetect.eol", { kind: eol ?? "—" })}
            </ShellBadge>
            {o.languageGuess ? (
              <ShellBadge>
                {t("encodingDetect.language", {
                  language: o.languageGuess.language,
                  confidence: o.languageGuess.confidence,
                })}
              </ShellBadge>
            ) : null}
            {o.sampled ? (
              <ShellBadge tone="info">
                {t("encodingDetect.sampled", {
                  kb: Math.round(o.byteStats.totalBytes / 1024),
                  totalKb: Math.round(o.sourceBytes / 1024),
                })}
              </ShellBadge>
            ) : null}
          </>
        }
      />
    );
  };

  const renderDetail = (o: EncodingDetectOutput) => (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[var(--neutral-11)]">
          {t("encodingDetect.candidates")}
        </h3>
        <ul className="space-y-1.5">
          {o.candidates.map((c) => (
            <li key={c.encoding} className="flex items-center gap-3">
              <span className="w-32 shrink-0 font-mono text-sm text-[var(--neutral-12)]">
                {c.encoding}
              </span>
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--neutral-4)]">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${c.confidence}%`, background: barColor(c.confidence) }}
                />
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-xs text-[var(--neutral-11)]">
                {c.confidence}%
              </span>
            </li>
          ))}
        </ul>
        <ShellNote>{t("encodingDetect.candidatesNote")}</ShellNote>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[var(--neutral-11)]">
          {t("encodingDetect.lineEndings")}
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <Stat label="LF" value={o.lineEndings.lf} />
          <Stat label="CR" value={o.lineEndings.cr} />
          <Stat label="CRLF" value={o.lineEndings.crlf} />
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-[var(--neutral-11)]">
          {t("encodingDetect.byteStats")}
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <Stat label={t("encodingDetect.totalBytes")} value={o.byteStats.totalBytes} />
          <Stat label={t("encodingDetect.asciiBytes")} value={o.byteStats.asciiCount} />
          <Stat label={t("encodingDetect.highBytes")} value={o.byteStats.highByteCount} />
          <Stat label={t("encodingDetect.nullBytes")} value={o.byteStats.nullByteCount} />
        </dl>
      </section>

      {o.mojibake ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-[var(--neutral-11)]">
            {t("encodingDetect.mojibake")}
          </h3>
          <ShellCode label={t("encodingDetect.mojibake")}>{o.mojibake.recovered}</ShellCode>
        </section>
      ) : null}

      {o.warnings && o.warnings.length > 1 ? (
        <ul className="space-y-1">
          {o.warnings.map((w) => (
            <li key={w} className="text-xs text-[var(--neutral-10)]">
              {w}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <DropVerdictShell<EncodingDetectOutput>
      engine={{ toolId }}
      dropLabel={t("encodingDetect.drop")}
      privacyNote={t("encodingDetect.privacy", { kb: SAMPLE_BYTES / 1024 })}
      maxReadBytes={SAMPLE_BYTES}
      paste={{
        label: t("encodingDetect.pasteLabel"),
        placeholder: t("encodingDetect.pastePlaceholder"),
        rows: 6,
      }}
      buildInput={buildInput}
      renderVerdict={renderVerdict}
      renderDetail={renderDetail}
      detailLabel={t("encodingDetect.detail")}
      idle={<ShellNote>{t("encodingDetect.idle")}</ShellNote>}
      exit={(o) => ({
        text: reportText(o),
        json: o,
        filename: "encoding-report.txt",
      })}
      note={t("encodingDetect.readOnly")}
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-[var(--neutral-10)]">{label}</dt>
      <dd className="font-mono text-sm text-[var(--neutral-12)]">{value}</dd>
    </div>
  );
}

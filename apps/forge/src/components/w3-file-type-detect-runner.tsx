"use client";

/**
 * file-type-detect — drop-and-verdict (brief §8): a file (or raw hex) in, one
 * clear answer out, the hex dump and the candidate list behind a disclosure.
 * The shell owns layout, idle/running/error and the invoke call; this file
 * supplies the input mapping, the verdict rendering and the labels.
 */

import { useTranslations } from "next-intl";
import {
  bytesToBase64,
  DropVerdictShell,
  ShellBadge,
  ShellCode,
  type ShellExit,
  ShellNote,
  type ShellSource,
  type ShellTone,
  ShellVerdict,
} from "./journey-shells";

/** Only the header sample is read — enough for TAR's offset-257 marker. */
const HEADER_BYTES = 8192;

interface DetectOutput {
  source: "file" | "hex";
  bytesRead: number;
  truncated: boolean;
  detectedType: string | null;
  detectedMime: string | null;
  detectedExtension: string | null;
  confidence: "match" | "container-only" | "ambiguous" | "none";
  reportedMime: string | null;
  filenameExtension: string | null;
  matchedSignature: { id: string; hex: string; offset: number; category: string } | null;
  candidates: { id: string; name: string; offset: number; hex: string }[];
  containerDrillDown: {
    kind: string;
    resolvedType: string | null;
    evidence: string[];
    note?: string;
  } | null;
  mismatch: "none" | "benign" | "mismatch" | "high-risk";
  mismatchReason: string;
  polyglot: {
    detected: boolean;
    embedded: { format: string; offset: number }[];
    note: string | null;
  };
  entropyBitsPerByte: number;
  textHints: string[];
  hexDump: string;
  asciiPreview: string;
  summary: string;
  signatureCount: number;
}

const MISMATCH_TONE: Record<DetectOutput["mismatch"], ShellTone> = {
  none: "success",
  benign: "info",
  mismatch: "warning",
  "high-risk": "danger",
};

const MISMATCH_LABEL: Record<DetectOutput["mismatch"], string> = {
  none: "fileTypeDetect.tierNone",
  benign: "fileTypeDetect.tierBenign",
  mismatch: "fileTypeDetect.tierMismatch",
  "high-risk": "fileTypeDetect.tierHighRisk",
};

const CONFIDENCE_LABEL: Record<DetectOutput["confidence"], string> = {
  match: "fileTypeDetect.confidenceMatch",
  "container-only": "fileTypeDetect.confidenceContainer",
  ambiguous: "fileTypeDetect.confidenceAmbiguous",
  none: "fileTypeDetect.confidenceNone",
};

export function W3FileTypeDetectRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const dash = t("fileTypeDetect.unset");

  const buildInput = (source: ShellSource): Record<string, unknown> | null => {
    if (source.kind === "file") {
      if (source.bytes.length === 0) return null;
      return {
        fileBase64: bytesToBase64(source.bytes),
        filename: source.name,
        maxBytesRead: HEADER_BYTES,
        ...(source.type ? { reportedMime: source.type } : {}),
      };
    }
    const hex = source.text.trim();
    return hex ? { hex, maxBytesRead: HEADER_BYTES } : null;
  };

  const signal = (label: string, value: string | null) => (
    <div key={label} className="space-y-0.5">
      <p className="text-xs text-[var(--neutral-10)]">{label}</p>
      <p className="font-mono text-sm text-[var(--neutral-12)]">{value ?? dash}</p>
    </div>
  );

  const renderVerdict = (out: DetectOutput) => (
    <div className="space-y-3">
      <ShellVerdict
        tone={out.detectedType ? MISMATCH_TONE[out.mismatch] : "neutral"}
        headline={out.detectedType ?? t("fileTypeDetect.unknownType")}
        caveat={out.mismatchReason || undefined}
        badges={
          <>
            <ShellBadge tone={MISMATCH_TONE[out.mismatch]}>
              {t(MISMATCH_LABEL[out.mismatch])}
            </ShellBadge>
            <ShellBadge tone="neutral">{t(CONFIDENCE_LABEL[out.confidence])}</ShellBadge>
            {out.polyglot.detected ? (
              <ShellBadge tone="warning">{t("fileTypeDetect.polyglot")}</ShellBadge>
            ) : null}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4 sm:grid-cols-3">
        {signal(t("fileTypeDetect.signalDetected"), out.detectedMime)}
        {signal(t("fileTypeDetect.signalReported"), out.reportedMime)}
        {signal(
          t("fileTypeDetect.signalExtension"),
          out.filenameExtension ? `.${out.filenameExtension}` : null,
        )}
      </div>
      {out.containerDrillDown ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4">
          <p className="text-sm text-[var(--neutral-12)]">
            {out.containerDrillDown.resolvedType
              ? t("fileTypeDetect.drillResolved", {
                  kind: out.containerDrillDown.kind,
                  type: out.containerDrillDown.resolvedType,
                })
              : t("fileTypeDetect.drillUnresolved", { kind: out.containerDrillDown.kind })}
          </p>
          {out.containerDrillDown.evidence.length > 0 ? (
            <p className="mt-1 font-mono text-xs text-[var(--neutral-10)]">
              {out.containerDrillDown.evidence.join(" · ")}
            </p>
          ) : null}
          <ShellNote>{out.containerDrillDown.note}</ShellNote>
        </div>
      ) : null}
      {out.polyglot.note ? <ShellNote>{out.polyglot.note}</ShellNote> : null}
    </div>
  );

  const renderDetail = (out: DetectOutput) => (
    <div className="space-y-3">
      <ShellCode label={t("fileTypeDetect.hexDump")}>{out.hexDump}</ShellCode>
      <div className="space-y-1 text-sm text-[var(--neutral-11)]">
        <p>
          {t("fileTypeDetect.bytesRead", { n: out.bytesRead })}
          {out.truncated ? ` · ${t("fileTypeDetect.headerOnly")}` : ""}
        </p>
        <p>{t("fileTypeDetect.entropy", { bits: out.entropyBitsPerByte })}</p>
        <p>{t("fileTypeDetect.signatureCount", { n: out.signatureCount })}</p>
        {out.textHints.length > 0 ? (
          <p>{t("fileTypeDetect.textHints", { hints: out.textHints.join(", ") })}</p>
        ) : null}
      </div>
      {out.candidates.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-[var(--neutral-10)]">{t("fileTypeDetect.candidates")}</p>
          {out.candidates.map((c) => (
            <p key={c.id} className="font-mono text-xs text-[var(--neutral-11)]">
              {c.name} · {t("fileTypeDetect.atOffset", { offset: c.offset })} · {c.hex}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );

  const exit = (out: DetectOutput): ShellExit => ({
    text: out.summary,
    json: out,
    filename: "file-type-detect.txt",
  });

  return (
    <DropVerdictShell<DetectOutput>
      engine={{ toolId, parse: (raw) => raw as unknown as DetectOutput }}
      dropLabel={t("fileTypeDetect.drop")}
      privacyNote={t("fileTypeDetect.privacy", { kb: Math.round(HEADER_BYTES / 1024) })}
      maxReadBytes={HEADER_BYTES}
      paste={{
        label: t("fileTypeDetect.hexTab"),
        placeholder: "89 50 4E 47 0D 0A 1A 0A",
        rows: 4,
        mode: "tab",
      }}
      buildInput={buildInput}
      renderVerdict={renderVerdict}
      renderDetail={renderDetail}
      detailLabel={t("fileTypeDetect.detail")}
      idle={<ShellNote>{t("fileTypeDetect.idle")}</ShellNote>}
      exit={exit}
      note={t("fileTypeDetect.note")}
    />
  );
}

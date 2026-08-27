"use client";

/**
 * exif-strip — drop-and-verdict (brief §8): one image in, one line saying what
 * left the file, the per-block list behind a disclosure, and a download of the
 * cleaned file. The shell owns layout, idle/running/error and the invoke call.
 *
 * Two things this file adds that the shared exits cannot: a *binary* download
 * (the shell's exit actions write text), and a keep-thumbnail checkbox that is
 * off by default — an Exif thumbnail survives a crop and can still show the
 * pre-crop frame, so keeping it is the deliberate choice, not the default.
 */

import { Download } from "@nebutra/icons";
import { Button, Checkbox } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  bytesToBase64,
  DropVerdictShell,
  ShellBadge,
  type ShellExit,
  ShellNote,
  type ShellSource,
  ShellVerdict,
} from "@/components/journey-shells";

/** The stated ceiling, plus a slice of slack so an oversize drop still reaches
 * the engine's honest `file_too_large` rather than being silently truncated. */
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const READ_BYTES = MAX_INPUT_BYTES + 1024;

type RemovedSegment = "exif" | "iptc" | "xmp" | "comment" | "text" | "time" | "vendor";

interface RemovedDetail {
  segment: RemovedSegment;
  container: string;
  fields: number;
  bytes: number;
}

/** Mirrors the `image/exif-strip` output contract. */
interface ExifStripOutput {
  imageBase64: string;
  contentType: string;
  format: "jpeg" | "png" | "webp";
  bytesIn: number;
  bytesOut: number;
  bytesRemoved: number;
  fieldsRemoved: number;
  removedSegments: RemovedSegment[];
  removedDetail: RemovedDetail[];
  preserved: { orientation: boolean; colorProfile: boolean };
  orientationTag: number | null;
  colorProfileFound: boolean;
  thumbnailFound: boolean;
  thumbnailKept: boolean;
  verdict: "stripped" | "no_metadata_found";
}

const SEGMENT_LABEL: Record<RemovedSegment, string> = {
  exif: "exifStrip.segmentExif",
  iptc: "exifStrip.segmentIptc",
  xmp: "exifStrip.segmentXmp",
  comment: "exifStrip.segmentComment",
  text: "exifStrip.segmentText",
  time: "exifStrip.segmentTime",
  vendor: "exifStrip.segmentVendor",
};

const EXTENSION: Record<ExifStripOutput["format"], string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

function kb(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

/** The cleaned file is bytes, not text — the shared text exit cannot carry it. */
function downloadImage(out: ExifStripOutput): void {
  const anchor = document.createElement("a");
  anchor.href = `data:${out.contentType};base64,${out.imageBase64}`;
  anchor.download = `clean.${EXTENSION[out.format]}`;
  anchor.rel = "noopener";
  anchor.click();
}

export function W3ExifStripRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [keepThumbnail, setKeepThumbnail] = useState(false);

  const buildInput = (source: ShellSource): Record<string, unknown> | null => {
    if (source.kind !== "file" || source.bytes.length === 0) return null;
    return { imageBase64: bytesToBase64(source.bytes), keepThumbnail };
  };

  const renderVerdict = (out: ExifStripOutput) => {
    const stripped = out.verdict === "stripped";
    return (
      <div className="space-y-3">
        <ShellVerdict
          tone={stripped ? "success" : "info"}
          headline={
            stripped
              ? t("exifStrip.verdictStripped", {
                  fields: out.fieldsRemoved,
                  kb: kb(out.bytesRemoved),
                })
              : t("exifStrip.verdictClean")
          }
          caveat={stripped ? t("exifStrip.strippedCaveat") : t("exifStrip.cleanCaveat")}
          badges={
            <>
              <ShellBadge tone={out.preserved.orientation ? "success" : "warning"}>
                {out.preserved.orientation
                  ? t("exifStrip.badgeOrientationKept")
                  : t("exifStrip.badgeOrientationLost")}
              </ShellBadge>
              {out.colorProfileFound ? (
                <ShellBadge tone="success">{t("exifStrip.badgeColorProfileKept")}</ShellBadge>
              ) : null}
              {out.thumbnailFound ? (
                <ShellBadge tone={out.thumbnailKept ? "warning" : "success"}>
                  {out.thumbnailKept
                    ? t("exifStrip.badgeThumbnailKept")
                    : t("exifStrip.badgeThumbnailRemoved")}
                </ShellBadge>
              ) : null}
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ink" onClick={() => downloadImage(out)}>
            <Download className="h-4 w-4" />
            {t("exifStrip.download")}
          </Button>
          <span className="text-xs text-[var(--neutral-10)]">
            {t("exifStrip.sizes", { before: kb(out.bytesIn), after: kb(out.bytesOut) })}
          </span>
        </div>
      </div>
    );
  };

  const renderDetail = (out: ExifStripOutput) => (
    <div className="space-y-3">
      {out.removedDetail.length > 0 ? (
        <div className="space-y-1">
          {out.removedDetail.map((d) => (
            <p key={d.container} className="text-sm text-[var(--neutral-11)]">
              <span className="font-mono text-[var(--neutral-12)]">{d.container}</span>
              {" · "}
              {t(SEGMENT_LABEL[d.segment])}
              {" · "}
              {t("exifStrip.detailFields", { fields: d.fields, kb: kb(d.bytes) })}
            </p>
          ))}
        </div>
      ) : (
        <ShellNote>{t("exifStrip.detailNothing")}</ShellNote>
      )}
      <ShellNote>
        {out.orientationTag === null
          ? t("exifStrip.detailNoOrientation")
          : t("exifStrip.detailOrientation", { value: out.orientationTag })}
      </ShellNote>
    </div>
  );

  const exit = (out: ExifStripOutput): ShellExit => {
    const { imageBase64: _cleaned, ...report } = out;
    return {
      text:
        out.verdict === "stripped"
          ? t("exifStrip.summaryStripped", {
              fields: out.fieldsRemoved,
              families: out.removedSegments.join(", "),
              kb: kb(out.bytesRemoved),
            })
          : t("exifStrip.summaryClean"),
      json: report,
    };
  };

  return (
    <DropVerdictShell<ExifStripOutput>
      engine={{ toolId, parse: (raw) => raw as unknown as ExifStripOutput }}
      dropLabel={t("exifStrip.drop")}
      privacyNote={t("exifStrip.privacy", { mb: Math.round(MAX_INPUT_BYTES / (1024 * 1024)) })}
      accept="image/jpeg,image/png,image/webp"
      maxReadBytes={READ_BYTES}
      optionsKey={String(keepThumbnail)}
      options={
        <Checkbox checked={keepThumbnail} onChange={setKeepThumbnail}>
          {t("exifStrip.optKeepThumbnail")}
        </Checkbox>
      }
      buildInput={buildInput}
      renderVerdict={renderVerdict}
      renderDetail={renderDetail}
      detailLabel={t("exifStrip.detail")}
      idle={<ShellNote>{t("exifStrip.idle")}</ShellNote>}
      exit={exit}
      note={t("exifStrip.note")}
    />
  );
}

"use client";

/**
 * Rotate & flip image — instant transform (brief §8).
 *
 * Drop an image and the preview reacts to every preset, toggle and degree:
 * there is no "Apply" step, because rotation is cheap and previewable and a
 * button in front of it is a step tax. The one deliberate action is Download,
 * which is also the only primary-styled control on the page (§9.2).
 *
 * What the brief asks this surface to carry that competitors do not (§9.3):
 *  - a numeric degree field paired with the slider, for someone who knows the
 *    exact correction ("this scan is off by 2.3°") and should not have to drag;
 *  - the fit-mode choice, revealed only once the angle stops being a multiple
 *    of 90 — before that the decision does not exist and the control is noise;
 *  - EXIF orientation stated out loud when it was resolved, so "my rotate did
 *    the opposite of what I clicked" never has to be guessed at.
 *
 * Layout follows the house grammar: one column, tonal panels, no borders, no
 * component-level focus rings. The preview is a display downscale only — the
 * bytes the Download button writes are always full resolution.
 */
import {
  ArrowLeftRight,
  ArrowUpDown,
  Download,
  RotateClockwise,
  RotateCounterClockwise,
} from "@nebutra/icons";
import { Button, Checkbox, Input, Slider } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useId, useRef, useState } from "react";
import {
  bytesToBase64,
  readFileSample,
  ShellBadge,
  ShellError,
  ShellExitActions,
  ShellNote,
  type ShellTone,
  useShellRun,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-select";

/** Matches the tool's own MAX_INPUT_BYTES — the page must not promise more. */
const MAX_BYTES = 25 * 1024 * 1024;
/** Same epsilon the engine snaps with, so the UI and the answer agree. */
const RIGHT_ANGLE_EPSILON = 0.01;
/** Slider work on a 40 MP original is a real round trip; do not chase every tick. */
const DEBOUNCE_MS = 300;

type FitMode = "expand" | "crop" | "fit";
const SAME_AS_INPUT = "__same__";

interface Output {
  imageBase64: string;
  contentType: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
  inputWidth: number;
  inputHeight: number;
  angleApplied: number;
  snappedToRightAngle: boolean;
  fitModeApplied: FitMode | "n/a";
  appliedOrder: string;
  exifOrientation: number;
  exifOrientationHandled: boolean;
  lossless: boolean;
  reencodeLossy: boolean;
  backgroundApplied: boolean;
}

interface Picked {
  name: string;
  size: number;
  base64: string;
  previewUrl: string;
  key: string;
}

function isRightAngle(angle: number): boolean {
  const wrapped = ((angle % 360) + 360) % 360;
  return Math.abs(wrapped - Math.round(wrapped / 90) * 90) <= RIGHT_ANGLE_EPSILON;
}

/** Keep presets inside the -180..180 contract while still composing turns. */
function wrapAngle(angle: number): number {
  const wrapped = ((angle % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export function W3ImageRotateFlipRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [picked, setPicked] = useState<Picked | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [angle, setAngle] = useState(0);
  const [angleText, setAngleText] = useState("0");
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [fitMode, setFitMode] = useState<FitMode>("expand");
  const [outputFormat, setOutputFormat] = useState<string>(SAME_AS_INPUT);

  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const params = { angle, flipHorizontal, flipVertical, fitMode, outputFormat };
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const { state } = useShellRun<Output>({
    engine: { toolId, parse: (o) => o as unknown as Output },
    getInput: () => {
      const file = pickedRef.current;
      if (!file) return null;
      const p = paramsRef.current;
      return {
        imageBase64: file.base64,
        angle: p.angle,
        flipHorizontal: p.flipHorizontal,
        flipVertical: p.flipVertical,
        fitMode: p.fitMode,
        ...(p.outputFormat === SAME_AS_INPUT ? {} : { outputFormat: p.outputFormat }),
      };
    },
    deps: [picked?.key, angle, flipHorizontal, flipVertical, fitMode, outputFormat],
    debounceMs: DEBOUNCE_MS,
  });

  const take = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.size > MAX_BYTES) {
        setPicked(null);
        setReadError(t("imageRotateFlip.tooLarge", { mb: Math.round(MAX_BYTES / 1024 / 1024) }));
        return;
      }
      try {
        const source = await readFileSample(file, MAX_BYTES);
        if (source.kind !== "file") return;
        const base64 = bytesToBase64(source.bytes);
        setReadError(null);
        setPicked({
          name: file.name,
          size: file.size,
          base64,
          previewUrl: `data:${file.type || "image/*"};base64,${base64}`,
          key: `${file.name}:${file.size}:${file.lastModified}`,
        });
      } catch (err) {
        setPicked(null);
        setReadError(err instanceof Error ? err.message : String(err));
      }
    },
    [t],
  );

  const applyAngle = (next: number) => {
    const value = wrapAngle(next);
    setAngle(value);
    setAngleText(String(round1(value)));
  };

  const reset = () => {
    applyAngle(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setFitMode("expand");
    setOutputFormat(SAME_AS_INPUT);
  };

  const output = state.status === "ready" ? state.output : undefined;
  const showFitMode = !isRightAngle(angle);
  const dirty = angle !== 0 || flipHorizontal || flipVertical;

  const tone: ShellTone = output?.lossless ? "success" : "warning";
  const outUrl = output ? `data:${output.contentType};base64,${output.imageBase64}` : "";
  const download = () => {
    if (!output || !picked) return;
    const anchor = document.createElement("a");
    anchor.href = outUrl;
    anchor.download = `${baseName(picked.name)}-rotated.${output.format === "jpeg" ? "jpg" : output.format}`;
    anchor.rel = "noopener";
    anchor.click();
  };

  return (
    <div className="space-y-4">
      {/* ── source ─────────────────────────────────────────────────────── */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target; the button inside carries keyboard + click */}
      <div
        className={`flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-6 text-center transition-colors ${
          dragging ? "bg-[var(--blue-3)]" : "bg-[var(--neutral-2)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void take(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <p className="text-sm text-[var(--neutral-11)]">{t("imageRotateFlip.drop")}</p>
        <input
          data-allow-native
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,image/avif"
          className="sr-only"
          onChange={(e) => void take(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
          {t("imageRotateFlip.browse")}
        </Button>
        {picked ? (
          <p className="text-xs text-[var(--neutral-10)]">
            {t("imageRotateFlip.selected", {
              name: picked.name,
              kb: (picked.size / 1024).toFixed(1),
            })}
          </p>
        ) : null}
        <p className="text-xs text-[var(--neutral-10)]">{t("imageRotateFlip.privacy")}</p>
      </div>

      {readError ? <ShellError message={readError} /> : null}

      {/* ── controls ───────────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => applyAngle(angle - 90)}>
            <RotateCounterClockwise className="h-4 w-4" />
            {t("imageRotateFlip.ccw")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => applyAngle(angle + 90)}>
            <RotateClockwise className="h-4 w-4" />
            {t("imageRotateFlip.cw")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => applyAngle(angle + 180)}>
            {t("imageRotateFlip.half")}
          </Button>
          {dirty ? (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              {t("imageRotateFlip.reset")}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--neutral-11)]">
          <Checkbox
            id={`${uid}-flip-h`}
            checked={flipHorizontal}
            onChange={(checked: boolean) => setFlipHorizontal(checked)}
          >
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              {t("imageRotateFlip.flipHorizontal")}
            </span>
          </Checkbox>
          <Checkbox
            id={`${uid}-flip-v`}
            checked={flipVertical}
            onChange={(checked: boolean) => setFlipVertical(checked)}
          >
            <span className="inline-flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
              {t("imageRotateFlip.flipVertical")}
            </span>
          </Checkbox>
        </div>

        {/* Slider and exact-degree field stay paired down to small widths — the
            numeric path is the one power users came for (§9.2). */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <Slider
              id={`${uid}-angle`}
              label={t("imageRotateFlip.angle")}
              min={-180}
              max={180}
              step={0.1}
              unit="°"
              value={angle}
              onValueChange={(value: number) => applyAngle(value)}
            />
          </div>
          <Input
            id={`${uid}-angle-exact`}
            label={t("imageRotateFlip.exactAngle")}
            value={angleText}
            inputMode="decimal"
            className="w-28 font-mono"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              const next = e.target.value;
              setAngleText(next);
              const parsed = Number.parseFloat(next);
              if (Number.isFinite(parsed) && parsed >= -180 && parsed <= 180) setAngle(parsed);
            }}
            onBlur={() => setAngleText(String(round1(angle)))}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* The canvas decision does not exist at a multiple of 90 — showing
              the control there would be dead UI (know-how #2). */}
          {showFitMode ? (
            <RunnerSelect
              id={`${uid}-fit`}
              label={t("imageRotateFlip.fitMode")}
              value={fitMode}
              onChange={(value) => setFitMode(value as FitMode)}
              options={[
                { value: "expand", label: t("imageRotateFlip.fitExpand") },
                { value: "crop", label: t("imageRotateFlip.fitCrop") },
                { value: "fit", label: t("imageRotateFlip.fitInside") },
              ]}
            />
          ) : null}
          <RunnerSelect
            id={`${uid}-format`}
            label={t("imageRotateFlip.outputFormat")}
            value={outputFormat}
            onChange={setOutputFormat}
            options={[
              { value: SAME_AS_INPUT, label: t("imageRotateFlip.sameFormat") },
              { value: "png", label: "PNG" },
              { value: "jpeg", label: "JPEG" },
              { value: "webp", label: "WebP" },
            ]}
          />
        </div>
        {showFitMode ? <ShellNote>{t("imageRotateFlip.fitNote")}</ShellNote> : null}
      </div>

      {/* ── result ─────────────────────────────────────────────────────── */}
      <div aria-live="polite" aria-busy={state.status === "running"} className="space-y-3">
        {state.status === "error" ? <ShellError message={state.error} /> : null}
        {!picked && state.status !== "error" ? (
          <ShellNote>{t("imageRotateFlip.idle")}</ShellNote>
        ) : null}

        {picked && output ? (
          <div className={state.status === "running" ? "space-y-3 opacity-60" : "space-y-3"}>
            <div className="grid gap-3 sm:grid-cols-2">
              <figure className="m-0 space-y-1">
                <figcaption className="text-xs text-[var(--neutral-10)]">
                  {t("imageRotateFlip.original", {
                    w: output.inputWidth,
                    h: output.inputHeight,
                  })}
                </figcaption>
                <img
                  src={picked.previewUrl}
                  alt={t("imageRotateFlip.originalAlt")}
                  className="max-h-72 w-full rounded-[var(--radius-lg)] bg-[var(--neutral-2)] object-contain"
                />
              </figure>
              <figure className="m-0 space-y-1">
                <figcaption className="text-xs text-[var(--neutral-10)]">
                  {t("imageRotateFlip.result", { w: output.width, h: output.height })}
                </figcaption>
                <img
                  src={outUrl}
                  alt={t("imageRotateFlip.resultAlt")}
                  className="max-h-72 w-full rounded-[var(--radius-lg)] bg-[var(--neutral-2)] object-contain"
                />
              </figure>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <ShellBadge tone={tone}>
                {output.lossless
                  ? t("imageRotateFlip.badgeLossless")
                  : t("imageRotateFlip.badgeResampled")}
              </ShellBadge>
              <ShellBadge>
                {t("imageRotateFlip.badgeSize", { kb: (output.bytes / 1024).toFixed(1) })}
              </ShellBadge>
              <ShellBadge>{output.contentType}</ShellBadge>
              {output.exifOrientationHandled ? (
                <ShellBadge tone="info">
                  {t("imageRotateFlip.badgeExif", { orientation: output.exifOrientation })}
                </ShellBadge>
              ) : null}
              {output.snappedToRightAngle ? (
                <ShellBadge tone="info">{t("imageRotateFlip.badgeSnapped")}</ShellBadge>
              ) : null}
              {output.lossless && output.reencodeLossy ? (
                <ShellBadge tone="warning">{t("imageRotateFlip.badgeReencode")}</ShellBadge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" variant="ink" onClick={download}>
                <Download className="h-4 w-4" />
                {t("imageRotateFlip.download")}
              </Button>
              {/* The metadata, not the pixels: a megabyte of base64 does not
                  belong on the clipboard, but the contract fields do. */}
              <ShellExitActions
                exit={{ json: { ...output, imageBase64: undefined } }}
                idPrefix={uid}
              />
            </div>
          </div>
        ) : null}
      </div>

      <ShellNote>{t("imageRotateFlip.note")}</ShellNote>
    </div>
  );
}

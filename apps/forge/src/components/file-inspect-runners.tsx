"use client";

/**
 * Product journeys for file-inspect / PDF optimize tools that previously
 * dumped raw JSON via CatalogRunnerRouter.
 */
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  FileDropZone,
  fileToBase64,
  fileToDataUrl,
  formatBytes,
  ImageResultPanel,
  invokeForge,
  MetaCards,
  PdfResultPanel,
} from "@/components/result-panels";
import { RunnerError, RunnerNote } from "@/components/runner-ui";

function entriesOf(obj: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && typeof v !== "object")
    .map(([k, v]) => ({ label: k, value: String(v) }));
}

export function PdfOptimizeRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [fileName, setFileName] = useState("");
  const [base64, setBase64] = useState("");
  const [outBase64, setOutBase64] = useState("");
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!base64) {
      setError(t("pdfCompress.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    setOutBase64("");
    setMeta(null);
    const r = await invokeForge(toolId, { fileBase64: base64 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const o = r.output;
    setMeta(o);
    setOutBase64(typeof o.base64 === "string" ? o.base64 : "");
  };

  const outName = `${(fileName || "document").replace(/\.pdf$/i, "")}.optimized.pdf`;

  return (
    <div className="space-y-4">
      <FileDropZone
        accept="application/pdf,.pdf"
        label={fileName || t("pdfOptimize.file")}
        hint={t("common.privacyUpload")}
        onFiles={async (files) => {
          const f = files[0];
          if (!f) return;
          setFileName(f.name);
          setBase64(await fileToBase64(f));
          setOutBase64("");
          setMeta(null);
        }}
      />
      <Button type="button" variant="ink" disabled={loading || !base64} onClick={() => void run()}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {meta ? (
        <MetaCards
          items={[
            { label: t("pdfCompress.in"), value: formatBytes(Number(meta.bytesIn ?? 0)) },
            { label: t("pdfCompress.out"), value: formatBytes(Number(meta.bytesOut ?? 0)) },
            {
              label: t("pdfCompress.saved"),
              value: `${formatBytes(Number(meta.saved ?? 0))} (${String(meta.savedPercent ?? 0)}%)`,
            },
            {
              label: "pages",
              value: meta.pageCount != null ? String(meta.pageCount) : "—",
            },
          ]}
        />
      ) : null}
      {outBase64 ? <PdfResultPanel base64={outBase64} filename={outName} /> : null}
      <RunnerNote>{t("pdfOptimize.note")}</RunnerNote>
    </div>
  );
}

export function PdfInfoRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [fileName, setFileName] = useState("");
  const [base64, setBase64] = useState("");
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cards = useMemo(() => (info ? entriesOf(info).slice(0, 18) : []), [info]);

  const run = async () => {
    if (!base64) return;
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { fileBase64: base64 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setInfo(r.output);
  };

  return (
    <div className="space-y-4">
      <FileDropZone
        accept="application/pdf,.pdf"
        label={fileName || t("pdfInfo.file")}
        hint={t("common.privacyUpload")}
        onFiles={async (files) => {
          const f = files[0];
          if (!f) return;
          setFileName(f.name);
          setBase64(await fileToBase64(f));
          setInfo(null);
        }}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Button
            type="button"
            variant="ink"
            disabled={loading || !base64}
            onClick={() => void run()}
          >
            {loading ? t("common.running") : t("common.run")}
          </Button>
          <RunnerError>{error}</RunnerError>
          {cards.length ? <MetaCards items={cards} /> : null}
          <RunnerNote>{t("pdfInfo.note")}</RunnerNote>
        </div>
        {base64 ? (
          <PdfResultPanel
            base64={base64}
            filename={fileName || "source.pdf"}
            meta={<span className="text-xs">{t("common.sourcePreview")}</span>}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ImageMetaRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [fileName, setFileName] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [base64, setBase64] = useState("");
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cards = useMemo(() => (info ? entriesOf(info).slice(0, 24) : []), [info]);

  const run = async () => {
    if (!base64 && !dataUrl) return;
    setLoading(true);
    setError("");
    const payload = dataUrl.startsWith("data:")
      ? { imageBase64: dataUrl }
      : { imageBase64: base64 };
    const r = await invokeForge(toolId, payload);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setInfo(r.output);
  };

  return (
    <div className="space-y-4">
      <FileDropZone
        accept="image/*"
        label={fileName || t("imageMeta.file")}
        hint={t("common.privacyUpload")}
        onFiles={async (files) => {
          const f = files[0];
          if (!f) return;
          setFileName(f.name);
          const url = await fileToDataUrl(f);
          setDataUrl(url);
          setBase64(await fileToBase64(f));
          setInfo(null);
        }}
      />
      <Button type="button" variant="ink" disabled={loading || !dataUrl} onClick={() => void run()}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      <div className="grid gap-4 lg:grid-cols-2">
        {dataUrl ? (
          <ImageResultPanel src={dataUrl} filename={fileName || "image"} alt={fileName} />
        ) : null}
        {cards.length ? <MetaCards items={cards} /> : null}
      </div>
      <RunnerNote>{t("imageMeta.note")}</RunnerNote>
    </div>
  );
}

export function ExifViewerRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [fileName, setFileName] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const flat = useMemo(() => {
    if (!info) return [] as { label: string; value: string }[];
    // Prefer nested tags if present
    const tags = info.tags;
    if (tags && typeof tags === "object" && !Array.isArray(tags)) {
      return entriesOf(tags as Record<string, unknown>).slice(0, 40);
    }
    return entriesOf(info).slice(0, 40);
  }, [info]);

  const gps =
    info && typeof info.latitude === "number" && typeof info.longitude === "number"
      ? { lat: info.latitude as number, lon: info.longitude as number }
      : info && typeof (info as { GPSLatitude?: number }).GPSLatitude === "number"
        ? {
            lat: Number((info as { GPSLatitude: number }).GPSLatitude),
            lon: Number((info as { GPSLongitude?: number }).GPSLongitude ?? 0),
          }
        : null;

  const run = async () => {
    if (!dataUrl) return;
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { imageBase64: dataUrl });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setInfo(r.output);
  };

  return (
    <div className="space-y-4">
      <FileDropZone
        accept="image/*"
        label={fileName || t("exif.file")}
        hint={t("common.privacyUpload")}
        onFiles={async (files) => {
          const f = files[0];
          if (!f) return;
          setFileName(f.name);
          setDataUrl(await fileToDataUrl(f));
          setInfo(null);
        }}
      />
      <Button type="button" variant="ink" disabled={loading || !dataUrl} onClick={() => void run()}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      <div className="grid gap-4 lg:grid-cols-2">
        {dataUrl ? <ImageResultPanel src={dataUrl} filename={fileName || "photo.jpg"} /> : null}
        <div className="space-y-3">
          {gps ? (
            <a
              className="text-sm text-[hsl(var(--primary))] underline"
              href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lon}#map=15/${gps.lat}/${gps.lon}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              GPS {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)} → OpenStreetMap
            </a>
          ) : null}
          {flat.length ? <MetaCards items={flat} /> : null}
        </div>
      </div>
      <RunnerNote>{t("exif.note")}</RunnerNote>
    </div>
  );
}

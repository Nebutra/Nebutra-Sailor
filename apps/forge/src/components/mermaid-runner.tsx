"use client";

/**
 * Mermaid workbench — dual-surface product path.
 *
 * Human: live browser render (official mermaid, securityLevel=strict).
 * Agent: same toolId with mode=svg via Playwright on the product host.
 *
 * Bar: mermaid.live-class editor+preview (theme · samples · zoom/pan · SVG/PNG),
 * not a bare textarea demo.
 */
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ShellNote } from "@/components/journey-shells";
import { invokeForge, useDebouncedCallback } from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

export type MermaidTheme = "default" | "dark" | "forest" | "neutral" | "base";

const THEMES: readonly MermaidTheme[] = ["default", "dark", "forest", "neutral", "base"];

type Sample = { id: string; source: string };

const SAMPLES: readonly Sample[] = [
  {
    id: "flowchart",
    source: `flowchart LR
  A[User] --> B[Forge]
  B --> C[DNS]
  B --> D[TLS]
  B --> E[Mermaid]
  E --> F[(SVG / PNG)]`,
  },
  {
    id: "sequence",
    source: `sequenceDiagram
  participant U as User
  participant F as Forge
  participant A as Agent
  U->>F: open /t/mermaid-render
  F-->>U: live SVG
  A->>F: invoke mode=svg
  F-->>A: SVG bytes`,
  },
  {
    id: "class",
    source: `classDiagram
  class Tool {
    +string id
    +execute(input)
  }
  class Runner {
    +render()
  }
  Tool <|-- MermaidRender
  Runner --> Tool : invoke`,
  },
  {
    id: "er",
    source: `erDiagram
  USER ||--o{ POST : writes
  USER {
    int id PK
    string email
  }
  POST {
    int id PK
    int user_id FK
    string title
  }`,
  },
  {
    id: "state",
    source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Parsing: edit
  Parsing --> Ready: ok
  Parsing --> Error: fail
  Ready --> Idle: clear
  Error --> Parsing: fix`,
  },
  {
    id: "gantt",
    source: `gantt
  title Ship mermaid workbench
  dateFormat  YYYY-MM-DD
  section Core
  Engine + dual surface    :done,    a1, 2026-08-01, 2d
  Theme / zoom / export    :active,  a2, 2026-08-03, 2d
  section Next
  Share hash + Monaco      :         a3, after a2, 3d`,
  },
  {
    id: "pie",
    source: `pie showData
  title Dual-surface traffic
  "Human live" : 62
  "Agent SVG" : 28
  "parse_only" : 10`,
  },
  {
    id: "mindmap",
    source: `mindmap
  root((Mermaid))
    Editor
      Theme
      Samples
      Live parse
    Preview
      Zoom
      Pan
      Fit
    Export
      SVG
      PNG
    Agent
      Playwright
      securityLevel strict`,
  },
];

function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    const vb = root
      .getAttribute("viewBox")
      ?.split(/[\s,]+/)
      .map(Number);
    let w = Number(root.getAttribute("width")) || vb?.[2] || 800;
    let h = Number(root.getAttribute("height")) || vb?.[3] || 600;
    if (!Number.isFinite(w) || w <= 0) w = 800;
    if (!Number.isFinite(h) || h <= 0) h = 600;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas unavailable"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (out) => {
            URL.revokeObjectURL(url);
            if (!out) reject(new Error("PNG encode failed"));
            else resolve(out);
          },
          "image/png",
          1,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG load failed for PNG export"));
    };
    img.src = url;
  });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function previewBg(theme: MermaidTheme): string {
  return theme === "dark" ? "#0b0d10" : "var(--neutral-2)";
}

export function MermaidRenderRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const reactId = useId().replace(/:/g, "");
  const [text, setText] = useState(SAMPLES[0]?.source ?? "");
  const [sampleId, setSampleId] = useState(SAMPLES[0]?.id ?? "flowchart");
  const [theme, setTheme] = useState<MermaidTheme>("neutral");
  const [svg, setSvg] = useState("");
  const [diagramType, setDiagramType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);

  const genRef = useRef(0);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const runClient = useCallback(
    async (source: string, nextTheme: MermaidTheme) => {
      if (!source.trim()) {
        setSvg("");
        setDiagramType("");
        setError("");
        return;
      }
      const gen = ++genRef.current;
      setLoading(true);
      setError("");
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: nextTheme,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });
        const parsed = await mermaid.parse(source);
        const type =
          typeof parsed === "object" && parsed && "diagramType" in parsed
            ? String((parsed as { diagramType?: string }).diagramType ?? "")
            : "";
        const id = `mmd_${reactId}_${gen}`;
        const { svg: out } = await mermaid.render(id, source);
        if (gen !== genRef.current) return;
        setSvg(out);
        setDiagramType(type);
        // Keep agent contract warm without paying Playwright on every keystroke.
        void invokeForge(toolId, { text: source, mode: "parse_only", theme: nextTheme });
      } catch (err) {
        if (gen !== genRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setSvg("");
        setDiagramType("");
      } finally {
        if (gen === genRef.current) setLoading(false);
      }
    },
    [reactId, toolId],
  );

  const live = useDebouncedCallback((source: string, nextTheme: MermaidTheme) => {
    void runClient(source, nextTheme);
  }, 350);

  useEffect(() => {
    live(text, theme);
  }, [text, theme, live]);

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!(e.metaKey || e.ctrlKey || e.altKey)) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(4, Math.max(0.25, Math.round((s + delta) * 100) / 100)));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    setOffset({
      x: pan.originX + (e.clientX - pan.startX),
      y: pan.originY + (e.clientY - pan.startY),
    });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
  };

  const copySvg = async () => {
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
    } catch {
      /* ignore */
    }
  };

  const downloadSvg = () => {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "diagram.svg");
  };

  const downloadPng = async () => {
    if (!svg) return;
    setExporting(true);
    try {
      const blob = await svgToPngBlob(svg, 2);
      downloadBlob(blob, "diagram.png");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const applySample = (id: string) => {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setSampleId(id);
    setText(sample.source);
    resetView();
  };

  const themeOptions = THEMES.map((value) => ({
    value,
    label: t(`mermaid.theme_${value}` as "mermaid.theme_neutral"),
  }));

  const sampleOptions = SAMPLES.map((s) => ({
    value: s.id,
    label: t(`mermaid.sample_${s.id}` as "mermaid.sample_flowchart"),
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect
          label={t("mermaid.sample")}
          id="mmd-sample"
          value={sampleId}
          onChange={applySample}
          options={sampleOptions}
        />
        <RunnerSelect
          label={t("mermaid.theme")}
          id="mmd-theme"
          value={theme}
          onChange={(v) => {
            setTheme(v as MermaidTheme);
            resetView();
          }}
          options={themeOptions}
        />
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.min(4, Math.round((s + 0.15) * 100) / 100))}
          >
            {t("mermaid.zoomIn")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.max(0.25, Math.round((s - 0.15) * 100) / 100))}
          >
            {t("mermaid.zoomOut")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={resetView}>
            {t("mermaid.zoomReset")}
          </Button>
          <span className="px-1 text-xs tabular-nums text-[var(--neutral-10)]">
            {Math.round(scale * 100)}%{diagramType ? ` · ${diagramType}` : ""}
            {loading ? ` · ${t("common.running")}` : ` · ${t("common.liveHint")}`}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 pb-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!svg}
            onClick={() => void copySvg()}
          >
            {t("mermaid.copySvg")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!svg} onClick={downloadSvg}>
            {t("mermaid.downloadSvg")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!svg || exporting}
            onClick={() => void downloadPng()}
          >
            {exporting ? t("common.running") : t("mermaid.downloadPng")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
        <Textarea
          label={t("mermaid.source")}
          id="mmd-src"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSampleId("");
          }}
          rows={22}
          className="min-h-[28rem] font-mono text-sm leading-relaxed"
          spellCheck={false}
        />
        <div className="flex min-h-[28rem] flex-col gap-2">
          <RunnerError>{error}</RunnerError>
          <div
            ref={stageRef}
            data-specimen="mermaid-canvas"
            role="img"
            aria-label={t("mermaid.previewAria")}
            className="relative flex-1 cursor-grab overflow-hidden rounded-[var(--radius-lg)] bg-[var(--neutral-2)] ring-1 ring-inset ring-[var(--neutral-6)] active:cursor-grabbing"
            style={{ background: previewBg(theme) }}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {svg ? (
              <div
                className="absolute left-1/2 top-1/2 origin-center p-6 [&_svg]:max-w-none"
                style={{
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                }}
                // mermaid SVG is produced client-side with securityLevel=strict
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <ShellNote>{t("mermaid.idle")}</ShellNote>
              </div>
            )}
          </div>
          <p className="text-[11px] text-[var(--neutral-10)]">{t("mermaid.canvasHint")}</p>
        </div>
      </div>

      <RunnerNote>{t("mermaid.note")}</RunnerNote>
    </div>
  );
}

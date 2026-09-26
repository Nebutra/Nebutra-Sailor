import { PlayFill } from "@nebutra/icons";
import type { ReactNode, Ref } from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  FileCard — decorative file-format card (paper tile with colored banner).
 *
 *  Aesthetic family: marketing / showcase tile. Sibling of Folder; distinct
 *  from FileAttachment (which is an *interactive* chip for chat attachments).
 *  FileCard is purely visual — no hover, no interaction.
 *
 *  Banner colour: three families, each a 12-step pair that flips together
 *  between themes — blue (docs, slides, code), cyan (data, markup, styles),
 *  neutral (text, archives, media). Step 11/10 fill with step 1 ink measures
 *  ≥5:1 in light and dark. The label names the format; the hue only groups
 *  it, so three honest families beat 26 hues whose ink cannot be right on all
 *  of them (a white label on a bright chart cyan was 1.5:1).
 *
 *  Card background uses `bg-card` (theme-aware) so the off-white "paper" still
 *  reads correctly across light/dark themes; the colored banner provides the
 *  format identity on top.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FileFormat =
  | "doc"
  | "pdf"
  | "md"
  | "mdx"
  | "csv"
  | "xls"
  | "xlsx"
  | "txt"
  | "ppt"
  | "pptx"
  | "zip"
  | "rar"
  | "tar"
  | "gz"
  | "code"
  | "html"
  | "js"
  | "jsx"
  | "tsx"
  | "css"
  | "json"
  | "img"
  | "png"
  | "jpg"
  | "jpeg"
  | "video";

export type FileCardProps = {
  format: FileFormat;
  className?: string;
};

// ---------------------------------------------------------------------------
// Banner color (categorical)
// ---------------------------------------------------------------------------

const BANNER_COLOR: Readonly<Record<FileFormat, string>> = {
  doc: "bg-blue-11 text-blue-1",
  pdf: "bg-neutral-10 text-neutral-1",
  md: "bg-neutral-10 text-neutral-1",
  mdx: "bg-neutral-10 text-neutral-1",
  txt: "bg-neutral-10 text-neutral-1",
  csv: "bg-cyan-11 text-cyan-1",
  xls: "bg-cyan-11 text-cyan-1",
  xlsx: "bg-cyan-11 text-cyan-1",
  ppt: "bg-blue-11 text-blue-1",
  pptx: "bg-blue-11 text-blue-1",
  zip: "bg-neutral-10 text-neutral-1",
  rar: "bg-neutral-10 text-neutral-1",
  tar: "bg-neutral-10 text-neutral-1",
  gz: "bg-neutral-10 text-neutral-1",
  html: "bg-cyan-11 text-cyan-1",
  js: "bg-blue-11 text-blue-1",
  jsx: "bg-blue-11 text-blue-1",
  css: "bg-cyan-11 text-cyan-1",
  json: "bg-cyan-11 text-cyan-1",
  tsx: "bg-blue-11 text-blue-1",
  code: "bg-blue-11 text-blue-1",
  img: "bg-neutral-10 text-neutral-1",
  png: "bg-neutral-10 text-neutral-1",
  jpg: "bg-neutral-10 text-neutral-1",
  jpeg: "bg-neutral-10 text-neutral-1",
  video: "bg-neutral-10 text-neutral-1",
};

// ---------------------------------------------------------------------------
// Placeholder renderers (one per visual cluster)
// ---------------------------------------------------------------------------

function DefaultPlaceholder() {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="bg-foreground/20 h-0.5 w-1/2 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-foreground/10 h-0.5 w-1/2 rounded-full" />
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        <div className="bg-foreground/10 h-0.5 w-1/2 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

function MarkdownPlaceholder() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <div className="text-foreground/30 text-[10px] font-bold">#</div>
        <div className="bg-foreground/20 h-0.5 w-6 rounded-full" />
      </div>
      <div className="space-y-1">
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        <div className="bg-foreground/10 h-0.5 w-7 rounded-full" />
      </div>
      <div className="space-y-1">
        <div className="bg-foreground/10 h-0.5 w-8 rounded-full" />
        <div className="bg-foreground/10 h-0.5 w-4 rounded-full" />
        <div className="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

function SpreadsheetPlaceholder() {
  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-foreground/20 h-2" />
        <div className="bg-foreground/20 h-2" />
        <div className="bg-foreground/20 h-2" />
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-foreground/5 h-2" />
        <div className="bg-foreground/5 h-2" />
        <div className="bg-foreground/5 h-2" />
        <div className="bg-foreground/5 h-2" />
        <div className="bg-foreground/5 h-2" />
        <div className="bg-foreground/5 h-2" />
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-foreground/5 h-2" />
        <div className="bg-foreground/5 h-2" />
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-foreground/5 h-2" />
      </div>
    </div>
  );
}

function CsvPlaceholder() {
  return (
    <>
      <div className="mb-2">
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-foreground/20 h-1.5 rounded-full" />
          <div className="bg-foreground/20 h-1.5 rounded-full" />
          <div className="bg-foreground/20 h-1.5 rounded-full" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-foreground/5 h-1 rounded-full" />
          <div className="bg-foreground/5 h-1 rounded-full" />
          <div className="bg-foreground/5 h-1 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-foreground/5 h-1 rounded-full" />
          <div className="bg-foreground/5 h-1 rounded-full" />
          <div className="bg-foreground/5 h-1 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-foreground/5 h-1 rounded-full" />
          <div className="bg-foreground/5 h-1 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-foreground/5 h-1 rounded-full" />
        </div>
      </div>
    </>
  );
}

function ArchivePlaceholder() {
  // Pixelated zip "pull-tab" pattern — used for zip/rar/tar/gz.
  return (
    <div className="relative flex h-full flex-col items-center justify-center">
      <div className="space-y-0">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={`archive-row-${i}`} className="flex overflow-hidden rounded-full">
            <div className={cn("size-1.5", i % 2 === 0 ? "bg-foreground/20" : "bg-foreground/5")} />
            <div className={cn("size-1.5", i % 2 === 0 ? "bg-foreground/5" : "bg-foreground/20")} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlidePlaceholder() {
  return (
    <>
      <div className="bg-foreground/5 mb-1.5 space-y-1 rounded border p-1">
        <div className="flex justify-center gap-1">
          <div className="size-3 rounded-[var(--radius-sm)] bg-[var(--category-3)]/40" />
        </div>
        <div className="bg-foreground/15 mx-auto h-0.75 w-8 rounded-full" />
      </div>
      <div className="mb-1 flex justify-center gap-1">
        <div className="bg-foreground/15 h-0.75 w-8 rounded-full" />
        <div className="bg-foreground/15 h-0.75 w-4 rounded-full" />
      </div>
      <div className="space-y-1">
        <div className="bg-foreground/15 h-0.75 w-4 rounded-full" />
        <div className="bg-foreground/15 h-0.75 w-5 rounded-full" />
      </div>
    </>
  );
}

function ImagePlaceholder() {
  return (
    <div className="bg-foreground/5 mb-1.5 space-y-1 rounded border p-1">
      <div className="flex justify-center gap-1">
        <div className="size-3 rounded-[var(--radius-sm)] bg-[var(--category-4)]/40" />
      </div>
      <div className="bg-foreground/15 mx-auto mt-1 h-0.75 w-4 rounded-full" />
      <div className="bg-foreground/15 mx-auto h-0.75 w-8 rounded-full" />
    </div>
  );
}

function VideoPlaceholder() {
  return (
    <div className="bg-foreground/5 mb-1.5 space-y-1 rounded border p-1">
      <div className="flex justify-center gap-1">
        <PlayFill className="size-3 text-chart-5/70" aria-hidden="true" />
      </div>
      <div className="bg-foreground/15 mx-auto mt-1 h-0.75 w-4 rounded-full" />
      <div className="bg-foreground/15 mx-auto h-0.75 w-8 rounded-full" />
    </div>
  );
}

function HtmlCodePlaceholder() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        <div className="text-foreground/30 font-mono text-[5px]">&lt;</div>
        <div className="h-0.75 w-3 rounded-full bg-chart-2/60" />
        <div className="text-foreground/30 font-mono text-[5px]">&gt;</div>
      </div>
      <div className="flex items-center gap-0.5 pl-1">
        <div className="text-foreground/30 font-mono text-[5px]">&lt;</div>
        <div className="h-0.75 w-2.5 rounded-full bg-chart-2/60" />
        <div className="text-foreground/30 font-mono text-[5px]">&gt;</div>
      </div>
      <div className="flex items-center gap-0.5 pl-1">
        <div className="text-foreground/30 font-mono text-[5px]">&lt;/</div>
        <div className="h-0.75 w-2.5 rounded-full bg-chart-2/60" />
        <div className="text-foreground/30 font-mono text-[5px]">&gt;</div>
      </div>
      <div className="flex items-center gap-0.5">
        <div className="text-foreground/30 font-mono text-[5px]">&lt;</div>
        <div className="h-0.75 w-1 rounded-full bg-chart-2/60" />
        <div className="text-foreground/30 font-mono text-[5px]">/&gt;</div>
      </div>
    </div>
  );
}

function CssPlaceholder() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <div className="text-foreground/40 font-mono text-[6px]">{"{"}</div>
      </div>
      <div className="flex items-center gap-1 pl-1.5">
        <div className="h-0.75 w-3 rounded-full bg-chart-2/60" />
        <div className="h-0.75 w-4 rounded-full bg-chart-2/60" />
      </div>
      <div className="flex items-center gap-1 pl-1.5">
        <div className="h-0.75 w-4 rounded-full bg-chart-2/60" />
        <div className="h-0.75 w-2 rounded-full bg-chart-2/60" />
      </div>
      <div className="flex items-center gap-1 pl-1.5">
        <div className="h-0.75 w-3 rounded-full bg-chart-2/60" />
        <div className="h-0.75 w-4 rounded-full bg-chart-2/60" />
      </div>
      <div className="flex items-center gap-1">
        <div className="text-foreground/40 font-mono text-[6px]">{"}"}</div>
      </div>
    </div>
  );
}

function JsonPlaceholder() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <div className="text-foreground/40 font-mono text-[6px]">{"{"}</div>
      </div>
      <div className="flex items-center gap-1 pl-1.5">
        <div className="bg-foreground/20 h-0.75 w-3 rounded-full" />
        <div className="bg-foreground/20 h-0.75 w-4 rounded-full" />
      </div>
      <div className="flex items-center gap-1 pl-1.5">
        <div className="bg-foreground/10 h-0.75 w-4 rounded-full" />
        <div className="bg-foreground/10 h-0.75 w-2 rounded-full" />
      </div>
      <div className="flex items-center gap-1 pl-1.5">
        <div className="bg-foreground/10 h-0.75 w-3 rounded-full" />
        <div className="bg-foreground/10 h-0.75 w-4 rounded-full" />
      </div>
      <div className="flex items-center gap-1 pl-1.5">
        <div className="bg-foreground/10 h-0.75 w-3 rounded-full" />
      </div>
      <div className="flex items-center gap-1">
        <div className="text-foreground/40 font-mono text-[6px]">{"}"}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format → placeholder lookup (groups visual aliases)
// ---------------------------------------------------------------------------

const PLACEHOLDER: Partial<Record<FileFormat, () => ReactNode>> = {
  md: MarkdownPlaceholder,
  mdx: MarkdownPlaceholder,
  xls: SpreadsheetPlaceholder,
  xlsx: SpreadsheetPlaceholder,
  csv: CsvPlaceholder,
  zip: ArchivePlaceholder,
  rar: ArchivePlaceholder,
  tar: ArchivePlaceholder,
  gz: ArchivePlaceholder,
  ppt: SlidePlaceholder,
  pptx: SlidePlaceholder,
  img: ImagePlaceholder,
  png: ImagePlaceholder,
  jpg: ImagePlaceholder,
  jpeg: ImagePlaceholder,
  video: VideoPlaceholder,
  html: HtmlCodePlaceholder,
  js: HtmlCodePlaceholder,
  jsx: HtmlCodePlaceholder,
  tsx: HtmlCodePlaceholder,
  code: HtmlCodePlaceholder,
  css: CssPlaceholder,
  json: JsonPlaceholder,
  // doc / pdf / txt fall through to DefaultPlaceholder
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FileCard = function FileCard({
  ref,
  format,
  className,
}: FileCardProps & { ref?: Ref<HTMLDivElement> | undefined }) {
  const Renderer = PLACEHOLDER[format] ?? DefaultPlaceholder;
  const bannerCls = BANNER_COLOR[format];

  return (
    <div ref={ref} aria-hidden="true" className={cn("relative size-fit", className)}>
      <div
        className={cn(
          "absolute -right-2 bottom-1.5 z-2 rounded px-1.5 py-0.5 text-[8px] font-medium uppercase",
          bannerCls,
        )}
      >
        {format}
      </div>
      <div className="ring-border relative z-1 h-18 w-14 space-y-3 rounded-[var(--radius-md)] bg-card p-2 ring-1">
        <Renderer />
      </div>
    </div>
  );
};

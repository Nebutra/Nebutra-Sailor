import { ArrowRight, Check, Clock, Image, Lightning, Play } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Stage = {
  icon: typeof Image;
  label: string;
  detail: string;
  active?: boolean;
};

const STAGES: Stage[] = [
  { icon: Play, label: "Source", detail: "1080p.mp4" },
  { icon: Lightning, label: "Transcode", detail: "H.264 + AV1", active: true },
  { icon: Image, label: "Thumbnails", detail: "12 frames" },
  { icon: Play, label: "HLS", detail: "240p..1080p" },
];

export function VideoPipelineGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="relative flex w-full flex-col justify-between gap-2 px-3 py-3"
    >
      <div className="flex items-start justify-end">
        <Badge variant="outline" className="text-[10px] font-mono">
          ~3 min processing · GPU
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const StageIcon = stage.icon;
          const StatusIcon = stage.active ? Clock : Check;
          return (
            <div key={stage.label} className="flex flex-1 items-center gap-1">
              <div
                className={[
                  "flex min-w-0 flex-1 flex-col gap-1 rounded-[var(--radius-md)] border px-2 py-1.5",
                  stage.active
                    ? "border-[var(--blue-7)] bg-[var(--blue-2)]"
                    : "border-neutral-6 bg-muted",
                ].join(" ")}
              >
                <div className="flex items-center gap-1">
                  <StageIcon
                    className={[
                      "h-3 w-3 shrink-0",
                      stage.active ? "text-primary" : "text-neutral-11",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "truncate text-[10px] font-medium",
                      stage.active ? "text-[var(--blue-12)]" : "text-neutral-12",
                    ].join(" ")}
                  >
                    {stage.label}
                  </span>
                  <StatusIcon
                    className={[
                      "ml-auto h-2.5 w-2.5 shrink-0",
                      stage.active ? "text-primary" : "text-green-900",
                    ].join(" ")}
                  />
                </div>
                <span className="truncate font-mono text-[9px] text-neutral-11">
                  {stage.detail}
                </span>
              </div>
              {idx < STAGES.length - 1 ? (
                <ArrowRight className="h-3 w-3 shrink-0 text-neutral-9" />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-neutral-10">
        <span>FFmpeg · CDN-ready · multi-bitrate</span>
      </div>
    </div>
  );
}

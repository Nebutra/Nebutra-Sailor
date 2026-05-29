import { Check, Eye, LockClosed, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Layer = {
  icon: typeof Shield;
  label: { en: string; zh: string };
  stat: { en: string; zh: string };
};

const LAYERS: Layer[] = [
  {
    icon: Shield,
    label: { en: "Content moderation", zh: "内容审核" },
    stat: { en: "0 blocked today", zh: "今日 0 拦截" },
  },
  {
    icon: LockClosed,
    label: { en: "PII redaction", zh: "PII 脱敏" },
    stat: { en: "12 redacted today", zh: "今日脱敏 12" },
  },
  {
    icon: Eye,
    label: { en: "Prompt injection detect", zh: "注入检测" },
    stat: { en: "2 caught today", zh: "今日捕获 2" },
  },
  {
    icon: Shield,
    label: { en: "Rate limit per actor", zh: "按主体限流" },
    stat: { en: "normal", zh: "正常" },
  },
];

const COPY = {
  title: { en: "Guardrails active", zh: "防护已开启" },
  layers: { en: "4 layers", zh: "4 层" },
  footer: {
    en: "OpenAI Moderation · regex + LLM gate",
    zh: "OpenAI Moderation · 正则 + LLM 网关",
  },
};

export function EcosystemSafetyGlyph({ locale }: SubpackageGlyphProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--neutral-2)] px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
          <span className="font-mono text-[10px] text-[var(--neutral-12)]">
            {COPY.title[locale]}
          </span>
        </div>
        <span className="font-mono text-[10px] text-[var(--neutral-11)]">
          {COPY.layers[locale]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {LAYERS.map((layer) => {
          const LayerIcon = layer.icon;
          return (
            <div
              key={layer.label.en}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-[var(--neutral-1)] px-1.5 py-1"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <LayerIcon className="h-3 w-3 shrink-0 text-[var(--neutral-11)]" />
                <span className="truncate text-[10px] text-[var(--neutral-12)]">
                  {layer.label[locale]}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[9px] text-[var(--neutral-11)]">
                  {layer.stat[locale]}
                </span>
                <Badge
                  variant="outline"
                  className="h-3.5 gap-0.5 border-[color:var(--status-success)]/30 bg-[color:var(--status-success)]/10 px-1 text-[color:var(--status-success)]"
                >
                  <Check className="h-2.5 w-2.5" />
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <div className="font-mono text-[9px] text-[var(--neutral-11)]">{COPY.footer[locale]}</div>
    </div>
  );
}

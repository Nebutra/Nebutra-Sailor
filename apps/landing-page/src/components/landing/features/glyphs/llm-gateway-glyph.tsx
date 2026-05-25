import { ArrowRight, Brain, Connection, Lightning } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ProviderRow = {
  name: string;
  latency: string;
  cost: string;
  role: string;
  icon: typeof Brain;
  tone: "primary" | "fallback" | "saver";
};

const PROVIDERS: ProviderRow[] = [
  {
    name: "OpenAI",
    latency: "248ms",
    cost: "$0.012",
    role: "primary route",
    icon: Lightning,
    tone: "primary",
  },
  {
    name: "Anthropic",
    latency: "312ms",
    cost: "$0.018",
    role: "fallback",
    icon: Brain,
    tone: "fallback",
  },
  {
    name: "DeepSeek",
    latency: "184ms",
    cost: "$0.003",
    role: "cost-saver",
    icon: Lightning,
    tone: "saver",
  },
];

const TONE_DOT: Record<ProviderRow["tone"], string> = {
  primary: "bg-blue-9",
  fallback: "bg-neutral-8",
  saver: "bg-cyan-9",
};

export function LlmGatewayGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="relative flex w-full flex-col gap-2 overflow-hidden rounded-md bg-neutral-2 px-3 py-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded border border-neutral-7 bg-neutral-1 px-2 py-0.5 font-mono text-[10px] text-neutral-12">
          <Connection className="h-3 w-3 text-neutral-11" />
          gateway
        </div>
        <Badge variant="outline" className="font-mono text-[9px]">
          247K reqs/day · 99.4% ok
        </Badge>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.name} className="flex items-center gap-1.5 font-mono text-[9.5px]">
              <ArrowRight className="h-2.5 w-2.5 text-neutral-10" />
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[p.tone]}`} />
              <Icon className="h-2.5 w-2.5 text-neutral-11" />
              <span className="font-medium text-neutral-12">{p.name}</span>
              <span className="text-neutral-10">·</span>
              <span className="text-neutral-11">{p.latency}</span>
              <span className="text-neutral-10">·</span>
              <span className="text-neutral-11">{p.cost}</span>
              <span className="text-neutral-10">·</span>
              <span className="text-neutral-10">{p.role}</span>
            </div>
          );
        })}
      </div>

      <div className="font-mono text-[9px] text-neutral-10">
        route by latency · cost · capability
      </div>
    </div>
  );
}

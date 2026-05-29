import {
  Bell,
  BookClosed,
  Box,
  Brain,
  ChartActivity,
  Code,
  Connection,
  Cpu,
  CreditCard,
  Database,
  Droplet,
  GitBranch,
  Globe,
  Lightning,
  LockClosed,
  Shield,
  Sparkles,
  Users,
} from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { ComponentType, SVGProps } from "react";

import type { SubpackageGlyphProps } from "./types";

type GeistIcon = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_GRID: ReadonlyArray<ReadonlyArray<{ Icon: GeistIcon; label: string }>> = [
  [
    { Icon: Sparkles, label: "Sparkles" },
    { Icon: Brain, label: "Brain" },
    { Icon: Cpu, label: "Cpu" },
    { Icon: Database, label: "Database" },
    { Icon: Shield, label: "Shield" },
    { Icon: LockClosed, label: "LockClosed" },
  ],
  [
    { Icon: Bell, label: "Bell" },
    { Icon: Lightning, label: "Lightning" },
    { Icon: CreditCard, label: "CreditCard" },
    { Icon: Connection, label: "Connection" },
    { Icon: Globe, label: "Globe" },
    { Icon: Code, label: "Code" },
  ],
  [
    { Icon: Users, label: "Users" },
    { Icon: ChartActivity, label: "ChartActivity" },
    { Icon: BookClosed, label: "BookClosed" },
    { Icon: GitBranch, label: "GitBranch" },
    { Icon: Box, label: "Box" },
    { Icon: Droplet, label: "Droplet" },
  ],
];

export function IconsGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--neutral-2)] p-3"
      style={{ height: 160 }}
    >
      <div className="absolute right-2 top-2">
        <Badge variant="outline" className="text-[10px] font-normal">
          541 icons · tree-shakable
        </Badge>
      </div>

      <div className="mt-1 flex flex-1 flex-col justify-center gap-1.5">
        {ICON_GRID.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="grid grid-cols-6 gap-1.5">
            {row.map(({ Icon, label }) => (
              <div
                key={label}
                role="img"
                aria-label={label}
                className="flex h-6 w-full items-center justify-center rounded border border-[var(--neutral-6)] bg-[var(--neutral-1)] text-[var(--neutral-11)]"
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto text-[10px] font-mono text-[var(--neutral-10)]">
        @nebutra/icons · Geist source
      </div>
    </div>
  );
}

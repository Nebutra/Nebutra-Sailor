"use client";

import {
  Box,
  Clock,
  Connection,
  Database,
  Lightning,
  Shield,
  Sparkles,
  Users,
} from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { ComponentType, SVGProps } from "react";
import type { SubpackageGlyphProps } from "./types";

/**
 * CapabilityKitGlyph
 *
 * SDK overview for the @nebutra/capability-kit sub-package. A 2-col x 4-row
 * grid of module pills (icon + name) sits between a header (`SDK · 8 modules`
 * with a Box icon) and a footer showing the scaffold CLI command.
 */

type ModulePill = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  name: string;
};

const MODULES: ReadonlyArray<ModulePill> = [
  { icon: Box, name: "config" },
  { icon: Database, name: "db" },
  { icon: Connection, name: "queue" },
  { icon: Shield, name: "vault" },
  { icon: Lightning, name: "events" },
  { icon: Sparkles, name: "ai" },
  { icon: Users, name: "tenant" },
  { icon: Clock, name: "schedule" },
];

export function CapabilityKitGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-lg)] bg-muted px-3 py-2"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Box className="h-3 w-3" />
          SDK &middot; 8 modules
        </span>
        <Badge variant="outline" size="sm" className="font-mono text-[9px]">
          kit
        </Badge>
      </div>

      {/* 2-col x 4-row module grid */}
      <ul className="grid min-h-0 flex-1 grid-cols-2 gap-1">
        {MODULES.map(({ icon: Icon, name }) => (
          <li
            key={name}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-background px-2"
          >
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[10px] text-foreground">{name}</span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <p className="text-center font-mono text-[9px] text-muted-foreground">
        pnpm nebutra capability scaffold
      </p>
    </div>
  );
}

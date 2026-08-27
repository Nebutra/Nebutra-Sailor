"use client";

import { MagnifyingGlass, Shield, TerminalWindow, User } from "@nebutra/icons";
import { Badge, Input } from "@nebutra/ui/primitives";
import type { ComponentType, SVGProps } from "react";
import type { SubpackageGlyphProps } from "./types";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type AdminAction = {
  /** Geist icon for the action verb. */
  icon: IconComponent;
  /** Action verb (e.g. "Impersonate"). */
  verb: string;
  /** Mono object identifier (tenant_…, invoice_…, org_…). */
  object: string;
};

const ACTIONS: readonly AdminAction[] = [
  { icon: User, verb: "Impersonate", object: "tenant_abc123" },
  { icon: TerminalWindow, verb: "Refund", object: "invoice_xyz890" },
  { icon: Shield, verb: "Reset rate limit", object: "org_def456" },
] as const;

export function AdminToolingGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="relative flex w-full flex-col gap-2 overflow-hidden p-3"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">
        <div className="pointer-events-none min-w-0 flex-1">
          <Input
            size="sm"
            readOnly
            tabIndex={-1}
            aria-label="Admin command palette preview"
            placeholder="impersonate tenant…"
            prefix={<MagnifyingGlass />}
            shortcut="⌘K"
          />
        </div>
        <Badge
          variant="red-subtle"
          size="sm"
          icon={<Shield />}
          className="shrink-0 font-mono tracking-tight"
        >
          admin
        </Badge>
      </div>

      <ul className="m-0 flex flex-col gap-1 p-0">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li
              key={action.object}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background/40 px-2 py-1.5"
            >
              <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span className="truncate text-[12px] leading-tight text-foreground">
                <span className="font-medium">{action.verb}</span>{" "}
                <span className="font-mono text-[11px] text-muted-foreground">{action.object}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

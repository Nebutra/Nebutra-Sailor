import { Buildings, Check, ChevronDown } from "@nebutra/icons";
import { Badge, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

export function TenantGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--neutral-2)] p-3"
      style={{ height: 160 }}
    >
      {/* Active tenant row */}
      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Buildings className="h-4 w-4 shrink-0 text-[var(--neutral-12)]" />
          <span className="truncate text-xs font-medium text-[var(--neutral-12)]">
            Acme Robotics
          </span>
          <StatusDot state="READY" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="default" className="h-4 px-1.5 text-[10px]">
            Pro
          </Badge>
          <Check className="h-3.5 w-3.5 text-[var(--cyan-9)]" />
        </div>
      </div>

      {/* Inactive tenant rows */}
      <div className="flex items-center justify-between rounded-[var(--radius-md)] px-2.5 py-1.5 opacity-60">
        <div className="flex min-w-0 items-center gap-2">
          <Buildings className="h-3.5 w-3.5 shrink-0 text-[var(--neutral-11)]" />
          <span className="truncate text-xs text-[var(--neutral-11)]">Globex Corp</span>
        </div>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
          Member
        </Badge>
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius-md)] px-2.5 py-1.5 opacity-60">
        <div className="flex min-w-0 items-center gap-2">
          <Buildings className="h-3.5 w-3.5 shrink-0 text-[var(--neutral-11)]" />
          <span className="truncate text-xs text-[var(--neutral-11)]">Initech Labs</span>
        </div>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
          Member
        </Badge>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-[var(--neutral-6)] pt-1.5">
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--neutral-10)]">
          RLS · tenantId scope · AsyncLocalStorage
        </span>
        <ChevronDown className="h-3 w-3 text-[var(--neutral-10)]" />
      </div>
    </div>
  );
}

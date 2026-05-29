"use client";

import { Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    name: "Mira Kondo",
    handle: "@mira",
    role: "admin",
    tenant: "tenant_abc123",
    session: "active",
    actorLabel: "actor.id",
    actorId: "usr_8c41be7",
  },
  zh: {
    name: "Mira Kondo",
    handle: "@mira",
    role: "管理员",
    tenant: "tenant_abc123",
    session: "在线",
    actorLabel: "actor.id",
    actorId: "usr_8c41be7",
  },
} as const;

export function IdentityGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2.5 rounded-[var(--radius-lg)] bg-[var(--neutral-1)] p-3 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Top: avatar + name + handle */}
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            MK
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold text-[var(--neutral-12)]">
              {copy.name}
            </span>
            <span className="truncate font-mono text-[11px] text-[var(--neutral-10)]">
              {copy.handle}
            </span>
          </div>
        </div>

        {/* Middle: role / tenant / session chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="blue-subtle" size="sm">
            {copy.role}
          </Badge>
          <Badge variant="gray-subtle" size="sm" className="font-mono">
            {copy.tenant}
          </Badge>
          <Badge variant="green-subtle" size="sm">
            {copy.session}
          </Badge>
        </div>

        {/* Footer: actor id + shield */}
        <div className="flex items-center justify-between border-t border-[var(--neutral-5)] pt-1.5">
          <span className="truncate font-mono text-[10px] text-[var(--neutral-10)]">
            {copy.actorLabel} · {copy.actorId}
          </span>
          <Shield className="h-3 w-3 text-[var(--neutral-10)]" />
        </div>
      </div>
    </div>
  );
}

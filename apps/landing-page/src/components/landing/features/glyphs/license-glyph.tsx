"use client";

import { Calendar, Check, Key, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * LicenseGlyph — mini license key card for self-hosted Pro licensing.
 *
 * Shows a mono license key, an Active status badge with expiry, three
 * feature chips, and a customer/tier footer.
 */

const LICENSE_KEY = "NB-ULTRA-8472-4F2A-XYZ8";

const COPY = {
  en: {
    active: "Active",
    expires: "expires 2026-12-31",
    features: ["SSO", "Audit log", "Unlimited seats"],
    footer: "cust_org_abc123 · Pro tier",
  },
  zh: {
    active: "已激活",
    expires: "2026-12-31 到期",
    features: ["SSO", "审计日志", "席位无限"],
    footer: "cust_org_abc123 · Pro 套餐",
  },
} as const;

export function LicenseGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[300px] flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* Top: key icon + license key */}
        <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-muted px-2 py-1.5 ring-1 ring-[hsl(var(--border))]">
          <Key className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-mono text-[11px] text-foreground">{LICENSE_KEY}</span>
        </div>

        {/* Status + expiry */}
        <div className="flex items-center justify-between">
          <Badge variant="green-subtle" size="sm" icon={<Check />}>
            {t.active}
          </Badge>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono text-[10px] text-muted-foreground">{t.expires}</span>
          </div>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap items-center gap-1">
          {t.features.map((feature) => (
            <Badge key={feature} variant="outline" size="sm" icon={<Sparkles />}>
              {feature}
            </Badge>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center font-mono text-[10px] text-muted-foreground">{t.footer}</p>
      </div>
    </div>
  );
}

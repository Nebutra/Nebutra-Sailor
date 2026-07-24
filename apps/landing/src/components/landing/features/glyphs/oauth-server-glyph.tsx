"use client";

import { Check, Clock, Connection, Key } from "@nebutra/icons";
import { Badge, Button } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * OauthServerGlyph — mini OAuth 2.0 / OIDC consent screen.
 *
 * Visual hint: a third-party app requests scoped access, the user sees the
 * scopes (read / write / admin) and an Approve button. Footer annotates the
 * issued artifact: a 1h-TTL JWT.
 */

type ScopeRow = {
  label: string;
  variant: "outline" | "amber-subtle" | "red-subtle";
};

const SCOPES: ReadonlyArray<ScopeRow> = [
  { label: "read:projects", variant: "outline" },
  { label: "write:deployments", variant: "amber-subtle" },
  { label: "admin:billing", variant: "red-subtle" },
];

const COPY = {
  en: {
    appLabel: "third-party app",
    appName: "Acme CI",
    scopesHeading: "Requested scopes:",
    approve: "Approve",
    token: "Token JWT · 1h TTL",
  },
  zh: {
    appLabel: "第三方应用",
    appName: "Acme CI",
    scopesHeading: "请求的权限范围：",
    approve: "批准",
    token: "Token JWT · 1h 有效期",
  },
} as const;

export function OauthServerGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      {/* Header — third-party app identity */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Key className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {t.appLabel} · &lsquo;{t.appName}&rsquo;
          </span>
        </div>
        <Connection className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
      </div>

      {/* Scopes */}
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="text-[10px] font-medium text-foreground">{t.scopesHeading}</div>
        <div className="flex flex-wrap gap-1">
          {SCOPES.map(({ label, variant }) => (
            <Badge key={label} variant={variant} size="sm" className="font-mono text-[10px]">
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Footer — Approve action + token annotation */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <Button type="button" size="tiny" variant="default" prefix={<Check aria-hidden="true" />}>
          {t.approve}
        </Button>
        <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/80">
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
          <span className="truncate">{t.token}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Eye, Key, LockClosed, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * IntegrationVaultGlyph — mini secrets vault card.
 *
 * Per-tenant encrypted secrets for third-party API keys. Visual hint:
 * a stack of masked credential rows, each tagged `encrypted`, footed
 * by an envelope-encryption annotation.
 */

type SecretRow = {
  provider: string;
  masked: string;
  Icon: typeof Key;
};

const SECRETS: ReadonlyArray<SecretRow> = [
  { provider: "Stripe API", masked: "sk_live_•••••••8847", Icon: Key },
  { provider: "OpenAI Key", masked: "sk-proj-•••••••a13e", Icon: LockClosed },
  { provider: "Slack OAuth", masked: "xoxb-•••••••92f0", Icon: Shield },
];

const COPY = {
  en: {
    tenantPrefix: "tenant_abc",
    countSuffix: "3 integrations",
    encrypted: "encrypted",
    footer: "AES-256-GCM · KMS-wrapped",
  },
  zh: {
    tenantPrefix: "tenant_abc",
    countSuffix: "3 个集成",
    encrypted: "已加密",
    footer: "AES-256-GCM · KMS 封装",
  },
} as const;

export function IntegrationVaultGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-md bg-[var(--neutral-2)] p-3"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Key className="h-3 w-3" aria-hidden="true" />
          <span className="truncate">
            {t.tenantPrefix} · {t.countSuffix}
          </span>
        </div>
        <Eye className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />
      </div>

      {/* Secret rows */}
      <div className="flex flex-1 flex-col gap-1">
        {SECRETS.map(({ provider, masked, Icon }) => (
          <div
            key={provider}
            className="flex items-center justify-between gap-2 rounded-sm border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-2 py-1.5"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[10px] font-medium text-foreground">{provider}</span>
                <span className="truncate font-mono text-[9px] text-muted-foreground">
                  {masked}
                </span>
              </div>
            </div>
            <Badge variant="green-subtle" size="sm" className="shrink-0">
              {t.encrypted}
            </Badge>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/80">
        <LockClosed className="h-2.5 w-2.5" aria-hidden="true" />
        <span>{t.footer}</span>
      </div>
    </div>
  );
}

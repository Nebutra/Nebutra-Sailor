"use client";

import { Eye, Key, LockClosed, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * VaultGlyph — mini vault card for envelope encryption (AWS KMS + local HKDF).
 *
 * Per-tenant DEK protected secrets. Visual: header with KMS-wrapped badge +
 * two masked secret rows with an Eye reveal control, footed by the
 * AES-256-GCM annotation.
 */

type SecretRow = {
  name: string;
  masked: string;
};

const SECRETS: ReadonlyArray<SecretRow> = [
  { name: "OPENAI_API_KEY", masked: "sk-•••••8847" },
  { name: "STRIPE_WEBHOOK_SECRET", masked: "whsec_•••••a3d2" },
];

const COPY = {
  en: {
    title: "vault",
    badge: "KMS-wrapped",
    footer: "AES-256-GCM · per-tenant DEK",
  },
  zh: {
    title: "vault",
    badge: "KMS 封装",
    footer: "AES-256-GCM · 每租户 DEK",
  },
} as const;

export function VaultGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[300px] flex-col gap-2 rounded-lg bg-[var(--neutral-1)] p-3 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Key className="h-3 w-3 text-[var(--neutral-11)]" aria-hidden="true" />
            <span className="font-mono text-[11px] text-[var(--neutral-11)]">{t.title}</span>
          </div>
          <Badge variant="green-subtle" size="sm" icon={<Shield />}>
            {t.badge}
          </Badge>
        </div>

        {/* Secret rows */}
        <div className="flex flex-col gap-1">
          {SECRETS.map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-2 rounded-md bg-[var(--neutral-2)] px-2 py-1.5 ring-1 ring-[var(--neutral-5)]"
            >
              <LockClosed
                className="h-3 w-3 shrink-0 text-[var(--neutral-10)]"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate font-mono text-[10px] text-[var(--neutral-12)]">
                  {row.name}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-[var(--neutral-10)]">
                  {row.masked}
                </span>
              </div>
              <Eye className="h-3 w-3 shrink-0 text-[var(--neutral-10)]" aria-hidden="true" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center font-mono text-[10px] text-[var(--neutral-10)]">{t.footer}</p>
      </div>
    </div>
  );
}

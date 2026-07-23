"use client";

import { ChevronRight, Envelope, LogoGithub, LogoGoogle, Shield } from "@nebutra/icons";
import { Badge, Separator } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    header: "Sign in to Nebutra",
    google: "Google",
    github: "GitHub",
    email: "Continue with email",
    footer: "MFA enforced · session HMAC-signed",
  },
  zh: {
    header: "登录 Nebutra",
    google: "Google",
    github: "GitHub",
    email: "使用邮箱继续",
    footer: "已启用 MFA · 会话 HMAC 签名",
  },
} as const;

type ProviderRow = {
  key: string;
  icon: React.ReactNode;
  label: string;
};

export function AuthGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  const rows: ProviderRow[] = [
    {
      key: "google",
      icon: <LogoGoogle className="h-3.5 w-3.5" />,
      label: copy.google,
    },
    {
      key: "github",
      icon: <LogoGithub className="h-3.5 w-3.5" />,
      label: copy.github,
    },
    {
      key: "email",
      icon: <Envelope className="h-3.5 w-3.5" />,
      label: copy.email,
    },
  ];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[300px] flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground">{copy.header}</span>
          <Badge variant="gray-subtle" size="sm" icon={<Shield />}>
            SSO
          </Badge>
        </div>

        {/* Provider rows */}
        <div className="flex flex-col gap-1">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-muted px-2 py-1.5 ring-1 ring-[hsl(var(--border))]"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-background text-foreground ring-1 ring-[hsl(var(--border))]">
                {row.icon}
              </span>
              <span className="truncate text-[11px] text-foreground">{row.label}</span>
              <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* Divider + footer */}
        <Separator className="my-0.5" />
        <p className="text-center font-mono text-[10px] text-muted-foreground">{copy.footer}</p>
      </div>
    </div>
  );
}

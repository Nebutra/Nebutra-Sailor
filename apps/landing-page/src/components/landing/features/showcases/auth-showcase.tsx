"use client";

import {
  Check,
  Key,
  LockClosed,
  LogoGithub,
  LogoGoogle,
  Envelope as Mail,
  User,
} from "@nebutra/icons";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Separator,
} from "@nebutra/ui/primitives";
import type { PackageShowcaseProps } from "./types";

type Provider = {
  badge: { label: { en: string; zh: string }; tone: "success" | "info" };
  icon: typeof LogoGoogle;
  id: string;
  label: { en: string; zh: string };
  variant: "default" | "outline" | "secondary";
};

const PROVIDERS: Provider[] = [
  {
    badge: { label: { en: "active", zh: "已启用" }, tone: "success" },
    icon: LockClosed,
    id: "clerk",
    label: { en: "Continue with Clerk", zh: "使用 Clerk 登录" },
    variant: "default",
  },
  {
    badge: { label: { en: "configured", zh: "已配置" }, tone: "info" },
    icon: Key,
    id: "better-auth",
    label: { en: "Continue with Better Auth", zh: "使用 Better Auth 登录" },
    variant: "outline",
  },
  {
    badge: { label: { en: "configured", zh: "已配置" }, tone: "info" },
    icon: LogoGithub,
    id: "nextauth",
    label: { en: "Continue with NextAuth", zh: "使用 NextAuth 登录" },
    variant: "outline",
  },
  {
    badge: { label: { en: "active", zh: "已启用" }, tone: "success" },
    icon: LogoGoogle,
    id: "google",
    label: { en: "Continue with Google SSO", zh: "使用 Google SSO 登录" },
    variant: "outline",
  },
  {
    badge: { label: { en: "configured", zh: "已配置" }, tone: "info" },
    icon: Mail,
    id: "email",
    label: { en: "Continue with Email", zh: "使用邮箱登录" },
    variant: "secondary",
  },
];

const COPY = {
  en: {
    cta: "Sign in",
    description: "Single auth surface — swap providers without touching app code.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    or: "or sign in with email",
    password: "Password",
    passwordPlaceholder: "••••••••••••",
    stats: "3 providers · SSO ready · MFA enforced",
    title: "Sign in to Nebutra",
  },
  zh: {
    cta: "登录",
    description: "单一认证入口 — 切换提供商无需改动应用代码。",
    email: "邮箱",
    emailPlaceholder: "you@example.com",
    or: "或使用邮箱登录",
    password: "密码",
    passwordPlaceholder: "••••••••••••",
    stats: "3 个提供商 · 支持 SSO · 强制 MFA",
    title: "登录 Nebutra",
  },
} as const;

function ProviderBadge({ tone, children }: { tone: "success" | "info"; children: string }) {
  return (
    <Badge size="sm" variant={tone === "success" ? "green-subtle" : "blue-subtle"}>
      {tone === "success" ? <Check aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
}

export function AuthShowcase({ locale }: PackageShowcaseProps) {
  const t = COPY[locale];

  return (
    <div
      className="flex w-full items-stretch justify-center rounded-[var(--radius-lg)] border border-border bg-background p-6 md:p-8"
      style={{ minHeight: "400px" }}
    >
      <Card className="flex w-full max-w-md flex-col shadow-sm">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <User className="size-4" aria-hidden="true" />
            <span>@nebutra/auth</span>
          </div>
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 pt-0">
          <ul className="flex flex-col gap-2" aria-label={t.title}>
            {PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              return (
                <li key={provider.id}>
                  <Button
                    type="button"
                    variant={provider.variant}
                    size="lg"
                    className="w-full justify-between gap-3 px-4 text-sm font-medium"
                    prefix={<Icon aria-hidden="true" />}
                    suffix={
                      <ProviderBadge tone={provider.badge.tone}>
                        {provider.badge.label[locale]}
                      </ProviderBadge>
                    }
                  >
                    <span className="flex-1 text-left">{provider.label[locale]}</span>
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3 py-2">
            <Separator className="flex-1" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.or}
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="grid gap-3">
            <Field label={t.email} htmlFor="auth-showcase-email">
              <Input
                id="auth-showcase-email"
                type="email"
                placeholder={t.emailPlaceholder}
                prefix={<Mail aria-hidden="true" />}
                readOnly
                tabIndex={-1}
              />
            </Field>
            <Field label={t.password} htmlFor="auth-showcase-password">
              <Input
                id="auth-showcase-password"
                type="password"
                placeholder={t.passwordPlaceholder}
                prefix={<LockClosed aria-hidden="true" />}
                readOnly
                tabIndex={-1}
              />
            </Field>
          </div>

          <Button type="button" variant="ink" size="lg" className="mt-1 w-full" tabIndex={-1}>
            {t.cta}
          </Button>

          <Separator className="mt-2" />

          <p className="text-center text-xs text-muted-foreground">{t.stats}</p>
        </CardContent>
      </Card>
    </div>
  );
}

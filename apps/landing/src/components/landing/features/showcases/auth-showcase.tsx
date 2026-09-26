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
import { ShowcaseFrame } from "./showcase-frame";
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
    id: "passkey",
    label: { en: "Continue with passkey", zh: "使用 Passkey 登录" },
    variant: "default",
  },
  {
    badge: { label: { en: "active", zh: "已启用" }, tone: "success" },
    icon: LogoGoogle,
    id: "google",
    label: { en: "Continue with Google", zh: "使用 Google 登录" },
    variant: "outline",
  },
  {
    badge: { label: { en: "active", zh: "已启用" }, tone: "success" },
    icon: LogoGithub,
    id: "github",
    label: { en: "Continue with GitHub", zh: "使用 GitHub 登录" },
    variant: "outline",
  },
  {
    badge: { label: { en: "active", zh: "已启用" }, tone: "success" },
    icon: Key,
    id: "device",
    label: { en: "Continue with device code", zh: "使用设备码登录" },
    variant: "outline",
  },
  {
    badge: { label: { en: "active", zh: "已启用" }, tone: "success" },
    icon: Mail,
    id: "email",
    label: { en: "Continue with magic link", zh: "使用魔法链接登录" },
    variant: "secondary",
  },
];

const COPY = {
  en: {
    cta: "Sign in",
    description:
      "One auth provider, every sign-in method it needs — Better Auth, no vendor in the loop.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    or: "or sign in with email",
    password: "Password",
    passwordPlaceholder: "••••••••••••",
    stats: "Better Auth · SSO ready · MFA enforced",
    title: "Sign in to Nebutra",
  },
  zh: {
    cta: "登录",
    description: "一个认证提供方，覆盖所有需要的登录方式 — Better Auth，不经第三方厂商。",
    email: "邮箱",
    emailPlaceholder: "you@example.com",
    or: "或使用邮箱登录",
    password: "密码",
    passwordPlaceholder: "••••••••••••",
    stats: "Better Auth · 支持 SSO · 强制 MFA",
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
    <ShowcaseFrame className="flex items-stretch justify-center">
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
    </ShowcaseFrame>
  );
}

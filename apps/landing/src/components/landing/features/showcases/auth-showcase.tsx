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
  icon: typeof LogoGoogle;
  id: string;
  variant: "default" | "outline" | "secondary";
};

const PROVIDERS: Provider[] = [
  { icon: LockClosed, id: "passkey", variant: "default" },
  { icon: LogoGoogle, id: "google", variant: "outline" },
  { icon: LogoGithub, id: "github", variant: "outline" },
  { icon: Key, id: "device", variant: "outline" },
  { icon: Mail, id: "email", variant: "secondary" },
];

type AuthCopy = {
  active: string;
  providers: Record<string, { label: string }>;
  cta: string;
  description: string;
  email: string;
  or: string;
  password: string;
  stats: string;
  title: string;
};

// Same in every locale — an example email/password, not translatable copy.
const EMAIL_PLACEHOLDER = "you@example.com";
const PASSWORD_PLACEHOLDER = "••••••••••••";

function ProviderBadge({ tone, children }: { tone: "success" | "info"; children: string }) {
  return (
    <Badge size="sm" variant={tone === "success" ? "green-subtle" : "blue-subtle"}>
      {tone === "success" ? <Check aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
}

export function AuthShowcase({ copy }: PackageShowcaseProps) {
  const t = copy as AuthCopy;

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
            {PROVIDERS.map((provider, index) => {
              const Icon = provider.icon;
              return (
                <li key={provider.id}>
                  <Button
                    type="button"
                    variant={provider.variant}
                    size="lg"
                    className="w-full justify-between gap-3 px-4 text-sm font-medium"
                    prefix={<Icon aria-hidden="true" />}
                    suffix={<ProviderBadge tone="success">{t.active}</ProviderBadge>}
                  >
                    <span className="flex-1 text-left">{t.providers[String(index)].label}</span>
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
                placeholder={EMAIL_PLACEHOLDER}
                prefix={<Mail aria-hidden="true" />}
                readOnly
                tabIndex={-1}
              />
            </Field>
            <Field label={t.password} htmlFor="auth-showcase-password">
              <Input
                id="auth-showcase-password"
                type="password"
                placeholder={PASSWORD_PLACEHOLDER}
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

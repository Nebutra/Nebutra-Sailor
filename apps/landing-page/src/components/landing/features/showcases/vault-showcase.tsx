"use client";

import {
  ArrowRight,
  Clock,
  Eye,
  Key as KeyAsterisk,
  LockClosed,
  RefreshClockwise,
  Shield,
} from "@nebutra/icons";

import { Badge } from "@nebutra/ui/primitives/badge";
import { Button } from "@nebutra/ui/primitives/button";
import { Card } from "@nebutra/ui/primitives/card";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type Secret = {
  name: string;
  masked: string;
  tenant: string;
  kmsKeyId: string;
  rotated: string;
};

type Copy = {
  headerTitle: string;
  countBadge: string;
  reveal: string;
  chain: { plaintext: string; dek: string; kek: string };
  footnote: string;
  secrets: Secret[];
};

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    headerTitle: "secrets",
    countBadge: "12 secrets · 3 tenants",
    reveal: "Reveal",
    chain: { plaintext: "Plaintext", dek: "DEK", kek: "KEK (KMS)" },
    footnote: "AES-256-GCM · per-tenant DEK · KMS-wrapped",
    secrets: [
      {
        name: "OpenAI API Key",
        masked: "sk-•••••••••••8847",
        tenant: "acme-prod",
        kmsKeyId: "kms/9f2a",
        rotated: "rotated 3 days ago",
      },
      {
        name: "Stripe Webhook Secret",
        masked: "whsec_•••••••••••1c4d",
        tenant: "acme-prod",
        kmsKeyId: "kms/9f2a",
        rotated: "rotated 12 days ago",
      },
      {
        name: "Database Password",
        masked: "pg://•••••••••••a31f",
        tenant: "lumen-dev",
        kmsKeyId: "kms/4b7e",
        rotated: "rotated 27 days ago",
      },
    ],
  },
  zh: {
    headerTitle: "密钥库",
    countBadge: "12 个密钥 · 3 个租户",
    reveal: "显示",
    chain: { plaintext: "明文", dek: "DEK", kek: "KEK (KMS)" },
    footnote: "AES-256-GCM · 租户级 DEK · KMS 包裹",
    secrets: [
      {
        name: "OpenAI API Key",
        masked: "sk-•••••••••••8847",
        tenant: "acme-prod",
        kmsKeyId: "kms/9f2a",
        rotated: "3 天前轮换",
      },
      {
        name: "Stripe Webhook 密钥",
        masked: "whsec_•••••••••••1c4d",
        tenant: "acme-prod",
        kmsKeyId: "kms/9f2a",
        rotated: "12 天前轮换",
      },
      {
        name: "数据库密码",
        masked: "pg://•••••••••••a31f",
        tenant: "lumen-dev",
        kmsKeyId: "kms/4b7e",
        rotated: "27 天前轮换",
      },
    ],
  },
};

function SecretRow({ secret, revealLabel }: { secret: Secret; revealLabel: string }) {
  return (
    <Card className="border-border/60 p-3 shadow-none">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <KeyAsterisk className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-medium text-foreground">{secret.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="tiny"
            prefix={<Eye />}
            aria-label={`${revealLabel} ${secret.name}`}
          >
            {revealLabel}
          </Button>
        </div>
        <code className="block truncate rounded-[var(--radius-sm)] border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs text-foreground">
          {secret.masked}
        </code>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="gray-subtle" size="sm" icon={<Shield />}>
            {secret.tenant}
          </Badge>
          <Badge variant="blue-subtle" size="sm" icon={<LockClosed />}>
            {secret.kmsKeyId}
          </Badge>
          <Badge variant="outline" size="sm" icon={<Clock />}>
            {secret.rotated}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function ChainPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
      <span aria-hidden="true" className="text-foreground">
        {icon}
      </span>
      {label}
    </span>
  );
}

export function VaultShowcase({ locale }: PackageShowcaseProps) {
  const copy = COPY[locale];

  return (
    <ShowcaseFrame>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
            <LockClosed className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-foreground">{copy.headerTitle}</span>
          <Badge variant="gray-subtle" size="sm">
            {copy.countBadge}
          </Badge>
        </div>
        <Badge variant="green-subtle" size="sm" icon={<RefreshClockwise />}>
          rotation policy
        </Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {copy.secrets.map((secret) => (
          <SecretRow key={secret.name} secret={secret} revealLabel={copy.reveal} />
        ))}
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ChainPill icon={<Eye className="h-3 w-3" />} label={copy.chain.plaintext} />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <ChainPill icon={<KeyAsterisk className="h-3 w-3" />} label={copy.chain.dek} />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <ChainPill icon={<Shield className="h-3 w-3" />} label={copy.chain.kek} />
        </div>
        <p className="text-center font-mono text-[10px] text-muted-foreground">{copy.footnote}</p>
      </div>
    </ShowcaseFrame>
  );
}

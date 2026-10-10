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
import { Badge, Button, Card } from "@nebutra/ui/primitives";

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
  chain: { plaintext: string };
  footnote: string;
  /** Translatable secret name and rotation age, keyed by secret index. */
  secrets: Record<string, { name?: string; rotated?: string }>;
};

// Key-hierarchy acronyms — same on every locale.
const CHAIN = { dek: "DEK", kek: "KEK (KMS)" } as const;

// Masked values, tenants and KMS key ids — demo data, same on every locale.
const SECRETS: ReadonlyArray<Omit<Secret, "name" | "rotated">> = [
  { masked: "sk-•••••••••••8847", tenant: "acme-prod", kmsKeyId: "kms/9f2a" },
  { masked: "whsec_•••••••••••1c4d", tenant: "acme-prod", kmsKeyId: "kms/9f2a" },
  { masked: "pg://•••••••••••a31f", tenant: "lumen-dev", kmsKeyId: "kms/4b7e" },
];

function SecretRow({ secret, revealLabel }: { secret: Secret; revealLabel: string }) {
  return (
    <Card className="p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted text-muted-foreground">
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

export function VaultShowcase({ copy: rawCopy }: PackageShowcaseProps) {
  const copy = rawCopy as Copy;
  const secrets: Secret[] = SECRETS.map((secret, i) => ({
    ...secret,
    name: copy.secrets[i]?.name ?? "",
    rotated: copy.secrets[i]?.rotated ?? "",
  }));

  return (
    <ShowcaseFrame>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-md)] bg-primary text-primary-foreground">
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
        {secrets.map((secret) => (
          <SecretRow key={secret.masked} secret={secret} revealLabel={copy.reveal} />
        ))}
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ChainPill icon={<Eye className="h-3 w-3" />} label={copy.chain.plaintext} />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <ChainPill icon={<KeyAsterisk className="h-3 w-3" />} label={CHAIN.dek} />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <ChainPill icon={<Shield className="h-3 w-3" />} label={CHAIN.kek} />
        </div>
        <p className="text-center font-mono text-[10px] text-muted-foreground">{copy.footnote}</p>
      </div>
    </ShowcaseFrame>
  );
}

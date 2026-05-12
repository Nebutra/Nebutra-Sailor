"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MagicLinkForm } from "./magic-link-form";

interface MagicLinkPanelProps {
  /** Sanitized returnUrl to land on after verification. */
  returnUrl?: string;
}

export function MagicLinkPanel({ returnUrl }: MagicLinkPanelProps) {
  const t = useTranslations("auth.magicLink");
  const router = useRouter();

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {t("title")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--neutral-10)]">{t("description")}</p>
      </div>
      <MagicLinkForm
        onSuccess={() => {
          router.push(returnUrl ?? "/");
        }}
      />
    </div>
  );
}

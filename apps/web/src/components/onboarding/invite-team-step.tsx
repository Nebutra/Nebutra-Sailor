"use client";

import { CrossSmall, Plus } from "@nebutra/icons";
import { Button, Input, Label } from "@nebutra/ui/primitives";
import { AUTH_PRIMARY_CTA_CLASS } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface InviteTeamStepProps {
  onComplete: () => void;
}

export function InviteTeamStep({ onComplete }: InviteTeamStepProps) {
  const t = useTranslations("onboarding.invite");
  const [emails, setEmails] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addField() {
    if (emails.length < 5) {
      setEmails([...emails, ""]);
    }
  }

  function removeField(index: number) {
    setEmails(emails.filter((_, i) => i !== index));
  }

  function updateEmail(index: number, value: string) {
    setEmails(emails.map((e, i) => (i === index ? value : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validEmails = emails.filter((email) => email.trim().includes("@"));
    if (validEmails.length === 0) {
      onComplete();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/invite-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: validEmails }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || t("error"));
        return;
      }

      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label>{t("emailsLabel")}</Label>
          <div className="flex flex-col gap-2">
            {emails.map((email, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="email"
                  size="lg"
                  className="h-12 border-border bg-background text-foreground shadow-none"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => updateEmail(i, e.target.value)}
                />
                {emails.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    shape="circle"
                    size="sm"
                    aria-label={t("removeEmail")}
                    onClick={() => removeField(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <CrossSmall className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {emails.length < 5 ? (
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {t("addAnother")}
          </button>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="ink" className={AUTH_PRIMARY_CTA_CLASS} disabled={loading}>
            {loading ? t("sending") : t("send")}
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full" onClick={onComplete}>
            {t("skip")}
          </Button>
        </div>
      </form>
    </div>
  );
}

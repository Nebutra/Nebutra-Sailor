"use client";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Select,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import type { AppLocale } from "@/lib/locale";

const ALL_CHANNELS = ["email", "feishu", "dingtalk", "wecom", "slack", "webhook"] as const;
type Channel = (typeof ALL_CHANNELS)[number];

type Outcome =
  | { kind: "pending"; target: string }
  | { kind: "active"; unsubscribeUrl: string | null }
  | null;

/**
 * Subscribe to a page through the instance's own API
 * (POST /api/v1/pages/:slug/subscribe). Email appears only when this instance
 * can send mail; if it cannot, the API answers 409 and we say so plainly and
 * offer the bot and webhook channels instead.
 */
export function SubscribeDialog({
  slug,
  locale,
  components,
}: {
  slug: string;
  locale: AppLocale;
  components: Array<{ key: string; name: string }>;
}) {
  const t = useTranslations("subscribe");
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<Channel[] | null>(null);
  const [channel, setChannel] = useState<Channel>("feishu");
  const [narrow, setNarrow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  useEffect(() => {
    if (!open || available) return;
    fetch(`/api/v1/pages/${slug}/subscribe`)
      .then((r) => (r.ok ? r.json() : { channels: [] }))
      .then((data: { channels?: string[] }) => {
        const list = ALL_CHANNELS.filter((c) => data.channels?.includes(c));
        setAvailable(list.length > 0 ? list : [...ALL_CHANNELS].filter((c) => c !== "email"));
        setChannel(list[0] ?? "feishu");
      })
      .catch(() => setAvailable([...ALL_CHANNELS].filter((c) => c !== "email")));
  }, [open, available, slug]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = String(form.get("target") ?? "").trim();
    const secret = String(form.get("secret") ?? "").trim();
    const picked = narrow ? form.getAll("components").map(String) : [];
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/pages/${slug}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          target,
          locale,
          ...(secret ? { secret } : {}),
          ...(picked.length > 0 ? { components: picked } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        status?: string;
        unsubscribeUrl?: string;
        error?: string;
        detail?: unknown;
      };
      if (response.ok) {
        setOutcome(
          data.status === "pending_confirmation"
            ? { kind: "pending", target }
            : { kind: "active", unsubscribeUrl: data.unsubscribeUrl ?? null },
        );
      } else if (data.error === "email_disabled") {
        setAvailable((list) => (list ?? []).filter((c) => c !== "email"));
        setChannel("feishu");
        setError(t("emailDisabled"));
      } else if (response.status === 429) {
        setError(t("rateLimited"));
      } else {
        const detail =
          typeof data.detail === "string" ? data.detail : (data.error ?? String(response.status));
        setError(t("error", { detail }));
      }
    } catch (e) {
      setError(t("error", { detail: String(e) }));
    } finally {
      setPending(false);
    }
  };

  const targetLabel =
    channel === "email"
      ? t("targetEmail")
      : channel === "webhook"
        ? t("targetWebhook")
        : t("targetBot");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setOutcome(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ink" size="sm">
          {t("title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>

        {outcome ? (
          <div role="status" className="grid gap-3 text-sm">
            <p className="text-foreground">
              {outcome.kind === "pending" ? t("pending", { target: outcome.target }) : t("active")}
            </p>
            {outcome.kind === "active" && outcome.unsubscribeUrl ? (
              <p className="text-muted-foreground">
                {t("keepLink")}{" "}
                <a
                  className="break-all text-foreground underline underline-offset-4"
                  href={outcome.unsubscribeUrl}
                >
                  {outcome.unsubscribeUrl}
                </a>
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => setOutcome(null)}
            >
              {t("again")}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            {error ? (
              <p
                role="alert"
                className="rounded-md border border-amber-700/40 bg-amber-200 px-3 py-2 text-sm text-foreground"
              >
                {error}
              </p>
            ) : null}
            <Field label={t("channel")} htmlFor="sub-channel">
              <Select
                id="sub-channel"
                value={channel}
                onValueChange={(v) => setChannel((v as Channel) ?? "feishu")}
                options={(available ?? ALL_CHANNELS.filter((c) => c !== "email")).map((c) => ({
                  value: c,
                  label: t(c),
                }))}
              />
            </Field>
            <Field label={targetLabel} htmlFor="sub-target">
              <Input
                id="sub-target"
                name="target"
                required
                type={channel === "email" ? "email" : "url"}
                autoComplete={channel === "email" ? "email" : "off"}
                placeholder={channel === "email" ? "you@example.com" : "https://"}
              />
            </Field>
            {channel !== "email" ? (
              <Field label={t("secret")} htmlFor="sub-secret" description={t("secretHint")}>
                <Input id="sub-secret" name="secret" autoComplete="off" />
              </Field>
            ) : null}
            {components.length > 1 ? (
              <fieldset className="grid gap-2">
                <Checkbox checked={narrow} onCheckedChange={setNarrow}>
                  {t("components")}
                </Checkbox>
                {narrow ? (
                  <div className="grid gap-2 pl-6 sm:grid-cols-2">
                    {components.map((c) => (
                      <Checkbox key={c.key} name="components" value={c.key}>
                        {c.name}
                      </Checkbox>
                    ))}
                  </div>
                ) : null}
              </fieldset>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">
                {t("feeds")}{" "}
                <a
                  className="underline underline-offset-4 hover:text-foreground"
                  href={`/api/v1/pages/${slug}/feed.atom`}
                >
                  {t("atom")}
                </a>{" "}
                ·{" "}
                <a
                  className="underline underline-offset-4 hover:text-foreground"
                  href={`/api/v1/pages/${slug}/feed.rss`}
                >
                  {t("rss")}
                </a>
              </p>
              <Button type="submit" variant="ink" size="sm" disabled={pending}>
                {t("submit")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

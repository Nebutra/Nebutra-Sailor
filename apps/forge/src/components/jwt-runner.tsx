"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

const SAMPLE =
  "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik5lYnV0cmEiLCJpYXQiOjE1MTYyMzkwMjJ9.";

function formatUnix(sec: unknown, locale: string): string | null {
  if (typeof sec !== "number" || !Number.isFinite(sec)) return null;
  try {
    return new Date(sec * 1000).toLocaleString(locale);
  } catch {
    return null;
  }
}

export function JwtRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [token, setToken] = useState(SAMPLE);
  const [header, setHeader] = useState("");
  const [payload, setPayload] = useState("");
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (label: string, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  };

  const decode = async () => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { token: token.trim() } }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: {
        header?: Record<string, unknown>;
        payload?: Record<string, unknown>;
        note?: string;
        engine?: string;
      };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "decode failed");
      setHeader("");
      setPayload("");
      setClaims(null);
      return;
    }
    const h = body.output?.header ?? {};
    const p = body.output?.payload ?? {};
    setHeader(JSON.stringify(h, null, 2));
    setPayload(JSON.stringify(p, null, 2));
    setClaims(p);
    setNote(t("jwt.decodeNote", { engine: body.output?.engine ?? "jose" }));
  };

  const expHuman = formatUnix(claims?.exp, "en-US");
  const iatHuman = formatUnix(claims?.iat, "en-US");

  return (
    <div className="space-y-4">
      <Textarea
        label="JWT"
        id="jwt-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={5}
        className="font-mono text-xs"
        placeholder={t("jwt.tokenPlaceholder")}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={() => void decode()}>
          {t("jwt.decode")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setToken(SAMPLE)}>
          {t("jwt.sample")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => copy("token", token)}>
          {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {t("common.copy")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {note ? <RunnerNote>{note}</RunnerNote> : null}

      {(claims?.exp != null || claims?.iat != null) && (
        <div className="flex flex-wrap gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)]/40 px-3 py-2 text-xs text-[var(--neutral-11)]">
          {claims?.iat != null ? (
            <span>
              iat: <span className="font-mono text-[var(--neutral-12)]">{String(claims.iat)}</span>
              {iatHuman ? ` · ${iatHuman}` : ""}
            </span>
          ) : null}
          {claims?.exp != null ? (
            <span>
              exp: <span className="font-mono text-[var(--neutral-12)]">{String(claims.exp)}</span>
              {expHuman ? ` · ${expHuman}` : ""}
            </span>
          ) : null}
        </div>
      )}

      {(header || payload) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--neutral-10)]">Header</p>
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => copy("h", header)}
              >
                {copied === "h" ? t("common.copied") : t("common.copy")}
              </Button>
            </div>
            <RunnerOutput className="text-xs">{header}</RunnerOutput>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--neutral-10)]">Payload</p>
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => copy("p", payload)}
              >
                {copied === "p" ? t("common.copied") : t("common.copy")}
              </Button>
            </div>
            <RunnerOutput className="text-xs">{payload}</RunnerOutput>
          </div>
        </div>
      )}
      <RunnerNote>{t("jwt.footerNote")}</RunnerNote>
      <p className="text-xs text-[var(--neutral-10)]">
        {t("jwt.generateHint")}{" "}
        <a className="text-[var(--blue-11)] underline" href="/t/jwt-generate">
          jwt-generate
        </a>
      </p>
    </div>
  );
}

/** Optional compact secret field for generate page reuse */
export function JwtSecretField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("runners");
  return (
    <Input
      label={t("jwt.secret")}
      id="jwt-secret"
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

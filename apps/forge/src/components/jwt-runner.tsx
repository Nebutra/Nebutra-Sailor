"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { InstantTransformShell, ShellNote } from "@/components/journey-shells";
import { JwtTokenSpecimen, splitJwtParts } from "@/components/specimens";

const SAMPLE =
  "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik5lYnV0cmEiLCJpYXQiOjE1MTYyMzkwMjJ9.";

type JwtOutput = {
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  note?: string;
  engine?: string;
};

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
  const locale = useLocale();
  const [raw, setRaw] = useState(SAMPLE);

  return (
    <InstantTransformShell<JwtOutput>
      engine={{ toolId }}
      inputKind="block"
      rows={4}
      inputLabel={t("jwt.tokenPlaceholder")}
      inputPlaceholder={t("jwt.tokenPlaceholder")}
      initialValue={SAMPLE}
      sample={SAMPLE}
      note={t("jwt.footerNote")}
      onTextChange={setRaw}
      buildInput={(text) => {
        const token = text.trim();
        if (!token || !token.includes(".")) return null;
        return { token };
      }}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      exit={(o) => ({
        text: JSON.stringify({ header: o.header, payload: o.payload }, null, 2),
        json: o,
      })}
      renderResult={(o) => {
        const [h, p, s] = splitJwtParts(raw);
        const headerPretty = o.header ? JSON.stringify(o.header, null, 2) : h;
        const payloadPretty = o.payload ? JSON.stringify(o.payload, null, 2) : p;
        const claims = o.payload ?? {};
        const expHuman = formatUnix(claims.exp, locale);
        const iatHuman = formatUnix(claims.iat, locale);

        return (
          <JwtTokenSpecimen
            parts={[
              { label: t("jwt.header"), raw: h, pretty: headerPretty, tone: "header" },
              {
                label: t("jwt.payloadLabel"),
                raw: p,
                pretty: payloadPretty,
                tone: "payload",
              },
              {
                label: t("jwt.signature"),
                raw: s,
                pretty: s || t("jwt.emptySignature"),
                tone: "signature",
              },
            ]}
            claimsSummary={
              claims.exp != null || claims.iat != null ? (
                <div className="flex flex-wrap gap-3 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-2 text-xs text-[var(--neutral-11)]">
                  {claims.iat != null ? (
                    <span>
                      iat:{" "}
                      <span className="font-mono text-[var(--neutral-12)]">
                        {String(claims.iat)}
                      </span>
                      {iatHuman ? ` · ${iatHuman}` : ""}
                    </span>
                  ) : null}
                  {claims.exp != null ? (
                    <span>
                      exp:{" "}
                      <span className="font-mono text-[var(--neutral-12)]">
                        {String(claims.exp)}
                      </span>
                      {expHuman ? ` · ${expHuman}` : ""}
                    </span>
                  ) : null}
                </div>
              ) : null
            }
            note={t("honesty.signatureNotVerified", {
              engine: o.engine ?? "jose",
            })}
          />
        );
      }}
    />
  );
}

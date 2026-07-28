"use client";

/**
 * IBAN validator — instant transform (brief §8, docs/plans/tools/iban.md).
 *
 * Every competitor in the teardown gates this behind a "Check IBAN" click for
 * a sub-millisecond MOD 97-10 fold; here the verdict follows the keystroke.
 * Two consequences the shell already handles and this file must not undo: a
 * half-typed IBAN reads as "keep typing" rather than a red failure, and the
 * previous verdict stays on screen while the next one computes.
 *
 * The verdict panel is drop-and-verdict-shaped: one answer, with the parsed
 * country/check-digits/BBAN breakdown behind a drill. The "well-formed is not
 * proof the account exists" line rides on every pass — it is the one piece of
 * domain know-how every competitor independently arrives at.
 */

import { useTranslations } from "next-intl";
import {
  InstantTransformShell,
  ShellBadge,
  ShellCode,
  ShellDrill,
  ShellNote,
  ShellVerdict,
} from "./journey-shells";

type IbanReason =
  | "bad_charset"
  | "country_unsupported"
  | "incomplete"
  | "wrong_length_for_country"
  | "structure_mismatch"
  | "checksum_failed";

type CheckState = "pass" | "fail" | "skipped";

interface IbanOutput {
  valid: boolean;
  incomplete: boolean;
  normalized: string;
  formatted: string;
  length: number;
  country: { code: string; name?: string; expectedLength?: number; bbanFormat?: string } | null;
  checkDigits?: string;
  bban?: string;
  bankCode?: string;
  expectedCheckDigits?: string;
  reason?: IbanReason;
  checks: Record<"charset" | "country" | "length" | "structure" | "checksum", CheckState>;
  caveat: string;
  source: { checksum: string; structure: string; countriesCovered: number };
}

const SAMPLE = "GB82 WEST 1234 5698 7654 32";
const CHECK_ORDER = ["charset", "country", "length", "structure", "checksum"] as const;

export function W3IbanRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");

  const verdictTone = (output: IbanOutput) =>
    output.valid ? "success" : output.incomplete ? "neutral" : "danger";

  const headline = (output: IbanOutput) =>
    output.valid
      ? t("iban.valid")
      : output.incomplete
        ? t("iban.keepTyping")
        : t(`iban.reason.${output.reason ?? "bad_charset"}`);

  return (
    <InstantTransformShell<IbanOutput>
      engine={{ toolId }}
      inputKind="line"
      inputLabel={t("iban.inputLabel")}
      inputPlaceholder={SAMPLE}
      sample={SAMPLE}
      note={t("iban.sourceNote")}
      buildInput={(text) => (text.trim() ? { iban: text } : null)}
      idle={<ShellNote>{t("iban.idle")}</ShellNote>}
      exit={(output) => ({
        text: [
          output.formatted,
          headline(output),
          output.country?.name ?? output.country?.code ?? "",
          output.valid ? t("iban.caveat") : "",
        ]
          .filter(Boolean)
          .join("\n"),
        json: output,
      })}
      renderResult={(output) => (
        <div className="space-y-3">
          <ShellVerdict
            tone={verdictTone(output)}
            headline={headline(output)}
            caveat={output.valid ? t("iban.caveat") : undefined}
            badges={
              <>
                {output.country ? (
                  <ShellBadge tone={output.country.name ? "info" : "warning"}>
                    {output.country.name
                      ? t("iban.badge.country", {
                          name: output.country.name,
                          code: output.country.code,
                        })
                      : t("iban.badge.unknownCountry", { code: output.country.code })}
                  </ShellBadge>
                ) : null}
                {output.country?.expectedLength ? (
                  <ShellBadge tone={output.checks.length === "fail" ? "danger" : "neutral"}>
                    {t("iban.badge.length", {
                      n: output.length,
                      expected: output.country.expectedLength,
                    })}
                  </ShellBadge>
                ) : null}
                {output.bankCode ? (
                  <ShellBadge>{t("iban.badge.bankCode", { code: output.bankCode })}</ShellBadge>
                ) : null}
                {output.reason === "checksum_failed" && output.expectedCheckDigits ? (
                  <ShellBadge tone="warning">
                    {t("iban.badge.expectedCheckDigits", { digits: output.expectedCheckDigits })}
                  </ShellBadge>
                ) : null}
              </>
            }
          />

          {output.valid ? (
            <ShellCode label={t("iban.printFormat")}>{output.formatted}</ShellCode>
          ) : null}

          <ShellDrill summary={t("iban.details")}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-[var(--neutral-10)]">{t("iban.field.normalized")}</dt>
              <dd className="font-mono break-all">{output.normalized || "—"}</dd>
              <dt className="text-[var(--neutral-10)]">{t("iban.field.country")}</dt>
              <dd>{output.country?.name ?? output.country?.code ?? "—"}</dd>
              <dt className="text-[var(--neutral-10)]">{t("iban.field.checkDigits")}</dt>
              <dd className="font-mono">{output.checkDigits ?? "—"}</dd>
              <dt className="text-[var(--neutral-10)]">{t("iban.field.bban")}</dt>
              <dd className="font-mono break-all">{output.bban ?? "—"}</dd>
              <dt className="text-[var(--neutral-10)]">{t("iban.field.bbanFormat")}</dt>
              <dd className="font-mono">{output.country?.bbanFormat ?? "—"}</dd>
              <dt className="text-[var(--neutral-10)]">{t("iban.field.bankCode")}</dt>
              <dd className="font-mono">{output.bankCode ?? t("iban.notEncoded")}</dd>
            </dl>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {CHECK_ORDER.map((key) => (
                <li key={key}>
                  <ShellBadge
                    tone={
                      output.checks[key] === "pass"
                        ? "success"
                        : output.checks[key] === "fail"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {t(`iban.check.${key}`)} · {t(`iban.state.${output.checks[key]}`)}
                  </ShellBadge>
                </li>
              ))}
            </ul>

            <ShellNote>{t("iban.coverage", { n: output.source.countriesCovered })}</ShellNote>
          </ShellDrill>
        </div>
      )}
    />
  );
}

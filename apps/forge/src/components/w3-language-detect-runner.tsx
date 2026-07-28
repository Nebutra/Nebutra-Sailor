"use client";

/**
 * Programming-language detector — instant transform (brief §8,
 * docs/plans/tools/language-detect.md), with a drop-and-verdict result card.
 *
 * Every free competitor reached (OneCompiler, CreativeTechGuy, CodePal) makes
 * the user press a button for a computation that costs nothing; this page has
 * no button — the shell recomputes as you paste. The optional filename hint
 * sits under the paste box because §7.1 shows it materially changes the answer
 * on collision-prone extensions, and it is optional because "instant use"
 * (§6.5 gate 1) means an empty page must still be usable.
 *
 * The shell owns layout, idle/running/error states, the invoke and the exits.
 * This file owns the hint control, the verdict projection and its labels.
 */

import { Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  InstantTransformShell,
  ShellBadge,
  ShellCode,
  ShellDrill,
  ShellNote,
  type ShellTone,
  ShellVerdict,
} from "./journey-shells";

type ConfidenceLabel = "high" | "medium" | "low";

interface LanguageDetectOutput {
  primary: { language: string; confidenceLabel: ConfidenceLabel; confidenceScore: number };
  isDataFormat: boolean;
  signals: string[];
  alternates: Array<{ language: string; confidenceScore: number }>;
  multiLanguageSuspected: boolean;
  warning?: string;
  engine?: string;
}

const TONE_BY_LABEL: Record<ConfidenceLabel, ShellTone> = {
  high: "success",
  medium: "info",
  low: "warning",
};

/**
 * Compose-next (§9.1.6): detection stays read-only, but the next verb is one
 * click away when the registry actually has a formatter for that language.
 */
const NEXT_TOOL_BY_LANGUAGE: Readonly<Record<string, string>> = {
  JSON: "json-format",
  YAML: "yaml-format",
  TOML: "toml-format",
  XML: "xml-format",
  HTML: "html-format",
  CSS: "css-format",
  SQL: "sql-format",
  Markdown: "markdown-toc",
};

const SAMPLE = [
  "package main",
  "",
  'import "fmt"',
  "",
  "func main() {",
  '\tmsg := "hello"',
  "\tfmt.Println(msg)",
  "}",
].join("\n");

export function W3LanguageDetectRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [hint, setHint] = useState("");

  const summarize = (out: LanguageDetectOutput): string =>
    [
      `${out.primary.language} (${t(`languageDetect.confidence.${out.primary.confidenceLabel}`)}, ${out.primary.confidenceScore}/100)`,
      ...out.signals.map((line) => `- ${line}`),
    ].join("\n");

  return (
    <InstantTransformShell<LanguageDetectOutput>
      engine={{
        toolId,
        parse: (output) => output as unknown as LanguageDetectOutput,
      }}
      inputLabel={t("languageDetect.inputLabel")}
      inputPlaceholder={t("languageDetect.inputPlaceholder")}
      rows={12}
      sample={SAMPLE}
      note={t("languageDetect.note")}
      optionsKey={hint}
      options={
        <Input
          id="language-detect-hint"
          label={t("languageDetect.hintLabel")}
          value={hint}
          placeholder={t("languageDetect.hintPlaceholder")}
          onChange={(e) => setHint(e.target.value)}
          className="font-mono"
          spellCheck={false}
          autoComplete="off"
        />
      }
      buildInput={(text) => {
        if (!text.trim()) return null;
        const trimmedHint = hint.trim();
        return trimmedHint ? { code: text, filenameHint: trimmedHint } : { code: text };
      }}
      idle={<ShellVerdict tone="neutral" headline="—" caveat={t("languageDetect.idle")} />}
      exit={(out) => ({
        text: summarize(out),
        json: out,
        filename: "language-detect.txt",
      })}
      renderResult={(out) => {
        const { language, confidenceLabel, confidenceScore } = out.primary;
        const nextSlug = NEXT_TOOL_BY_LANGUAGE[language];
        return (
          <div className="space-y-3">
            <ShellVerdict
              tone={TONE_BY_LABEL[confidenceLabel]}
              headline={language}
              caveat={out.warning}
              badges={
                <>
                  <ShellBadge tone={TONE_BY_LABEL[confidenceLabel]}>
                    {t(`languageDetect.confidence.${confidenceLabel}`)}
                  </ShellBadge>
                  <ShellBadge tone="neutral">
                    {t("languageDetect.score", { n: confidenceScore })}
                  </ShellBadge>
                  {out.isDataFormat ? (
                    <ShellBadge tone="info">{t("languageDetect.dataFormat")}</ShellBadge>
                  ) : null}
                  {out.multiLanguageSuspected ? (
                    <ShellBadge tone="warning">{t("languageDetect.multiLanguage")}</ShellBadge>
                  ) : null}
                </>
              }
            />

            {out.signals.length > 0 || out.alternates.length > 0 ? (
              <ShellDrill summary={t("languageDetect.why")}>
                <div className="space-y-3">
                  {out.signals.length > 0 ? (
                    <ShellCode label={t("languageDetect.signals")}>
                      {out.signals.map((line) => `• ${line}`).join("\n")}
                    </ShellCode>
                  ) : null}
                  {out.alternates.length > 0 ? (
                    <div className="space-y-1.5">
                      <ShellNote>{t("languageDetect.alternates")}</ShellNote>
                      <div className="flex flex-wrap gap-1.5">
                        {out.alternates.map((alt) => (
                          <ShellBadge key={alt.language} tone="neutral">
                            {`${alt.language} · ${alt.confidenceScore}`}
                          </ShellBadge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </ShellDrill>
            ) : null}

            {nextSlug ? (
              <ShellNote>
                <Link href={`/t/${nextSlug}`} className="underline underline-offset-4">
                  {t("languageDetect.composeNext", { language })}
                </Link>
              </ShellNote>
            ) : null}
          </div>
        );
      }}
    />
  );
}

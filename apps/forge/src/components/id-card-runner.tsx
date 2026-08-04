"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { InstantTransformShell, ShellNote } from "@/components/journey-shells";
import {
  type CodeSegment,
  cnIdCardSegments,
  SegmentedCodeSpecimen,
  type SpecimenTone,
} from "@/components/specimens";

type IdCardOutput = {
  valid: boolean;
  reasonCode?: "format" | "birth" | "check_digit";
  reason?: string;
  expectedCheckDigit?: string;
  regionCode?: string;
  birth?: string;
  gender?: "M" | "F" | string;
  engine?: string;
};

const SAMPLE = "11010519491231002X";

function genderLabel(gender: string | undefined, t: (key: string) => string): string {
  if (gender === "M" || gender === "male") return t("idCard.genderMale");
  if (gender === "F" || gender === "female") return t("idCard.genderFemale");
  return gender ? String(gender) : "—";
}

function formatIdReason(
  o: IdCardOutput,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  const code = o.reasonCode;
  if (code === "check_digit") {
    const expected = o.expectedCheckDigit;
    return expected ? t("idCard.reasonCheckExpected", { expected }) : t("idCard.reasonCheck");
  }
  if (code === "birth") return t("idCard.reasonBirth");
  if (code === "format") return t("idCard.reasonFormat");
  // Legacy prose fallback for older engine responses
  const reason = o.reason;
  if (!reason) return "";
  if (/校验位|check/i.test(reason)) {
    const m = reason.match(/期望\s*([0-9X])/i) ?? reason.match(/expected[:\s]*([0-9X])/i);
    return m ? t("idCard.reasonCheckExpected", { expected: m[1] ?? "" }) : t("idCard.reasonCheck");
  }
  if (/出生|birth/i.test(reason)) return t("idCard.reasonBirth");
  if (/格式|format|18/i.test(reason)) return t("idCard.reasonFormat");
  return reason;
}

export function IdCardRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [raw, setRaw] = useState(SAMPLE);

  return (
    <InstantTransformShell<IdCardOutput>
      engine={{ toolId }}
      inputKind="line"
      inputLabel={t("idCard.number")}
      inputPlaceholder={SAMPLE}
      initialValue={SAMPLE}
      sample={SAMPLE}
      note={t("idCard.note")}
      onTextChange={setRaw}
      buildInput={(text) => {
        const cleaned = text.trim().toUpperCase().replace(/[\s-]/g, "");
        if (cleaned.length < 15) return null;
        return { id: cleaned };
      }}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      exit={(o) => ({
        text: [
          o.valid ? t("validate.valid") : t("validate.invalid"),
          o.birth ?? "",
          o.gender ? genderLabel(o.gender, t) : "",
          o.regionCode ?? "",
          formatIdReason(o, t),
        ]
          .filter(Boolean)
          .join("\n"),
        json: o,
      })}
      renderResult={(o) => {
        const { segments: parsed, complete } = cnIdCardSegments(raw);
        const checkFailed =
          complete &&
          !o.valid &&
          (o.reasonCode === "check_digit" ||
            (o.reasonCode == null &&
              (typeof o.reason === "string" ? /校验位|check/i.test(o.reason) : true)));

        const segs: CodeSegment[] = [
          {
            id: "region",
            label: t("idCard.segRegion"),
            value: parsed[0]?.value ?? "",
            tone: o.valid ? "success" : "neutral",
          },
          {
            id: "birth",
            label: t("idCard.segBirth"),
            value: parsed[1]?.value ?? "",
            tone: o.valid ? "info" : "neutral",
          },
          {
            id: "seq",
            label: t("idCard.segSeq"),
            value: parsed[2]?.value ?? "",
            tone: "neutral",
          },
          {
            id: "check",
            label: t("idCard.segCheck"),
            value: parsed[3]?.value ?? "",
            error: checkFailed,
            tone: o.valid ? "success" : checkFailed ? "danger" : "warning",
          },
        ];

        const statusTone: SpecimenTone = o.valid ? "success" : "danger";
        const reasonText = formatIdReason(o, t);

        return (
          <SegmentedCodeSpecimen
            title={t("idCard.specimenTitle")}
            subtitle={t("honesty.algorithmOnly")}
            segments={segs}
            statusTone={statusTone}
            statusLabel={o.valid ? t("validate.valid") : t("validate.invalid")}
            footer={
              <div className="space-y-1">
                {reasonText ? <p className="text-[var(--neutral-11)]">{reasonText}</p> : null}
                <p>
                  {t("idCard.metaBirth")}:{" "}
                  <span className="font-mono text-[var(--neutral-12)]">{o.birth ?? "—"}</span>
                  {" · "}
                  {t("idCard.metaGender")}:{" "}
                  <span className="text-[var(--neutral-12)]">{genderLabel(o.gender, t)}</span>
                  {o.regionCode ? (
                    <>
                      {" · "}
                      {t("idCard.metaRegion")}:{" "}
                      <span className="font-mono text-[var(--neutral-12)]">{o.regionCode}</span>
                    </>
                  ) : null}
                </p>
              </div>
            }
          />
        );
      }}
    />
  );
}

"use client";

import {
  checkVin,
  type VinCheckResult,
  type VinInput,
  type VinInvalidCharacter,
  type VinMathPosition,
  vinInputSchema,
} from "@nebutra/forge-runtime/vin";
import { useTranslations } from "next-intl";
import {
  InstantTransformShell,
  ShellBadge,
  ShellDrill,
  ShellNote,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";

const VIN_LENGTH = 17;

/** The reference VIN from the brief's worked example — check digit "X". */
const SAMPLE = "1M8GDM9AXKP042788";

/**
 * A VIN shorter than 17 characters is someone still typing, not someone with a
 * broken VIN — never red (§9.1 step 5). Everything else earns its colour.
 */
function verdictTone(output: VinCheckResult): ShellTone {
  if (output.valid) return "success";
  if (output.reason === "wrong-length" && output.length < VIN_LENGTH) return "neutral";
  return "danger";
}

/** Plain text a human pastes into a ticket: verdict first, then the working. */
function exportText(output: VinCheckResult, headline: string): string {
  const lines = [`${output.normalized || output.input}  —  ${headline}`, output.reasonText];
  if (output.segments) {
    const s = output.segments;
    lines.push(
      "",
      `WMI ${s.wmi} · VDS ${s.vds} · check ${s.checkDigit} · year ${s.modelYearCode} · plant ${s.plantCode} · serial ${s.serial}`,
    );
  }
  if (output.math) {
    lines.push("", "pos  char  value  weight  product");
    for (const p of output.math.positions) {
      lines.push(
        `${String(p.position).padStart(3)}  ${p.char.padStart(4)}  ${String(p.value).padStart(5)}  ${String(p.weight).padStart(6)}  ${String(p.product).padStart(7)}`,
      );
    }
    lines.push(
      `sum = ${output.math.sum};  ${output.math.sum} mod 11 = ${output.math.remainder}  ->  check digit ${output.expectedCheckDigit}`,
    );
  }
  for (const n of output.notices) lines.push("", n.text);
  return lines.join("\n");
}

/**
 * Verifier · vin (brief: docs/plans/tools/vin.md).
 *
 * A 17-character checksum is sub-millisecond work, so there is no Validate
 * button — every competitor in the teardown gates this behind a click, which
 * the archetype table names as a step tax for trivial compute (§6, §9.5). The
 * shell recomputes as you type and keeps the previous verdict on screen while
 * it does, so a keystroke never blanks the answer.
 *
 * The engine runs *in this component*: a VIN is a vehicle identifier users may
 * treat as personal, and check-digit validation is pure arithmetic with no
 * upstream to call (§9.5, ship gate §6.5 #8). It is byte-for-byte the same
 * `checkVin` the agent API runs, parsed through the same zod schema, so the
 * human page and the OpenAPI/MCP surface cannot drift.
 *
 * The archetype the brief chose is drop-and-verdict — one input, one clear
 * answer, detail on demand. The payload here is a typed 17-character string,
 * not a dropped file, so the verdict grammar (ShellVerdict + ShellDrill) is
 * composed inside the live single-line shell rather than the file dropzone.
 */
export function W3VinRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");

  const headlineFor = (output: VinCheckResult): string => {
    if (output.valid) return t("vin.verdict.valid");
    switch (output.reason) {
      case "wrong-length":
        return output.length < VIN_LENGTH
          ? t("vin.verdict.keepTyping", { remaining: VIN_LENGTH - output.length })
          : t("vin.verdict.tooLong", { n: output.length });
      case "invalid-character":
        return t("vin.verdict.invalidCharacter", {
          position: output.invalidCharacterPosition ?? 0,
          char: output.invalidCharacters?.[0]?.char ?? "",
        });
      default:
        return t("vin.verdict.checkDigitMismatch", {
          expected: output.expectedCheckDigit ?? "",
          found: output.foundCheckDigit ?? "",
        });
    }
  };

  const caveatFor = (output: VinCheckResult): string | undefined => {
    if (output.confusableHint) {
      return t("vin.hint.confusable", {
        char: output.invalidCharacters?.[0]?.char ?? "",
        suggest: output.confusableHint,
      });
    }
    const first = output.notices[0];
    if (!first) return undefined;
    switch (first.code) {
      // Shown on every pass, never folded into an FAQ — the one caveat that
      // separates an honest checksum tool from a used-car funnel (§9.3).
      case "checksum-is-not-provenance":
        return t("vin.notice.notProvenance");
      case "pre-1981-or-non-na-scheme":
        return t("vin.notice.pre1981");
      default:
        return t("vin.notice.partial");
    }
  };

  const renderSegments = (output: VinCheckResult) => {
    const s = output.segments;
    if (!s) return null;
    const cells: { key: string; label: string; value: string; highlight?: boolean }[] = [
      { key: "wmi", label: t("vin.segment.wmi"), value: s.wmi },
      { key: "vds", label: t("vin.segment.vds"), value: s.vds },
      { key: "check", label: t("vin.segment.checkDigit"), value: s.checkDigit, highlight: true },
      { key: "year", label: t("vin.segment.modelYear"), value: s.modelYearCode },
      { key: "plant", label: t("vin.segment.plant"), value: s.plantCode },
      { key: "serial", label: t("vin.segment.serial"), value: s.serial },
    ];
    return (
      <div className="flex flex-wrap gap-2">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`rounded-[var(--radius-lg)] px-3 py-2 ${
              cell.highlight ? "bg-[var(--blue-3)]" : "bg-[var(--neutral-2)]"
            }`}
          >
            <p className="text-xs text-[var(--neutral-10)]">{cell.label}</p>
            <p className="font-mono text-sm tracking-wider text-[var(--neutral-12)]">
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderMath = (output: VinCheckResult) => {
    const math = output.math;
    if (!math) return null;
    return (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-3)]">
          <table className="w-full min-w-[26rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--neutral-10)]">
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("vin.math.col.position")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("vin.math.col.char")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("vin.math.col.value")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("vin.math.col.weight")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("vin.math.col.product")}
                </th>
              </tr>
            </thead>
            <tbody>
              {math.positions.map((p: VinMathPosition) => (
                <tr
                  key={p.position}
                  className={p.position === 9 ? "bg-[var(--blue-3)]" : undefined}
                >
                  <td className="px-3 py-1.5 text-[var(--neutral-10)]">{p.position}</td>
                  <td className="px-3 py-1.5 font-mono text-[var(--neutral-12)]">{p.char}</td>
                  <td className="px-3 py-1.5 font-mono text-[var(--neutral-11)]">{p.value}</td>
                  <td className="px-3 py-1.5 font-mono text-[var(--neutral-11)]">{p.weight}</td>
                  <td className="px-3 py-1.5 font-mono text-[var(--neutral-11)]">{p.product}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-mono text-sm text-[var(--neutral-11)]">
          {t("vin.math.formula", {
            sum: math.sum,
            remainder: math.remainder,
            expected: output.expectedCheckDigit ?? "",
          })}
        </p>
      </div>
    );
  };

  const renderResult = (output: VinCheckResult) => {
    const headline = headlineFor(output);
    const extraInvalid = (output.invalidCharacters ?? []).slice(1);
    return (
      <div className="space-y-3">
        <ShellVerdict
          tone={verdictTone(output)}
          headline={headline}
          caveat={caveatFor(output)}
          badges={
            output.length > 0 ? (
              <>
                <ShellBadge tone={output.length === VIN_LENGTH ? "neutral" : "warning"}>
                  {t("vin.badge.length", { n: output.length })}
                </ShellBadge>
                {output.expectedCheckDigit ? (
                  <ShellBadge tone={output.valid ? "success" : "danger"}>
                    {t("vin.badge.expected", { d: output.expectedCheckDigit })}
                  </ShellBadge>
                ) : null}
              </>
            ) : null
          }
        />

        {/* Always visible: it costs nothing to compute and orients the user. */}
        {renderSegments(output)}

        {extraInvalid.length > 0 ? (
          <ShellNote>
            {t("vin.invalidChars.more", {
              list: extraInvalid
                .map((c: VinInvalidCharacter) => `${c.position}:${c.char}`)
                .join(", "),
            })}
          </ShellNote>
        ) : null}

        {/* Detail on demand — never competing with the verdict for attention. */}
        {output.math ? (
          <ShellDrill summary={t("vin.math.title")}>{renderMath(output)}</ShellDrill>
        ) : null}

        {output.valid ? <ShellNote>{t("vin.notice.notProvenance")}</ShellNote> : null}
      </div>
    );
  };

  return (
    <InstantTransformShell<VinCheckResult>
      engine={{
        // `compute` wins over `toolId` in the shell, which is the point: the
        // VIN stays local. `toolId` is carried anyway so the page names the
        // identical server operation an agent would call.
        toolId,
        compute: (input) => checkVin((vinInputSchema.parse(input) as VinInput).vin),
      }}
      inputLabel={t("vin.inputLabel")}
      inputKind="line"
      inputPlaceholder={SAMPLE}
      sample={SAMPLE}
      buildInput={(text) => (text.trim().length > 0 ? { vin: text } : null)}
      // Stated at the point of action, not buried in an FAQ (ship gate §6.5 #8).
      options={<ShellNote>{t("vin.privacy")}</ShellNote>}
      renderResult={renderResult}
      idle={<ShellNote>{t("vin.idle")}</ShellNote>}
      exit={(output) => ({
        text: exportText(output, headlineFor(output)),
        json: output,
        filename: "vin-check.txt",
      })}
      note={t("vin.scope")}
    />
  );
}

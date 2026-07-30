"use client";

/**
 * 统一社会信用代码 — verify (instant transform) + generate (configure then
 * generate), per the brief's §8/§9.
 *
 * The verify path has no run button: the whole computation is a charset scan,
 * four table lookups and a 17-term weighted sum over an 18-character string, so
 * a button would be a step tax. The generate path is the opposite shape — the
 * four options *are* the product — so it gets the configure shell. Both mount
 * the same tool id, meaning the human page and the agent API run one engine.
 *
 * The 18 characters are five fields, so the answer is five field verdicts, not
 * a boolean. That is the thing every competitor in the teardown declines to do.
 */
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  ConfigureGenerateShell,
  InstantTransformShell,
  ShellBadge,
  ShellCode,
  ShellDrill,
  ShellNote,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-ui";

/* ── contract mirror (cn/unified-social-credit-code) ───────────────────── */

interface Label {
  zh: string;
  en: string;
}

interface Field {
  value: string;
  valid: boolean;
  label?: Label;
  noteCode?: string;
  note?: string;
}

interface DivisionField extends Field {
  provinceCode?: string;
  region?: Label;
  depth: "none" | "province" | "prefecture" | "county";
}

interface OrgIdField extends Field {
  legacyChecksumChecked: boolean;
  legacyChecksumValid?: boolean;
  legacyChecksumExpected?: string;
}

interface Fields {
  registrationDept: Field;
  orgCategory: Field;
  adminDivision: DivisionField;
  orgIdentifier: OrgIdField;
  checkDigit: { expected: string; actual: string; valid: boolean };
}

interface VerifyOutput {
  input: string;
  normalized: string;
  length: number;
  complete: boolean;
  valid: boolean;
  checksumValid: boolean;
  illegalCharacters: { position: number; char: string }[];
  fields?: Fields;
  errorCode?: string;
  error?: string;
  verifyRealEntityAt: string;
}

interface GenerateOutput {
  codes: { code: string; isTestData: true; fields: Fields }[];
  count: number;
  seed: number;
  isTestData: true;
  disclaimer: string;
  verifyRealEntityAt: string;
}

/* ── option tables (mirror of GB 32100-2015 Tables 2/3 + GB/T 2260) ─────
 * Duplicated here only because the runtime package exposes no client subpath
 * for this tool yet; the engine remains the single source of truth for what is
 * actually accepted, and it rejects any pairing this list gets wrong. */

/** All twelve of GB 32100-2015 表2 — a shorter list would hide real registrants. */
const DEPARTMENTS: readonly [string, Label][] = [
  ["1", { zh: "机构编制", en: "Institutional staffing" }],
  ["2", { zh: "外交", en: "Foreign affairs" }],
  ["3", { zh: "司法行政", en: "Judicial administration" }],
  ["4", { zh: "文化", en: "Culture" }],
  ["5", { zh: "民政", en: "Civil affairs" }],
  ["6", { zh: "旅游", en: "Tourism" }],
  ["7", { zh: "宗教", en: "Religious affairs" }],
  ["8", { zh: "工会", en: "Trade union" }],
  ["9", { zh: "工商", en: "Market regulation" }],
  ["A", { zh: "中央军委改革和编制办公室", en: "CMC reform & structure office" }],
  ["N", { zh: "农业", en: "Agriculture" }],
  ["Y", { zh: "其他", en: "Other" }],
];

const CATEGORIES: Record<string, readonly [string, Label][]> = {
  "1": [
    ["1", { zh: "机关", en: "State organ" }],
    ["2", { zh: "事业单位", en: "Public institution" }],
    ["3", { zh: "群众团体", en: "Mass organisation" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "2": [
    ["1", { zh: "外国常驻新闻机构", en: "Resident foreign news agency" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "3": [
    ["1", { zh: "律师执业机构", en: "Law firm" }],
    ["2", { zh: "公证处", en: "Notary office" }],
    ["3", { zh: "基层法律服务所", en: "Grassroots legal service office" }],
    ["4", { zh: "司法鉴定机构", en: "Forensic appraisal institution" }],
    ["5", { zh: "仲裁委员会", en: "Arbitration commission" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "4": [
    ["1", { zh: "外国在华文化中心", en: "Foreign cultural centre in China" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "5": [
    ["1", { zh: "社会团体", en: "Social organisation" }],
    ["2", { zh: "民办非企业单位", en: "Private non-enterprise unit" }],
    ["3", { zh: "基金会", en: "Foundation" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "6": [
    ["1", { zh: "外国旅游部门常驻代表机构", en: "Foreign tourism authority office" }],
    ["2", { zh: "港澳台旅游部门常驻内地代表机构", en: "HK/Macao/Taiwan tourism office" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "7": [
    ["1", { zh: "宗教活动场所", en: "Place of religious activity" }],
    ["2", { zh: "宗教院校", en: "Religious school" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "8": [
    ["1", { zh: "基层工会", en: "Grassroots trade union" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  "9": [
    ["1", { zh: "企业", en: "Enterprise" }],
    ["2", { zh: "个体工商户", en: "Individual household business" }],
    ["3", { zh: "农民专业合作社", en: "Farmers' cooperative" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  A: [
    ["1", { zh: "军队事业单位", en: "Military public institution" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  N: [
    ["1", { zh: "组级集体经济组织", en: "Group-level collective economy" }],
    ["2", { zh: "村级集体经济组织", en: "Village-level collective economy" }],
    ["3", { zh: "乡镇级集体经济组织", en: "Township-level collective economy" }],
    ["9", { zh: "其他", en: "Other" }],
  ],
  Y: [["1", { zh: "其他", en: "Other" }]],
};

const PROVINCES: readonly [string, Label][] = [
  ["11", { zh: "北京市", en: "Beijing" }],
  ["12", { zh: "天津市", en: "Tianjin" }],
  ["13", { zh: "河北省", en: "Hebei" }],
  ["14", { zh: "山西省", en: "Shanxi" }],
  ["15", { zh: "内蒙古自治区", en: "Inner Mongolia" }],
  ["21", { zh: "辽宁省", en: "Liaoning" }],
  ["22", { zh: "吉林省", en: "Jilin" }],
  ["23", { zh: "黑龙江省", en: "Heilongjiang" }],
  ["31", { zh: "上海市", en: "Shanghai" }],
  ["32", { zh: "江苏省", en: "Jiangsu" }],
  ["33", { zh: "浙江省", en: "Zhejiang" }],
  ["34", { zh: "安徽省", en: "Anhui" }],
  ["35", { zh: "福建省", en: "Fujian" }],
  ["36", { zh: "江西省", en: "Jiangxi" }],
  ["37", { zh: "山东省", en: "Shandong" }],
  ["41", { zh: "河南省", en: "Henan" }],
  ["42", { zh: "湖北省", en: "Hubei" }],
  ["43", { zh: "湖南省", en: "Hunan" }],
  ["44", { zh: "广东省", en: "Guangdong" }],
  ["45", { zh: "广西壮族自治区", en: "Guangxi" }],
  ["46", { zh: "海南省", en: "Hainan" }],
  ["50", { zh: "重庆市", en: "Chongqing" }],
  ["51", { zh: "四川省", en: "Sichuan" }],
  ["52", { zh: "贵州省", en: "Guizhou" }],
  ["53", { zh: "云南省", en: "Yunnan" }],
  ["54", { zh: "西藏自治区", en: "Tibet" }],
  ["61", { zh: "陕西省", en: "Shaanxi" }],
  ["62", { zh: "甘肃省", en: "Gansu" }],
  ["63", { zh: "青海省", en: "Qinghai" }],
  ["64", { zh: "宁夏回族自治区", en: "Ningxia" }],
  ["65", { zh: "新疆维吾尔自治区", en: "Xinjiang" }],
  ["71", { zh: "台湾省", en: "Taiwan" }],
  ["81", { zh: "香港特别行政区", en: "Hong Kong SAR" }],
  ["82", { zh: "澳门特别行政区", en: "Macao SAR" }],
];

const COUNTS = ["1", "5", "10", "50", "100", "500", "1000"] as const;

/** Sentinel: an empty Select value is not a value. */
const RANDOM = "__random__";

/**
 * Sample is generated test data (seed 1), never a real registrant's code — the
 * teardown flagged pointing users at real entities as the compliance trap here.
 */
const SAMPLE = "91500000059926748X";

/** Where each field sits in the 18 characters — numerals, not prose. */
const SEGMENTS = [
  { key: "registrationDept", span: "1" },
  { key: "orgCategory", span: "2" },
  { key: "adminDivision", span: "3–8" },
  { key: "orgIdentifier", span: "9–17" },
  { key: "checkDigit", span: "18" },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

/** The check digit reports `actual`; every other field reports `value`. */
function segmentState(
  fields: Fields | undefined,
  key: SegmentKey,
): { value: string; ok?: boolean } {
  if (!fields) return { value: "" };
  if (key === "checkDigit") {
    return { value: fields.checkDigit.actual, ok: fields.checkDigit.valid };
  }
  const field = fields[key];
  return { value: field.value, ok: field.valid };
}

const NOTE_KEY: Record<string, string> = {
  empty: "uscc.note.empty",
  incomplete: "uscc.note.incomplete",
  "too-long": "uscc.note.tooLong",
  "illegal-character": "uscc.note.illegalCharacter",
  "check-digit-mismatch": "uscc.note.checkDigitMismatch",
  "department-unknown": "uscc.note.departmentUnknown",
  "category-unknown-for-department": "uscc.note.categoryUnknown",
  "division-not-numeric": "uscc.note.divisionNotNumeric",
  "division-unknown-province": "uscc.note.divisionUnknownProvince",
  "division-malformed": "uscc.note.divisionMalformed",
};

function csv(output: GenerateOutput): string {
  const header = "code,is_test_data,registration_dept,org_category,admin_division";
  const rows = output.codes.map((c) =>
    [
      c.code,
      "true",
      c.fields.registrationDept.value,
      c.fields.orgCategory.value,
      c.fields.adminDivision.value,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

/* ── runner ────────────────────────────────────────────────────────────── */

export function W3UnifiedSocialCreditCodeRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const locale = useLocale();
  const zh = locale.startsWith("zh");
  const pick = (label?: Label): string => (label ? (zh ? label.zh : label.en) : "—");

  const [mode, setMode] = useState<"verify" | "generate">("verify");
  const [dept, setDept] = useState("9");
  const [category, setCategory] = useState("1");
  const [province, setProvince] = useState(RANDOM);
  const [count, setCount] = useState("10");
  // Changing an option regenerates on its own; a fresh batch under identical
  // options needs a new seed, which is exactly what this button is.
  const [seed, setSeed] = useState(1);

  const categoryOptions = CATEGORIES[dept] ?? CATEGORIES["9"] ?? [];
  const effectiveCategory = categoryOptions.some(([v]) => v === category)
    ? category
    : (categoryOptions[0]?.[0] ?? "1");

  const generateInput = useMemo(
    () => ({
      mode: "generate" as const,
      registrationDept: dept,
      orgCategory: effectiveCategory,
      ...(province === RANDOM ? {} : { adminDivision: province }),
      count: Number(count),
      seed,
    }),
    [dept, effectiveCategory, province, count, seed],
  );

  const noteFor = (code?: string): string | undefined => {
    const key = code ? NOTE_KEY[code] : undefined;
    return key ? t(key) : undefined;
  };

  /* ── verify rendering ────────────────────────────────────────────── */

  const anatomy = (fields?: Fields) => (
    <ul className="grid gap-2 sm:grid-cols-5">
      {SEGMENTS.map((segment) => {
        const { value, ok } = segmentState(fields, segment.key);
        const tone: ShellTone = ok === undefined ? "neutral" : ok ? "success" : "danger";
        return (
          <li key={segment.key} className="space-y-1 rounded-[var(--radius-md)] p-2">
            <p className="text-xs text-[var(--neutral-10)]">
              {segment.span} · {t(`uscc.field.${segment.key}`)}
            </p>
            <ShellBadge tone={tone}>
              <span className="font-mono">{value || "—"}</span>
            </ShellBadge>
          </li>
        );
      })}
    </ul>
  );

  const renderVerify = (output: VerifyOutput) => {
    const fields = output.fields;
    const tone: ShellTone = output.valid
      ? "success"
      : output.complete
        ? "danger"
        : output.illegalCharacters.length > 0
          ? "danger"
          : "neutral";
    const headline = output.valid
      ? t("uscc.valid")
      : output.complete
        ? t("uscc.invalid")
        : output.errorCode === "illegal-character"
          ? t("uscc.invalidCharacters")
          : t("uscc.incomplete", { n: output.length });

    return (
      <div className="space-y-3">
        <ShellVerdict
          tone={tone}
          headline={headline}
          caveat={
            fields && !fields.checkDigit.valid
              ? t("uscc.expectedDigit", {
                  expected: fields.checkDigit.expected,
                  actual: fields.checkDigit.actual,
                })
              : noteFor(output.errorCode)
          }
          badges={
            fields ? (
              <>
                <ShellBadge tone={fields.checkDigit.valid ? "success" : "danger"}>
                  {fields.checkDigit.valid ? t("uscc.checksumOk") : t("uscc.checksumBad")}
                </ShellBadge>
                {fields.registrationDept.label ? (
                  <ShellBadge tone="info">{pick(fields.registrationDept.label)}</ShellBadge>
                ) : null}
                {fields.orgCategory.label ? (
                  <ShellBadge tone="info">{pick(fields.orgCategory.label)}</ShellBadge>
                ) : null}
                {fields.adminDivision.region ? (
                  <ShellBadge tone="info">{pick(fields.adminDivision.region)}</ShellBadge>
                ) : null}
              </>
            ) : null
          }
        />

        {anatomy(fields)}

        {output.illegalCharacters.length > 0 ? (
          <ul className="space-y-1">
            {output.illegalCharacters.map((c) => (
              <li key={`${c.position}-${c.char}`} className="text-sm text-[var(--status-danger)]">
                {t("uscc.illegalAt", { position: c.position, char: c.char })}
              </li>
            ))}
          </ul>
        ) : null}

        {fields ? (
          <ShellDrill summary={t("uscc.detail")}>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--neutral-10)]">
                  {t("uscc.field.adminDivision")}
                </dt>
                <dd className="text-[var(--neutral-12)]">
                  {t(`uscc.depth.${fields.adminDivision.depth}`)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--neutral-10)]">{t("uscc.legacyTitle")}</dt>
                <dd className="text-[var(--neutral-12)]">
                  {!fields.orgIdentifier.legacyChecksumChecked
                    ? t("uscc.legacy.unchecked")
                    : fields.orgIdentifier.legacyChecksumValid
                      ? t("uscc.legacy.ok")
                      : t("uscc.legacy.mismatch", {
                          expected: fields.orgIdentifier.legacyChecksumExpected ?? "",
                        })}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-[var(--neutral-10)]">{t("uscc.divisionScope")}</p>
          </ShellDrill>
        ) : null}
      </div>
    );
  };

  /* ── generate rendering ──────────────────────────────────────────── */

  const renderGenerate = (output: GenerateOutput) => {
    const shown = output.codes.slice(0, 20);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ShellBadge tone="warning">{t("uscc.gen.testDataBadge")}</ShellBadge>
          <ShellBadge tone="neutral">{t("uscc.gen.seed", { seed: output.seed })}</ShellBadge>
        </div>
        <ul className="space-y-1">
          {shown.map((entry) => (
            <li key={entry.code} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-[var(--neutral-12)]">{entry.code}</span>
              <span className="text-xs text-[var(--neutral-10)]">
                {pick(entry.fields.adminDivision.region)} · {pick(entry.fields.orgCategory.label)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  void navigator.clipboard?.writeText(entry.code).catch(() => undefined)
                }
              >
                {t("common.copy")}
              </Button>
            </li>
          ))}
        </ul>
        {output.codes.length > shown.length ? (
          <ShellCode label={t("uscc.gen.allCodes")}>
            {output.codes.map((c) => c.code).join("\n")}
          </ShellCode>
        ) : null}
        <ShellNote>{t("uscc.gen.disclaimer")}</ShellNote>
      </div>
    );
  };

  /* ── one card, two journeys ──────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* DS Tabs (Base UI): the hand-rolled version set a roving tabindex but
          wired no key handler, so the unselected tab was unreachable by
          keyboard. Arrow keys, Home/End and the panel wiring come from the
          primitive. `variant="button" shape="pill"` matches the sibling
          runners. */}
      <Tabs
        value={mode}
        onValueChange={(next) => setMode(next as "verify" | "generate")}
        variant="button"
        shape="pill"
        size="sm"
      >
        <TabsList aria-label={t("uscc.modeLabel")}>
          {(["verify", "generate"] as const).map((id) => (
            <TabsTrigger key={id} value={id}>
              {t(`uscc.tab.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="verify" className="text-[var(--neutral-12)]">
          <InstantTransformShell<VerifyOutput>
            engine={{ toolId, parse: (o) => o as unknown as VerifyOutput }}
            inputLabel={t("uscc.inputLabel")}
            inputKind="line"
            inputPlaceholder={t("uscc.placeholder")}
            sample={SAMPLE}
            buildInput={(text) => (text.trim().length > 0 ? { mode: "verify", code: text } : null)}
            renderResult={renderVerify}
            idle={
              <div className="space-y-2">
                {anatomy(undefined)}
                <ShellNote>{t("uscc.idle")}</ShellNote>
              </div>
            }
            exit={(output) => ({
              text: `${output.normalized}\t${output.valid ? "valid" : "invalid"}${
                output.error ? `\t${output.error}` : ""
              }`,
              json: output,
              filename: "uscc-verify.txt",
            })}
            note={t("uscc.scope")}
          />
        </TabsContent>

        <TabsContent value="generate" className="text-[var(--neutral-12)]">
          <ConfigureGenerateShell<GenerateOutput>
            engine={{ toolId, parse: (o) => o as unknown as GenerateOutput }}
            input={generateInput}
            emptyHint={t("uscc.gen.emptyHint")}
            renderResult={renderGenerate}
            exit={(output) => ({
              text: csv(output),
              json: output,
              filename: "uscc-test-codes.csv",
              mimeType: "text/csv;charset=utf-8",
            })}
            note={t("uscc.gen.note")}
          >
            <div className="flex flex-wrap items-end gap-3">
              <RunnerSelect
                id="uscc-dept"
                label={t("uscc.gen.dept")}
                value={dept}
                onChange={setDept}
                options={DEPARTMENTS.map(([value, label]) => ({
                  value,
                  label: `${value} · ${pick(label)}`,
                }))}
              />
              <RunnerSelect
                id="uscc-category"
                label={t("uscc.gen.category")}
                value={effectiveCategory}
                onChange={setCategory}
                options={categoryOptions.map(([value, label]) => ({
                  value,
                  label: `${value} · ${pick(label)}`,
                }))}
              />
              <RunnerSelect
                id="uscc-province"
                label={t("uscc.gen.province")}
                value={province}
                onChange={setProvince}
                options={[
                  { value: RANDOM, label: t("uscc.gen.randomProvince") },
                  ...PROVINCES.map(([value, label]) => ({
                    value,
                    label: `${value} · ${pick(label)}`,
                  })),
                ]}
              />
              <RunnerSelect
                id="uscc-count"
                label={t("uscc.gen.count")}
                value={count}
                onChange={setCount}
                options={COUNTS.map((value) => ({ value, label: value }))}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setSeed((s) => s + 1)}>
                {t("uscc.gen.regenerate")}
              </Button>
            </div>
          </ConfigureGenerateShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}

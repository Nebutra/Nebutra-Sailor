"use client";

/**
 * Hard-correct polish for high-traffic catalog tools that previously dumped
 * JSON via GenericInvokeRunner: validators (verdict), live calculators,
 * generators (copy + download), and hash-compare.
 */
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  InstantTransformShell,
  ShellBadge,
  ShellNote,
  type ShellTone,
  ShellVerdict,
  TwoPaneCompareShell,
} from "@/components/journey-shells";
import {
  invokeForge,
  MetaCards,
  TextResultActions,
  useDebouncedCallback,
} from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerPanel, RunnerSelect } from "@/components/runner-ui";
import { BankCardSpecimen, formatCardGroups } from "@/components/specimens";

/* ── shared batch-validate result shape ─────────────────────────────────── */

interface BatchValidateOutput {
  results: Array<Record<string, unknown>>;
  total: number;
  validCount: number;
  invalidCount: number;
}

function toneForBatch(o: BatchValidateOutput): ShellTone {
  if (o.total === 0) return "neutral";
  if (o.invalidCount === 0) return "success";
  if (o.validCount === 0) return "danger";
  return "warning";
}

function BatchValidateResult({
  output,
  labelValid,
  labelInvalid,
  labelSummary,
  rowPrimary,
  rowMeta,
}: {
  output: BatchValidateOutput;
  labelValid: string;
  labelInvalid: string;
  labelSummary: string;
  rowPrimary: (row: Record<string, unknown>) => string;
  rowMeta?: (row: Record<string, unknown>) => string;
}) {
  return (
    <div className="space-y-3">
      <ShellVerdict
        tone={toneForBatch(output)}
        headline={labelSummary}
        badges={
          <>
            <ShellBadge tone="success">
              {labelValid}: {output.validCount}
            </ShellBadge>
            <ShellBadge tone={output.invalidCount ? "danger" : "neutral"}>
              {labelInvalid}: {output.invalidCount}
            </ShellBadge>
          </>
        }
      />
      <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <tbody>
            {output.results.map((row, i) => {
              const ok = row.valid === true;
              return (
                <tr key={i} className={i % 2 === 1 ? "bg-[var(--neutral-3)]" : undefined}>
                  <td className="px-3 py-2">
                    <ShellBadge tone={ok ? "success" : "danger"}>
                      {ok ? labelValid : labelInvalid}
                    </ShellBadge>
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--neutral-12)]">
                    {rowPrimary(row)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--neutral-11)]">
                    {rowMeta?.(row) ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BatchValidateRunner({
  toolId,
  sample,
  inputLabel,
  note,
  rowPrimary,
  rowMeta,
  csvHeaders,
  csvRow,
}: {
  toolId: string;
  sample: string;
  inputLabel: string;
  note: string;
  rowPrimary: (row: Record<string, unknown>) => string;
  rowMeta?: (row: Record<string, unknown>) => string;
  csvHeaders: string;
  csvRow: (row: Record<string, unknown>) => string;
}) {
  const t = useTranslations("runners");
  return (
    <InstantTransformShell<BatchValidateOutput>
      engine={{ toolId, parse: (raw) => raw as unknown as BatchValidateOutput }}
      inputKind="block"
      inputLabel={inputLabel}
      inputPlaceholder={sample}
      sample={sample}
      rows={6}
      note={note}
      buildInput={(text) => (text.trim() ? { text } : null)}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      exit={(output) => ({
        text: [csvHeaders, ...output.results.map(csvRow)].join("\n"),
        json: output,
        filename: "validate-results.csv",
        mimeType: "text/csv;charset=utf-8",
      })}
      renderResult={(output) => (
        <BatchValidateResult
          output={output}
          labelValid={t("validate.valid")}
          labelInvalid={t("validate.invalid")}
          labelSummary={t("validate.summary", {
            valid: output.validCount,
            total: output.total,
          })}
          rowPrimary={rowPrimary}
          {...(rowMeta ? { rowMeta } : {})}
        />
      )}
    />
  );
}

export function EmailValidateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <BatchValidateRunner
      toolId={toolId}
      sample={"ok@nebutra.com\nbad@\nsupport@example.org"}
      inputLabel={t("common.text")}
      note={t("emailValidate.note")}
      rowPrimary={(r) => String(r.email ?? r.input ?? "")}
      rowMeta={(r) => (r.reason ? String(r.reason) : r.domain ? String(r.domain) : "—")}
      csvHeaders="email,valid,reason"
      csvRow={(r) =>
        `${String(r.email ?? "")},${r.valid ? "valid" : "invalid"},${String(r.reason ?? "")}`
      }
    />
  );
}

export function UrlValidateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <BatchValidateRunner
      toolId={toolId}
      sample={"https://nebutra.com/docs\nnot a url\nhttps://example.com:8443/path?q=1"}
      inputLabel={t("common.text")}
      note={t("urlValidate.note")}
      rowPrimary={(r) => String(r.url ?? "")}
      rowMeta={(r) =>
        r.valid ? `${String(r.protocol ?? "")} · ${String(r.host ?? "")}` : String(r.reason ?? "—")
      }
      csvHeaders="url,valid,host,protocol"
      csvRow={(r) =>
        `${String(r.url ?? "")},${r.valid ? "valid" : "invalid"},${String(r.host ?? "")},${String(r.protocol ?? "")}`
      }
    />
  );
}

export function IpValidateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <BatchValidateRunner
      toolId={toolId}
      sample={"127.0.0.1\n2001:db8::1\n999.1.1.1"}
      inputLabel={t("common.text")}
      note={t("ipValidate.note")}
      rowPrimary={(r) => String(r.ip ?? "")}
      rowMeta={(r) => (r.valid ? `IPv${String(r.version ?? "")}` : String(r.reason ?? "format"))}
      csvHeaders="ip,valid,version"
      csvRow={(r) =>
        `${String(r.ip ?? "")},${r.valid ? "valid" : "invalid"},${String(r.version ?? "")}`
      }
    />
  );
}

export function UuidValidateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <BatchValidateRunner
      toolId={toolId}
      sample={
        "550e8400-e29b-41d4-a716-446655440000\nnot-a-uuid\n00000000-0000-0000-0000-000000000000"
      }
      inputLabel={t("common.text")}
      note={t("uuidValidate.note")}
      rowPrimary={(r) => String(r.uuid ?? "")}
      rowMeta={(r) =>
        r.valid
          ? `v${String(r.version ?? "?")}${r.variant ? ` · ${String(r.variant)}` : ""}`
          : String(r.reason ?? "format")
      }
      csvHeaders="uuid,valid,version"
      csvRow={(r) =>
        `${String(r.uuid ?? "")},${r.valid ? "valid" : "invalid"},${String(r.version ?? "")}`
      }
    />
  );
}

export function CreditCardLuhnRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [raw, setRaw] = useState("4111111111111111");
  return (
    <InstantTransformShell<{
      valid: boolean;
      brand: string;
      length: number;
      masked?: string;
      reason?: string;
    }>
      engine={{ toolId }}
      inputKind="line"
      inputLabel={t("creditCardLuhn.number")}
      inputPlaceholder="4111 1111 1111 1111"
      initialValue="4111111111111111"
      sample="4111111111111111"
      note={t("creditCardLuhn.note")}
      onTextChange={setRaw}
      buildInput={(text) => (text.trim() ? { number: text } : null)}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      exit={(o) => {
        const grouped = formatCardGroups(raw.replace(/\D/g, "") || raw);
        return {
          text: [
            o.valid ? t("validate.valid") : t("validate.invalid"),
            o.brand,
            grouped,
            o.reason ?? "",
          ]
            .filter(Boolean)
            .join("\n"),
          json: o,
        };
      }}
      renderResult={(o) => {
        const digits = raw.replace(/\D/g, "");
        const display = digits ? formatCardGroups(digits) : formatCardGroups(raw);
        const brand =
          !o.brand || o.brand === "unknown" ? t("creditCardLuhn.unknownBrand") : o.brand;
        const caveat = o.valid
          ? t("validate.luhnCaveat")
          : o.reason === "length_or_digits"
            ? t("validate.luhnReason.length_or_digits")
            : o.reason === "luhn_failed"
              ? t("validate.luhnReason.luhn_failed")
              : (o.reason ?? t("honesty.algorithmOnly"));
        return (
          <BankCardSpecimen
            brand={brand}
            numberDisplay={display}
            valid={o.valid}
            statusLabel={o.valid ? t("validate.valid") : t("validate.invalid")}
            specimenLabel={t("creditCardLuhn.specimenLabel")}
            structureLabel={t("creditCardLuhn.structureOnly")}
            fallbackBrand={t("creditCardLuhn.unknownBrand")}
            caveat={caveat}
            footer={
              <div className="flex flex-wrap gap-2">
                <ShellBadge tone="info">{brand}</ShellBadge>
                <ShellBadge>
                  {o.length} {t("creditCardLuhn.digits")}
                </ShellBadge>
              </div>
            }
          />
        );
      }}
    />
  );
}

/* ── live calculators ───────────────────────────────────────────────────── */

export function ReadingTimeRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(
    "Nebutra Forge ships dual-surface tools for humans and agents. 在线工具站同一套能力。",
  );
  const [wpm, setWpm] = useState("230");
  const [cpm, setCpm] = useState("300");
  const [error, setError] = useState("");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (body?: { text: string; wpm: number; cpm: number }) => {
    const input = body ?? {
      text,
      wpm: Number(wpm) || 230,
      cpm: Number(cpm) || 300,
    };
    if (!input.text.trim()) {
      setOut(null);
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, input);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  const live = useDebouncedCallback(() => {
    void run();
  }, 300);

  useEffect(() => {
    live();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, wpm, cpm]);

  const human = typeof out?.human === "string" ? out.human : null;
  const minutes = typeof out?.minutes === "number" ? out.minutes : null;

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.text")}
        id="reading-time-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="font-mono text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="WPM (Latin)"
          id="rt-wpm"
          type="number"
          value={wpm}
          onChange={(e) => setWpm(e.target.value)}
          className="font-mono"
        />
        <Input
          label="CPM (CJK)"
          id="rt-cpm"
          type="number"
          value={cpm}
          onChange={(e) => setCpm(e.target.value)}
          className="font-mono"
        />
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p className="text-3xl font-bold tabular-nums">
            {human ??
              (minutes != null && Number.isFinite(minutes)
                ? `~${minutes < 1 ? "<1" : minutes} min`
                : "—")}
          </p>
          <div className="mt-3">
            <MetaCards
              items={[
                { label: "characters", value: String(out.characters ?? "—") },
                { label: "cjk", value: String(out.cjkCharacters ?? "—") },
                { label: "latin words", value: String(out.latinWords ?? "—") },
                { label: "seconds", value: String(out.seconds ?? "—") },
              ]}
            />
          </div>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("readingTime.note")}</RunnerNote>
    </div>
  );
}

const DEFAULT_ZONES = [
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function WorldClockRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [zones, setZones] = useState(DEFAULT_ZONES.join("\n"));
  const [at, setAt] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Refresh "now" every 30s when no explicit instant is set.
  useEffect(() => {
    if (at.trim()) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [at]);

  const run = async () => {
    setLoading(true);
    setError("");
    const input: Record<string, unknown> = { timezones: zones };
    if (at.trim()) input.at = at.trim();
    const r = await invokeForge(toolId, input);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const list = Array.isArray(r.output.clocks)
      ? r.output.clocks
      : Array.isArray(r.output.zones)
        ? r.output.zones
        : Array.isArray(r.output.results)
          ? r.output.results
          : [];
    setRows(list as Array<Record<string, unknown>>);
  };

  const live = useDebouncedCallback(() => {
    void run();
  }, 400);

  useEffect(() => {
    live();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, at, tick]);

  return (
    <div className="space-y-4">
      <Textarea
        label={t("worldClock.zones")}
        id="wc-zones"
        value={zones}
        onChange={(e) => setZones(e.target.value)}
        rows={6}
        className="font-mono text-sm"
      />
      <Input
        label={t("worldClock.at")}
        id="wc-at"
        value={at}
        onChange={(e) => setAt(e.target.value)}
        placeholder="leave empty = now"
        className="font-mono"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void run()}
          disabled={loading}
        >
          {loading ? t("common.running") : t("common.run")}
        </Button>
        <span className="text-xs text-[var(--neutral-10)]">{t("common.liveHint")}</span>
      </div>
      <RunnerError>{error}</RunnerError>
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--neutral-10)]">
                <th className="px-3 py-2 font-medium">Timezone</th>
                <th className="px-3 py-2 font-medium">Local time</th>
                <th className="px-3 py-2 font-medium">Offset</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-[var(--neutral-3)]" : undefined}>
                  <td className="px-3 py-2 font-mono text-[var(--neutral-12)]">
                    {String(row.timezone ?? row.tz ?? row.id ?? "—")}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--neutral-12)]">
                    {row.error
                      ? String(row.error)
                      : String(row.time ?? row.formatted ?? row.local ?? "—")}
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--neutral-11)]">
                    {String(row.offset ?? row.utcOffset ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function PasswordEntropyRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [password, setPassword] = useState("Nebutra!Forge2026");
  const [error, setError] = useState("");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);

  const run = async (p = password) => {
    if (!p) {
      setOut(null);
      return;
    }
    setError("");
    const r = await invokeForge(toolId, { password: p });
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  const live = useDebouncedCallback((p: string) => {
    void run(p);
  }, 200);

  useEffect(() => {
    live(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const score = typeof out?.score === "string" ? out.score : "";
  const tone: ShellTone =
    score === "very_strong" || score === "strong"
      ? "success"
      : score === "fair"
        ? "warning"
        : score
          ? "danger"
          : "neutral";

  return (
    <div className="space-y-4">
      <Input
        label={t("passwordEntropy.password")}
        id="entropy-pw"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="font-mono"
      />
      <p className="text-xs text-[var(--neutral-10)]">{t("common.liveHint")}</p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <div className="space-y-3">
          <ShellVerdict
            tone={tone}
            headline={`${String(out.bits ?? "—")} bits · ${score || "—"}`}
            caveat={typeof out.note === "string" ? out.note : undefined}
            badges={
              <>
                <ShellBadge>len {String(out.length ?? "")}</ShellBadge>
                <ShellBadge>pool {String(out.charsetSize ?? "")}</ShellBadge>
              </>
            }
          />
        </div>
      ) : null}
      <RunnerNote>{t("passwordEntropy.note")}</RunnerNote>
    </div>
  );
}

/* ── generators ─────────────────────────────────────────────────────────── */

export function RandomStringRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [length, setLength] = useState("16");
  const [count, setCount] = useState("5");
  const [charset, setCharset] = useState("alphanumeric");
  const [strings, setStrings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, {
      length: Number(length) || 16,
      count: Number(count) || 1,
      charset,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setStrings(Array.isArray(r.output.strings) ? (r.output.strings as string[]) : []);
  };

  // Generate on mount so the page is never empty.
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = strings.join("\n");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label={t("randomString.length")}
          id="rs-len"
          type="number"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        />
        <Input
          label={t("randomString.count")}
          id="rs-count"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
        <RunnerSelect
          id="rs-charset"
          label={t("randomString.charset")}
          value={charset}
          onChange={setCharset}
        >
          <option value="alphanumeric">{t("randomString.alphanumeric")}</option>
          <option value="alphanumeric_symbols">{t("randomString.symbols")}</option>
          <option value="hex">{t("randomString.hex")}</option>
          <option value="base64url">{t("randomString.base64url")}</option>
        </RunnerSelect>
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {text ? (
        <>
          <TextResultActions text={text} downloadName="random-strings.txt" />
          <pre className="max-h-80 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-sm">
            {text}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("randomString.note")}</RunnerNote>
    </div>
  );
}

export function LoremIpsumRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [paragraphs, setParagraphs] = useState("3");
  const [words, setWords] = useState("40");
  const [startWithLorem, setStartWithLorem] = useState("true");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, {
      paragraphs: Number(paragraphs) || 3,
      wordsPerParagraph: Number(words) || 40,
      startWithLorem: startWithLorem === "true",
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(String(r.output.text ?? r.output.result ?? ""));
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label={t("lorem.paragraphs")}
          id="lorem-p"
          type="number"
          value={paragraphs}
          onChange={(e) => setParagraphs(e.target.value)}
        />
        <Input
          label={t("lorem.wordsPerParagraph")}
          id="lorem-w"
          type="number"
          value={words}
          onChange={(e) => setWords(e.target.value)}
        />
        <RunnerSelect
          id="lorem-start"
          label={t("lorem.startWithLorem")}
          value={startWithLorem}
          onChange={setStartWithLorem}
        >
          <option value="true">{t("common.yes")}</option>
          <option value="false">{t("common.no")}</option>
        </RunnerSelect>
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <>
          <TextResultActions text={result} downloadName="lorem.txt" />
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 text-sm leading-relaxed">
            {result}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("lorem.note")}</RunnerNote>
    </div>
  );
}

export function MarkdownTocRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const sample = useMemo(
    () => `# Title\n\n## Section A\n\n### Detail\n\n## Section B\n\n### More\n`,
    [],
  );
  const [text, setText] = useState(sample);
  const [maxLevel, setMaxLevel] = useState("3");
  const [toc, setToc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (body = text, level = maxLevel) => {
    if (!body.trim()) {
      setToc("");
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, {
      text: body,
      maxLevel: Number(level) || 3,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setToc(String(r.output.toc ?? r.output.result ?? ""));
  };

  const live = useDebouncedCallback((body: string, level: string) => {
    void run(body, level);
  }, 360);

  useEffect(() => {
    live(text, maxLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, maxLevel]);

  return (
    <div className="space-y-4">
      <Textarea
        label={t("markdownToc.markdown")}
        id="md-toc"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="font-mono text-sm"
      />
      <Input
        label={t("markdownToc.maxLevel")}
        id="md-toc-level"
        type="number"
        value={maxLevel}
        onChange={(e) => setMaxLevel(e.target.value)}
        className="max-w-xs font-mono"
      />
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {toc ? (
        <>
          <TextResultActions text={toc} downloadName="toc.md" />
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-sm">
            {toc}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("markdownToc.note")}</RunnerNote>
    </div>
  );
}

export function HashCompareRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [ignoreCase, setIgnoreCase] = useState("true");

  return (
    <div className="space-y-3">
      <TwoPaneCompareShell<{
        equal: boolean;
        lengthA: number;
        lengthB: number;
        ignoreCase: boolean;
      }>
        engine={{ toolId }}
        leftLabel={t("hashCompare.a")}
        rightLabel={t("hashCompare.b")}
        emptyHint={t("common.liveHint")}
        sample={{
          left: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          right: "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
        }}
        options={
          <RunnerSelect
            id="hash-cmp-case"
            label={t("hashCompare.ignoreCase")}
            value={ignoreCase}
            onChange={setIgnoreCase}
          >
            <option value="true">{t("common.yes")}</option>
            <option value="false">{t("common.no")}</option>
          </RunnerSelect>
        }
        optionsKey={ignoreCase}
        buildInput={(left, right) =>
          left.trim() && right.trim()
            ? { a: left, b: right, ignoreCase: ignoreCase === "true" }
            : null
        }
        note={t("hashCompare.note")}
        summary={(o) => ({
          tone: o.equal ? "success" : "danger",
          headline: o.equal ? t("validate.match") : t("validate.mismatch"),
        })}
        renderResult={(o) => (
          <ShellVerdict
            tone={o.equal ? "success" : "danger"}
            headline={o.equal ? t("validate.match") : t("validate.mismatch")}
            badges={
              <>
                <ShellBadge>A {o.lengthA}</ShellBadge>
                <ShellBadge>B {o.lengthB}</ShellBadge>
                <ShellBadge tone="info">
                  {o.ignoreCase ? "ignoreCase" : "case-sensitive"}
                </ShellBadge>
              </>
            }
          />
        )}
      />
    </div>
  );
}

"use client";

/**
 * P0 specialized runners for high-traffic tools that previously showed
 *「未配置工作台」— JSON/YAML family, regex, SQL, color, QR, cron, timezone.
 */
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useCallback, useState } from "react";
import {
  RunnerError,
  RunnerNote,
  RunnerOutput,
  RunnerPanel,
  RunnerSelect,
} from "@/components/runner-ui";

async function invokeTool(
  toolId: string,
  input: Record<string, unknown>,
): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; message: string }> {
  const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const body = (await res.json()) as {
    ok?: boolean;
    output?: Record<string, unknown>;
    message?: string;
    error?: string;
  };
  if (!res.ok || body.ok === false) {
    return { ok: false, message: body.message ?? body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, output: body.output ?? {} };
}

// ─── Bidirectional convert (JSON↔YAML / TOML / CSV) ─────────────────────────

export function ConvertModeRunner({
  toolId,
  modes,
  defaultMode,
  sample,
  note,
  resultKey = "result",
}: {
  toolId: string;
  modes: ReadonlyArray<{ value: string; label: string }>;
  defaultMode: string;
  sample: string;
  note?: string;
  resultKey?: string;
}) {
  const [text, setText] = useState(sample);
  const [mode, setMode] = useState(defaultMode);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    const r = await invokeTool(toolId, { text, mode });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const out = r.output[resultKey];
    if (typeof out === "string") setText(out);
    setStatus(`完成 · ${String(r.output.engine ?? mode)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect label="模式" id={`${toolId}-mode`} value={mode} onChange={setMode}>
          {modes.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </RunnerSelect>
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? "转换中…" : "转换"}
        </Button>
      </div>
      <Textarea
        id={`${toolId}-text`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <RunnerError>{error}</RunnerError>
      {status ? <RunnerNote>{status}</RunnerNote> : null}
      {note ? <RunnerNote>{note}</RunnerNote> : null}
    </div>
  );
}

// ─── Regex ──────────────────────────────────────────────────────────────────

export function RegexTesterRunner({ toolId }: { toolId: string }) {
  const [pattern, setPattern] = useState("\\b[A-Z][a-z]+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Hello Nebutra World — Forge Tools");
  const [mode, setMode] = useState<"match" | "replace" | "test">("match");
  const [replacement, setReplacement] = useState("[$&]");
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const runLocal = useCallback(() => {
    setError("");
    try {
      const re = new RegExp(pattern, flags);
      if (mode === "test") {
        setOutput(JSON.stringify({ ok: re.test(text) }, null, 2));
        return;
      }
      if (mode === "replace") {
        setOutput(text.replace(re, replacement));
        return;
      }
      const matches: Array<{ match: string; index: number; groups: string[] }> = [];
      if (!flags.includes("g")) {
        const m = re.exec(text);
        if (m) matches.push({ match: m[0] ?? "", index: m.index, groups: m.slice(1) });
      } else {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        let guard = 0;
        while ((m = re.exec(text)) !== null) {
          matches.push({ match: m[0] ?? "", index: m.index, groups: m.slice(1) });
          guard += 1;
          if (guard > 10_000) throw new Error("Too many matches");
          if (m[0] === "") re.lastIndex += 1;
        }
      }
      setOutput(JSON.stringify({ matches, count: matches.length }, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [flags, mode, pattern, replacement, text]);

  const runServer = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { pattern, flags, text, mode, replacement });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (typeof r.output.result === "string") setOutput(r.output.result);
    else setOutput(JSON.stringify(r.output, null, 2));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="正则"
          id="re-pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="font-mono"
        />
        <Input
          label="标志"
          id="re-flags"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          className="font-mono"
          placeholder="gim"
        />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect
          label="模式"
          id="re-mode"
          value={mode}
          onChange={(v) => setMode(v as typeof mode)}
        >
          <option value="match">匹配</option>
          <option value="replace">替换</option>
          <option value="test">测试</option>
        </RunnerSelect>
        {mode === "replace" ? (
          <Input
            label="替换为"
            id="re-repl"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            className="font-mono min-w-[12rem]"
          />
        ) : null}
        <Button type="button" variant="ink" onClick={runLocal}>
          本地运行
        </Button>
        <Button type="button" variant="outline" onClick={() => void runServer()} disabled={loading}>
          {loading ? "校验中…" : "服务端校验"}
        </Button>
      </div>
      <Textarea
        id="re-text"
        label="文本"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
      <RunnerError>{error}</RunnerError>
      <RunnerOutput>{output}</RunnerOutput>
      <RunnerNote>本地即时 · 服务端带超时预算 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── SQL format ─────────────────────────────────────────────────────────────

export function SqlFormatRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState(
    "select id,name from users u join orders o on o.user_id=u.id where o.status='paid' order by o.created_at desc",
  );
  const [language, setLanguage] = useState("sql");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, language, keywordCase: "upper" });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (typeof r.output.result === "string") setText(r.output.result);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect label="方言" id="sql-lang" value={language} onChange={setLanguage}>
          {["sql", "mysql", "postgresql", "sqlite", "tsql", "bigquery", "snowflake"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </RunnerSelect>
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? "格式化中…" : "格式化"}
        </Button>
      </div>
      <Textarea
        id="sql-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <RunnerError>{error}</RunnerError>
      <RunnerNote>sql-formatter · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Color ──────────────────────────────────────────────────────────────────

export function ColorConvertRunner({ toolId }: { toolId: string }) {
  const [color, setColor] = useState("#0033FE");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { color });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setResult(null);
      return;
    }
    setResult(r.output);
  };

  const hex = typeof result?.hex === "string" ? result.hex : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label="颜色"
          id="color-in"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="font-mono min-w-[12rem]"
          placeholder="#0033FE / rgb() / hsl()"
        />
        <input
          data-allow-native
          type="color"
          aria-label="取色"
          value={hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#0033FE"}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-[var(--neutral-7)] bg-transparent p-1"
        />
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? "转换中…" : "转换"}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <RunnerPanel className="flex flex-wrap items-start gap-4">
          {hex ? (
            <div
              className="h-16 w-16 shrink-0 rounded-lg border border-[var(--neutral-6)]"
              style={{ background: hex }}
              title={hex}
            />
          ) : null}
          <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </RunnerPanel>
      ) : null}
      <RunnerNote>culori · hex / rgb / hsl / oklch · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── QR generate / decode ───────────────────────────────────────────────────

export function QrGenerateRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("https://forge.nebutra.com");
  const [format, setFormat] = useState<"png" | "svg" | "dataurl">("dataurl");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    setPreview("");
    const r = await invokeTool(toolId, { text, format, width: 256 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (format === "svg" && typeof r.output.data === "string") {
      setPreview(`data:image/svg+xml;utf8,${encodeURIComponent(r.output.data)}`);
    } else if (format === "dataurl" && typeof r.output.data === "string") {
      setPreview(r.output.data);
    } else if (typeof r.output.base64 === "string") {
      setPreview(`data:image/png;base64,${r.output.base64}`);
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        id="qr-text"
        label="内容"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
      />
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect
          label="格式"
          id="qr-fmt"
          value={format}
          onChange={(v) => setFormat(v as typeof format)}
        >
          <option value="dataurl">PNG (预览)</option>
          <option value="png">PNG Base64</option>
          <option value="svg">SVG</option>
        </RunnerSelect>
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? "生成中…" : "生成二维码"}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="QR code"
          className="h-48 w-48 rounded-lg border border-[var(--neutral-6)] bg-white p-2"
        />
      ) : null}
      <RunnerNote>qrcode · 与 API 同一路径</RunnerNote>
    </div>
  );
}

export function QrDecodeRunner({ toolId }: { toolId: string }) {
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setError("");
    setText("");
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const b64 = btoa(binary);
      const r = await invokeTool(toolId, { imageBase64: b64 });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setText(typeof r.output.text === "string" ? r.output.text : JSON.stringify(r.output));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1.5 text-sm text-[var(--neutral-11)]">
        <span className="text-xs font-medium">上传含二维码的图片</span>
        <input
          data-allow-native
          type="file"
          accept="image/*"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      {loading ? <RunnerNote>解析中…</RunnerNote> : null}
      <RunnerError>{error}</RunnerError>
      <RunnerOutput>{text}</RunnerOutput>
      <RunnerNote>jsQR + sharp · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Cron ───────────────────────────────────────────────────────────────────

export function CronExplainRunner({ toolId }: { toolId: string }) {
  const [expression, setExpression] = useState("0 9 * * 1-5");
  const [tz, setTz] = useState("Asia/Shanghai");
  const [error, setError] = useState("");
  const [next, setNext] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { expression, tz, count: 8 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setNext([]);
      return;
    }
    setNext(Array.isArray(r.output.next) ? (r.output.next as string[]) : []);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Cron 表达式"
          id="cron-expr"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          className="font-mono"
        />
        <Input
          label="时区"
          id="cron-tz"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="font-mono"
          placeholder="UTC / Asia/Shanghai"
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "解析中…" : "解析下次触发"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {next.length > 0 ? (
        <RunnerPanel title="下次触发 (ISO)">
          <ul className="space-y-1 font-mono text-sm">
            {next.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </RunnerPanel>
      ) : null}
      <RunnerNote>cron-parser · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Timezone ───────────────────────────────────────────────────────────────

const TZ_PRESETS = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
];

export function TimezoneRunner({ toolId }: { toolId: string }) {
  const [datetime, setDatetime] = useState(() =>
    new Date().toISOString().slice(0, 19).replace("T", " "),
  );
  const [fromTz, setFromTz] = useState("UTC");
  const [toTz, setToTz] = useState("Asia/Shanghai");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { datetime, fromTz, toTz });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "string" ? r.output.result : "");
    setMeta(
      [
        r.output.iso ? `ISO ${String(r.output.iso)}` : "",
        r.output.unix != null ? `unix ${String(r.output.unix)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    );
  };

  return (
    <div className="space-y-4">
      <Input
        label="日期时间"
        id="tz-dt"
        value={datetime}
        onChange={(e) => setDatetime(e.target.value)}
        className="font-mono"
        placeholder="2026-07-24 12:00:00 或 ISO / unix"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect label="从" id="tz-from" value={fromTz} onChange={setFromTz}>
          {TZ_PRESETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </RunnerSelect>
        <RunnerSelect label="到" id="tz-to" value={toTz} onChange={setToTz}>
          {TZ_PRESETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </RunnerSelect>
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "转换中…" : "转换时区"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <RunnerPanel>
          <p className="text-xl font-semibold tabular-nums tracking-tight">{result}</p>
          {meta ? <p className="mt-1 text-xs text-[var(--neutral-10)]">{meta}</p> : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>dayjs timezone · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── CSV preview ────────────────────────────────────────────────────────────

export function CsvPreviewRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("id,name,role\n1,Ada,admin\n2,Lin,member\n3,Tom,viewer");
  const [error, setError] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, maxRows: 50 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setHeaders(Array.isArray(r.output.headers) ? (r.output.headers as string[]) : []);
    setRows(Array.isArray(r.output.rows) ? (r.output.rows as string[][]) : []);
    setTotalRows(typeof r.output.totalRows === "number" ? r.output.totalRows : 0);
  };

  return (
    <div className="space-y-4">
      <Textarea
        id="csv-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "解析中…" : "预览表格"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {headers.length > 0 || rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)]">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className="bg-[var(--neutral-2)]">
              <tr>
                {headers.map((h, i) => (
                  <th key={`${h}-${i}`} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-t border-[var(--neutral-6)]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 font-mono text-[13px]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-[var(--neutral-6)] px-3 py-2 text-xs text-[var(--neutral-10)]">
            预览 {rows.length} / 共 {totalRows} 行
          </p>
        </div>
      ) : null}
      <RunnerNote>papaparse · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── JSON Path ──────────────────────────────────────────────────────────────

export function JsonPathRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState('{"users":[{"id":1,"name":"Ada"},{"id":2,"name":"Lin"}]}');
  const [path, setPath] = useState("$.users[*].name");
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, path });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOutput(
      typeof r.output.result === "string"
        ? r.output.result
        : JSON.stringify(r.output.result ?? r.output, null, 2),
    );
  };

  return (
    <div className="space-y-4">
      <Input
        label="JSONPath"
        id="jp-path"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        className="font-mono"
      />
      <Textarea
        id="jp-json"
        label="JSON"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "查询中…" : "查询"}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput>{output}</RunnerOutput>
      <RunnerNote>jsonpath-plus · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── XML format ─────────────────────────────────────────────────────────────

export function XmlFormatRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState(
    '<root><item id="1">hello</item><item id="2">world</item></root>',
  );
  const [mode, setMode] = useState("format");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    const r = await invokeTool(toolId, { text, mode });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (typeof r.output.result === "string") setText(r.output.result);
    setStatus(mode === "validate" ? "校验通过" : `完成 · ${String(r.output.engine ?? "xml")}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect label="模式" id="xml-mode" value={mode} onChange={setMode}>
          <option value="format">美化</option>
          <option value="minify">压缩</option>
          <option value="validate">校验</option>
        </RunnerSelect>
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? "处理中…" : "运行"}
        </Button>
      </div>
      <Textarea
        id="xml-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <RunnerError>{error}</RunnerError>
      {status ? <RunnerNote>{status}</RunnerNote> : null}
      <RunnerNote>fast-xml-parser · 与 API 同一路径</RunnerNote>
    </div>
  );
}

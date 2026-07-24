"use client";

// @brand-exempt: issue links reference monorepo name; fixture-only surface
/**
 * P2 specialized runners — unit convert, codec/text leftovers, CN/life, image helpers.
 * @see https://github.com/Nebutra/Nebutra-Sailor/issues/256
 */
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";
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

// ─── Unit convert family ────────────────────────────────────────────────────

const UNIT_FAMILIES: Record<
  string,
  {
    from: string;
    to: string;
    value: string;
    units: readonly string[];
    labels?: Record<string, string>;
  }
> = {
  length: {
    from: "m",
    to: "ft",
    value: "1",
    units: ["m", "km", "cm", "mm", "in", "ft", "yd", "mi", "nmi"],
    labels: {
      m: "米 m",
      km: "千米 km",
      cm: "厘米 cm",
      mm: "毫米 mm",
      in: "英寸 in",
      ft: "英尺 ft",
      yd: "码 yd",
      mi: "英里 mi",
      nmi: "海里 nmi",
    },
  },
  weight: {
    from: "kg",
    to: "lb",
    value: "1",
    units: ["kg", "g", "mg", "lb", "oz", "t", "st"],
    labels: {
      kg: "千克 kg",
      g: "克 g",
      mg: "毫克 mg",
      lb: "磅 lb",
      oz: "盎司 oz",
      t: "吨 t",
      st: "英石 st",
    },
  },
  temperature: {
    from: "C",
    to: "F",
    value: "25",
    units: ["C", "F", "K"],
    labels: { C: "摄氏 °C", F: "华氏 °F", K: "开尔文 K" },
  },
  area: {
    from: "m2",
    to: "mu",
    value: "1",
    units: ["m2", "km2", "ha", "mu", "ft2", "acre"],
    labels: {
      m2: "平方米 m²",
      km2: "平方千米 km²",
      ha: "公顷 ha",
      mu: "亩 mu",
      ft2: "平方英尺 ft²",
      acre: "英亩 acre",
    },
  },
  speed: {
    from: "km/h",
    to: "mph",
    value: "100",
    units: ["m/s", "km/h", "mph", "kn", "ft/s"],
    labels: {
      "m/s": "米/秒 m/s",
      "km/h": "千米/时 km/h",
      mph: "英里/时 mph",
      kn: "节 kn",
      "ft/s": "英尺/秒 ft/s",
    },
  },
  volume: {
    from: "L",
    to: "gal_us",
    value: "1",
    units: ["L", "mL", "m3", "gal_us", "gal_uk", "cup_us"],
    labels: {
      L: "升 L",
      mL: "毫升 mL",
      m3: "立方米 m³",
      gal_us: "美制加仑 gal_us",
      gal_uk: "英制加仑 gal_uk",
      cup_us: "美制杯 cup",
    },
  },
};

export function UnitConvertRunner({
  toolId,
  family,
}: {
  toolId: string;
  family: keyof typeof UNIT_FAMILIES | string;
}) {
  const cfg = UNIT_FAMILIES[family] ?? UNIT_FAMILIES.length!;
  const [value, setValue] = useState(cfg.value);
  const [from, setFrom] = useState(cfg.from);
  const [to, setTo] = useState(cfg.to);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const unitLabel = (u: string) => cfg.labels?.[u] ?? u;

  const swap = () => {
    setFrom(to);
    setTo(from);
    setResult(null);
  };

  const run = async () => {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      setError("请输入有效数字");
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { value: n, from, to });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "number" ? r.output.result : null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <Input
          label="数值"
          id={`unit-${family}-value`}
          type="number"
          step="any"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setValue(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <RunnerSelect label="从" id={`unit-${family}-from`} value={from} onChange={setFrom}>
          {cfg.units.map((u) => (
            <option key={u} value={u}>
              {unitLabel(u)}
            </option>
          ))}
        </RunnerSelect>
        <RunnerSelect label="到" id={`unit-${family}-to`} value={to} onChange={setTo}>
          {cfg.units.map((u) => (
            <option key={u} value={u}>
              {unitLabel(u)}
            </option>
          ))}
        </RunnerSelect>
        <Button type="button" variant="outline" onClick={swap} className="sm:mb-0.5">
          ⇄ 互换
        </Button>
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "换算中…" : "换算"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result != null ? (
        <RunnerPanel>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {Number.isInteger(result) ? result : Number(result.toPrecision(12))}
          </p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            {value} {unitLabel(from)} ={" "}
            {Number.isInteger(result) ? result : Number(result.toPrecision(12))} {unitLabel(to)}
          </p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>SI 换算表 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Unicode ────────────────────────────────────────────────────────────────

export function UnicodeRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("Hello 你好");
  const [mode, setMode] = useState("to_escape");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, mode });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (mode === "code_points" && Array.isArray(r.output.points)) {
      setResult(
        (r.output.points as Array<{ char: string; hex: string; dec: number }>)
          .map((p) => `${p.char}\t${p.hex}\t${p.dec}`)
          .join("\n"),
      );
    } else {
      setResult(
        typeof r.output.result === "string" ? r.output.result : JSON.stringify(r.output, null, 2),
      );
    }
  };

  return (
    <div className="space-y-4">
      <RunnerSelect label="模式" id="unicode-mode" value={mode} onChange={setMode}>
        <option value="to_escape">→ \u 转义</option>
        <option value="from_escape">← 解码转义</option>
        <option value="code_points">码点列表</option>
      </RunnerSelect>
      <Textarea
        id="unicode-text"
        label="输入"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={6}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "转换中…" : "转换"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!result}
          onClick={() => void navigator.clipboard.writeText(result)}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="min-h-[120px] whitespace-pre-wrap break-all">{result}</RunnerOutput>
      <RunnerNote>ECMAScript code points · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Query string ───────────────────────────────────────────────────────────

export function QueryStringRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("https://example.com?a=1&b=hello&b=world");
  const [mode, setMode] = useState("parse");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, mode });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (typeof r.output.json === "string") setResult(r.output.json);
    else if (typeof r.output.result === "string") setResult(r.output.result);
    else setResult(JSON.stringify(r.output.result ?? r.output, null, 2));
  };

  return (
    <div className="space-y-4">
      <RunnerSelect label="模式" id="qs-mode" value={mode} onChange={setMode}>
        <option value="parse">解析 → JSON</option>
        <option value="stringify">JSON 对象 → 查询串</option>
      </RunnerSelect>
      <Textarea
        id="qs-text"
        label={mode === "stringify" ? "JSON 对象" : "URL / 查询串"}
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={8}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "处理中…" : mode === "parse" ? "解析" : "序列化"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!result}
          onClick={() => void navigator.clipboard.writeText(result)}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="min-h-[100px] whitespace-pre-wrap break-all">{result}</RunnerOutput>
      <RunnerNote>URLSearchParams · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Image Base64 inspect ───────────────────────────────────────────────────

export function ImageBase64Runner({ toolId }: { toolId: string }) {
  const [base64, setBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState("inspect");
  const [mime, setMime] = useState("image/png");
  const [meta, setMeta] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = useCallback((file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setError("");
    if (file.type) setMime(file.type);
    const reader = new FileReader();
    reader.onload = () => setBase64(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }, []);

  const run = async () => {
    if (!base64.trim()) {
      setError("请上传图片或粘贴 Base64 / data URL");
      return;
    }
    setLoading(true);
    setError("");
    setMeta("");
    setDataUrl("");
    const r = await invokeTool(toolId, { imageBase64: base64, mode, mime });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (typeof r.output.dataUrl === "string") {
      setDataUrl(r.output.dataUrl);
      setMeta(`${String(r.output.mime ?? mime)} · ${String(r.output.bytes ?? "?")} bytes`);
    } else {
      setMeta(
        [
          `mime: ${String(r.output.mime ?? "")}`,
          `bytes: ${String(r.output.bytes ?? "")}`,
          `base64Length: ${String(r.output.base64Length ?? "")}`,
          `headHex: ${String(r.output.headHex ?? "")}`,
        ].join("\n"),
      );
      if (base64.startsWith("data:")) setDataUrl(base64);
      else
        setDataUrl(
          `data:${mime};base64,${base64.includes(",") ? base64.split(",").pop() : base64}`,
        );
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-6 text-sm text-muted-foreground"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          type="file"
          accept="image/*"
          data-allow-native
          className="mb-2 text-sm"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <p>{fileName ? `已选：${fileName}` : "拖拽图片，或粘贴 data URL / Base64"}</p>
      </div>
      <Textarea
        id="img64-text"
        label="Base64 / data URL"
        value={base64}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setBase64(e.target.value)
        }
        rows={5}
        className="font-mono text-xs"
        spellCheck={false}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect label="模式" id="img64-mode" value={mode} onChange={setMode}>
          <option value="inspect">解析元信息</option>
          <option value="to_data_url">生成 data URL</option>
        </RunnerSelect>
        <Input
          label="MIME（无前缀时）"
          id="img64-mime"
          value={mime}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setMime(e.target.value)
          }
          className="font-mono"
        />
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "处理中…" : "运行"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {meta ? <RunnerOutput className="whitespace-pre-wrap">{meta}</RunnerOutput> : null}
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="preview"
          className="max-h-64 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] object-contain"
        />
      ) : null}
      <RunnerNote>Node Buffer · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Trim whitespace (multi-output) ─────────────────────────────────────────

export function TrimWhitespaceRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("  hello   world  \n\n  你好  ");
  const [trim, setTrim] = useState("");
  const [collapse, setCollapse] = useState("");
  const [stripAll, setStripAll] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setTrim(typeof r.output.trim === "string" ? r.output.trim : "");
    setCollapse(typeof r.output.collapse === "string" ? r.output.collapse : "");
    setStripAll(typeof r.output.stripAll === "string" ? r.output.stripAll : "");
  };

  return (
    <div className="space-y-4">
      <Textarea
        id="trim-src"
        label="输入"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={6}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "处理中…" : "去空白"}
      </Button>
      <RunnerError>{error}</RunnerError>
      <div className="grid gap-3 lg:grid-cols-3">
        <RunnerPanel title="trim（首尾）">
          <pre className="whitespace-pre-wrap break-all font-mono text-sm">{trim || "—"}</pre>
        </RunnerPanel>
        <RunnerPanel title="collapse（压缩空格）">
          <pre className="whitespace-pre-wrap break-all font-mono text-sm">{collapse || "—"}</pre>
        </RunnerPanel>
        <RunnerPanel title="stripAll（去全部空白）">
          <pre className="whitespace-pre-wrap break-all font-mono text-sm">{stripAll || "—"}</pre>
        </RunnerPanel>
      </div>
      <RunnerNote>text-utils · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Text replace ───────────────────────────────────────────────────────────

export function TextReplaceRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("foo bar foo");
  const [find, setFind] = useState("foo");
  const [replace, setReplace] = useState("baz");
  const [regex, setRegex] = useState(false);
  const [flags, setFlags] = useState("g");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, find, replace, regex, flags });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "string" ? r.output.result : "");
  };

  return (
    <div className="space-y-4">
      <Textarea
        id="replace-src"
        label="原文"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={8}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="查找"
          id="replace-find"
          value={find}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setFind(e.target.value)
          }
          className="font-mono"
        />
        <Input
          label="替换为"
          id="replace-to"
          value={replace}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setReplace(e.target.value)
          }
          className="font-mono"
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--neutral-11)]">
          <input
            data-allow-native
            type="checkbox"
            checked={regex}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRegex(e.target.checked)}
            className="size-4 accent-[var(--blue-9)]"
          />
          正则
        </label>
        {regex ? (
          <Input
            label="flags"
            id="replace-flags"
            value={flags}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setFlags(e.target.value)
            }
            className="w-24 font-mono"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "替换中…" : "替换"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!result}
          onClick={() => void navigator.clipboard.writeText(result)}
        >
          复制结果
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="min-h-[100px] whitespace-pre-wrap">{result}</RunnerOutput>
      <RunnerNote>查找替换 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Line prefix / suffix ───────────────────────────────────────────────────

export function LinePrefixSuffixRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("apple\nbanana\ncherry");
  const [prefix, setPrefix] = useState("- ");
  const [suffix, setSuffix] = useState("");
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, prefix, suffix, skipEmpty });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "string" ? r.output.result : "");
  };

  return (
    <div className="space-y-4">
      <Textarea
        id="lineps-src"
        label="文本（按行）"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={8}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="前缀"
          id="lineps-prefix"
          value={prefix}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setPrefix(e.target.value)
          }
          className="font-mono"
        />
        <Input
          label="后缀"
          id="lineps-suffix"
          value={suffix}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setSuffix(e.target.value)
          }
          className="font-mono"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-[var(--neutral-11)]">
        <input
          data-allow-native
          type="checkbox"
          checked={skipEmpty}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSkipEmpty(e.target.checked)}
          className="size-4 accent-[var(--blue-9)]"
        />
        跳过空行
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "处理中…" : "应用"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!result}
          onClick={() => void navigator.clipboard.writeText(result)}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="min-h-[100px] whitespace-pre-wrap">{result}</RunnerOutput>
      <RunnerNote>按行批量前缀/后缀 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Fullwidth ↔ halfwidth ──────────────────────────────────────────────────

export function FullwidthHalfwidthRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("Ｈｅｌｌｏ　世界！Hello 123");
  const [mode, setMode] = useState("to_half");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, mode });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "string" ? r.output.result : "");
  };

  return (
    <div className="space-y-4">
      <RunnerSelect label="方向" id="fw-mode" value={mode} onChange={setMode}>
        <option value="to_half">全角 → 半角</option>
        <option value="to_full">半角 → 全角</option>
      </RunnerSelect>
      <Textarea
        id="fw-text"
        label="输入"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={6}
        className="font-mono text-sm"
        spellCheck={false}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "转换中…" : "转换"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!result}
          onClick={() => void navigator.clipboard.writeText(result)}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="min-h-[80px] whitespace-pre-wrap">{result}</RunnerOutput>
      <RunnerNote>Unicode FF00 映射 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── NanoID ─────────────────────────────────────────────────────────────────

export function NanoidRunner({ toolId }: { toolId: string }) {
  const [size, setSize] = useState("21");
  const [count, setCount] = useState("5");
  const [alphabet, setAlphabet] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const sizeN = Number(size);
    const countN = Number(count);
    if (!Number.isFinite(sizeN) || sizeN < 4 || sizeN > 64) {
      setError("长度需在 4–64");
      return;
    }
    if (!Number.isFinite(countN) || countN < 1 || countN > 100) {
      setError("数量需在 1–100");
      return;
    }
    setLoading(true);
    setError("");
    const input: Record<string, unknown> = { size: sizeN, count: countN };
    if (alphabet.trim().length >= 2) input.alphabet = alphabet.trim();
    const r = await invokeTool(toolId, input);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setIds(Array.isArray(r.output.ids) ? (r.output.ids as string[]) : []);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="长度"
          id="nanoid-size"
          type="number"
          min={4}
          max={64}
          value={size}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setSize(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <Input
          label="数量"
          id="nanoid-count"
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setCount(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <Input
          label="自定义字母表（可选）"
          id="nanoid-alphabet"
          value={alphabet}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setAlphabet(e.target.value)
          }
          placeholder="默认 URL-safe"
          className="font-mono text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "生成中…" : "生成"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={ids.length === 0}
          onClick={() => void navigator.clipboard.writeText(ids.join("\n"))}
        >
          复制全部
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {ids.length > 0 ? (
        <ul className="space-y-1 font-mono text-sm">
          {ids.map((id) => (
            <li
              key={id}
              className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-3 py-2"
            >
              {id}
            </li>
          ))}
        </ul>
      ) : (
        <RunnerNote>生成结果会显示在这里</RunnerNote>
      )}
      <RunnerNote>nanoid · 服务端 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── ID card ────────────────────────────────────────────────────────────────

export function IdCardRunner({ toolId }: { toolId: string }) {
  const [id, setId] = useState("11010519491231002X");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const cleaned = id.trim().toUpperCase();
    if (cleaned.length < 15) {
      setError("请输入身份证号");
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { id: cleaned });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  const valid = out?.valid === true;

  return (
    <div className="space-y-4">
      <Input
        label="身份证号"
        id="id-card-input"
        value={id}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setId(e.target.value)}
        className="font-mono tracking-wider"
        maxLength={18}
      />
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "校验中…" : "校验"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p
            className={`text-lg font-semibold ${valid ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"}`}
          >
            {valid ? "校验通过" : "校验失败"}
          </p>
          {typeof out.reason === "string" ? (
            <p className="mt-1 text-sm text-[var(--neutral-11)]">{out.reason}</p>
          ) : null}
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {typeof out.birth === "string" ? (
              <>
                <dt className="text-[var(--neutral-10)]">出生日期</dt>
                <dd className="font-mono">{out.birth}</dd>
              </>
            ) : null}
            {typeof out.gender === "string" ? (
              <>
                <dt className="text-[var(--neutral-10)]">性别</dt>
                <dd>
                  {out.gender === "M" || out.gender === "male"
                    ? "男"
                    : out.gender === "F" || out.gender === "female"
                      ? "女"
                      : String(out.gender)}
                </dd>
              </>
            ) : null}
            {typeof out.regionCode === "string" ? (
              <>
                <dt className="text-[var(--neutral-10)]">行政区划码</dt>
                <dd className="font-mono">{out.regionCode}</dd>
              </>
            ) : null}
          </dl>
        </RunnerPanel>
      ) : null}
      <RunnerNote>GB 11643 校验位 · 不查库 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Mortgage ───────────────────────────────────────────────────────────────

export function MortgageRunner({ toolId }: { toolId: string }) {
  const [principal, setPrincipal] = useState("1000000");
  const [rate, setRate] = useState("3.1");
  const [years, setYears] = useState("30");
  const [method, setMethod] = useState("equal_installment");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fmt = (n: unknown) =>
    typeof n === "number"
      ? n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "—";

  const run = async () => {
    const p = Number(principal);
    const r = Number(rate);
    const y = Number(years);
    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(r) || !Number.isFinite(y) || y <= 0) {
      setError("请输入有效本金、利率与年限");
      return;
    }
    setLoading(true);
    setError("");
    const res = await invokeTool(toolId, {
      principal: p,
      annualRatePercent: r,
      years: y,
      method,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setOut(res.output);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="贷款本金（元）"
          id="mortgage-p"
          type="number"
          value={principal}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setPrincipal(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <Input
          label="年利率 %"
          id="mortgage-rate"
          type="number"
          step="0.01"
          value={rate}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setRate(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <Input
          label="年限"
          id="mortgage-years"
          type="number"
          min={1}
          max={50}
          value={years}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setYears(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <RunnerSelect label="还款方式" id="mortgage-method" value={method} onChange={setMethod}>
          <option value="equal_installment">等额本息</option>
          <option value="equal_principal">等额本金</option>
        </RunnerSelect>
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "计算中…" : "计算"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {method === "equal_installment" ? (
            <RunnerPanel title="每月月供">
              <p className="text-2xl font-semibold tabular-nums">¥ {fmt(out.monthlyPayment)}</p>
            </RunnerPanel>
          ) : (
            <>
              <RunnerPanel title="首月月供">
                <p className="text-2xl font-semibold tabular-nums">
                  ¥ {fmt(out.firstMonthPayment)}
                </p>
              </RunnerPanel>
              <RunnerPanel title="末月月供">
                <p className="text-2xl font-semibold tabular-nums">¥ {fmt(out.lastMonthPayment)}</p>
              </RunnerPanel>
              <RunnerPanel title="每月本金">
                <p className="text-xl font-semibold tabular-nums">¥ {fmt(out.monthlyPrincipal)}</p>
              </RunnerPanel>
            </>
          )}
          <RunnerPanel title="还款月数">
            <p className="text-2xl font-semibold tabular-nums">{String(out.months ?? "—")}</p>
          </RunnerPanel>
          <RunnerPanel title="总还款">
            <p className="text-2xl font-semibold tabular-nums">¥ {fmt(out.totalPayment)}</p>
          </RunnerPanel>
          <RunnerPanel title="总利息">
            <p className="text-2xl font-semibold tabular-nums text-[var(--status-warning)]">
              ¥ {fmt(out.totalInterest)}
            </p>
          </RunnerPanel>
        </div>
      ) : null}
      <RunnerNote>标准摊还公式 · 仅供参考 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Lunar calendar ─────────────────────────────────────────────────────────

export function LunarRunner({ toolId }: { toolId: string }) {
  const now = useMemo(() => {
    const d = new Date();
    return { y: String(d.getFullYear()), m: String(d.getMonth() + 1), day: String(d.getDate()) };
  }, []);
  const [mode, setMode] = useState("solar_to_lunar");
  const [year, setYear] = useState(now.y);
  const [month, setMonth] = useState(now.m);
  const [day, setDay] = useState(now.day);
  const [isLeap, setIsLeap] = useState(false);
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      setError("请输入有效年月日");
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { mode, year: y, month: m, day: d, isLeap });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  return (
    <div className="space-y-4">
      <RunnerSelect label="方向" id="lunar-mode" value={mode} onChange={setMode}>
        <option value="solar_to_lunar">公历 → 农历</option>
        <option value="lunar_to_solar">农历 → 公历</option>
      </RunnerSelect>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="年"
          id="lunar-y"
          type="number"
          min={1900}
          max={2100}
          value={year}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setYear(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <Input
          label="月"
          id="lunar-m"
          type="number"
          min={1}
          max={12}
          value={month}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setMonth(e.target.value)
          }
          className="font-mono tabular-nums"
        />
        <Input
          label="日"
          id="lunar-d"
          type="number"
          min={1}
          max={31}
          value={day}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setDay(e.target.value)
          }
          className="font-mono tabular-nums"
        />
      </div>
      {mode === "lunar_to_solar" ? (
        <label className="inline-flex items-center gap-2 text-sm text-[var(--neutral-11)]">
          <input
            data-allow-native
            type="checkbox"
            checked={isLeap}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIsLeap(e.target.checked)}
            className="size-4 accent-[var(--blue-9)]"
          />
          农历闰月
        </label>
      ) : null}
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "转换中…" : "转换"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {typeof out.solar === "string" ? (
              <>
                <dt className="text-[var(--neutral-10)]">公历</dt>
                <dd className="font-mono font-medium">{out.solar}</dd>
              </>
            ) : null}
            {typeof out.lunar === "string" ? (
              <>
                <dt className="text-[var(--neutral-10)]">农历</dt>
                <dd className="font-medium">{out.lunar}</dd>
              </>
            ) : null}
            {typeof out.lunarYmd === "string" ? (
              <>
                <dt className="text-[var(--neutral-10)]">农历 Y-M-D</dt>
                <dd className="font-mono">{out.lunarYmd}</dd>
              </>
            ) : null}
            {typeof out.ganZhi === "string" ? (
              <>
                <dt className="text-[var(--neutral-10)]">干支年</dt>
                <dd>{out.ganZhi}</dd>
              </>
            ) : null}
            {typeof out.week === "string" || typeof out.week === "number" ? (
              <>
                <dt className="text-[var(--neutral-10)]">星期</dt>
                <dd>{String(out.week)}</dd>
              </>
            ) : null}
          </dl>
          {Array.isArray(out.festival) && out.festival.length > 0 ? (
            <p className="mt-3 text-sm text-[var(--neutral-11)]">
              节日：{(out.festival as string[]).join("、")}
            </p>
          ) : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>lunar-javascript · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Optional lab: phone lookup + kinship ───────────────────────────────────

export function PhoneLookupRunner({ toolId }: { toolId: string }) {
  const [phone, setPhone] = useState("13800138000");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { phone: phone.trim() });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  return (
    <div className="space-y-4">
      <Input
        label="手机号"
        id="phone-lookup"
        value={phone}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setPhone(e.target.value)
        }
        className="font-mono tracking-wider"
      />
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "查询中…" : "查询"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p
            className={`font-semibold ${out.valid === true ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"}`}
          >
            {out.valid === true ? "格式有效" : "无效"}
          </p>
          {typeof out.carrier === "string" ? (
            <p className="mt-2 text-lg">运营商：{out.carrier}</p>
          ) : null}
          {typeof out.reason === "string" ? (
            <p className="mt-1 text-sm text-[var(--neutral-11)]">{out.reason}</p>
          ) : null}
          {typeof out.note === "string" ? <RunnerNote>{out.note}</RunnerNote> : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>号段粗分 · 非完整归属地库 · lab</RunnerNote>
    </div>
  );
}

export function KinshipRunner({ toolId }: { toolId: string }) {
  const [relation, setRelation] = useState("爸爸的爸爸");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const samples = ["爸爸的爸爸", "妈妈的兄弟", "兄弟的儿子", "配偶的妈妈"];

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { relation: relation.trim() });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setTitle(
      typeof r.output.title === "string"
        ? r.output.title
        : typeof r.output.result === "string"
          ? r.output.result
          : JSON.stringify(r.output),
    );
  };

  return (
    <div className="space-y-4">
      <Input
        label="关系描述"
        id="kinship-rel"
        value={relation}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setRelation(e.target.value)
        }
      />
      <div className="flex flex-wrap gap-2">
        {samples.map((s) => (
          <Button key={s} type="button" variant="outline" size="sm" onClick={() => setRelation(s)}>
            {s}
          </Button>
        ))}
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "查询中…" : "查询称呼"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {title ? (
        <RunnerPanel>
          <p className="text-2xl font-semibold">{title}</p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>轻量映射 · 非常见关系可能无结果 · lab</RunnerNote>
    </div>
  );
}

"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button, Tabs, TabsList, TabsTrigger, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

type CodecKind = "url" | "html" | "hex";

function runLocal(
  kind: CodecKind,
  text: string,
  mode: "encode" | "decode",
  hexInvalid: string,
): string {
  if (kind === "url") {
    return mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text);
  }
  if (kind === "html") {
    if (mode === "encode") {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
    return text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }
  if (mode === "encode") {
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  const clean = text.replace(/\s/g, "");
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error(hexInvalid);
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

const SAMPLES: Record<CodecKind, string> = {
  url: "https://nebutra.com/path?q=hello",
  html: `<p class="x">Hello & "Nebutra"</p>`,
  hex: "Hello Nebutra",
};

/**
 * Encode/decode workspace for url / html-entities / hex.
 */
export function CodecModeRunner({ toolId, kind }: { toolId: string; kind: CodecKind }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(SAMPLES[kind]);
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const kindNote =
    kind === "url"
      ? t("codec.noteUrl")
      : kind === "html"
        ? t("codec.noteHtml")
        : t("codec.noteHex");

  const local = () => {
    setError("");
    try {
      setResult(runLocal(kind, text, mode, t("codec.hexInvalid")));
      setNote(t("codec.localNote"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const server = async () => {
    setError("");
    const input = kind === "hex" ? { text } : { text, mode };

    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: {
        result?: string;
        encode?: string;
        decode?: string | null;
      };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    if (kind === "hex") {
      if (mode === "encode") {
        setResult(body.output?.encode ?? "");
      } else {
        const d = body.output?.decode;
        if (d == null) {
          setError(t("codec.hexDecodeFail"));
          return;
        }
        setResult(d);
      }
    } else {
      setResult(body.output?.result ?? "");
    }
    setNote(t("codec.serverNote"));
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "encode" | "decode")}
          variant="button"
          shape="pill"
        >
          <TabsList>
            <TabsTrigger value="encode">{t("common.encode")}</TabsTrigger>
            <TabsTrigger value="decode">{t("common.decode")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <RunnerNote>{mode === "encode" ? t("codec.encodeDir") : t("codec.decodeDir")}</RunnerNote>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Textarea
          label={t("common.input")}
          id={`${kind}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="min-h-[220px] font-mono text-sm"
          spellCheck={false}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-11)]">
              {t("common.output")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copy()}
              disabled={!result}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> {t("common.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> {t("common.copy")}
                </>
              )}
            </Button>
          </div>
          <RunnerOutput className="min-h-[220px] whitespace-pre-wrap break-all">
            {result || (
              <span className="text-[var(--neutral-9)]">{t("common.outputPlaceholder")}</span>
            )}
          </RunnerOutput>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={local}>
          {t("common.localRun")}
        </Button>
        <Button type="button" variant="outline" onClick={() => void server()}>
          {t("common.serverVerify")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{note || kindNote}</RunnerNote>
    </div>
  );
}

"use client";

import { brand } from "@nebutra/brand/metadata";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { invokeForge, useDebouncedCallback } from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerPanel } from "@/components/runner-ui";

/**
 * Tokenizer presets — labels map encodings to current models.dev families.
 * Default = o200k (GPT-5 / o-series / 4o-class tokenizer).
 */
const ENCODINGS = [
  {
    id: "o200k_base",
    label: "o200k · GPT-5 / o-series",
    hint: "OpenAI current chat & reasoning tokenizers",
  },
  {
    id: "cl100k_base",
    label: "cl100k · older OpenAI chat",
    hint: "Pre-o200k OpenAI chat tokenizer (historical)",
  },
  {
    id: "p50k_base",
    label: "p50k · Codex / edit",
    hint: "Legacy code / edit models",
  },
  {
    id: "r50k_base",
    label: "r50k · early GPT-3",
    hint: "Early completion models",
  },
] as const;

export function TokenCountRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(`Hello ${brand.name}, count my tokens.`);
  const [encoding, setEncoding] = useState<(typeof ENCODINGS)[number]["id"]>("o200k_base");
  const [tokens, setTokens] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const count = async (nextText = text, nextEncoding = encoding) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError("");
    try {
      const r = await invokeForge(toolId, { text: nextText, encoding: nextEncoding }, ac.signal);
      if (ac.signal.aborted) return;
      if (!r.ok) {
        setError(r.message);
        setTokens(null);
        return;
      }
      setTokens(typeof r.output.tokens === "number" ? r.output.tokens : null);
      setNote(
        `${String(r.output.engine ?? "js-tiktoken")} · ${String(r.output.encoding ?? nextEncoding)}`,
      );
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  };

  const debounced = useDebouncedCallback((value: string, enc: string) => {
    void count(value, enc as (typeof ENCODINGS)[number]["id"]);
  }, 320);

  useEffect(() => {
    debounced(text, encoding);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on text/encoding only
  }, [text, encoding]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ENCODINGS.map((e) => (
          <Button
            key={e.id}
            type="button"
            size="sm"
            variant={encoding === e.id ? "ink" : "outline"}
            onClick={() => setEncoding(e.id)}
            title={e.hint}
          >
            {e.label}
          </Button>
        ))}
      </div>
      <Textarea
        label={t("common.text")}
        id="token-count-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => void count()} disabled={loading}>
          {loading ? t("tokenCount.counting") : t("tokenCount.count")}
        </Button>
        <span className="text-sm text-[var(--neutral-11)]">
          {t("tokenCount.chars", { n: text.length })} · {t("common.liveHint")}
        </span>
      </div>
      <RunnerError>{error}</RunnerError>
      {tokens !== null ? (
        <RunnerPanel>
          <p className="text-3xl font-bold tabular-nums">{tokens}</p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">tokens</p>
          <RunnerNote>{note}</RunnerNote>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("tokenCount.note")}</RunnerNote>
    </div>
  );
}

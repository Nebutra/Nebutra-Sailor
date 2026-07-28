"use client";

import { Card } from "@nebutra/ui/layout";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { RunnerError, RunnerNote } from "@/components/runner-ui";

function countClient(text: string) {
  const characters = [...text].length;
  const charactersNoSpaces = [...text.replace(/\s/g, "")].length;
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
  const paragraphs =
    text.trim().length === 0 ? 0 : text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const cjkCharacters = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/gu) ?? []).length;

  let words = 0;
  let engine = "latin+cjk-fallback";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    for (const { segment, isWordLike } of segmenter.segment(text)) {
      if (isWordLike || /[\u3400-\u9fff]/.test(segment)) words += 1;
    }
    engine = "Intl.Segmenter";
  } else {
    const latinWords = (text.match(/[A-Za-z0-9]+(?:[''][A-Za-z0-9]+)*/g) ?? []).length;
    words = latinWords + cjkCharacters;
  }
  return {
    characters,
    charactersNoSpaces,
    words,
    lines,
    paragraphs,
    cjkCharacters,
    engine,
  };
}

const SAMPLE = `Nebutra Forge word count

Mixed: Hello world，你好世界。
Drafts, posts, and pre-token estimates.`;

export function WordCountRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(SAMPLE);
  const [apiNote, setApiNote] = useState("");
  const [error, setError] = useState("");
  const live = useMemo(() => countClient(text), [text]);

  const verifyServer = async () => {
    setError("");
    setApiNote(t("wordCount.verifying"));
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { text } }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: { words?: number };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "server error");
      setApiNote("");
      return;
    }
    setApiNote(t("wordCount.serverNote", { words: body.output?.words ?? "?" }));
  };

  const stats = [
    { label: t("wordCount.words"), value: live.words, primary: true },
    { label: t("wordCount.chars"), value: live.characters },
    { label: t("wordCount.noSpaces"), value: live.charactersNoSpaces },
    { label: t("wordCount.cjk"), value: live.cjkCharacters },
    { label: t("wordCount.lines"), value: live.lines },
    { label: t("wordCount.paragraphs"), value: live.paragraphs },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`border-[var(--neutral-6)] px-3.5 py-3 ${
              s.primary
                ? "border-[color-mix(in_srgb,var(--blue-9)_28%,var(--neutral-7))] bg-[color-mix(in_srgb,var(--blue-3)_35%,var(--neutral-1))]"
                : ""
            }`}
          >
            <p className="text-[11px] font-medium text-[var(--neutral-10)]">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{s.value}</p>
          </Card>
        ))}
      </div>

      <Textarea
        label={t("common.text")}
        id="word-count-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="min-h-[240px] font-mono text-sm"
        placeholder={t("wordCount.placeholder")}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(text)}
        >
          {t("wordCount.copyText")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setText("")}>
          {t("wordCount.clear")}
        </Button>
        <Button type="button" variant="ink" onClick={() => void verifyServer()}>
          {t("common.serverVerify")}
        </Button>
      </div>
      <RunnerNote>{t("wordCount.note", { engine: live.engine })}</RunnerNote>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{apiNote}</RunnerNote>
    </div>
  );
}

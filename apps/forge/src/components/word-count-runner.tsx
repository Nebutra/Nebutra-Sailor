"use client";

import { Card } from "@nebutra/ui/layout";
import { Button, Textarea } from "@nebutra/ui/primitives";
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
    const latinWords = (text.match(/[A-Za-z0-9]+(?:['\u2019][A-Za-z0-9]+)*/g) ?? []).length;
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

const SAMPLE = `Nebutra Forge 字数统计

中英混排：Hello world，你好世界。
用于作文、公众号、产品文案与 token 前置估算。`;

export function WordCountRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState(SAMPLE);
  const [apiNote, setApiNote] = useState("");
  const [error, setError] = useState("");
  const live = useMemo(() => countClient(text), [text]);

  const verifyServer = async () => {
    setError("");
    setApiNote("校验中…");
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
    setApiNote(`服务端 words=${body.output?.words ?? "?"} · 与 API 同一路径`);
  };

  const stats = [
    { label: "词数", value: live.words, primary: true },
    { label: "字符", value: live.characters },
    { label: "不含空格", value: live.charactersNoSpaces },
    { label: "中日韩", value: live.cjkCharacters },
    { label: "行", value: live.lines },
    { label: "段", value: live.paragraphs },
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
        label="文本"
        id="word-count-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="min-h-[240px] font-mono text-sm"
        placeholder="粘贴或输入文字…"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(text)}
        >
          复制文本
        </Button>
        <Button type="button" variant="ghost" onClick={() => setText("")}>
          清空
        </Button>
        <Button type="button" variant="ink" onClick={() => void verifyServer()}>
          服务端校验
        </Button>
      </div>
      <RunnerNote>实时引擎：{live.engine} · 不上传即可统计 · 与 API 同一路径</RunnerNote>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{apiNote}</RunnerNote>
    </div>
  );
}

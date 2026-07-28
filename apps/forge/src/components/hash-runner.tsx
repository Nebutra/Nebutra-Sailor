"use client";

import { brand } from "@nebutra/brand/metadata";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

async function digestHex(
  algorithm: "SHA-1" | "SHA-256" | "SHA-512" | "MD5",
  text: string,
): Promise<string> {
  if (algorithm === "MD5") {
    throw new Error("MD5_SERVER_ONLY");
  }
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function HashRunner({
  toolId,
  algorithm,
}: {
  toolId: string;
  algorithm: "md5" | "sha1" | "sha256" | "sha512";
}) {
  const t = useTranslations("runners");
  const [text, setText] = useState(`Hello ${brand.name}`);
  const [hex, setHex] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const webAlgo = useMemo(() => {
    if (algorithm === "sha1") return "SHA-1" as const;
    if (algorithm === "sha256") return "SHA-256" as const;
    if (algorithm === "sha512") return "SHA-512" as const;
    return null;
  }, [algorithm]);

  const runLocal = async () => {
    setError("");
    try {
      if (!webAlgo) {
        setError(t("hash.md5ServerHint"));
        return;
      }
      setHex(await digestHex(webAlgo, text));
      setNote(t("hash.localNote", { algo: webAlgo }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg === "MD5_SERVER_ONLY" ? t("hash.md5LocalError") : msg);
    }
  };

  const runServer = async () => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { text } }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: { hex?: string };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    setHex(body.output?.hex ?? "");
    setNote(t("hash.serverNote"));
  };

  return (
    <div className="space-y-4">
      <RunnerNote>
        {t("hash.algo", { algo: algorithm.toUpperCase() })}
        {algorithm === "md5" ? t("hash.md5Warn") : null}
      </RunnerNote>
      <Textarea
        label={t("common.input")}
        id={`hash-${algorithm}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={() => void runLocal()}>
          {t("common.localRun")}
        </Button>
        <Button type="button" variant="outline" onClick={() => void runServer()}>
          {t("common.serverRun")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void navigator.clipboard.writeText(hex)}
          disabled={!hex}
        >
          {t("common.copy")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="break-all">{hex}</RunnerOutput>
      <RunnerNote>{note}</RunnerNote>
    </div>
  );
}

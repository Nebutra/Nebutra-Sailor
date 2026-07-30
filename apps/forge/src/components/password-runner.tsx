"use client";

import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

export function PasswordRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const generate = async () => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { length, uppercase, lowercase, digits, symbols },
      }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: { password?: string };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    const next = body.output?.password ?? "";
    setPassword(next);
    if (next) setHistory((h) => [next, ...h].slice(0, 5));
  };

  const options = [
    { key: "uppercase", label: t("password.uppercase"), checked: uppercase, set: setUppercase },
    { key: "lowercase", label: t("password.lowercase"), checked: lowercase, set: setLowercase },
    { key: "digits", label: t("password.digits"), checked: digits, set: setDigits },
    { key: "symbols", label: t("password.symbols"), checked: symbols, set: setSymbols },
  ] as const;

  return (
    <div className="space-y-4">
      <label className="block text-sm text-[var(--neutral-11)]">
        {t("common.length", { n: length })}
        <input
          data-allow-native
          type="range"
          min={4}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="mt-2 w-full accent-primary"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-sm text-[var(--neutral-11)]">
        {options.map(({ key, label, checked, set }) => (
          <label key={key} className="inline-flex items-center gap-2">
            <input
              data-allow-native
              type="checkbox"
              checked={checked}
              onChange={(e) => set(e.target.checked)}
              className="size-4 accent-primary"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={() => void generate()}>
          {t("password.generate")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(password)}
          disabled={!password}
        >
          {t("common.copy")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="text-lg tracking-wide">{password}</RunnerOutput>
      <RunnerNote>{t("password.note")}</RunnerNote>
      {history.length > 1 ? (
        <div className="space-y-1">
          <p className="text-xs text-[var(--neutral-10)]">{t("password.recent")}</p>
          <ul className="space-y-1 font-mono text-xs text-[var(--neutral-11)]">
            {history.slice(1).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

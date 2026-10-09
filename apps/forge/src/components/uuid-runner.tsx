"use client";

import { Button, CopyButton, NumberField } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RunnerError, RunnerNote } from "@/components/runner-ui";

export function UuidRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const local = () => {
    setError("");
    const list = Array.from({ length: count }, () => crypto.randomUUID());
    setUuids(list);
  };

  const server = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { count } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: { uuids?: string[] };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? "error");
        return;
      }
      setUuids(body.output?.uuids ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <NumberField
        label={t("uuid.count")}
        id="uuid-count"
        min={1}
        max={100}
        value={count}
        onValueChange={(value) => setCount(value ?? 0)}
        className="w-28"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={local}>
          {t("uuid.local")}
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void server()}>
          {t("uuid.server")}
        </Button>
        <CopyButton
          variant="ghost"
          disabled={uuids.length === 0}
          size="default"
          value={uuids.join("\n")}
          label={t("uuid.copyAll")}
          copiedLabel={t("common.copied")}
          successMessage={t("common.copied")}
          showToast={false}
        />
      </div>
      <RunnerError>{error}</RunnerError>
      {uuids.length > 0 ? (
        <ul className="space-y-1 font-mono text-sm">
          {uuids.map((id) => (
            <li
              key={id}
              className="rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-1 px-3 py-2"
            >
              {id}
            </li>
          ))}
        </ul>
      ) : (
        <RunnerNote>{t("uuid.empty")}</RunnerNote>
      )}
    </div>
  );
}

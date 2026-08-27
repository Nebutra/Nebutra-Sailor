"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useState } from "react";

/** Compact mono field + copy — high-density console pattern. */
export function CopyField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const [ok, setOk] = useState(false);
  return (
    <div className={["min-w-0", className].filter(Boolean).join(" ")}>
      <p className="mb-1 text-[11px] font-medium text-[var(--neutral-10)]">{label}</p>
      <div className="flex items-stretch gap-1.5">
        <code className="flex min-h-8 min-w-0 flex-1 items-center overflow-x-auto rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-2.5 font-mono text-[11px] text-[var(--neutral-12)]">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setOk(true);
              setTimeout(() => setOk(false), 1200);
            });
          }}
          aria-label={`复制 ${label}`}
        >
          {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

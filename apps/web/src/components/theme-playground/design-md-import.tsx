"use client";

import { Check, CloudUpload, File, Warning } from "@nebutra/icons";
import { Badge, Button, Spinner, Textarea } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useRef, useState, useTransition } from "react";
import { importDesignMdAction } from "./actions";
import type { ImportedTheme } from "./design-md-types";

export interface DesignMdImportProps {
  onImported: (theme: ImportedTheme) => void;
}

export function DesignMdImport({ onImported }: DesignMdImportProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastTheme, setLastTheme] = useState<ImportedTheme | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setContent(text);
      setError(null);
      setLastTheme(null);
    });
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handlePreview() {
    if (!content.trim()) {
      setError("Please paste a DESIGN.md or upload a file first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await importDesignMdAction(content);
      if (res.ok) {
        setLastTheme(res.theme);
        onImported(res.theme);
      } else {
        setError(res.error);
      }
    });
  }

  const isComplete =
    lastTheme !== null &&
    lastTheme.report.missingRequired.length === 0 &&
    lastTheme.report.unmapped.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Paste a DESIGN.md or upload a <code className="font-mono">.md</code> file to preview it in
          the workbench.
        </p>
        {/* File upload — data-allow-native required by lint-no-raw-inputs rule */}
        <input
          data-allow-native
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Upload DESIGN.md file"
        />
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-border/80 bg-background/60"
          prefix={<File />}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload .md
        </Button>
      </div>

      <Textarea
        value={content}
        onValueChange={setContent}
        placeholder={`---\nname: My Brand\ncolors:\n  primary: "hsl(var(--primary))"\n  accent: "#0BF1C3"\n---`}
        rows={8}
        className="font-mono text-xs"
        aria-label="DESIGN.md content"
      />

      {error !== null && (
        <div
          className="flex items-start gap-2 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs"
          role="alert"
        >
          <Warning className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        size="sm"
        className="w-full"
        prefix={isPending ? <Spinner size="xs" /> : <CloudUpload />}
        type="button"
        disabled={isPending || !content.trim()}
        onClick={handlePreview}
      >
        {isPending ? "Parsing…" : "Preview theme"}
      </Button>

      {/* Import report — shown after a successful parse */}
      {lastTheme !== null && (
        <div
          className={cn(
            "rounded-[var(--radius-md)] border p-3 text-xs",
            isComplete ? "border-success/30 bg-success/10" : "border-border bg-card/70",
          )}
        >
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
            {isComplete ? (
              <>
                <Check className="size-3.5 text-success" />
                <span>完整映射 — all required tokens present</span>
              </>
            ) : (
              <span>Import report · {lastTheme.name}</span>
            )}
          </div>

          {lastTheme.report.missingRequired.length > 0 && (
            <div className="mb-2">
              <p className="mb-1.5 text-muted-foreground">
                缺失必需 token ({lastTheme.report.missingRequired.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {lastTheme.report.missingRequired.map((key) => (
                  <Badge key={key} variant="red-subtle" size="sm" className="font-mono">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lastTheme.report.unmapped.length > 0 && (
            <div className="mb-2">
              <p className="mb-1.5 text-muted-foreground">
                未映射 prose-only ({lastTheme.report.unmapped.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {lastTheme.report.unmapped.map((key) => (
                  <Badge key={key} variant="outline" size="sm" className="font-mono">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lastTheme.report.warnings.length > 0 && (
            <div>
              <p className="mb-1.5 text-muted-foreground">
                Warnings ({lastTheme.report.warnings.length}):
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {lastTheme.report.warnings.map((w, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i} className="flex items-start gap-1.5">
                    <Warning className="mt-0.5 size-3 shrink-0 text-warning" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

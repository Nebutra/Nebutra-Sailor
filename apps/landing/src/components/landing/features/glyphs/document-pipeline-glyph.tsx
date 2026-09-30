import { ArrowRight, Check, FileText, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type PipelineStep = {
  readonly label: string;
  readonly meta?: string;
};

// File names are treated as data, not copy — same on every locale.
const DOC_NAMES: readonly [string, string] = ["q4-report.pdf", "eu-policy.docx"];

type DocumentPipelineCopy = {
  steps: Record<string, { label: string; meta: string }>;
  docs: Record<string, { age: string; pages: string; chunks: string }>;
  processed: string;
};

export function DocumentPipelineGlyph({ copy }: SubpackageGlyphProps) {
  const t = copy as DocumentPipelineCopy;
  const steps: PipelineStep[] = ["0", "1", "2", "3"].map((i) => ({
    label: t.steps[i].label,
    meta: t.steps[i].meta || undefined,
  }));
  const docs = DOC_NAMES.map((name, i) => ({ name, ...t.docs[String(i)] }));
  const processedLabel = t.processed;

  return (
    <div
      className="relative flex w-full flex-col justify-between overflow-hidden rounded-[var(--radius-md)] bg-muted px-4 py-3"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>document pipeline</span>
      </div>

      {/* Pipeline steps */}
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="gap-1 border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground"
            >
              <FileText className="h-2.5 w-2.5 text-primary" />
              <span>{step.label}</span>
              {step.meta ? (
                <span className="font-mono text-[9px] text-muted-foreground">· {step.meta}</span>
              ) : null}
            </Badge>
            {i < steps.length - 1 ? <ArrowRight className="h-3 w-3 text-muted-foreground" /> : null}
          </div>
        ))}
      </div>

      {/* Recent docs */}
      <div className="flex flex-col gap-1" aria-hidden="true">
        {docs.map((doc) => (
          <div
            key={doc.name}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-[10px] text-foreground">{doc.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <span>
                {processedLabel} {doc.age}
              </span>
              <span>·</span>
              <span>{doc.pages}</span>
              <span>·</span>
              <span>{doc.chunks}</span>
              <Check className="h-3 w-3 text-[var(--brand-accent)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer mono */}
      <div className="font-mono text-[9px] tracking-tight text-muted-foreground">
        unstructured.io · multi-format
      </div>
    </div>
  );
}

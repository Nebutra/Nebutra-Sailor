import { ArrowRight, Check, FileText, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type PipelineStep = {
  readonly label: string;
  readonly meta?: string;
};

const PIPELINE_STEPS_EN: ReadonlyArray<PipelineStep> = [
  { label: "PDF", meta: "upload" },
  { label: "OCR", meta: "47p" },
  { label: "chunk", meta: "248" },
  { label: "embed" },
];

const PIPELINE_STEPS_ZH: ReadonlyArray<PipelineStep> = [
  { label: "PDF", meta: "上传" },
  { label: "OCR", meta: "47页" },
  { label: "切块", meta: "248" },
  { label: "向量化" },
];

type DocRow = {
  readonly name: string;
  readonly age: string;
  readonly pages: string;
  readonly chunks: string;
};

const DOCS_EN: ReadonlyArray<DocRow> = [
  { name: "q4-report.pdf", age: "2m ago", pages: "47 pages", chunks: "248 chunks" },
  { name: "eu-policy.docx", age: "12m ago", pages: "12 pages", chunks: "84 chunks" },
];

const DOCS_ZH: ReadonlyArray<DocRow> = [
  { name: "q4-report.pdf", age: "2分钟前", pages: "47页", chunks: "248块" },
  { name: "eu-policy.docx", age: "12分钟前", pages: "12页", chunks: "84块" },
];

export function DocumentPipelineGlyph({ locale }: SubpackageGlyphProps) {
  const steps = locale === "zh" ? PIPELINE_STEPS_ZH : PIPELINE_STEPS_EN;
  const docs = locale === "zh" ? DOCS_ZH : DOCS_EN;
  const processedLabel = locale === "zh" ? "已处理" : "processed";

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
              <FileText className="h-2.5 w-2.5 text-[hsl(var(--primary))]" />
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

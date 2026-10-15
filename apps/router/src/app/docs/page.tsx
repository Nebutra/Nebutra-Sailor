import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CopyField } from "@/components/copy-field";
import { PageFrame } from "@/components/page-frame";
import { getListedModelIds } from "@/lib/listing-catalog";
import { getBaseUrlHint } from "@/lib/model-routes";

export async function generateMetadata() {
  const t = await getTranslations("console.docs");
  return { title: t("title") };
}

const mono = (chunks: ReactNode) => <span className="font-mono">{chunks}</span>;

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-neutral-6">
      <div className="border-b border-neutral-6 bg-neutral-2/50 px-3 py-1.5 text-xs font-semibold">
        {title}
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">{code}</pre>
    </section>
  );
}

export default async function DocsPage() {
  const t = await getTranslations("console.docs");
  const base = getBaseUrlHint();
  // The shelf, not the alias table — a snippet must name a model we actually sell.
  const models = await getListedModelIds();
  const sampleModel = models[0] ?? DEFAULT_PUBLIC_MODEL;
  const host = base.replace(/\/v1\/?$/, "");

  const openaiSdk = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.NEBUTRA_API_KEY,
  baseURL: "${base}",
});

const res = await client.chat.completions.create({
  model: "${sampleModel}",
  messages: [{ role: "user", content: "ping" }],
});`;

  const anthropicSdk = `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.NEBUTRA_API_KEY,   // sent as x-api-key
  baseURL: "${host}",
});

const msg = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 256,
  messages: [{ role: "user", content: "ping" }],
});`;

  const claudeCode = `# Claude Code / any Anthropic-format CLI
export ANTHROPIC_BASE_URL="${host}"
export ANTHROPIC_AUTH_TOKEN="$NEBUTRA_API_KEY"
claude`;

  const codex = `# Codex CLI — Responses API
export OPENAI_BASE_URL="${base}"
export OPENAI_API_KEY="$NEBUTRA_API_KEY"
codex

# same endpoint from the SDK
const r = await client.responses.create({
  model: "gpt-5-codex",
  input: "ping",
});`;

  const images = `curl -s ${base}/images/generations \\
  -H "Authorization: Bearer $NEBUTRA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-image-2","prompt":"a lighthouse at dusk","size":"1024x1024"}'`;

  const curl = `curl -s ${base}/chat/completions \\
  -H "Authorization: Bearer $NEBUTRA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${sampleModel}","messages":[{"role":"user","content":"ping"}]}'`;

  const rows: Array<[string, string, string]> = [
    ["GET", `${base}/models`, t("endpoints.models")],
    ["POST", `${base}/chat/completions`, t("endpoints.chat")],
    ["POST", `${base}/responses`, t("endpoints.responses")],
    ["POST", `${base}/messages`, t("endpoints.messages")],
    ["POST", `${base}/embeddings`, t("endpoints.embeddings")],
    ["POST", `${base}/images/generations`, t("endpoints.imagesGenerations")],
    ["POST", `${base}/images/edits`, t("endpoints.imagesEdits")],
    ["GET", `${base}/limits`, t("endpoints.limits")],
  ];

  return (
    <PageFrame title={t("title")} description={t("description")} width="content">
      <div className="grid gap-3 sm:grid-cols-2">
        <CopyField label="baseURL" value={base} />
        <CopyField label={t("sampleModel")} value={sampleModel} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Snippet title="TypeScript · openai SDK" code={openaiSdk} />
        <Snippet title="curl" code={curl} />
        <Snippet title="TypeScript · @anthropic-ai/sdk" code={anthropicSdk} />
        <Snippet title="Claude Code" code={claudeCode} />
        <Snippet title="Codex CLI · Responses API" code={codex} />
        <Snippet title={t("images")} code={images} />
      </div>

      <section className="mt-3 rounded-[var(--radius-md)] border border-neutral-6 p-3 text-xs leading-relaxed text-neutral-11">
        <h2 className="mb-1 text-sm font-semibold text-neutral-12">{t("limits.title")}</h2>
        <p>{t.rich("limits.rate", { mono })}</p>
        <p className="mt-1">{t.rich("limits.quota", { mono, base })}</p>
      </section>

      <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-neutral-6">
        <Table bare className="w-full text-xs">
          <TableHeader>
            <TableRow className="bg-neutral-2/50 text-xs text-muted-foreground">
              <TableHead alignment="start" className="font-medium">
                {t("col.method")}
              </TableHead>
              <TableHead alignment="start" className="font-medium">
                {t("col.path")}
              </TableHead>
              <TableHead alignment="start" className="font-medium">
                {t("col.note")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody bordered className="font-mono text-xs">
            {rows.map(([method, path, note]) => (
              <TableRow key={path}>
                <TableCell alignment="start">{method}</TableCell>
                <TableCell alignment="start">{path}</TableCell>
                <TableCell alignment="start" className="font-sans text-neutral-11">
                  {note}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageFrame>
  );
}

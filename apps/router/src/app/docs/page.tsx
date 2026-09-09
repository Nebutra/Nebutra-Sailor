import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import { CopyField } from "@/components/copy-field";
import { PageFrame } from "@/components/page-frame";
import { getListedModelIds } from "@/lib/listing-catalog";
import { getBaseUrlHint } from "@/lib/model-routes";

export const metadata = { title: "接入" };

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
      <div className="border-b border-[var(--neutral-6)] bg-[var(--neutral-2)]/50 px-3 py-1.5 text-[11px] font-semibold">
        {title}
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed">{code}</pre>
    </section>
  );
}

export default async function DocsPage() {
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
    ["GET", `${base}/models`, "公开模型列表"],
    ["POST", `${base}/chat/completions`, "对话补全（流式 / 非流）"],
    ["POST", `${base}/responses`, "Responses API（Codex、Agents SDK）"],
    ["POST", `${base}/messages`, "Anthropic Messages（Claude Code、Anthropic SDK，x-api-key）"],
    ["POST", `${base}/embeddings`, "向量"],
    ["POST", `${base}/images/generations`, "文生图（302.ai / OpenAI 同契约）"],
    ["POST", `${base}/images/edits`, "图生图（multipart：image + prompt + model + size）"],
  ];

  return (
    <PageFrame
      title="接入"
      description="一把 Key，一个 baseURL。OpenAI、Anthropic、Responses 三种协议走同一入口。"
      width="content"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CopyField label="baseURL" value={base} />
        <CopyField label="示例 model" value={sampleModel} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Snippet title="TypeScript · openai SDK" code={openaiSdk} />
        <Snippet title="curl" code={curl} />
        <Snippet title="TypeScript · @anthropic-ai/sdk" code={anthropicSdk} />
        <Snippet title="Claude Code" code={claudeCode} />
        <Snippet title="Codex CLI · Responses API" code={codex} />
        <Snippet title="图片生成" code={images} />
      </div>

      <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
        <Table bare className="w-full text-[12px]">
          <TableHeader>
            <TableRow className="bg-[var(--neutral-2)]/50 text-[11px] text-[var(--neutral-10)]">
              <TableHead alignment="start" className="font-medium">
                Method
              </TableHead>
              <TableHead alignment="start" className="font-medium">
                Path
              </TableHead>
              <TableHead alignment="start" className="font-medium">
                说明
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody bordered className="font-mono text-[11px]">
            {rows.map(([method, path, note]) => (
              <TableRow key={path}>
                <TableCell alignment="start">{method}</TableCell>
                <TableCell alignment="start">{path}</TableCell>
                <TableCell alignment="start" className="font-sans text-[var(--neutral-11)]">
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

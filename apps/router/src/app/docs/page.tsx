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
import { getBaseUrlHint, getModels } from "@/lib/demo-store";

export const metadata = { title: "接入" };

export default function DocsPage() {
  const base = getBaseUrlHint();
  const models = getModels();
  const sampleModel = models[0] ?? DEFAULT_PUBLIC_MODEL;

  const sdk = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.NEBUTRA_API_KEY,
  baseURL: "${base}",
});

const res = await client.chat.completions.create({
  model: "${sampleModel}",
  messages: [{ role: "user", content: "ping" }],
});`;

  const curl = `curl -s ${base}/chat/completions \\
  -H "Authorization: Bearer $NEBUTRA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${sampleModel}","messages":[{"role":"user","content":"ping"}]}'`;

  return (
    <PageFrame
      title="接入"
      description="改 baseURL + API Key。OpenAI SDK / curl 同一契约。"
      width="content"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CopyField label="baseURL" value={base} />
        <CopyField label="示例 model" value={sampleModel} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
          <div className="border-b border-[var(--neutral-6)] bg-[var(--neutral-2)]/50 px-3 py-1.5 text-[11px] font-semibold">
            TypeScript · openai SDK
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed">{sdk}</pre>
        </section>
        <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
          <div className="border-b border-[var(--neutral-6)] bg-[var(--neutral-2)]/50 px-3 py-1.5 text-[11px] font-semibold">
            curl
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed">{curl}</pre>
        </section>
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
            <TableRow>
              <TableCell alignment="start">GET</TableCell>
              <TableCell alignment="start">{base}/models</TableCell>
              <TableCell alignment="start" className="font-sans text-[var(--neutral-11)]">
                公开模型列表
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell alignment="start">POST</TableCell>
              <TableCell alignment="start">{base}/chat/completions</TableCell>
              <TableCell alignment="start" className="font-sans text-[var(--neutral-11)]">
                对话补全（流式/非流）
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </PageFrame>
  );
}

import { Card, PageHeader } from "@nebutra/ui/layout";
import { PageFrame } from "@/components/page-frame";
import { getBaseUrlHint } from "@/lib/demo-store";

export const metadata = { title: "接入" };

export default function DocsPage() {
  const base = getBaseUrlHint();
  const snippet = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.NEBUTRA_API_KEY, // sk-sailor-...
  baseURL: "${base}",
});

const res = await client.chat.completions.create({
  model: "gpt-5.4-mini",
  messages: [{ role: "user", content: "ping" }],
});`;

  return (
    <PageFrame width="content">
      <div className="space-y-6">
        <PageHeader
          title="三分钟接入"
          description="改 baseURL + API Key 即可。生产挂 router 域名后走 OpenAI-compatible 网关。"
        />
        <Card className="border-[var(--neutral-6)] p-5">
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed">{snippet}</pre>
        </Card>
        <div className="space-y-1 font-mono text-sm text-[var(--neutral-11)]">
          <p>
            <code>GET {base}/models</code>
          </p>
          <p>
            <code>POST {base}/chat/completions</code>
          </p>
        </div>
      </div>
    </PageFrame>
  );
}

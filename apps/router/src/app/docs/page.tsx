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
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "ping" }],
});`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">三分钟接入</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          改 baseURL + API Key 即可。网关路由：/api/v1/ai/gateway/chat/completions（生产挂 router
          域名）。
        </p>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-border bg-muted p-4 text-xs">
        {snippet}
      </pre>
      <div className="text-sm text-muted-foreground">
        <p>
          <code>GET {base}/models</code>
        </p>
        <p className="mt-1">
          <code>POST {base}/chat/completions</code>
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "API 文档",
  description: "Nebutra Forge OpenAPI-style discoverability for Agents",
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Forge API</h1>
      <p className="text-[var(--neutral-11)]">
        机器可读目录：{" "}
        <Link href="/api/v1/tools" className="underline">
          <code>GET /api/v1/tools</code>
        </Link>
      </p>
      <p className="text-[var(--neutral-11)]">
        调用工具： <code>POST /api/v1/tools/invoke/&#123;toolId&#125;</code>
      </p>
      <p className="text-[var(--neutral-11)]">
        Job： <code>POST /api/v1/jobs</code> · <code>GET /api/v1/jobs/:id</code>
      </p>
      <p className="text-[var(--neutral-11)]">
        MCP HTTP： <code>POST /api/mcp</code>（tools/list · tools/call）
      </p>
      <p className="text-[var(--neutral-11)]">
        钱包： <code>GET /api/v1/wallet</code> · <code>POST /api/v1/wallet/topup</code>（mock）
      </p>
      <pre className="overflow-x-auto rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-2)] p-4 text-sm">{`curl -X POST 'http://localhost:3105/api/v1/tools/invoke/text/word-count' \\
  -H 'Content-Type: application/json' \\
  -d '{"input":{"text":"hello 你好"}}'`}</pre>
      <p className="text-sm">
        人类工具站：{" "}
        <Link href="/" className="underline">
          首页
        </Link>
      </p>
    </div>
  );
}

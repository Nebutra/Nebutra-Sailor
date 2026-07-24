import { brand } from "@nebutra/brand/metadata";
import { Card, PageHeader } from "@nebutra/ui/layout";
import Link from "next/link";
import { PageFrame } from "@/components/page-frame";

export const metadata = {
  title: "API 文档",
  description: `${brand.name} Forge OpenAPI-style discoverability for Agents`,
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/tools",
    note: "机器可读工具目录",
  },
  {
    method: "POST",
    path: "/api/v1/tools/invoke/{toolId}",
    note: "调用工具（与页面同一路径）",
  },
  {
    method: "POST",
    path: "/api/v1/jobs",
    note: "异步 Job 创建",
  },
  {
    method: "GET",
    path: "/api/v1/jobs/:id",
    note: "Job 状态查询",
  },
  {
    method: "POST",
    path: "/api/mcp",
    note: "MCP HTTP（tools/list · tools/call）",
  },
  {
    method: "GET",
    path: "/api/v1/wallet",
    note: "钱包余额",
  },
  {
    method: "POST",
    path: "/api/v1/wallet/topup",
    note: "Mock 充值",
  },
] as const;

export default function ApiDocsPage() {
  return (
    <PageFrame width="content" className="py-10 md:py-12">
      <div className="space-y-8">
        <PageHeader
          title="Forge API"
          description="页面与 API 共用同一 invoke 路径。生产环境请带认证 Key。"
        />

        <Card className="divide-y divide-[var(--neutral-6)] overflow-hidden border-[var(--neutral-6)] p-0">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.method + ep.path}
              className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <code className="rounded-[var(--radius-sm)] bg-[var(--neutral-2)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--neutral-12)]">
                  {ep.method}
                </code>
                <code className="truncate font-mono text-sm text-[var(--neutral-11)]">
                  {ep.path}
                </code>
              </div>
              <p className="text-sm text-[var(--neutral-10)]">{ep.note}</p>
            </div>
          ))}
        </Card>

        <Card className="border-[var(--neutral-6)] p-5">
          <p className="mb-3 text-sm font-semibold">示例</p>
          <pre className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] p-4 font-mono text-[12px] leading-relaxed">{`curl -X POST 'http://localhost:3105/api/v1/tools/invoke/text/word-count' \\
  -H 'Content-Type: application/json' \\
  -d '{"input":{"text":"hello 你好"}}'`}</pre>
        </Card>

        <p className="text-sm text-[var(--neutral-11)]">
          人类工具站：{" "}
          <Link
            href="/"
            className="font-medium text-[var(--neutral-12)] underline-offset-4 hover:underline"
          >
            返回首页
          </Link>
        </p>
      </div>
    </PageFrame>
  );
}

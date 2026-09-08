import { PageHeader } from "@nebutra/ui/layout";
import { DashboardPanel } from "@nebutra/ui/patterns";
import { SupplySyncButton } from "@/components/supply-sync-button";
import { requireStaff } from "@/lib/staff";
import { probeEngines } from "@/lib/supply";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supply" };

/**
 * Supply desk. The two Router supply engines live on private Fly Machines;
 * this page is the only door. Account pool = CLIProxyAPI's own management UI,
 * proxied at /management.html with the management key injected, so staff sign
 * in through Cloudflare Access and never handle an engine secret.
 */
export default async function SupplyPage() {
  await requireStaff();
  const engines = await probeEngines();
  const byId = Object.fromEntries(engines.map((e) => [e.id, e]));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6">
      <PageHeader
        title="Supply"
        description="Router 供给引擎。API-key 渠道和账号号池都在 New-API 后面汇成一条 router.nebutra.com/v1。"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DashboardPanel
          title="账号号池 · CLIProxyAPI"
          description="ChatGPT / Codex、Google（Antigravity）、Claude 账号在这里登录。登录完成后点同步，模型即刻上架。"
        >
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-neutral-10">状态</dt>
            <dd className={byId.cliproxyapi?.reachable ? "text-success" : "text-destructive"}>
              {byId.cliproxyapi?.reachable ? "在线" : "不可达"} · {byId.cliproxyapi?.detail}
            </dd>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/management.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-[var(--radius-md)] bg-primary px-3 font-medium text-primary-foreground text-sm"
            >
              打开号池管理台
            </a>
            <SupplySyncButton />
          </div>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-neutral-11 text-xs">
            <li>管理台里选 OAuth 登录：Codex 用设备码；Google / Claude 会给一个链接。</li>
            <li>在本机浏览器打开链接并授权。跳到 localhost 打不开是正常的。</li>
            <li>把地址栏那条 localhost 回调 URL 贴回管理台，账号即入池。</li>
            <li>回到这里点同步，New-API 渠道的模型列表跟着更新。</li>
          </ol>
        </DashboardPanel>

        <DashboardPanel
          title="渠道中枢 · New-API"
          description="官方 API key 与号池都是它的渠道；客户 key 与计费在 Router 控制面，不在这里。"
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-neutral-10">状态</dt>
            <dd className={byId["new-api"]?.reachable ? "text-success" : "text-destructive"}>
              {byId["new-api"]?.reachable ? "在线" : "不可达"} · {byId["new-api"]?.detail}
            </dd>
            <dt className="text-neutral-10">号池渠道</dt>
            <dd className="font-mono">cliproxyapi · type OpenAI · priority 0</dd>
          </dl>
        </DashboardPanel>
      </div>
    </div>
  );
}

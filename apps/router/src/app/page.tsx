import { ArrowRight, Check } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { getBaseUrlHint, getWallet, listKeys } from "@/lib/demo-store";

export default async function RouterHomePage() {
  const balance = await getWallet().getBalance("demo");
  const keys = listKeys();
  const baseUrl = getBaseUrlHint();

  const steps = [
    {
      n: "01",
      title: "充值",
      desc: "预充钱包，按量扣费",
      href: "/wallet",
      done: balance.balance > 0,
    },
    {
      n: "02",
      title: "创建 API Key",
      desc: "sk-sailor-* · models:* / tools:*",
      href: "/keys",
      done: keys.length > 0,
    },
    {
      n: "03",
      title: "配置 base_url",
      desc: baseUrl,
      href: "/docs",
      done: false,
    },
    {
      n: "04",
      title: "调用模型",
      desc: "Playground 或任意 OpenAI SDK",
      href: "/playground",
      done: false,
    },
  ];

  return (
    <>
      <section className="relative w-full overflow-hidden border-b border-[var(--neutral-6)]">
        <AuroraBackground variant="subtle" position="top" intensity={0.28} />
        <PageFrame className="relative z-10 !py-16 md:!py-20">
          <AnimateInGroup stagger="normal" className="max-w-2xl space-y-6">
            <AnimateIn preset="fadeUp">
              <p className="text-xs font-medium tracking-[0.12em] text-[var(--neutral-11)] uppercase">
                302 风格控制台
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h1
                className="text-3xl font-semibold text-[var(--neutral-12)] md:text-5xl"
                style={{
                  letterSpacing: "var(--tracking-display, -0.02em)",
                  lineHeight: "var(--leading-display, 1.1)",
                }}
              >
                模型聚合中转
              </h1>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <p className="text-base leading-relaxed text-[var(--neutral-11)] md:text-lg">
                先充值、再拿 Key、改 base_url 即可。数据面走 New-API / Sub2API 侧车；客户只见
                Nebutra。
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <div className="flex flex-wrap items-end gap-3">
                <Card className="min-w-[8rem] border-[var(--neutral-6)] px-4 py-3">
                  <p className="text-[11px] text-[var(--neutral-10)]">余额</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {balance.balance}{" "}
                    <span className="text-sm font-medium text-[var(--neutral-11)]">
                      {balance.currency}
                    </span>
                  </p>
                </Card>
                <Card className="min-w-[8rem] border-[var(--neutral-6)] px-4 py-3">
                  <p className="text-[11px] text-[var(--neutral-10)]">API Keys</p>
                  <p className="text-2xl font-semibold tabular-nums">{keys.length}</p>
                </Card>
                <Button asChild variant="ink" size="lg">
                  <Link href="/playground" className="inline-flex items-center gap-2">
                    打开 Playground
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </AnimateIn>
          </AnimateInGroup>
        </PageFrame>
      </section>

      <PageFrame className="!pt-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">上线旅程</h2>
          <p className="mt-1 text-sm text-[var(--neutral-10)]">四步完成可用接入</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((s) => (
            <Link key={s.n} href={s.href} className="group block">
              <Card
                isInteractive
                className="h-full border-[var(--neutral-6)] p-5 transition group-hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[11px] tracking-widest text-[var(--neutral-10)]">
                    STEP {s.n}
                  </p>
                  {s.done ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cyan-3)] px-3 py-1 text-xs font-medium text-[var(--cyan-11)]">
                      <Check className="h-3 w-3" />
                      完成
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--neutral-3)] px-3 py-1 text-xs font-medium text-[var(--neutral-11)]">
                      待办
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1 break-all text-sm leading-relaxed text-[var(--neutral-11)]">
                  {s.desc}
                </p>
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--neutral-11)] opacity-0 transition group-hover:opacity-100">
                  继续
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </PageFrame>
    </>
  );
}

import { ArrowRight, Check } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import Link from "next/link";
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
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[var(--radius-xl,1.5rem)] border border-border bg-background">
        <AuroraBackground variant="vivid" position="top" intensity={0.5} />
        <div className="relative z-10 space-y-6 px-6 py-12 md:px-12 md:py-16">
          <AnimateInGroup stagger="normal" className="space-y-5">
            <AnimateIn preset="fadeUp">
              <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                302 风格控制台
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h1
                className="max-w-xl text-3xl font-semibold tracking-tight md:text-5xl"
                style={{
                  letterSpacing: "var(--tracking-display, -0.02em)",
                  lineHeight: "var(--leading-display, 1.1)",
                }}
              >
                <span className="text-primary">模型聚合中转</span>
              </h1>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                先充值、再拿 Key、改 base_url 即可。数据面走 New-API / Sub2API 侧车；客户只见
                Nebutra。
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <div className="flex flex-wrap items-end gap-3">
                <Card className="min-w-[8rem] border-border/80 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">余额</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {balance.balance}{" "}
                    <span className="text-sm font-medium text-muted-foreground">
                      {balance.currency}
                    </span>
                  </p>
                </Card>
                <Card className="min-w-[8rem] border-border/80 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">API Keys</p>
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
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">上线旅程</h2>
          <p className="mt-1 text-sm text-muted-foreground">四步完成可用接入</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((s) => (
            <Link key={s.n} href={s.href} className="group block">
              <Card
                isInteractive
                className="h-full border-border/80 p-5 transition group-hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[11px] tracking-widest text-muted-foreground">
                    STEP {s.n}
                  </p>
                  {s.done ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cyan-3)] px-3 py-1 text-xs font-medium text-[var(--cyan-11)]">
                      <Check className="h-3 w-3" />
                      完成
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      待办
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1 break-all text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  继续
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

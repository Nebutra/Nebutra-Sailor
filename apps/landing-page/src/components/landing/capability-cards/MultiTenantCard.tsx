"use client";

import { Database } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { CapabilityCard } from "./CapabilityCard";

const CODE_LINES = [
  { num: 1, text: "import { withTenant } from '@nebutra/rls'", type: "import" as const },
  { num: 2, text: "", type: "blank" as const },
  { num: 3, text: "export const getPosts = withTenant(", type: "code" as const },
  { num: 4, text: "  async (ctx) => {", type: "code" as const },
  { num: 5, text: "    const data = await prisma.post.findMany({", type: "code" as const },
  { num: 6, text: "      where: {", type: "code" as const },
  { num: 7, text: "        tenantId: ctx.tenant.id,", type: "key" as const },
  { num: 8, text: "        published: true,", type: "code" as const },
  { num: 9, text: "      },", type: "code" as const },
  { num: 10, text: "      include: { author: true },", type: "code" as const },
  { num: 11, text: "    });", type: "code" as const },
  { num: 12, text: "    return data;", type: "code" as const },
  { num: 13, text: "  }", type: "code" as const },
  { num: 14, text: ");", type: "code" as const },
];

function getLineClass(type: string, text: string): string {
  if (type === "key") {
    return "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10";
  }
  if (type === "import") {
    return "text-primary dark:text-cyan-400";
  }
  if (type === "comment") {
    return "text-muted-foreground dark:text-zinc-500";
  }
  if (text.includes("await") || text.includes("const") || text.includes("export") || text.includes("async")) {
    return "text-primary dark:text-cyan-400";
  }
  if (text.includes("'@nebutra/rls'")) {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-foreground dark:text-zinc-300";
}

export function MultiTenantCard() {
  const t = useTranslations("microLanding.capability");

  return (
    <CapabilityCard
      title={t("multiTenant.title")}
      description={t("multiTenant.desc")}
      ctaText={t("multiTenant.cta")}
      ctaHref="/docs/multi-tenancy"
      icon={<Database />}
    >
      {/* High-Fidelity Code Editor with tabs, line numbers, and terminal */}
      <div className="w-full max-w-[420px] mt-auto relative top-4 group-hover:top-2 transition-all duration-700 overflow-hidden rounded-t-[1.5rem] border-x border-t border-border/60 bg-background dark:bg-[#0A0A0A] dark:border-white/10 shadow-2xl scale-105 origin-bottom">
        {/* Window Chrome */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-border/60 dark:border-white/5 bg-muted/30 dark:bg-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-border dark:bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-border dark:bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-border dark:bg-zinc-700" />
        </div>

        {/* File Tabs */}
        <div className="flex border-b border-border/60 dark:border-white/5 bg-muted/10 dark:bg-white/[0.02]">
          <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-foreground dark:text-white bg-background dark:bg-[#0A0A0A] border-b-2 border-primary dark:border-cyan-400">
            <span className="w-2 h-2 rounded-sm bg-blue-500/60" />
            query.ts
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-muted-foreground dark:text-zinc-500">
            <span className="w-2 h-2 rounded-sm bg-emerald-500/40" />
            schema.prisma
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-muted-foreground dark:text-zinc-500">
            <span className="w-2 h-2 rounded-sm bg-amber-500/40" />
            middleware.ts
          </div>
        </div>

        {/* Code Area with Line Numbers */}
        <div className="bg-transparent overflow-hidden">
          <pre className="font-mono text-[12px] sm:text-[13px] leading-[1.7] whitespace-pre">
            {CODE_LINES.map((line) => (
              <div
                key={line.num}
                className={`flex ${line.type === "key" ? "bg-emerald-50 dark:bg-emerald-500/10 border-l-[3px] border-emerald-500/50" : ""}`}
              >
                <span className="w-10 shrink-0 text-right pr-3 select-none text-[11px] text-muted-foreground/40 dark:text-zinc-600">
                  {line.num}
                </span>
                <span className={getLineClass(line.type, line.text)}>
                  {line.text || "\u00a0"}
                </span>
              </div>
            ))}
          </pre>
        </div>

        {/* Mini Terminal Output */}
        <div className="border-t border-border/60 dark:border-white/5 bg-muted/20 dark:bg-white/[0.02] px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-zinc-500">
              Terminal
            </span>
            <span className="text-[10px] text-muted-foreground/50 dark:text-zinc-600">
              &mdash; rls-audit
            </span>
          </div>
          <div className="font-mono text-[11px] leading-relaxed">
            <p className="text-muted-foreground dark:text-zinc-500">
              $ npx nebutra rls-audit --strict
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ✔ 0 cross-tenant leaks detected
            </p>
            <p className="text-muted-foreground/60 dark:text-zinc-600">
              14 queries scanned in 0.8s
            </p>
          </div>
        </div>
      </div>
    </CapabilityCard>
  );
}

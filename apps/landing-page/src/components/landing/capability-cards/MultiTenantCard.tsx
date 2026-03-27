"use client";

import { Database } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { CapabilityCard } from "./CapabilityCard";

const TENANT_CODE_LINES = [
  { text: "const data = await prisma.post.findMany({", type: "code" as const },
  { text: "  where: {", type: "code" as const },
  { text: "    tenantId: ctx.tenant.id", type: "key" as const },
  { text: "  }", type: "code" as const },
  { text: "});", type: "code" as const },
  { text: "", type: "code" as const },
  { text: "// \u2714 RLS enforced at database level", type: "comment" as const },
  { text: "// \u2714 No cross-tenant data leaks", type: "comment" as const },
];

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
      {/* High-Fidelity Bleeding Code Window */}
      <div className="w-full max-w-[400px] mt-auto relative top-4 group-hover:top-2 transition-all duration-700 overflow-hidden rounded-t-[1.5rem] border-x border-t border-border/60 bg-background dark:bg-[#0A0A0A] dark:border-white/10 shadow-2xl scale-105 origin-bottom">
        <div className="flex items-center gap-1.5 px-5 py-4 border-b border-border/60 dark:border-white/5 bg-muted/30 dark:bg-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-border dark:bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-border dark:bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-border dark:bg-zinc-700" />
          <span className="ml-3 text-muted-foreground dark:text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
            query.ts
          </span>
        </div>
        <div className="p-6 pb-8 bg-transparent">
          <pre className="font-mono text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">
            {TENANT_CODE_LINES.map((line, i) => (
              <span
                key={i}
                className={`block ${
                  line.type === "comment"
                    ? "text-muted-foreground dark:text-zinc-500"
                    : line.type === "key"
                      ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 border-l-[3px] border-emerald-500/50 py-0.5 px-2 my-0.5 inline-block"
                      : line.text.includes("await") || line.text.includes("const")
                        ? "text-primary dark:text-cyan-400"
                        : "text-foreground dark:text-zinc-300"
                }`}
              >
                {line.text || "\u00a0"}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </CapabilityCard>
  );
}

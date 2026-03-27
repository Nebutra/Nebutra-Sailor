"use client";

import { Shield } from "@nebutra/icons";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { useTranslations } from "next-intl";
import { CapabilityCard } from "./CapabilityCard";

const PERMISSIONS = [
  { feature: "Posts", admin: true, member: true, guest: true },
  { feature: "Billing", admin: true, member: false, guest: false },
  { feature: "Settings", admin: true, member: false, guest: false },
  { feature: "API Keys", admin: true, member: true, guest: false },
  { feature: "Analytics", admin: true, member: true, guest: false },
];

const ROLES = [
  { name: "Admin", initial: "A", color: "bg-primary/80 dark:bg-cyan-500/80" },
  { name: "Member", initial: "M", color: "bg-amber-500/80 dark:bg-amber-400/80" },
  { name: "Guest", initial: "G", color: "bg-zinc-400/80 dark:bg-zinc-500/80" },
] as const;

export function RBACCard() {
  const t = useTranslations("microLanding.capability");

  return (
    <CapabilityCard
      title={t("rbac.title")}
      description={t("rbac.desc")}
      ctaText={t("rbac.cta")}
      ctaHref="/docs/authentication"
      icon={<Shield />}
    >
      {/* High-Fidelity Matrix Table Bleed */}
      <div className="w-full max-w-[440px] mt-auto relative top-6 group-hover:top-4 transition-all duration-700 overflow-hidden rounded-t-[1.5rem] border-x border-t border-border/60 bg-background dark:bg-[#0A0A0A] dark:border-white/10 shadow-2xl scale-105 origin-bottom flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border/60 dark:border-white/5 text-[11px] uppercase tracking-widest text-muted-foreground dark:text-zinc-500 font-bold bg-muted/20 dark:bg-white/[0.02]">
          <Fingerprint className="w-4 h-4" />
          Access Matrix
          <span className="ml-auto text-[10px] font-semibold normal-case tracking-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 dark:border-emerald-400/20">
            5 rules active
          </span>
        </div>

        <table className="w-full text-sm text-left flex-1 border-collapse">
          <thead className="bg-transparent">
            <tr className="border-b border-border/50 dark:border-white/5">
              <th className="py-3 px-6 text-[10px] font-bold text-muted-foreground/80 dark:text-zinc-500 uppercase tracking-widest w-[38%]">
                Resource
              </th>
              {ROLES.map((role) => (
                <th key={role.name} className="py-3 px-2 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-white ${role.color}`}
                    >
                      {role.initial}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground/80 dark:text-zinc-500 uppercase tracking-widest">
                      {role.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-transparent">
            {PERMISSIONS.map((row, i) => (
              <tr
                key={row.feature}
                className={`transition-colors hover:bg-muted/40 dark:hover:bg-white/5 ${
                  i < PERMISSIONS.length - 1 ? "border-b border-border/40 dark:border-white/5" : ""
                }`}
              >
                <td className="py-3.5 px-6 text-sm font-semibold text-foreground dark:text-zinc-300">
                  {row.feature}
                </td>
                {([row.admin, row.member, row.guest] as const).map((allowed, j) => (
                  <td key={j} className="py-3.5 text-center">
                    <span className="inline-flex items-center justify-center w-full h-full">
                      {allowed ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 shadow-[0_0_8px_rgba(16,185,129,0.15)] dark:shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border/50 dark:border-white/10">
                          <span className="w-2.5 h-[1.5px] rounded-full bg-border dark:bg-zinc-600" />
                        </span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CapabilityCard>
  );
}

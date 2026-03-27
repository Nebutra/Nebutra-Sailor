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
];

const ROLES = ["Admin", "Member", "Guest"] as const;

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
        <div className="flex items-center gap-2 px-6 py-5 border-b border-border/60 dark:border-white/5 text-[11px] uppercase tracking-widest text-muted-foreground dark:text-zinc-500 font-bold bg-muted/20 dark:bg-white/[0.02]">
          <Fingerprint className="w-4 h-4" />
          Access Matrix
        </div>
        <table className="w-full text-sm text-left flex-1 border-collapse">
          <thead className="bg-transparent">
            <tr className="border-b border-border/50 dark:border-white/5">
              <th className="py-3 px-6 text-[10px] font-bold text-muted-foreground/80 dark:text-zinc-500 uppercase tracking-widest w-1/3">
                Resource
              </th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className="py-3 px-2 text-center text-[10px] font-bold text-muted-foreground/80 dark:text-zinc-500 uppercase tracking-widest"
                >
                  {role}
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
                <td className="py-4 px-6 text-sm font-semibold text-foreground dark:text-zinc-300">
                  {row.feature}
                </td>
                {([row.admin, row.member, row.guest] as const).map((allowed, j) => (
                  <td key={j} className="py-4 text-center">
                    <span className="inline-flex items-center justify-center w-full h-full">
                      {allowed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-border/40 dark:border-white/10" />
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

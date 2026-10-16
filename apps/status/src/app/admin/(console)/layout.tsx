import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminLocale, requireMember } from "@/lib/admin";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const member = await requireMember();
  return (
    <AdminShell locale={await adminLocale()} email={member.email}>
      {children}
    </AdminShell>
  );
}

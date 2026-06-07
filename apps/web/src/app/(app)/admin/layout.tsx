import "server-only";
import { PageHeader } from "@nebutra/ui/layout";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await getAuth();
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);

  if (!auth.isSignedIn || !hasPermission(role, "admin:access")) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="Admin"
        description="Minimal internal dashboard — high-leverage signals only"
      />
      <div className="mt-6">{children}</div>
    </div>
  );
}

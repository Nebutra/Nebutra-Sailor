import "server-only";
import { EmptyState, PageHeader } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { getAuth, requireAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAuth();
  const [auth, t] = await Promise.all([getAuth(), getTranslations("admin")]);
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);

  // A signed-in member without admin access sees why, instead of being
  // bounced to the home page with no explanation.
  if (!hasPermission(role, "admin:access")) {
    return (
      <div className="mx-auto max-w-text px-4 py-16">
        <EmptyState
          title={t("forbidden.title")}
          description={t("forbidden.description")}
          action={
            <Button asChild variant="outline">
              <Link href="/workspace">{t("forbidden.back")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-wide px-4 py-8">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

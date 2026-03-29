import { PageHeader } from "@nebutra/ui/layout";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/organizations", label: "Organizations" },
];

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
        description="Super admin panel — manage users, organizations, and system health"
      />

      <nav className="mt-6 flex gap-1 border-b border-neutral-7 dark:border-white/10">
        {ADMIN_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-neutral-11 transition-colors hover:border-neutral-7 hover:text-neutral-12 dark:text-white/70 dark:hover:border-white/20 dark:hover:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}

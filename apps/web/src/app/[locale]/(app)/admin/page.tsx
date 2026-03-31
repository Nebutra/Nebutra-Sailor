import { Shield, UserSettings, Users } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
import { Building2 } from "lucide-react";
import { Suspense } from "react";
import { ExternalAvatar } from "@/components/ui/external-avatar";
import { db } from "@/lib/db";

async function AdminOverviewContent() {
  const [totalUsers, totalOrgs, recentUsers] = await Promise.all([
    db.user.count(),
    db.organization.count(),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users },
    { label: "Organizations", value: totalOrgs, icon: Building2 },
    { label: "Admin Users", value: "—", icon: Shield },
    { label: "Active Sessions", value: "—", icon: UserSettings },
  ];

  return (
    <>
      <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <AnimateIn key={label} preset="fadeUp">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-11 dark:text-white/70">{label}</h3>
                <Icon className="h-4 w-4 text-blue-10 dark:text-cyan-9" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-neutral-12 dark:text-white">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </Card>
          </AnimateIn>
        ))}
      </AnimateInGroup>

      <AnimateIn preset="fadeUp">
        <Card className="mt-6 p-0 overflow-hidden">
          <div className="border-b border-neutral-7 bg-neutral-2 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-sm font-medium text-neutral-12 dark:text-white">Recent Signups</h3>
          </div>
          <div className="divide-y divide-neutral-7 dark:divide-white/10">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                <ExternalAvatar
                  src={user.avatarUrl}
                  alt={user.name ?? "User"}
                  size={32}
                  className="h-8 w-8"
                  fallbackInitial={(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-12 dark:text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-neutral-10 dark:text-white/60">
                    {user.email}
                  </p>
                </div>
                <time className="text-xs text-neutral-10 dark:text-white/60">
                  {new Date(user.createdAt).toLocaleDateString()}
                </time>
              </div>
            ))}
          </div>
        </Card>
      </AnimateIn>
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AnimateIn key={i} preset="fadeUp">
              <div className="h-28 rounded-xl border border-[var(--neutral-7)] bg-[var(--neutral-2)] dark:border-white/10 dark:bg-white/5" />
            </AnimateIn>
          ))}
        </AnimateInGroup>
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}

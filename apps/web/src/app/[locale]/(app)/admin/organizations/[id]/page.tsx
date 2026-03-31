import { ArrowLeft, Users } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalAvatar } from "@/components/ui/external-avatar";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

async function OrgDetailContent({ params }: Props) {
  const { id } = await params;

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true },
        take: 50,
      },
      _count: { select: { members: true } },
    },
  });

  if (!org) {
    notFound();
  }

  return (
    <>
      <AnimateIn preset="fadeUp">
        <Link
          href="/admin/organizations"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-11 hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to organizations
        </Link>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid gap-6 lg:grid-cols-3">
        {/* Org profile */}
        <AnimateIn preset="fadeUp" className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <ExternalAvatar
                src={undefined}
                alt={org.name}
                size={80}
                className="h-20 w-20 rounded-xl"
                fallbackInitial={org.name[0]?.toUpperCase()}
              />
              <h2 className="mt-4 text-lg font-semibold text-neutral-12 dark:text-white">
                {org.name}
              </h2>
              {org.slug && (
                <p className="mt-1 font-mono text-sm text-neutral-11 dark:text-white/70">
                  {org.slug}
                </p>
              )}
            </div>

            <dl className="mt-6 space-y-3">
              <div>
                <dt className="text-xs text-neutral-10 dark:text-white/60">Organization ID</dt>
                <dd className="mt-0.5 truncate font-mono text-xs text-neutral-12 dark:text-white">
                  {org.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-10 dark:text-white/60">Created</dt>
                <dd className="mt-0.5 text-sm text-neutral-12 dark:text-white">
                  {new Date(org.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-10 dark:text-white/60">Members</dt>
                <dd className="mt-0.5 text-sm text-neutral-12 dark:text-white">
                  {org._count.members}
                </dd>
              </div>
            </dl>
          </Card>
        </AnimateIn>

        {/* Members list */}
        <AnimateIn preset="fadeUp" className="lg:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-neutral-7 bg-neutral-2 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <Users className="h-4 w-4 text-neutral-11 dark:text-white/70" />
              <h3 className="text-sm font-medium text-neutral-12 dark:text-white">
                Members ({org._count.members})
              </h3>
            </div>
            {org.members.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-11 dark:text-white/70">
                No members in this organization.
              </div>
            ) : (
              <div className="divide-y divide-neutral-7 dark:divide-white/10">
                {org.members.map((membership) => {
                  const user = membership.user;
                  return (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <ExternalAvatar
                          src={user?.avatarUrl}
                          alt={user?.name ?? "Member"}
                          size={32}
                          className="h-8 w-8"
                          fallbackInitial={(user?.name?.[0] ?? "?").toUpperCase()}
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/users/${user?.id}`}
                            className="truncate text-sm font-medium text-neutral-12 hover:text-blue-10 dark:text-white dark:hover:text-cyan-9"
                          >
                            {user?.name}
                          </Link>
                          <p className="truncate text-xs text-neutral-10 dark:text-white/60">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          membership.role === "ADMIN" || membership.role === "OWNER"
                            ? "bg-blue-3 text-blue-11 dark:bg-blue-9/20 dark:text-blue-9"
                            : "bg-neutral-3 text-neutral-11 dark:bg-white/10 dark:text-white/70"
                        }`}
                      >
                        {membership.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </AnimateIn>
      </AnimateInGroup>
    </>
  );
}

export default function AdminOrgDetailPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-xl border border-neutral-7 bg-neutral-2 dark:border-white/10 dark:bg-white/5" />
      }
    >
      <OrgDetailContent {...props} />
    </Suspense>
  );
}

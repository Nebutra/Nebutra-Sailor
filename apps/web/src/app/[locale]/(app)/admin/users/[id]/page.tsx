import { ArrowLeft, Envelope, ShieldCheck, UserSettings } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
import { Ban } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalAvatar } from "@/components/ui/external-avatar";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

async function UserDetailContent({ params }: Props) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      organizations: {
        include: { organization: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <>
      <AnimateIn preset="fadeUp">
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-11 hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to users
        </Link>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <AnimateIn preset="fadeUp" className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <ExternalAvatar
                src={user.avatarUrl}
                alt={user.name ?? "User"}
                size={80}
                className="h-20 w-20"
                fallbackInitial={(user.name?.[0] ?? "?").toUpperCase()}
              />
              <h2 className="mt-4 text-lg font-semibold text-neutral-12 dark:text-white">
                {user.name}
              </h2>
              <p className="mt-1 text-sm text-neutral-11 dark:text-white/70">{user.email}</p>

              <div className="mt-6 w-full space-y-2">
                <form action={`/api/admin/impersonate`} method="POST">
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-7 px-4 py-2 text-sm font-medium text-neutral-12 transition-colors hover:bg-neutral-2 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                  >
                    <UserSettings className="h-4 w-4" />
                    Impersonate
                  </button>
                </form>
              </div>
            </div>
          </Card>
        </AnimateIn>

        {/* Details */}
        <AnimateIn preset="fadeUp" className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">User Details</h3>

            <dl className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm text-neutral-11 dark:text-white/70">User ID</dt>
                <dd className="col-span-2 truncate font-mono text-sm text-neutral-12 dark:text-white">
                  {user.id}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm text-neutral-11 dark:text-white/70">Created</dt>
                <dd className="col-span-2 text-sm text-neutral-12 dark:text-white">
                  {new Date(user.createdAt).toLocaleString()}
                </dd>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm text-neutral-11 dark:text-white/70">Email</dt>
                <dd className="col-span-2 flex items-center gap-2 text-sm text-neutral-12 dark:text-white">
                  <Envelope className="h-3.5 w-3.5 text-neutral-10 dark:text-white/60" />
                  {user.email}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Organization memberships */}
          <Card className="mt-6 overflow-hidden p-0">
            <div className="border-b border-neutral-7 bg-neutral-2 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <h3 className="text-sm font-medium text-neutral-12 dark:text-white">
                Organizations ({user.organizations.length})
              </h3>
            </div>
            {user.organizations.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-11 dark:text-white/70">
                Not a member of any organization.
              </div>
            ) : (
              <div className="divide-y divide-neutral-7 dark:divide-white/10">
                {user.organizations.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ExternalAvatar
                        src={undefined}
                        alt={membership.organization.name}
                        size={32}
                        className="h-8 w-8 rounded-md"
                        fallbackInitial={membership.organization.name[0]?.toUpperCase()}
                      />
                      <div>
                        <Link
                          href={`/admin/organizations/${membership.organization.id}`}
                          className="text-sm font-medium text-neutral-12 hover:text-blue-10 dark:text-white dark:hover:text-cyan-9"
                        >
                          {membership.organization.name}
                        </Link>
                      </div>
                    </div>
                    <span className="rounded-full bg-neutral-3 px-2.5 py-1 text-xs font-medium text-neutral-11 dark:bg-white/10 dark:text-white/70">
                      {membership.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </AnimateIn>
      </AnimateInGroup>
    </>
  );
}

export default function AdminUserDetailPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-xl border border-neutral-7 bg-neutral-2 dark:border-white/10 dark:bg-white/5" />
      }
    >
      <UserDetailContent {...props} />
    </Suspense>
  );
}

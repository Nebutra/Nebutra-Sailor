import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, Envelope, ShieldCheck, UserSettings } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, ErrorState } from "@nebutra/ui/layout";
import { Ban } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

async function UserDetailContent({ params }: Props) {
  const { id } = await params;
  const client = await clerkClient();

  let user: Awaited<ReturnType<typeof client.users.getUser>>;
  try {
    user = await client.users.getUser(id);
  } catch {
    notFound();
  }

  const memberships = await client.users.getOrganizationMembershipList({
    userId: id,
  });

  const primaryEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress;

  const isBanned = user.banned;

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
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-20 w-20 rounded-full" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-3 text-2xl font-semibold text-neutral-11 dark:bg-white/10 dark:text-white/70">
                  {(user.firstName?.[0] ?? "?").toUpperCase()}
                </div>
              )}
              <h2 className="mt-4 text-lg font-semibold text-neutral-12 dark:text-white">
                {user.firstName} {user.lastName}
              </h2>
              <p className="mt-1 text-sm text-neutral-11 dark:text-white/70">{primaryEmail}</p>

              {isBanned && (
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-3 px-2.5 py-1 text-xs font-medium text-red-11 dark:bg-red-9/20 dark:text-red-9">
                  <Ban className="h-3 w-3" />
                  Banned
                </span>
              )}

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

                <form action={`/api/admin/ban`} method="POST">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="action" value={isBanned ? "unban" : "ban"} />
                  <button
                    type="submit"
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 ${
                      isBanned
                        ? "border-cyan-7 text-cyan-11 hover:bg-cyan-2 dark:border-cyan-9/30 dark:text-cyan-9 dark:hover:bg-cyan-9/10"
                        : "border-red-7 text-red-11 hover:bg-red-2 dark:border-red-9/30 dark:text-red-9 dark:hover:bg-red-9/10"
                    }`}
                  >
                    {isBanned ? (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Unban User
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" />
                        Ban User
                      </>
                    )}
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
                <dt className="text-sm text-neutral-11 dark:text-white/70">Last Active</dt>
                <dd className="col-span-2 text-sm text-neutral-12 dark:text-white">
                  {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "Never"}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm text-neutral-11 dark:text-white/70">Email Addresses</dt>
                <dd className="col-span-2 space-y-1">
                  {user.emailAddresses.map((email) => (
                    <div
                      key={email.id}
                      className="flex items-center gap-2 text-sm text-neutral-12 dark:text-white"
                    >
                      <Envelope className="h-3.5 w-3.5 text-neutral-10 dark:text-white/60" />
                      {email.emailAddress}
                      {email.id === user.primaryEmailAddressId && (
                        <span className="rounded-full bg-blue-3 px-2 py-0.5 text-xs font-medium text-blue-11 dark:bg-blue-9/20 dark:text-blue-9">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm text-neutral-11 dark:text-white/70">2FA Enabled</dt>
                <dd className="col-span-2 text-sm text-neutral-12 dark:text-white">
                  {user.twoFactorEnabled ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Organization memberships */}
          <Card className="mt-6 overflow-hidden p-0">
            <div className="border-b border-neutral-7 bg-neutral-2 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <h3 className="text-sm font-medium text-neutral-12 dark:text-white">
                Organizations ({memberships.totalCount})
              </h3>
            </div>
            {memberships.data.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-11 dark:text-white/70">
                Not a member of any organization.
              </div>
            ) : (
              <div className="divide-y divide-neutral-7 dark:divide-white/10">
                {memberships.data.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {membership.organization.imageUrl ? (
                        <img
                          src={membership.organization.imageUrl}
                          alt=""
                          className="h-8 w-8 rounded-md"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-3 text-xs font-medium text-neutral-11 dark:bg-white/10 dark:text-white/70">
                          {membership.organization.name[0]?.toUpperCase()}
                        </div>
                      )}
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
                      {membership.role.replace("org:", "")}
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

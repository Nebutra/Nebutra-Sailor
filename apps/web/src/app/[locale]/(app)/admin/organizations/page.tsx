import { AnimateIn } from "@nebutra/ui/components";
import { Card, EmptyState } from "@nebutra/ui/layout";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalAvatar } from "@/components/ui/external-avatar";
import { db } from "@/lib/db";

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

const PAGE_SIZE = 20;

async function OrgsListContent({ searchParams }: Props) {
  const { page: pageStr, q } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [orgs, totalCount] = await Promise.all([
    db.organization.findMany({
      take: PAGE_SIZE,
      skip: offset,
      orderBy: { createdAt: "desc" },
      ...(q ? { where: { name: { contains: q, mode: "insensitive" } } } : {}),
      include: {
        _count: { select: { members: true } },
      },
    }),
    db.organization.count({
      ...(q ? { where: { name: { contains: q, mode: "insensitive" } } } : {}),
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (orgs.length === 0) {
    return (
      <AnimateIn preset="fadeUp">
        <Card className="p-8">
          <EmptyState
            title={q ? "No organizations found" : "No organizations yet"}
            description={
              q ? `No results for "${q}".` : "Organizations will appear here as users create them."
            }
          />
        </Card>
      </AnimateIn>
    );
  }

  return (
    <>
      <AnimateIn preset="fadeUp">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-neutral-11 dark:text-white/70">
            {totalCount.toLocaleString()} organization{totalCount !== 1 ? "s" : ""} total
          </p>
          <form className="flex gap-2">
            <input
              type="search"
              name="q"
              placeholder="Search organizations..."
              defaultValue={q}
              className="rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-1.5 text-sm text-neutral-12 placeholder:text-neutral-10 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/50"
            />
            <button
              type="submit"
              className="rounded-lg bg-neutral-3 px-3 py-1.5 text-sm font-medium text-neutral-12 transition-colors hover:bg-neutral-4 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Search
            </button>
          </form>
        </div>
      </AnimateIn>

      <AnimateIn preset="fadeUp">
        <Card className="overflow-hidden p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-12 border-b border-neutral-7 bg-neutral-2 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-11 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              <div className="col-span-4">Organization</div>
              <div className="col-span-2">Members</div>
              <div className="col-span-2">Slug</div>
              <div className="col-span-3">Created</div>
              <div className="col-span-1" />
            </div>
            {orgs.map((org) => (
              <div
                key={org.id}
                className="grid grid-cols-12 items-center border-b border-neutral-7 px-4 py-3 text-sm last:border-b-0 dark:border-white/10"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <ExternalAvatar
                    src={undefined}
                    alt={org.name}
                    size={32}
                    className="h-8 w-8 rounded-md"
                    fallbackInitial={org.name[0]?.toUpperCase()}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-12 dark:text-white">
                      {org.name}
                    </p>
                    <p className="truncate text-xs text-neutral-10 dark:text-white/60">{org.id}</p>
                  </div>
                </div>
                <div className="col-span-2 text-neutral-11 dark:text-white/70">
                  {org._count.members ?? "—"}
                </div>
                <div className="col-span-2 truncate font-mono text-xs text-neutral-11 dark:text-white/70">
                  {org.slug}
                </div>
                <div className="col-span-3 text-neutral-11 dark:text-white/70">
                  {new Date(org.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-1 text-right">
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="text-sm font-medium text-blue-10 hover:text-blue-11 dark:text-cyan-9 dark:hover:text-cyan-10"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="block rounded-lg border border-neutral-7 bg-neutral-2 p-3 transition-colors hover:bg-neutral-3 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <ExternalAvatar
                    src={undefined}
                    alt={org.name}
                    size={32}
                    className="h-8 w-8 rounded-md"
                    fallbackInitial={org.name[0]?.toUpperCase()}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-12 dark:text-white">
                      {org.name}
                    </p>
                    <p className="truncate text-xs text-neutral-10 dark:text-white/60">
                      <span className="text-neutral-10 dark:text-white/60">
                        {org._count.members}
                      </span>
                      <span className="text-neutral-10 dark:text-white/60">
                        {org._count.members === 1 ? " member" : " members"}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </AnimateIn>

      {/* Pagination */}
      {totalPages > 1 && (
        <AnimateIn preset="fadeUp">
          <div className="mt-4 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/admin/organizations?page=${page - 1}${q ? `&q=${q}` : ""}`}
                className="rounded-lg border border-neutral-7 px-3 py-1.5 text-sm text-neutral-11 hover:bg-neutral-2 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-neutral-11 dark:text-white/70">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/admin/organizations?page=${page + 1}${q ? `&q=${q}` : ""}`}
                className="rounded-lg border border-neutral-7 px-3 py-1.5 text-sm text-neutral-11 hover:bg-neutral-2 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
              >
                Next
              </Link>
            )}
          </div>
        </AnimateIn>
      )}
    </>
  );
}

export default function AdminOrgsPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-xl border border-neutral-7 bg-neutral-2 dark:border-white/10 dark:bg-white/5" />
      }
    >
      <OrgsListContent {...props} />
    </Suspense>
  );
}

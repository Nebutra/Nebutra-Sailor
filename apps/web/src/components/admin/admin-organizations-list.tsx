"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  memberCount: number;
}

interface OrganizationsResponse {
  organizations: AdminOrganization[];
  total: number;
  page: number;
  pageSize: number;
}

interface AdminOrganizationsListProps {
  initialPage?: number;
  pageSize?: number;
}

const SEARCH_DEBOUNCE_MS = 300;

export function AdminOrganizationsList({
  initialPage = 1,
  pageSize = 20,
}: AdminOrganizationsListProps) {
  const [page, setPage] = useState(initialPage);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<OrganizationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      try {
        const response = await fetch(`/api/admin/organizations?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          if (!cancelled) {
            setError("Failed to load organizations.");
            setData(null);
          }
          return;
        }

        const body = (await response.json()) as OrganizationsResponse;
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled && (err as { name?: string })?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Failed to load organizations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, pageSize, debouncedSearch]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const showEmpty = !loading && !error && data && data.organizations.length === 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-11 dark:text-white/70">
          {data ? `${data.total.toLocaleString()} organization${data.total === 1 ? "" : "s"}` : "—"}
        </p>
        <input
          type="search"
          placeholder="Search organizations…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64 rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-1.5 text-sm text-neutral-12 placeholder:text-neutral-10 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/50"
          aria-label="Search organizations"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-[color:var(--status-danger)]/40 bg-[color:var(--status-danger)]/10 px-3 py-2 text-sm text-[color:var(--status-danger)]"
        >
          {error}
        </div>
      ) : null}

      {showEmpty ? (
        <div
          data-testid="admin-organizations-empty"
          className="rounded-lg border border-neutral-7 bg-neutral-2 p-8 text-center text-sm text-neutral-11 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
        >
          No organizations found.
        </div>
      ) : null}

      {data && data.organizations.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-neutral-7 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-neutral-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-11 dark:bg-white/5 dark:text-white/60">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Members</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-7 dark:divide-white/10">
              {data.organizations.map((org) => (
                <tr key={org.id} className="text-neutral-12 dark:text-white">
                  <td className="px-3 py-2 font-medium">{org.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-11 dark:text-white/70">
                    {org.slug}
                  </td>
                  <td className="px-3 py-2 text-neutral-11 dark:text-white/70">{org.plan}</td>
                  <td className="px-3 py-2 text-neutral-11 dark:text-white/70">
                    {org.memberCount}
                  </td>
                  <td className="px-3 py-2 text-neutral-11 dark:text-white/70">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="rounded-md border border-neutral-7 px-2.5 py-1 text-xs font-medium text-neutral-11 hover:bg-neutral-2 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && data.total > data.pageSize ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            aria-label="Previous page"
            className="rounded-md border border-neutral-7 px-3 py-1.5 text-sm text-neutral-11 hover:bg-neutral-2 disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-11 dark:text-white/70">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            aria-label="Next page"
            className="rounded-md border border-neutral-7 px-3 py-1.5 text-sm text-neutral-11 hover:bg-neutral-2 disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

export interface AdminUserSearchResult {
  id: string;
  name: string;
  email: string;
  organizationName?: string | null;
  emailVerified?: boolean | null;
}

export interface AdminOrganizationSearchResult {
  id: string;
  name: string;
  slug?: string | null;
  planName?: string | null;
}

interface AdminDirectoryPanelProps {
  query: string;
  page: number;
  users: AdminUserSearchResult[];
  organizations: AdminOrganizationSearchResult[];
  totalUsers: number;
  totalOrganizations: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

type DirectoryRow =
  | {
      kind: "user";
      id: string;
      label: string;
      meta: string;
      detail: string;
      editHref: string;
      emailVerified: boolean;
    }
  | {
      kind: "organization";
      id: string;
      label: string;
      meta: string;
      detail: string;
      editHref: string;
      slug: string;
      planName: string;
    };

function normalizePage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function normalizePageSize(pageSize: number): number {
  return Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE;
}

function buildAdminHref(query: string, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) params.set("q", trimmed);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(pageSize));
  const suffix = params.toString();
  return suffix ? `/admin?${suffix}` : "/admin";
}

export function AdminDirectoryPanel({
  query,
  page,
  users,
  organizations,
  totalUsers,
  totalOrganizations,
  pageSize = DEFAULT_PAGE_SIZE,
}: AdminDirectoryPanelProps) {
  const currentPage = normalizePage(page);
  const normalizedPageSize = normalizePageSize(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(totalUsers / normalizedPageSize),
    Math.ceil(totalOrganizations / normalizedPageSize),
  );
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <section className="mt-6 rounded-[var(--radius-3xl)] border border-border bg-background p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-medium text-sm text-muted-foreground uppercase tracking-[0.18em]">
            Directory
          </p>
          <h2 className="mt-2 font-semibold text-2xl text-foreground">Users and organizations</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            URL-backed admin lookup for support triage. Search by name, email, organization, or
            slug, then edit the record in place.
          </p>
        </div>

        {/* biome-ignore lint/a11y/useSemanticElements: React/jsdom still warn on the HTML search element in tests. */}
        <form action="/admin" role="search" className="flex w-full gap-2 lg:max-w-md">
          {normalizedPageSize !== DEFAULT_PAGE_SIZE ? (
            // hidden form data
            <input
              data-allow-native
              name="pageSize"
              type="hidden"
              value={String(normalizedPageSize)}
            />
          ) : null}
          <input
            data-allow-native
            aria-label="Search users and organizations"
            className="min-w-0 flex-1 rounded-[var(--radius-xl)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-[color:hsl(var(--primary))] /20"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Name, email, org, slug"
          />
          <button
            type="submit"
            className="rounded-[var(--radius-xl)] bg-[color:hsl(var(--primary))] px-4 py-2 font-medium text-[hsl(var(--background))] text-sm transition hover:opacity-90"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <DirectoryTable
          title="Users"
          empty="No users match this query."
          rows={users.map((user) => ({
            kind: "user",
            id: user.id,
            label: user.name,
            meta: user.email,
            detail: user.organizationName ?? "No organization",
            editHref: `/admin/users/${encodeURIComponent(user.id)}`,
            emailVerified: user.emailVerified ?? false,
          }))}
        />
        <DirectoryTable
          title="Organizations"
          empty="No organizations match this query."
          rows={organizations.map((organization) => ({
            kind: "organization",
            id: organization.id,
            label: organization.name,
            meta: organization.slug ? `/${organization.slug}` : organization.id,
            detail: organization.planName ?? "No plan",
            editHref: `/admin/organizations/${encodeURIComponent(organization.id)}`,
            slug: organization.slug ?? "",
            planName: organization.planName ?? "",
          }))}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Page {currentPage} of {totalPages} · {totalUsers} users · {totalOrganizations}{" "}
          organizations
        </p>
        <div className="flex gap-2">
          {hasPrevious ? (
            <Link
              href={buildAdminHref(query, currentPage - 1, normalizedPageSize)}
              className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-muted"
            >
              Previous page
            </Link>
          ) : null}
          {hasNext ? (
            <Link
              href={buildAdminHref(query, currentPage + 1, normalizedPageSize)}
              className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-muted"
            >
              Next page
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DirectoryTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: DirectoryRow[];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border">
      <div className="border-border border-b bg-muted px-4 py-3">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-muted-foreground text-sm">{empty}</p>
      ) : (
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row) => (
              <DirectoryTableRow key={`${row.kind}:${row.id}`} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DirectoryTableRow({ row }: { row: DirectoryRow }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleImpersonate() {
    if (row.kind !== "user") return;

    setImpersonating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: row.id }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to start impersonation.");
      }
      globalThis.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start impersonation.");
    } finally {
      setImpersonating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const body =
      row.kind === "user"
        ? {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            emailVerified: form.get("emailVerified") === "on",
          }
        : {
            name: String(form.get("name") ?? ""),
            slug: String(form.get("slug") ?? ""),
            plan: String(form.get("plan") ?? ""),
          };
    const endpoint =
      row.kind === "user"
        ? `/api/admin/users/${encodeURIComponent(row.id)}`
        : `/api/admin/organizations/${encodeURIComponent(row.id)}`;

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to save.");
      }
      setMessage(`Saved ${row.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <tr aria-label={row.label} className="border-border border-b">
        <td className="px-4 py-3">
          <p className="font-medium text-foreground text-sm">{row.label}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">{row.meta}</p>
        </td>
        <td className="hidden px-4 py-3 text-muted-foreground text-sm sm:table-cell">
          {row.detail}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            {row.kind === "user" ? (
              <button
                type="button"
                onClick={handleImpersonate}
                disabled={impersonating}
                className="rounded-[var(--radius-lg)] border border-[color:hsl(var(--primary))]/40 px-2.5 py-1.5 font-medium text-[color:hsl(var(--primary))] text-xs transition hover:bg-[color:hsl(var(--primary))]/10 disabled:opacity-50"
              >
                {impersonating ? "Starting…" : `Impersonate ${row.label}`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-[var(--radius-lg)] border border-border px-2.5 py-1.5 font-medium text-foreground text-xs transition hover:bg-muted"
            >
              Edit {row.label}
            </button>
          </div>
          <Link href={row.editHref} className="sr-only">
            Open {row.label}
          </Link>
        </td>
      </tr>
      {open ? (
        <tr className="border-border border-b bg-muted/60">
          <td colSpan={3} className="px-4 py-4">
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
              <label className="text-xs font-medium text-muted-foreground">
                {row.kind === "user" ? "User name" : "Organization name"}
                <input
                  data-allow-native
                  name="name"
                  defaultValue={row.label}
                  className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              {row.kind === "user" ? (
                <>
                  <label className="text-xs font-medium text-muted-foreground">
                    User email
                    <input
                      data-allow-native
                      name="email"
                      type="email"
                      defaultValue={row.meta}
                      className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-xs font-medium text-muted-foreground">
                    <input
                      data-allow-native
                      name="emailVerified"
                      type="checkbox"
                      defaultChecked={row.emailVerified}
                    />
                    Email verified
                  </label>
                </>
              ) : (
                <>
                  <label className="text-xs font-medium text-muted-foreground">
                    Organization slug
                    <input
                      data-allow-native
                      name="slug"
                      defaultValue={row.slug}
                      className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Plan
                    <input
                      data-allow-native
                      name="plan"
                      defaultValue={row.planName}
                      className="mt-1 w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                </>
              )}
              <div className="flex items-center gap-3 md:col-span-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-[var(--radius-lg)] bg-[color:hsl(var(--primary))] px-3 py-2 font-medium text-[hsl(var(--background))] text-sm disabled:opacity-50"
                >
                  {pending ? "Saving…" : row.kind === "user" ? "Save user" : "Save organization"}
                </button>
                {message ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    {message}
                  </p>
                ) : null}
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}

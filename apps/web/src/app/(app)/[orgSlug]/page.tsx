import { notFound, redirect } from "next/navigation";
import { buildServerRequest, requireAuth } from "@/lib/auth";
import { getOrganizationsForRequest } from "@/lib/organizations";
import { resolveTenantSlug } from "@/lib/tenant-path";

/**
 * `/<workspace-slug>` — the address the onboarding step has always shown and
 * the product has never had.
 *
 * Until now the slug was decoration: org switcher, select-org list, a PostHog
 * property. `<app host>/<slug>` returned 404 while the field underneath
 * the input promised it. This is the first route that treats the slug as an
 * address.
 *
 * A static segment always wins over a dynamic one in Next's router, so
 * /dashboard, /settings and the other seventeen still resolve to themselves.
 * Only a first segment that matches no route reaches here, which is why
 * RESERVED_SLUGS exists: a workspace that claimed "settings" could not be
 * reached, and worse, would look like it had been.
 *
 * Resolution is against the caller's own memberships. A slug belonging to a
 * workspace they are not in is indistinguishable from one that does not exist
 * — both 404 — so this page cannot be used to probe for workspace names.
 */
export default async function TenantEntryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  await requireAuth();

  const { orgSlug } = await params;
  const organizations = await getOrganizationsForRequest(await buildServerRequest());

  const tenant = resolveTenantSlug(orgSlug, organizations ?? []);
  if (!tenant) notFound();

  // The cookie switch has to happen in a Route Handler; a Server Component
  // cannot write one. Membership is checked again there, so this redirect
  // carries no authority of its own.
  redirect(`/api/tenant/enter?org=${encodeURIComponent(tenant.id)}&next=/dashboard`);
}

#!/usr/bin/env tsx

/**
 * Provisions everything Cloudflare-side that admin.nebutra.com needs, in the
 * one order that is safe.
 *
 * THE ORDER IS THE POINT. The Access application and its policy are created
 * BEFORE the DNS record. Reversed, there is a window — however short — where
 * admin.nebutra.com resolves to an origin that can read across every tenant
 * with nothing in front of it. This script refuses to create the DNS record if
 * the Access policy did not land.
 *
 * Requires a token with:
 *   Zone   -> DNS -> Edit                    (scoped to nebutra.com)
 *   Account -> Access: Apps and Policies -> Edit
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... npx tsx scripts/provision-admin-access.ts --dry-run
 *   CLOUDFLARE_API_TOKEN=... ALLOWED_EMAIL_DOMAIN=nebutra.com npx tsx scripts/provision-admin-access.ts
 */

const API = "https://api.cloudflare.com/client/v4";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const HOSTNAME = process.env.ADMIN_HOSTNAME ?? "admin.nebutra.com";
const ZONE_NAME = process.env.ZONE_NAME ?? "nebutra.com";
const ORIGIN_IP = process.env.ECS_HOST ?? "106.15.4.31";
const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "";
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DRY_RUN = process.argv.includes("--dry-run");

if (!TOKEN) {
  process.stderr.write(
    "CLOUDFLARE_API_TOKEN is not set.\n" +
      "Create one at https://dash.cloudflare.com/profile/api-tokens (Create Custom Token) with:\n" +
      "  Zone    -> DNS -> Edit                          (Zone Resources: Include -> Specific zone -> nebutra.com)\n" +
      "  Account -> Access: Apps and Policies -> Edit\n",
  );
  process.exit(1);
}

if (!ALLOWED_EMAIL_DOMAIN && ALLOWED_EMAILS.length === 0) {
  process.stderr.write(
    "Refusing to create an Access policy with no rule.\n" +
      "Set ALLOWED_EMAIL_DOMAIN=example.com (everyone with that email domain) or\n" +
      "ALLOWED_EMAILS=a@x.com,b@x.com (an explicit list). A policy that admits\n" +
      "everyone is worse than no policy, because it looks like protection.\n",
  );
  process.exit(1);
}

type CfResponse<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
};

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as CfResponse<T>;
  if (!body.success) {
    const detail = body.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") ?? res.statusText;
    throw new Error(`${init?.method ?? "GET"} ${path} failed — ${detail}`);
  }
  return body.result;
}

async function main() {
  // ── Discover the zone and account from the token itself ───────────────────
  const zones = await cf<
    Array<{ id: string; name: string; account: { id: string; name: string } }>
  >(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  const zone = zones[0];
  if (!zone) throw new Error(`Zone ${ZONE_NAME} is not visible to this token.`);
  const accountId = zone.account.id;

  process.stdout.write(
    `zone    ${zone.name} (${zone.id})\naccount ${zone.account.name} (${accountId})\n\n`,
  );

  const include = ALLOWED_EMAILS.length
    ? ALLOWED_EMAILS.map((email) => ({ email: { email } }))
    : [{ email_domain: { domain: ALLOWED_EMAIL_DOMAIN } }];

  const appPayload = {
    name: "Nebutra Admin (control plane)",
    domain: HOSTNAME,
    type: "self_hosted",
    session_duration: "8h",
    // The control plane is staff-only; there is no anonymous surface to expose.
    allowed_idps: [],
    auto_redirect_to_identity: false,
    // Protect /api/* too. The default covers the whole host, but state it so a
    // later edit cannot quietly narrow the app to the HTML routes.
    path_cookie_attribute: false,
  };

  const policyPayload = {
    name: "Staff only",
    decision: "allow",
    include,
    // Everything else is denied by virtue of not being included; Access is
    // allow-listing, not filtering.
    precedence: 1,
  };

  if (DRY_RUN) {
    process.stdout.write(
      `would create Access application:\n${JSON.stringify(appPayload, null, 2)}\n\n` +
        `would create policy:\n${JSON.stringify(policyPayload, null, 2)}\n\n` +
        `would then create DNS A ${HOSTNAME} -> ${ORIGIN_IP} (proxied)\n`,
    );
    return;
  }

  // ── 1. Access application ─────────────────────────────────────────────────
  const existingApps = await cf<Array<{ id: string; domain: string }>>(
    `/accounts/${accountId}/access/apps`,
  );
  const existingApp = existingApps.find((a) => a.domain === HOSTNAME);

  const app = existingApp
    ? await cf<{ id: string }>(`/accounts/${accountId}/access/apps/${existingApp.id}`, {
        method: "PUT",
        body: JSON.stringify(appPayload),
      })
    : await cf<{ id: string }>(`/accounts/${accountId}/access/apps`, {
        method: "POST",
        body: JSON.stringify(appPayload),
      });
  process.stdout.write(`${existingApp ? "updated" : "created"} Access app ${app.id}\n`);

  // ── 2. Policy ─────────────────────────────────────────────────────────────
  const existingPolicies = await cf<Array<{ id: string; name: string }>>(
    `/accounts/${accountId}/access/apps/${app.id}/policies`,
  );
  const existingPolicy = existingPolicies.find((p) => p.name === policyPayload.name);

  const policy = existingPolicy
    ? await cf<{ id: string }>(
        `/accounts/${accountId}/access/apps/${app.id}/policies/${existingPolicy.id}`,
        { method: "PUT", body: JSON.stringify(policyPayload) },
      )
    : await cf<{ id: string }>(`/accounts/${accountId}/access/apps/${app.id}/policies`, {
        method: "POST",
        body: JSON.stringify(policyPayload),
      });
  process.stdout.write(`${existingPolicy ? "updated" : "created"} policy ${policy.id}\n`);

  // ── 3. Verify the gate is real BEFORE opening the door ────────────────────
  const check = await cf<Array<{ id: string }>>(
    `/accounts/${accountId}/access/apps/${app.id}/policies`,
  );
  if (check.length === 0) {
    throw new Error("Access app has no policies after provisioning. Refusing to create DNS.");
  }

  // ── 4. DNS, last ──────────────────────────────────────────────────────────
  const label = HOSTNAME.replace(`.${ZONE_NAME}`, "");
  const existingRecords = await cf<Array<{ id: string; name: string }>>(
    `/zones/${zone.id}/dns_records?name=${encodeURIComponent(HOSTNAME)}`,
  );
  const recordPayload = {
    type: "A",
    name: label,
    content: ORIGIN_IP,
    proxied: true,
    comment: "Ecosystem control plane. Gated by Cloudflare Access — do not unproxy.",
  };

  const record = existingRecords[0]
    ? await cf<{ id: string }>(`/zones/${zone.id}/dns_records/${existingRecords[0].id}`, {
        method: "PUT",
        body: JSON.stringify(recordPayload),
      })
    : await cf<{ id: string }>(`/zones/${zone.id}/dns_records`, {
        method: "POST",
        body: JSON.stringify(recordPayload),
      });

  process.stdout.write(
    `${existingRecords[0] ? "updated" : "created"} DNS A ${HOSTNAME} -> ${ORIGIN_IP} (${record.id})\n\n` +
      `Access policy is in front. Verify by loading https://${HOSTNAME} in a private window —\n` +
      `you must be challenged before anything renders.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

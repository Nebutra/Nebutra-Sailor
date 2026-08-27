# Retool Recipe — the CS/ops console you don't need to build

> **TL;DR:** Sailor deliberately does not ship a user-management UI. Drag-and-drop one in Retool in 30 minutes, wire it to `@nebutra/admin-tooling`'s audited REST endpoints, and you've built the same internal CS console that Stripe, Linear, Brex, and Mercury use — without the 2–3 eng-months of maintenance. Free for ≤5 users.

See also: [`README.md`](./README.md) for why we offload this layer, [`metabase-setup.md`](./metabase-setup.md) for the BI side.

---

## The 30-minute build

This recipe gets you a working "find user → view subscription → refund with audit reason" console in half an hour. Total cost on free tier: $0.

| Step | Time | What you do |
|---|---|---|
| 1 | 2 min | Sign up at retool.com (free for ≤5 users) |
| 2 | 5 min | Connect Postgres resource (READ) and REST API resource (WRITE) |
| 3 | 3 min | Confirm the `/api/admin/tools/*` contract is enabled |
| 4 | 5 min | Build "Find user" page (Table component + query) |
| 5 | 10 min | Build "Refund subscription" with confirm modal + audit reason |
| 6 | 5 min | Wire SSO with Google Workspace, restrict to your domain |

---

## Step 1 — Sign up

Go to https://retool.com and create an account. The free tier covers up to **5 users** and unlimited apps; that's enough for a founding team + first ops hire. Paid tier starts at roughly $10/user/mo (Team) and goes up to ~$50/user/mo (Business with SSO/audit) — check the current pricing page before committing.

Create a new workspace for your company.

---

## Step 2 — Connect your resources

Retool talks to data via **Resources**. You will create three.

### Resource A — Postgres READ (`READONLY_DATABASE_URL`)

**Resources → Create new → PostgreSQL.**

| Field | Value |
|---|---|
| Name | `app-postgres-readonly` |
| Host | (from `READONLY_DATABASE_URL`) |
| Port | 5432 |
| Database | (from URL) |
| Username | `metabase_ro` (reuse the same read-only role from Metabase) |
| Password | (from URL) |
| SSL | Required |

This resource is for **reads only**. Use it to list users, look up subscriptions, browse audit logs.

### Resource B — REST API for writes (recommended)

**Do not** create a write-capable Postgres resource. Direct DB writes from Retool bypass `@nebutra/audit`, `@nebutra/permissions`, business validation, and Stripe webhooks. That is a SOC 2 fail and a footgun.

Instead:

**Resources → Create new → REST API.**

| Field | Value |
|---|---|
| Name | `app-admin-tools` |
| Base URL | `https://your-app.com/api/admin/tools` |
| Headers | `Authorization: Bearer {{ retoolContext.user.email }}` (or service token) |
| Auth | Custom auth — exchange Retool's SSO identity for a short-lived admin token |

The `/api/admin/tools/*` endpoints are the contract that `@nebutra/admin-tooling` exposes. Each one goes through `withAuditHook()` and `requirePermission()`. Retool calls these endpoints; your server enforces the rules.

### Resource C (optional) — Postgres WRITE for emergency overrides

Sometimes you genuinely need raw SQL to fix data (a botched migration, a duplicate row). Create a *separate* resource `app-postgres-write` pointing at `DATABASE_URL`, restrict it to admins only via Retool's resource permissions, and require a Slack approval before use. Treat it as a break-glass tool.

---

## Step 3 — The `@nebutra/admin-tooling` contract

Every write from Retool should hit one of these endpoints. The package wraps each in audit + permission + Zod validation:

```ts
// packages/ops/admin-tooling — sketch
import { withAuditHook } from "@nebutra/audit";
import { requirePermission } from "@nebutra/permissions";
import { z } from "zod";

const RefundInput = z.object({
  subscriptionId: z.string(),
  amountCents: z.number().int().positive(),
  reason: z.string().min(20, "Audit requires a reason >= 20 chars"),
});

export const refundSubscription = withAuditHook({
  action: "subscription.refund",
  permission: requirePermission("refund", "Subscription"),
  schema: RefundInput,
  handler: async (input, ctx) => {
    // call @nebutra/billing
    return billing.refund(input.subscriptionId, input.amountCents);
  },
});
```

When the endpoint runs it writes an `audit_log` row with the actor email, action, input, before/after state, and reason. This is non-negotiable for SOC 2.

---

## Step 4 — Build "Find user" in 5 minutes

1. **Create app** → name it "User Admin".
2. **Drag a Text Input** onto the canvas. Label it "Email or user ID". Component name: `searchInput`.
3. **Queries panel → New query → app-postgres-readonly:**
   ```sql
   SELECT id, email, name, plan, created_at, last_login_at
   FROM users
   WHERE email ILIKE {{ '%' + searchInput.value + '%' }}
      OR id::text = {{ searchInput.value }}
   ORDER BY created_at DESC
   LIMIT 50;
   ```
   Name it `findUsers`. Set run mode: "Manually" (not on page load).
4. **Drag a Button** → label "Search" → on-click: trigger `findUsers`.
5. **Drag a Table** component → data source: `{{ findUsers.data }}`. Auto-detects columns.
6. **Hit Save**, click Preview, type an email, click Search.

You now have a fully functional user lookup that took ~5 minutes. The equivalent Next.js page would take a day to build, test, secure, and style.

---

## Step 5 — Build "Refund subscription" with audit-required reason

This is the canonical pattern: a *destructive write* gated by a confirm modal and a free-text audit reason.

1. **Add a Modal component** → name it `refundModal`. Default hidden.
2. **Inside the modal, add:**
   - Text component showing selected user: `User: {{ table1.selectedRow.email }}`
   - Number Input → label "Refund amount (USD)", name `refundAmount`.
   - Text Area → label "Reason (required, min 20 chars)", name `refundReason`.
   - Button → label "Confirm refund" → name `confirmRefundBtn`. Set `disabled` to:
     ```js
     {{ refundReason.value.length < 20 || !refundAmount.value }}
     ```
3. **Queries panel → New query → app-admin-tools (REST):**
   - Method: `POST`
   - URL: `/refund-subscription`
   - Body (JSON):
     ```json
     {
       "subscriptionId": "{{ table1.selectedRow.subscription_id }}",
       "amountCents": {{ refundAmount.value * 100 }},
       "reason": "{{ refundReason.value }}"
     }
     ```
   - Name: `refundSubscription`.
   - On success: trigger `findUsers` (refresh table) + close modal + show success toast.
   - On failure: show error toast with `{{ refundSubscription.error.message }}`.
4. **Wire `confirmRefundBtn` on-click → trigger `refundSubscription`.**
5. **Back on the main page, add a Button** above the table → label "Refund selected" → on-click: open `refundModal`. Disable if no row selected.

That's the full flow. Server-side, `@nebutra/admin-tooling`'s `refundSubscription` handler:

- Validates input with Zod (reject if reason < 20 chars — defense in depth, the UI is not the auth boundary).
- Checks `requirePermission("refund", "Subscription")` against the calling user.
- Writes an `audit_log` row.
- Calls `@nebutra/billing` to actually process the refund.
- Returns the new subscription state.

If the agent forgot the reason or the permission check fails, the API returns 400/403 and Retool shows the error toast. No bad writes possible.

---

## Step 6 — SSO + domain restriction

1. **Retool settings → SSO → Google Workspace** (or Okta / SAML).
2. **Restrict to your domain** — only `@yourcompany.com` emails can log in.
3. **Groups → create "Admins" group** → assign your real admins.
4. **App permissions → User Admin app → restrict to "Admins" group.**

Anyone outside the group cannot even see the app exists. Combined with the server-side `requirePermission()` checks, you have two independent gates.

---

## Step 7 — When to graduate from Retool

| Trigger | Next tool |
|---|---|
| You have >200 internal users on Retool and the per-seat cost stings | Self-host **Appsmith** (free OSS) or **ToolJet** |
| You need a fully white-labeled customer-facing internal tool | **Internal.io** or **Forest Admin** |
| You need source-controlled, code-first internal apps | **UI Bakery** or self-built Next.js + `@nebutra/admin-tooling` |
| You want React-native customizations Retool can't express | Build the specific screen inside `apps/web/app/admin/*` — but only that one screen |

Most companies never hit any of these. Stripe, Linear, Brex, and Mercury have all stayed on Retool through hundreds of internal users.

---

## Cost math

| Setup | Year-1 cost | Year-2 cost | Reality |
|---|---|---|---|
| Retool, 10-person CS/ops team, Team tier | ~$10/user × 10 × 12 = **$1.2k/yr** | $1.2k/yr | Drag-and-drop changes in minutes; ops team self-serves new screens. |
| Retool, 10-person team, Business tier (SSO + audit) | ~$50/user × 10 × 12 = **$6k/yr** | $6k/yr | Same as above + SAML SSO, advanced audit. |
| Self-built Next.js admin (equivalent surface area) | **2–3 eng-months** upfront ≈ $40k–$80k + ~10% of one engineer ongoing | ~$15k/yr maintenance | Every CS request is a Jira ticket and a deploy; ops blocked on eng. |

Retool wins on cost, time-to-value, and *opportunity cost* of those eng-months. Spend them on the actual product.

---

## Security checklist

- [ ] All writes go through `/api/admin/tools/*` REST endpoints, never direct Postgres write.
- [ ] Every endpoint wrapped in `withAuditHook()` + `requirePermission()` + Zod validation.
- [ ] Reason field required and validated server-side (≥20 chars) for any destructive write.
- [ ] SSO enforced, domain-restricted.
- [ ] App-level permissions match endpoint-level permissions (defense in depth).
- [ ] No PII (raw passwords, full SSN, full card numbers) exposed in tables — mask at the SQL view layer.
- [ ] Retool resource credentials stored in Retool's secrets, not hardcoded in queries.
- [ ] Audit log dashboard pinned for compliance review (Retool can render it from `audit_log` directly).
- [ ] Break-glass write Postgres resource (if used) restricted to ≤3 people and requires Slack approval before use.

---

## Who else does this

| Company | Public reference |
|---|---|
| Stripe | One of the largest known Retool deployments; widely discussed in eng conf talks |
| Linear | Publicly states Retool is the internal ops tool |
| Brex | Retool case study on retool.com |
| Mercury | Retool case study on retool.com |
| DoorDash | Retool case study |
| Vercel | Mix of Retool + custom Next.js admin |

The pattern is universal. Save your eng-months for the product.

---

## Anti-patterns

- Don't connect Retool directly to `DATABASE_URL` for writes. Audit + permissions are skipped, SOC 2 fails.
- Don't reuse one giant Retool app for everything. Per-team apps with per-team permissions scale better.
- Don't grant "Editor" access to non-engineers; they will tweak production queries by accident. Use "Use Only" / "View Only" + a separate dev workspace.
- Don't skip the reason field on destructive writes. Future-you (under SOC 2 audit) will be very sad.
- Don't migrate to a custom Next.js admin until you've actually hit a wall in Retool. Most teams never do.

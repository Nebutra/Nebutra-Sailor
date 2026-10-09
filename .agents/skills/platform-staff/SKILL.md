---
name: platform-staff
description: Check, grant or revoke platform staff access (who may operate the platform itself: owner, operator, support, readonly) through the nebutra CLI or the nebutra MCP tools. Use when asked "who has admin access", to give someone platform/admin/staff access, to take it away, to rotate an on-call, or to hand over ownership. Not for tenant or organization members, and never by editing the database directly.
---

# Platform staff, from the agent

Platform staff are the people who can operate the whole platform (read across
tenants, suspend, replay, grant). That is separate from a customer's workspace
roles: a tenant owner has no standing here. One gateway endpoint owns the rules;
the CLI and the MCP tools are both thin clients of it. Do not query or update
`platform_staff` with SQL: it skips the rules and the audit entry.

## Roles (least to most)

`platform_readonly` (dashboards) < `platform_support` (tenant lookup,
impersonation, invites) < `platform_operator` (supply, queues, tenant
suspension) < `platform_owner` (also grants and revokes staff).

## Read first, always

```bash
nebutra admin staff whoami --json    # your own standing, canGrant / canRevoke
nebutra admin staff list --json      # every grant, revoked ones included
```

MCP: `staff_list`. Emails are masked in the output; you name people by the
email you were given. Not logged in or not staff gives exit code 4 (403/401);
run `nebutra login` for the first.

## Changing access (needs a platform owner session and the person's yes)

1. Say the exact change to the person in one line: who, which role, why.
2. Get an explicit yes. Do not infer consent from the original request being
   vague ("give Sam access" does not say which role).
3. Run it with a real reason in the note (ticket, rotation, handover):

```bash
nebutra admin staff grant sam@example.com --role operator --note "on-call rota Oct" --yes --json
nebutra admin staff revoke sam@example.com --note "left the team" --yes --json
```

MCP: `staff_grant` / `staff_revoke` with `confirm: true`. Without `confirm: true`
the tool does nothing; never set it before the person agreed.

`--yes` is never implied: piped and agent runs do not confirm for you. Pass it
only after step 2.

Both return an `auditId`. Report it back; it is the receipt.

## Rules the system enforces (do not try to work around them)

- Only an active `platform_owner` grants or revokes. Anyone else gets 403.
- Nobody grants themselves a role (`self_grant`), and nobody grants a role above
  their own (`escalation`). If asked to "make me owner", the answer is that
  another owner has to do it.
- The last active owner can be neither revoked nor demoted (`last_owner`, 409).
  To hand over: grant the new owner first, then revoke or demote the old one.
- Revoking is a tombstone, not a delete: the row stays with `revokedAt` and the
  note. Re-granting a revoked person clears it and records a new grantor.
- The person needs a Nebutra account already (`no_such_user` 404 otherwise).
  Ask them to sign up; do not create accounts to get around it.
- A failed or refused attempt is audited too. A retry loop is visible.

## When it fails

Read the `code` in the error (`--json` or the MCP text), say what it means in
one sentence, and stop. Do not retry with a different role or another
identity to get past a guard.

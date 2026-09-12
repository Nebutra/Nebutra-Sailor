# Admin: sign in through auth.nebutra.com via SSO OIDC, keep host-only session + PlatformStaff

## Goal

Owner decision 2026-09-08: one identity, not one cookie. Finish sso.nebutra.com login interaction against the auth.nebutra.com session, point admin's genericOAuth at it, issue admin's own host-only session, keep PlatformStaff authorisation. Cloudflare Access stays as outer door until SSO path is stable. Never accept the shared .nebutra.com tenant cookie in admin.

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

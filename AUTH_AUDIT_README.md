# Nebutra-Sailor Auth Coupling Audit

This directory contains a comprehensive READ-ONLY audit of Clerk authentication coupling in the Nebutra-Sailor codebase.

## Documents

### 1. CLERK_AUDIT_SUMMARY.txt (Quick Read - 7.8 KB)
**Best for:** Planning meetings, quick reference, executive overview
- Critical findings
- Coupling by component
- Files requiring refactoring
- Recommended phases and effort estimates

### 2. CLERK_AUDIT_REPORT.md (Detailed Reference - 20 KB)
**Best for:** Refactoring planning, developer reference, architectural decisions
- Complete @nebutra/auth package structure
- All 31+ Clerk-coupled files with code examples
- API Gateway JWT verification and webhook handling
- Data flow diagrams
- Environment variables and configuration
- Complete refactoring roadmap

## Quick Facts

**Coupling Level:** TIGHT (31+ files)
**Abstraction Status:** Incomplete (Phase 1 only)
**Effort to Migrate:** 40-60 developer-days
**Critical Path:** 2 weeks minimum

**3 Core Components to Refactor:**
1. `apps/web/src/proxy.ts` — Middleware
2. `apps/web/src/lib/auth.ts` — Session helpers
3. `apps/api-gateway/src/middlewares/tenantContext.ts` — JWT verification

## How to Use This Audit

### For Architecture Review
1. Read CLERK_AUDIT_SUMMARY.txt first (5 min)
2. Review "Critical Findings" section
3. Check component coupling table for impact assessment

### For Refactoring Planning
1. Read CLERK_AUDIT_SUMMARY.txt (5 min)
2. Review "Files Requiring Refactoring" section
3. Open CLERK_AUDIT_REPORT.md for specific file details
4. Follow refactoring phases section

### For Implementation Details
1. Open CLERK_AUDIT_REPORT.md
2. Search for specific file (e.g., "sign-in-form.tsx")
3. Review code examples and Clerk API calls
4. Check "Refactoring Roadmap" section for guidance

## Key Insights

### What Works
- @nebutra/auth package has good interface design
- Better Auth provider implementation serves as working reference
- API Gateway has proper JWT verification pattern
- Database schema supports multi-provider sync

### What Needs Work
- Web app ignores @nebutra/auth abstraction
- Client-side hooks not implemented (stubs only)
- Clerk UI components need custom replacements
- Middleware hard-coded to Clerk

### Migration Strategy
1. Implement @nebutra/auth/client hooks
2. Create provider-agnostic wrappers for Clerk APIs
3. Replace Clerk UI components with custom versions
4. Update API Gateway JWT verification
5. Implement webhook dispatcher for multiple providers

## Environment Variables

### Required in Production
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  (web app)
CLERK_SECRET_KEY                   (web app + api-gateway)
CLERK_WEBHOOK_SECRET               (api-gateway)
```

### CSP Requirements
Hardcoded Clerk domains in proxy.ts:
- `https://clerk.accounts.dev`
- `https://api.clerk.com`
- `https://img.clerk.com`

## Clerk Features in Use

- Organizations (multi-tenant)
- Roles (org:owner, org:admin, org:member, org:viewer)
- Custom session claims (org_plan)
- OAuth (Google + GitHub)
- Email verification
- Webhooks (via Svix)

## Next Steps

1. **Immediate:** Document current Clerk configuration
2. **Before refactoring:** Create integration tests for auth flows
3. **Dev environment:** Set up feature flags for provider switching
4. **Staging:** Test other providers before production migration

## Questions?

- Refer to CLERK_AUDIT_REPORT.md for detailed code examples
- Check file-specific sections for API usage patterns
- Review refactoring phases for implementation guidance

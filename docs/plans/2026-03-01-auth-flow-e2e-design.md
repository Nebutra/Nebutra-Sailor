# Auth Flow End-to-End Design

**Date:** 2026-03-01
**Status:** Approved
**Extends:** 2026-02-28-auth-onboarding-design.md

---

## Goal

Replace Clerk's built-in `<SignIn />` / `<SignUp />` components with fully custom forms using `useSignIn` / `useSignUp` hooks, add shared OAuth buttons, and wire the web-to-API-gateway JWT token flow so the entire auth chain works end-to-end.

---

## Already Built (no changes)

- `ClerkProvider` in root layout, `clerkMiddleware` protecting routes
- `(auth)/layout.tsx` (no Header), `(app)/layout.tsx` (with Header + UserButton)
- `AuthBanner` + `AuthSplitLayout` (40/60 split)
- Onboarding wizard (create workspace + connect integrations)
- `select-org` page with `<OrganizationList />`
- Auth helpers: `getAuth`, `requireAuth`, `requireOrg`, `getTenantContext`
- API gateway: Clerk JWT verification in `tenantContext.ts`
- Clerk/Stripe webhooks + Inngest background sync
- DB schema: User, Organization, OrganizationMember with `clerkId`

---

## Components to Build

### 1. `oauth-buttons.tsx`

Shared Google + GitHub OAuth row. Uses `useSignIn().signIn.authenticateWithRedirect` / `useSignUp().signUp.authenticateWithRedirect`.

Props: `mode: "signIn" | "signUp"` to select correct hook.

Layout: two full-width outline buttons stacked vertically, Google icon + GitHub icon.

### 2. `sign-in-form.tsx`

Custom sign-in form using `useSignIn()` hook from `@clerk/nextjs`.

State machine: `idle` → `submitting` → `complete` | `error`

```
"Log in to Nebutra"
"Welcome back"

[Google OAuth]
[GitHub OAuth]

────── Or continue with ──────

Email          [______________]
Password       [______________]
               Forgot password?

[  Log in  ]

New to Nebutra? Sign up →
```

On complete → `router.push("/")` (triggers `clerkMiddleware` → dashboard).

Error handling: inline below fields. Network errors: inline banner at top.

### 3. `sign-up-form.tsx`

Custom sign-up form using `useSignUp()` hook.

Two phases:

**Phase A — Details:**

```
"Create your account"
"Start building today"

[Google OAuth]
[GitHub OAuth]

────── Or continue with ──────

First name    [________]
Last name     [________]
Email         [________________]
Password      [________________]

[  Create account  ]

Already have an account? Sign in →
```

**Phase B — Email OTP verification:**

```
"Check your email"
"We sent a 6-digit code to {email}"

[_][_][_][_][_][_]

[  Verify  ]
Didn't receive it? Resend code
```

On verification complete → `router.push("/onboarding")`.

### 4. Page updates

- `sign-in/page.tsx`: swap `<SignIn />` → `<SignInForm />`
- `sign-up/page.tsx`: swap `<SignUp />` → `<SignUpForm />`
- Remove duplicated `clerkAppearance` config from both pages (no longer needed)

### 5. `lib/api.ts` — Auto-inject JWT

Add two helpers:

**Server-side** (`getAuthenticatedApi`):

```typescript
import { auth } from "@clerk/nextjs/server";

export async function getAuthenticatedApi() {
  const { getToken } = await auth();
  const token = await getToken();
  return {
    get: (endpoint, opts) =>
      api.get(endpoint, { ...opts, token: token ?? undefined }),
    post: (endpoint, body, opts) =>
      api.post(endpoint, body, { ...opts, token: token ?? undefined }),
    // ... put, patch, delete
  };
}
```

**Client-side** (`useApi` hook):

```typescript
import { useAuth } from "@clerk/nextjs";

export function useApi() {
  const { getToken } = useAuth();

  async function authedRequest(endpoint, options) {
    const token = await getToken();
    return request(endpoint, { ...options, token: token ?? undefined });
  }

  return {
    get: (endpoint, opts) =>
      authedRequest(endpoint, { ...opts, method: "GET" }),
    post: (endpoint, body, opts) =>
      authedRequest(endpoint, { ...opts, method: "POST", body }),
    // ... put, patch, delete
  };
}
```

### 6. `.env.example` update

Add `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding` as documentation.

---

## Files

| Action | File                                                      |
| ------ | --------------------------------------------------------- |
| CREATE | `apps/web/src/components/auth/oauth-buttons.tsx`          |
| CREATE | `apps/web/src/components/auth/sign-in-form.tsx`           |
| CREATE | `apps/web/src/components/auth/sign-up-form.tsx`           |
| MODIFY | `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` |
| MODIFY | `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` |
| MODIFY | `apps/web/src/lib/api.ts`                                 |
| MODIFY | `apps/web/.env.example`                                   |

---

## End-to-End Flow

```
Landing → /sign-up → SignUpForm (email+pass OR OAuth)
                           ↓
                    OTP email verification
                           ↓
         Clerk webhook → User synced to DB
                           ↓
                    /onboarding → create workspace
                           ↓
         Clerk webhook → Organization synced to DB
                           ↓
                    /dashboard (authenticated)
                           ↓
         API calls → useApi()/getAuthenticatedApi() auto-injects JWT
                           ↓
         api-gateway → verifyToken → TenantContext → response
```

---

## Error Handling

| Scenario            | Behavior                              |
| ------------------- | ------------------------------------- |
| Wrong password      | Inline error below password field     |
| Email already taken | Inline error below email field        |
| OAuth window closed | Inline banner: "Sign in cancelled"    |
| Network error       | Inline banner: "Something went wrong" |
| Invalid OTP         | Inline error below OTP input          |
| API gateway 401     | `useApi` throws `ApiError(401)`       |

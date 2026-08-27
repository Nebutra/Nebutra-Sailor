# Auth Flow E2E Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Clerk built-in auth components with custom forms (useSignIn/useSignUp hooks), add OAuth buttons, wire JWT auto-injection for web→api-gateway calls.

**Architecture:** Custom React forms using Clerk hooks for full design control. OAuth via `authenticateWithRedirect`. JWT auto-injection via server-side `getAuthenticatedApi()` and client-side `useApi()` hook wrapping existing `api` client.

**Tech Stack:** @clerk/nextjs v6, React 19, Next.js App Router, @nebutra/ui primitives (Button, Input, Label, Separator)

---

### Task 1: OAuth Buttons Component

**Files:**

- Create: `apps/web/src/components/auth/oauth-buttons.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { Button } from "@nebutra/ui/primitives";

interface OAuthButtonsProps {
  mode: "signIn" | "signUp";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.572C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function OAuthButtons({ mode }: OAuthButtonsProps) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
    const provider = mode === "signIn" ? signIn : signUp;
    if (!provider) return;

    setLoadingProvider(strategy);
    try {
      await provider.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: mode === "signIn" ? "/" : "/onboarding",
      });
    } catch {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2"
        disabled={loadingProvider !== null}
        onClick={() => handleOAuth("oauth_google")}
      >
        <GoogleIcon />
        {loadingProvider === "oauth_google"
          ? "Redirecting…"
          : "Continue with Google"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2"
        disabled={loadingProvider !== null}
        onClick={() => handleOAuth("oauth_github")}
      >
        <GitHubIcon />
        {loadingProvider === "oauth_github"
          ? "Redirecting…"
          : "Continue with GitHub"}
      </Button>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep oauth-buttons || echo "OK"`

Expected: no errors referencing oauth-buttons (file isn't imported yet, so it won't be checked unless we see it).

**Step 3: Commit**

```
git add apps/web/src/components/auth/oauth-buttons.tsx
git commit -m "feat(web): add oauth buttons component for google + github"
```

---

### Task 2: Sign-In Form

**Files:**

- Create: `apps/web/src/components/auth/sign-in-form.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@nebutra/ui/primitives";
import { Input } from "@nebutra/ui/primitives";
import { Label } from "@nebutra/ui/primitives";
import { Separator } from "@nebutra/ui/primitives";
import { OAuthButtons } from "./oauth-buttons";

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn || !setActive) return;

    setLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Log in to Nebutra
        </h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back</p>
      </div>

      <OAuthButtons mode="signIn" />

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
          Or continue with
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/sign-in#/forgot-password"
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !isLoaded}
        >
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        New to Nebutra?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```
git add apps/web/src/components/auth/sign-in-form.tsx
git commit -m "feat(web): add custom sign-in form with clerk usesignin hook"
```

---

### Task 3: Sign-Up Form with OTP Verification

**Files:**

- Create: `apps/web/src/components/auth/sign-up-form.tsx`

**Step 1: Create the component**

This component has two phases: the registration form and the OTP verification step.

```tsx
"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@nebutra/ui/primitives";
import { Input } from "@nebutra/ui/primitives";
import { Label } from "@nebutra/ui/primitives";
import { Separator } from "@nebutra/ui/primitives";
import { OAuthButtons } from "./oauth-buttons";

type Phase = "details" | "verify";

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setLoading(true);
    setError("");

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPhase("verify");
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp || !setActive) return;

    setLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!isLoaded || !signUp) return;

    setError("");
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  }

  if (phase === "verify") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Check your email
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-code">Verification code</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              autoFocus
              autoComplete="one-time-code"
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={handleResendCode}
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Resend code
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-gray-500">Start building today</p>
      </div>

      <OAuthButtons mode="signUp" />

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
          Or continue with
        </span>
      </div>

      <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !isLoaded}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```
git add apps/web/src/components/auth/sign-up-form.tsx
git commit -m "feat(web): add custom sign-up form with otp verification"
```

---

### Task 4: Wire Pages to Custom Forms

**Files:**

- Modify: `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Modify: `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Step 1: Replace sign-in page**

Replace the entire file content with:

```tsx
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthSplitLayout>
      <SignInForm />
    </AuthSplitLayout>
  );
}
```

**Step 2: Replace sign-up page**

Replace the entire file content with:

```tsx
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthSplitLayout>
      <SignUpForm />
    </AuthSplitLayout>
  );
}
```

**Step 3: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`

Expected: no errors related to sign-in or sign-up pages.

**Step 4: Commit**

```
git add apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
git commit -m "feat(web): wire custom sign-in and sign-up forms into pages"
```

---

### Task 5: Auto-Inject JWT in API Client

**Files:**

- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add server-side `getAuthenticatedApi`**

Append to the bottom of `apps/web/src/lib/api.ts` (before the final `export default api` line), insert:

```typescript
// ============================================
// Authenticated API Helpers
// ============================================

/**
 * Server-side: returns an API client with Clerk JWT auto-injected.
 * Use in Server Components, Route Handlers, and Server Actions.
 *
 * @example
 * const authedApi = await getAuthenticatedApi();
 * const data = await authedApi.get<User>("/v1/users/me");
 */
export async function getAuthenticatedApi() {
  // Dynamic import to avoid bundling server code into client
  const { auth } = await import("@clerk/nextjs/server");
  const { getToken } = await auth();
  const token = (await getToken()) ?? undefined;

  return {
    get: <T>(
      endpoint: string,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.get<T>(endpoint, { ...options, token }),

    post: <T>(
      endpoint: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.post<T>(endpoint, body, { ...options, token }),

    put: <T>(
      endpoint: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.put<T>(endpoint, body, { ...options, token }),

    patch: <T>(
      endpoint: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.patch<T>(endpoint, body, { ...options, token }),

    delete: <T>(
      endpoint: string,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.delete<T>(endpoint, { ...options, token }),
  };
}
```

**Step 2: Create client-side hook in a separate file**

Create `apps/web/src/hooks/use-api.ts`:

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo } from "react";
import { api } from "@/lib/api";

/**
 * Client-side hook: returns an API client with Clerk JWT auto-injected.
 * Use in Client Components.
 *
 * @example
 * const api = useApi();
 * const data = await api.get<User>("/v1/users/me");
 */
export function useApi() {
  const { getToken } = useAuth();

  const authedGet = useCallback(
    async <T>(endpoint: string) => {
      const token = (await getToken()) ?? undefined;
      return api.get<T>(endpoint, { token });
    },
    [getToken],
  );

  const authedPost = useCallback(
    async <T>(endpoint: string, body?: unknown) => {
      const token = (await getToken()) ?? undefined;
      return api.post<T>(endpoint, body, { token });
    },
    [getToken],
  );

  const authedPut = useCallback(
    async <T>(endpoint: string, body?: unknown) => {
      const token = (await getToken()) ?? undefined;
      return api.put<T>(endpoint, body, { token });
    },
    [getToken],
  );

  const authedPatch = useCallback(
    async <T>(endpoint: string, body?: unknown) => {
      const token = (await getToken()) ?? undefined;
      return api.patch<T>(endpoint, body, { token });
    },
    [getToken],
  );

  const authedDelete = useCallback(
    async <T>(endpoint: string) => {
      const token = (await getToken()) ?? undefined;
      return api.delete<T>(endpoint, { token });
    },
    [getToken],
  );

  return useMemo(
    () => ({
      get: authedGet,
      post: authedPost,
      put: authedPut,
      patch: authedPatch,
      delete: authedDelete,
    }),
    [authedGet, authedPost, authedPut, authedPatch, authedDelete],
  );
}
```

**Step 3: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`

Expected: clean.

**Step 4: Commit**

```
git add apps/web/src/lib/api.ts apps/web/src/hooks/use-api.ts
git commit -m "feat(web): add jwt auto-injection for api calls (server + client)"
```

---

### Task 6: Update `.env.example` and Final Verification

**Files:**

- Modify: `apps/web/.env.example`

**Step 1: Add missing env vars**

Append to `.env.example`:

```
# Clerk Redirect URLs (used by custom auth forms)
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

**Step 2: Run full typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`

Expected: no errors.

**Step 3: Commit**

```
git add apps/web/.env.example
git commit -m "docs(web): add clerk redirect urls to env example"
```

---

### Task 7: Build Verification

**Step 1: Run web app build**

Run: `pnpm --filter @nebutra/web build 2>&1 | tail -20`

Expected: build succeeds. If there are Clerk-related warnings about SSR, they're expected (Clerk hooks are client-only and are in "use client" components).

**Step 2: Fix any build errors**

If errors occur, fix them. Common issues:

- `Separator` import path wrong → check `@nebutra/ui/primitives` exports
- `useSignIn`/`useSignUp` type mismatches → check Clerk v6 API

**Step 3: Final commit (if fixes needed)**

```
git add -u
git commit -m "fix(web): resolve build errors in auth forms"
```

---

## Commit Summary

| #   | Message                                                             | Files                                  |
| --- | ------------------------------------------------------------------- | -------------------------------------- |
| 1   | `feat(web): add oauth buttons component for google + github`        | `oauth-buttons.tsx`                    |
| 2   | `feat(web): add custom sign-in form with clerk usesignin hook`      | `sign-in-form.tsx`                     |
| 3   | `feat(web): add custom sign-up form with otp verification`          | `sign-up-form.tsx`                     |
| 4   | `feat(web): wire custom sign-in and sign-up forms into pages`       | `sign-in/page.tsx`, `sign-up/page.tsx` |
| 5   | `feat(web): add jwt auto-injection for api calls (server + client)` | `api.ts`, `use-api.ts`                 |
| 6   | `docs(web): add clerk redirect urls to env example`                 | `.env.example`                         |
| 7   | `fix(web): resolve build errors in auth forms` (if needed)          | varies                                 |

## Verification

After all tasks, verify the full flow:

```bash
# 1. Typecheck
cd apps/web && npx tsc --noEmit

# 2. Build
pnpm --filter @nebutra/web build

# 3. Dev: manual testing (requires Clerk keys)
# http://localhost:3000/sign-in → custom form renders
# http://localhost:3000/sign-up → custom form with OTP phase
# Sign up → verify email → /onboarding → create workspace → /dashboard
# Dashboard → API call with auto-injected JWT → api-gateway validates
```

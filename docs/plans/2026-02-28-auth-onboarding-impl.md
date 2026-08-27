# Auth & Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Clerk's default auth UI with a branded Neon-style split-layout (left dark banner, right custom form), plus a 2-step post-signup onboarding wizard (create workspace → connect integrations).

**Architecture:** Custom Clerk hooks (`useSignIn`/`useSignUp`) power the auth forms; root layout is refactored so auth routes get no Header while app routes do; onboarding uses Clerk's `createOrganization` API.

**Tech Stack:** Next.js 16 App Router, `@clerk/nextjs` v6, `@nebutra/ui/primitives` (Button, Input, Label, Separator, Card, InputOTP), Tailwind CSS v4.

---

## Background: What Exists

- `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — renders `<SignIn />` from Clerk
- `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — renders `<SignUp />` from Clerk
- `apps/web/src/app/(dashboard)/page.tsx` — basic dashboard at route `/`
- `apps/web/src/app/layout.tsx` — root layout with `ClerkProvider` + `DesignSystemShell`
- `apps/web/src/app/providers/design-system-shell.tsx` — includes `DesignSystemProvider` + `Header`
- `apps/web/src/middleware.ts` — `clerkMiddleware` protecting all non-public routes
- `apps/web/src/lib/auth.ts` — server-side auth helpers (`getAuth`, `requireAuth`, `requireOrg`)

**Component imports for this feature:**

```ts
// Primitives (shadcn-based)
import { Button } from "@nebutra/ui/primitives";
import { Input } from "@nebutra/ui/primitives";
import { Label } from "@nebutra/ui/primitives";
import { Separator } from "@nebutra/ui/primitives";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@nebutra/ui/primitives";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/lib/utils";

// Design system
import { DesignSystemProvider } from "@nebutra/ui";
```

---

## Task 1: Restructure layouts — move Header out of root, into `(app)` group

**Problem:** The root `app/layout.tsx` wraps ALL routes (including auth) in `DesignSystemShell` which includes the Header. Auth pages must be header-free.

**Solution:** Create a new `(app)/layout.tsx` that wraps non-auth routes with the Header shell. Root layout keeps only `ClerkProvider` + `DesignSystemProvider`.

**Files:**

- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/providers/design-system-shell.tsx`
- Create: `apps/web/src/app/(app)/layout.tsx`
- Move: `apps/web/src/app/(dashboard)/page.tsx` → `apps/web/src/app/(app)/page.tsx`

**Step 1: Modify root layout to remove DesignSystemShell**

Replace entire `apps/web/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DesignSystemProvider } from "@nebutra/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebutra - SaaS Platform",
  description: "Enterprise-grade AI-native SaaS platform",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = (
    <html lang="en">
      <body className="antialiased">
        <DesignSystemProvider>{children}</DesignSystemProvider>
      </body>
    </html>
  );

  if (!hasClerkKey) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
```

**Step 2: Create `(app)/layout.tsx` — header shell for authenticated routes**

Create `apps/web/src/app/(app)/layout.tsx`:

```tsx
import { DesignSystemShell } from "../providers/design-system-shell";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DesignSystemShell hasClerkKey={hasClerkKey}>{children}</DesignSystemShell>
  );
}
```

**Step 3: Modify `design-system-shell.tsx` — remove DesignSystemProvider (it's now in root)**

Replace entire `apps/web/src/app/providers/design-system-shell.tsx` with:

```tsx
"use client";

import React from "react";
import { Button, Header } from "@nebutra/ui";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

interface Props {
  children: React.ReactNode;
  hasClerkKey: boolean;
}

export function DesignSystemShell({ children, hasClerkKey }: Props) {
  return (
    <>
      <Header>
        <Header.Item full>
          <span className="text-xl font-bold">Nebutra</span>
        </Header.Item>
        {hasClerkKey && (
          <Header.Item>
            <SignedOut>
              <div className="flex gap-2">
                <SignInButton mode="modal">
                  <Button variant="invisible">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="primary">Sign Up</Button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: { avatarBox: "h-9 w-9" },
                }}
              />
            </SignedIn>
          </Header.Item>
        )}
      </Header>
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </>
  );
}
```

**Step 4: Move dashboard page into `(app)` group**

Create `apps/web/src/app/(app)/page.tsx` with identical content from `apps/web/src/app/(dashboard)/page.tsx`. Then delete the old file.

Copy this content to `apps/web/src/app/(app)/page.tsx`:

```tsx
import { getAuth, getUser } from "@/lib/auth";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default async function DashboardPage() {
  let userName = "User";
  let orgName = "";

  if (hasClerkKey) {
    const [authState, user] = await Promise.all([getAuth(), getUser()]);
    userName = user?.firstName || "User";
    orgName = (authState.sessionClaims?.org_name as string) || "";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
          {orgName && <p className="mt-1 text-sm text-gray-500">{orgName}</p>}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Welcome back, {userName}!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your dashboard is ready. Start exploring your workspace.
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">API Calls</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            <p className="mt-1 text-sm text-gray-500">This month</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">AI Tokens</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            <p className="mt-1 text-sm text-gray-500">This month</p>
          </div>
        </div>

        {!hasClerkKey && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              ⚠️ Clerk authentication is not configured. Set
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable
              auth.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 5: Delete old dashboard page and its directory**

```bash
rm apps/web/src/app/(dashboard)/page.tsx
rmdir apps/web/src/app/(dashboard)
```

**Step 6: Verify build compiles**

```bash
cd apps/web && pnpm build 2>&1 | tail -20
```

Expected: no TypeScript errors. The `/` route should still resolve (now via `(app)/page.tsx`).

**Step 7: Commit**

```bash
git add apps/web/src/app/layout.tsx \
        apps/web/src/app/providers/design-system-shell.tsx \
        apps/web/src/app/\(app\)/layout.tsx \
        apps/web/src/app/\(app\)/page.tsx
git rm apps/web/src/app/\(dashboard\)/page.tsx
git commit -m "refactor(web): split root layout — move header to (app) group, auth routes get bare layout"
```

---

## Task 2: `(auth)/layout.tsx` — full-screen bare layout

Auth routes (sign-in, sign-up) must render full-screen without the Header from `(app)/layout.tsx`. Since `(auth)` is a sibling route group to `(app)`, it will NOT inherit `(app)/layout.tsx`. It will only inherit root `app/layout.tsx`. This means the `(auth)/layout.tsx` just passes children through.

**Files:**

- Create: `apps/web/src/app/(auth)/layout.tsx`

**Step 1: Create auth layout**

Create `apps/web/src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

**Step 2: Verify the auth route group directory structure**

```bash
ls apps/web/src/app/\(auth\)/
```

Expected output:

```
layout.tsx
sign-in/
sign-up/
```

**Step 3: Commit**

```bash
git add apps/web/src/app/\(auth\)/layout.tsx
git commit -m "feat(web): add bare auth layout (no header for sign-in/sign-up)"
```

---

## Task 3: `auth-banner.tsx` — left brand panel

The dark left panel: Nebutra wordmark, tagline, and decorative indigo gradient with halftone dot overlay. Mirrors Neon's left panel design with Nebutra branding.

**Files:**

- Create: `apps/web/src/components/auth/auth-banner.tsx`

**Step 1: Create the banner component**

Create `apps/web/src/components/auth/auth-banner.tsx`:

```tsx
import Link from "next/link";
import { cn } from "@nebutra/ui/lib/utils";

interface AuthBannerProps {
  className?: string;
}

export function AuthBanner({ className }: AuthBannerProps) {
  return (
    <div
      className={cn(
        "relative hidden overflow-hidden lg:flex lg:flex-col",
        "bg-[#0a0a0a]",
        className,
      )}
    >
      {/* Decorative radial gradient glow — bottom-right origin */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 100%, rgba(99,102,241,0.35) 0%, rgba(124,58,237,0.15) 40%, transparent 70%)",
        }}
      />

      {/* Halftone dot grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top-left Home link */}
      <div className="relative z-10 p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Home
        </Link>
      </div>

      {/* Center branding */}
      <div className="relative z-10 flex flex-1 flex-col items-start justify-center px-12 pb-16">
        {/* Nebutra Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
            <span className="text-lg font-black text-white">N</span>
          </div>
          <span className="text-2xl font-bold text-white">Nebutra</span>
        </div>

        {/* Tagline */}
        <p className="max-w-xs text-xl font-semibold leading-snug text-white">
          Build faster with AI-native infrastructure.
        </p>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
          Enterprise-grade AI, without the enterprise complexity.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/auth/auth-banner.tsx
git commit -m "feat(web): add auth banner component (neon-style left brand panel)"
```

---

## Task 4: `auth-split-layout.tsx` — 40/60 container

The full-screen split layout: `AuthBanner` on the left (40%), form slot on the right (60%). On mobile, banner is hidden and form fills the screen.

**Files:**

- Create: `apps/web/src/components/auth/auth-split-layout.tsx`

**Step 1: Create the split layout**

Create `apps/web/src/components/auth/auth-split-layout.tsx`:

```tsx
import { AuthBanner } from "./auth-banner";
import { cn } from "@nebutra/ui/lib/utils";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthSplitLayout({ children, className }: AuthSplitLayoutProps) {
  return (
    <div className={cn("grid min-h-screen lg:grid-cols-[2fr_3fr]", className)}>
      <AuthBanner />
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/auth/auth-split-layout.tsx
git commit -m "feat(web): add auth split layout (40/60 banner + form)"
```

---

## Task 5: `oauth-buttons.tsx` — Google + GitHub OAuth

Reusable OAuth button row used in both sign-in and sign-up forms.

**Files:**

- Create: `apps/web/src/components/auth/oauth-buttons.tsx`

**Step 1: Create OAuth buttons**

Create `apps/web/src/components/auth/oauth-buttons.tsx`:

```tsx
"use client";

import { useSignIn } from "@clerk/nextjs";
import { Button } from "@nebutra/ui/primitives";

interface OAuthButtonsProps {
  mode: "sign_in" | "sign_up";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.572C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z"
        fill="currentColor"
      />
    </svg>
  );
}

export function OAuthButtons({ mode }: OAuthButtonsProps) {
  const { signIn } = useSignIn();

  async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
    if (!signIn) return;
    await signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: mode === "sign_in" ? "/" : "/onboarding",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => handleOAuth("oauth_google")}
      >
        <GoogleIcon />
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => handleOAuth("oauth_github")}
      >
        <GitHubIcon />
        Continue with GitHub
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/auth/oauth-buttons.tsx
git commit -m "feat(web): add oauth buttons component (google + github)"
```

---

## Task 6: `sign-in-form.tsx` — custom sign-in with useSignIn

Full sign-in form: OAuth buttons → divider → email + password → submit. Uses `useSignIn` state machine.

**Files:**

- Create: `apps/web/src/components/auth/sign-in-form.tsx`

**Step 1: Create sign-in form**

Create `apps/web/src/components/auth/sign-in-form.tsx`:

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

type FormState = "idle" | "loading" | "error";

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setState("loading");
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setError("Sign in failed. Please try again.");
        setState("error");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      const message =
        clerkError.errors?.[0]?.message || "Something went wrong.";
      setError(message);
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Log in to Nebutra
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back</p>
      </div>

      <OAuthButtons mode="sign_in" />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">Or continue with</span>
        <Separator className="flex-1" />
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
              href="/sign-in/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={state === "loading"}>
          {state === "loading" ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to Nebutra?{" "}
        <Link
          href="/sign-up"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/auth/sign-in-form.tsx
git commit -m "feat(web): add custom sign-in form with clerk hooks"
```

---

## Task 7: `sign-up-form.tsx` — custom sign-up with useSignUp

Two-step form: (A) collect name/email/password → (B) verify email via OTP → redirect to `/onboarding`.

**Files:**

- Create: `apps/web/src/components/auth/sign-up-form.tsx`

**Step 1: Create sign-up form**

Create `apps/web/src/components/auth/sign-up-form.tsx`:

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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@nebutra/ui/primitives";
import { OAuthButtons } from "./oauth-buttons";

type Step = "details" | "verify";
type FormState = "idle" | "loading" | "error";

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  // Step A fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step B fields
  const [code, setCode] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setState("loading");
    setError("");

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
      setState("idle");
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "Sign up failed.");
      setState("error");
    }
  }

  async function handleVerify(value: string) {
    if (!isLoaded || !signUp || value.length < 6) return;

    setState("loading");
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: value,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/onboarding");
      } else {
        setError("Verification failed. Please try again.");
        setState("error");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "Invalid code.");
      setState("error");
    }
  }

  async function handleResend() {
    if (!signUp) return;
    await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
  }

  if (step === "verify") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (value.length === 6) {
                void handleVerify(value);
              }
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="button"
            className="w-full"
            disabled={state === "loading" || code.length < 6}
            onClick={() => handleVerify(code)}
          >
            {state === "loading" ? "Verifying…" : "Verify"}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="text-foreground underline-offset-4 hover:underline"
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start building today
        </p>
      </div>

      <OAuthButtons mode="sign_up" />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">Or continue with</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={state === "loading"}>
          {state === "loading" ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/auth/sign-up-form.tsx
git commit -m "feat(web): add custom sign-up form with clerk hooks + otp verification"
```

---

## Task 8: Update auth pages to use new components

Replace Clerk's `<SignIn />` / `<SignUp />` in the page files with the new custom forms wrapped in `AuthSplitLayout`.

**Files:**

- Modify: `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Modify: `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Step 1: Replace sign-in page**

Replace entire `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

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

Replace entire `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

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

**Step 3: Verify `@/` path alias is configured**

```bash
grep -n "paths\|baseUrl" apps/web/tsconfig.json
```

If `@/*` → `src/*` is not configured, add to `tsconfig.json` compilerOptions:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

**Step 4: Build to check for type errors**

```bash
cd apps/web && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add apps/web/src/app/\(auth\)/sign-in/\[\[...sign-in\]\]/page.tsx \
        apps/web/src/app/\(auth\)/sign-up/\[\[...sign-up\]\]/page.tsx
git commit -m "feat(web): wire up custom auth forms in sign-in/sign-up pages"
```

---

## Task 9: Update middleware — add `/onboarding` and `/select-org` to public routes

These routes need to be reachable by newly-authenticated users before they've fully set up. They do their own auth checks.

**Files:**

- Modify: `apps/web/src/middleware.ts` (lines 5-9)

**Step 1: Update public routes matcher**

In `apps/web/src/middleware.ts`, change:

```ts
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
]);
```

to:

```ts
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/select-org(.*)",
  "/sso-callback(.*)",
  "/api/webhook(.*)",
]);
```

**Step 2: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(web): add onboarding, select-org, sso-callback to public routes"
```

---

## Task 10: `create-workspace-step.tsx` — Step 1 of onboarding

Workspace name + auto-generated slug form. Calls Clerk `createOrganization` on submit.

**Files:**

- Create: `apps/web/src/components/onboarding/create-workspace-step.tsx`

**Step 1: Create the component**

Create `apps/web/src/components/onboarding/create-workspace-step.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { Button } from "@nebutra/ui/primitives";
import { Input } from "@nebutra/ui/primitives";
import { Label } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/lib/utils";

interface CreateWorkspaceStepProps {
  onComplete: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function CreateWorkspaceStep({ onComplete }: CreateWorkspaceStepProps) {
  const { createOrganization, setActive } = useOrganizationList();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  const slugValid =
    /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug) || slug.length >= 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createOrganization || !setActive) return;

    setLoading(true);
    setError("");

    try {
      const org = await createOrganization({ name, slug });
      await setActive({ organization: org.id });
      onComplete();
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(
        clerkError.errors?.[0]?.message || "Failed to create workspace.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Set up your workspace
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is where your team will collaborate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-slug">Workspace URL</Label>
          <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="border-r border-input px-3 py-2 text-sm text-muted-foreground select-none">
              nebutra.app /
            </span>
            <input
              id="workspace-slug"
              className={cn(
                "flex-1 bg-transparent px-3 py-2 text-sm outline-none",
                "placeholder:text-muted-foreground",
              )}
              placeholder="my-workspace"
              value={slug}
              onChange={(e) => {
                setSlug(
                  slugify(e.target.value) || e.target.value.toLowerCase(),
                );
                setSlugEdited(true);
              }}
              pattern="[a-z0-9][a-z0-9\-]{1,46}[a-z0-9]"
              required
            />
          </div>
          {slug.length > 0 && !slugValid && (
            <p className="text-xs text-muted-foreground">
              3–48 characters, lowercase letters, numbers, and hyphens only.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || !name}>
          {loading ? "Creating…" : "Create Workspace →"}
        </Button>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/onboarding/create-workspace-step.tsx
git commit -m "feat(web): add create-workspace onboarding step with clerk createOrganization"
```

---

## Task 11: `connect-integrations-step.tsx` — Step 2 of onboarding

Grid of 5 integration cards (GitHub, Slack, Linear, Vercel, Jira). Connect buttons are placeholders (actual OAuth integration is a separate feature). All integrations are optional.

**Files:**

- Create: `apps/web/src/components/onboarding/connect-integrations-step.tsx`

**Step 1: Create the component**

Create `apps/web/src/components/onboarding/connect-integrations-step.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/lib/utils";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Code & deploys",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.572C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team alerts",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
        <rect width="24" height="24" rx="4" fill="#4A154B" />
        <text x="5" y="17" fontSize="13" fontWeight="bold" fill="white">
          S
        </text>
      </svg>
    ),
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracking",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
        <rect width="24" height="24" rx="4" fill="#5E6AD2" />
        <text x="6" y="17" fontSize="13" fontWeight="bold" fill="white">
          L
        </text>
      </svg>
    ),
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Deploy previews",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2L24 22H0L12 2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "jira",
    name: "Jira",
    description: "Project management",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
        <rect width="24" height="24" rx="4" fill="#0052CC" />
        <text x="7" y="17" fontSize="13" fontWeight="bold" fill="white">
          J
        </text>
      </svg>
    ),
  },
];

interface ConnectIntegrationsStepProps {
  onComplete: () => void;
}

export function ConnectIntegrationsStep({
  onComplete,
}: ConnectIntegrationsStepProps) {
  const [connected, setConnected] = useState<Set<string>>(new Set());

  function handleConnect(id: string) {
    // Placeholder: actual OAuth connection is a separate feature
    setConnected((prev) => new Set([...prev, id]));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Connect your tools
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up integrations to supercharge your workflow.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const isConnected = connected.has(integration.id);
          return (
            <div
              key={integration.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card hover:border-border/80",
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center">
                  {integration.icon}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">
                  {integration.description}
                </p>
              </div>
              <Button
                type="button"
                variant={isConnected ? "secondary" : "outline"}
                size="sm"
                className="w-full text-xs"
                onClick={() => !isConnected && handleConnect(integration.id)}
                disabled={isConnected}
              >
                {isConnected ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Connected
                  </span>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={onComplete}
      >
        Skip for now → Go to Dashboard
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/onboarding/connect-integrations-step.tsx
git commit -m "feat(web): add connect-integrations onboarding step (placeholder cards)"
```

---

## Task 12: `onboarding-wizard.tsx` + onboarding page

2-step wizard controller with step indicator. Wraps `CreateWorkspaceStep` and `ConnectIntegrationsStep`.

**Files:**

- Create: `apps/web/src/components/onboarding/onboarding-wizard.tsx`
- Create: `apps/web/src/app/onboarding/layout.tsx`
- Create: `apps/web/src/app/onboarding/page.tsx`

**Step 1: Create the wizard controller**

Create `apps/web/src/components/onboarding/onboarding-wizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateWorkspaceStep } from "./create-workspace-step";
import { ConnectIntegrationsStep } from "./connect-integrations-step";
import { cn } from "@nebutra/ui/lib/utils";

const STEPS = [{ label: "Workspace" }, { label: "Integrations" }] as const;

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  i < currentStep
                    ? "bg-primary text-primary-foreground"
                    : i === currentStep
                      ? "border-2 border-primary text-primary"
                      : "border border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {i < currentStep ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  i === currentStep
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px w-8",
                    i < currentStep ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {currentStep === 0 && (
            <CreateWorkspaceStep onComplete={() => setCurrentStep(1)} />
          )}
          {currentStep === 1 && (
            <ConnectIntegrationsStep onComplete={() => router.push("/")} />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Create onboarding layout (no header)**

Create `apps/web/src/app/onboarding/layout.tsx`:

```tsx
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

**Step 3: Create onboarding page**

Create `apps/web/src/app/onboarding/page.tsx`:

```tsx
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/onboarding/onboarding-wizard.tsx \
        apps/web/src/app/onboarding/layout.tsx \
        apps/web/src/app/onboarding/page.tsx
git commit -m "feat(web): add onboarding wizard page (2-step: workspace + integrations)"
```

---

## Task 13: `select-org/page.tsx` — org switcher

Redirect target for `requireOrg()` when user is logged in but has no active org. Provides a simple "select organization" page.

**Files:**

- Create: `apps/web/src/app/select-org/page.tsx`

**Step 1: Create select-org page**

Create `apps/web/src/app/select-org/page.tsx`:

```tsx
"use client";

import { OrganizationList } from "@clerk/nextjs";

export default function SelectOrgPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Select a workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a workspace to continue, or create a new one.
          </p>
        </div>
        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/onboarding"
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/select-org/page.tsx
git commit -m "feat(web): add select-org page for workspace switching"
```

---

## Task 14: Final build verification

Run the full build and check no TypeScript or compilation errors.

**Step 1: Build the web app**

```bash
cd apps/web && pnpm build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with no error lines.

**Step 2: Check route manifest**

```bash
cd apps/web && pnpm build 2>&1 | grep "Route\|○\|●\|λ" | head -20
```

Expected routes in output:

- `○ /` (dashboard, static)
- `λ /sign-in/[[...sign-in]]` (dynamic)
- `λ /sign-up/[[...sign-up]]` (dynamic)
- `λ /onboarding` (dynamic)
- `○ /select-org` (static or dynamic)

**Step 3: Run architecture tests to make sure no regressions**

```bash
cd /path/to/repo && pnpm test:arch 2>&1 | tail -20
```

Expected: `13 tests passed`.

**Step 4: Commit if any last fixes needed, then final commit**

```bash
git add .
git commit -m "chore(web): final build verification — all routes compile, arch tests pass"
```

---

## Summary of Files Created / Modified

| Action | File                                                               |
| ------ | ------------------------------------------------------------------ |
| Modify | `apps/web/src/app/layout.tsx`                                      |
| Modify | `apps/web/src/app/providers/design-system-shell.tsx`               |
| Create | `apps/web/src/app/(app)/layout.tsx`                                |
| Create | `apps/web/src/app/(app)/page.tsx`                                  |
| Delete | `apps/web/src/app/(dashboard)/page.tsx`                            |
| Create | `apps/web/src/app/(auth)/layout.tsx`                               |
| Modify | `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`          |
| Modify | `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`          |
| Create | `apps/web/src/app/onboarding/layout.tsx`                           |
| Create | `apps/web/src/app/onboarding/page.tsx`                             |
| Create | `apps/web/src/app/select-org/page.tsx`                             |
| Modify | `apps/web/src/middleware.ts`                                       |
| Create | `apps/web/src/components/auth/auth-banner.tsx`                     |
| Create | `apps/web/src/components/auth/auth-split-layout.tsx`               |
| Create | `apps/web/src/components/auth/oauth-buttons.tsx`                   |
| Create | `apps/web/src/components/auth/sign-in-form.tsx`                    |
| Create | `apps/web/src/components/auth/sign-up-form.tsx`                    |
| Create | `apps/web/src/components/onboarding/create-workspace-step.tsx`     |
| Create | `apps/web/src/components/onboarding/connect-integrations-step.tsx` |
| Create | `apps/web/src/components/onboarding/onboarding-wizard.tsx`         |

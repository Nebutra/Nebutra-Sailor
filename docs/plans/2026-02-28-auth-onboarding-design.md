# Auth & Onboarding Design

**Date:** 2026-02-28
**Status:** Approved
**Reference:** Neon login page (split layout: left brand banner, right auth form)

---

## Goal

Replace Clerk's default sign-in/sign-up components with a fully branded, Neon-style split-layout auth experience, plus a 2-step post-signup onboarding wizard. All UI uses the `@nebutra/ui` component library and Nebutra brand tokens.

---

## Architecture

### Approach

**Custom Clerk Hooks UI** — use `useSignIn` / `useSignUp` hooks from `@clerk/nextjs` to build fully custom forms. OAuth flows are delegated to Clerk's `authenticateWithRedirect`; email/password and OTP verification are handled in custom React state machines.

**Why not Clerk Appearance API:** Appearance API leaves Clerk's structural DOM in place (card wrappers, padding, shadow), preventing pixel-perfect layout control. Custom hooks give 100% design ownership.

### Component Hierarchy

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    # Full-screen, hides global Header
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/page.tsx   # AuthSplitLayout + SignInForm
│   │   └── sign-up/
│   │       └── [[...sign-up]]/page.tsx   # AuthSplitLayout + SignUpForm
│   ├── onboarding/
│   │   ├── layout.tsx                    # Centered, no sidebar
│   │   └── page.tsx                      # OnboardingWizard (multi-step)
│   └── select-org/
│       └── page.tsx                      # Org switcher (requireOrg redirect target)
│
└── components/
    ├── auth/
    │   ├── auth-banner.tsx               # Left brand panel (shared)
    │   ├── auth-split-layout.tsx         # 40/60 split container
    │   ├── sign-in-form.tsx              # useSignIn state machine
    │   ├── sign-up-form.tsx              # useSignUp state machine
    │   └── oauth-buttons.tsx             # Google + GitHub OAuth row
    └── onboarding/
        ├── onboarding-wizard.tsx         # Step controller + progress bar
        ├── create-workspace-step.tsx     # Step 1: name + slug
        └── connect-integrations-step.tsx # Step 2: integration cards grid
```

---

## User Flow

```
Landing page
    │
    ├─ Sign In → /sign-in → authenticated → /dashboard
    │
    └─ Sign Up → /sign-up
                    │
                    ├─ [Email flow] Enter details → OTP verify email
                    │
                    └─ [OAuth flow] Google / GitHub callback
                                    │
                                    ▼
                            /onboarding
                            Step 1: Create Workspace
                            Step 2: Connect Integrations
                                    │
                                    ▼
                            /dashboard
```

**Middleware:** `clerkMiddleware` already protects all routes except `/sign-in`, `/sign-up`, `/api/webhook`. Add `/onboarding` and `/select-org` to public routes list (they do their own auth checks internally).

---

## Component Design

### `auth-split-layout.tsx`

Split container: 40% left (banner) + 60% right (form). On mobile: left panel collapses to logo-only top bar, form fills screen.

```tsx
// Full viewport height, two-column grid
<div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
  <AuthBanner />
  <div className="flex flex-col items-center justify-center px-8 py-12">
    {children}
  </div>
</div>
```

### `auth-banner.tsx`

Dark immersive left panel with:

- Background: `bg-[#0a0a0a]` forced dark
- Decorative gradient: indigo → violet radial glow (`#6366f1` → `#7c3aed`), bottom-right origin
- Halftone dot grid overlay: CSS `radial-gradient` repeating pattern, 20% opacity
- Top-left: `← Home` link (`text-muted-foreground`, hover `text-foreground`)
- Center: Nebutra logo SVG wordmark + tagline

```tsx
// Tagline options (pick one):
// "Build faster with AI-native infrastructure."
// "Enterprise-grade AI, without the enterprise complexity."
```

All decorative elements are `aria-hidden`. Banner is `hidden lg:flex` on mobile.

### `sign-in-form.tsx`

State machine: `idle` → `loading` → `needs_verification` → `complete` | `error`

```
"Log in to Nebutra"           ← text-2xl font-semibold
"Welcome back"                ← text-muted-foreground text-sm

[G] Continue with Google      ← Button variant="outline" full-width
[⬡] Continue with GitHub     ← Button variant="outline" full-width

────── Or continue with ──────  ← Separator with label

Email          [______________]
Password       [______________] [👁 toggle]
               Forgot password? ← text-sm text-right link

[  Log in  ]   ← Button variant="default" full-width (indigo)

New to Nebutra? Sign up →      ← Link to /sign-up
```

All `Input`, `Button`, `Label`, `Separator` from `@nebutra/ui`.
Error messages: inline below field using `FormMessage` (red, `text-sm`).

### `sign-up-form.tsx`

Step A — Basic info:

```
"Create your account"
"Start building today"

[G] Continue with Google
[⬡] Continue with GitHub
──── Or continue with ────
First name    [________]
Last name     [________]
Email         [________________]
Password      [________________]
[  Create account  ]
Already have an account? Sign in →
```

Step B — Email verification (after Step A):

```
"Check your email"
"We sent a 6-digit code to {email}"

[_][_][_][_][_][_]   ← OTP Input (6 digits)
[  Verify  ]
Didn't receive it? Resend code
```

After verification → `router.push('/onboarding')`.

### `oauth-buttons.tsx`

Shared component for Google + GitHub buttons. Uses `useSignIn().authenticateWithRedirect` with `strategy: 'oauth_google'` / `strategy: 'oauth_github'`.

---

## Onboarding Wizard

### `onboarding-wizard.tsx`

- 2-step linear wizard with progress indicator (dots or `Step 1 of 2`)
- Centered layout, max-width `lg`, card surface
- Each step is a separate component, wizard controls navigation

### Step 1 — `create-workspace-step.tsx`

```
"Set up your workspace"
"This is where your team will collaborate"

Workspace name   [__________________]
                 e.g. Acme Corp

Workspace URL    nebutra.app / [acme-corp]
                 ↑ auto-generated from name, editable
                 Shows availability: ✓ Available / ✗ Taken

[ Create Workspace → ]
```

On submit: call Clerk `createOrganization({ name })` → set active org → go to Step 2.

Slug validation: lowercase alphanumeric + hyphens, 3-48 chars. Real-time debounced check against Clerk org slugs.

### Step 2 — `connect-integrations-step.tsx`

```
"Connect your tools"
"Set up integrations to supercharge your workflow"

┌──────────┐ ┌──────────┐ ┌──────────┐
│ GitHub   │ │ Slack    │ │ Linear   │
│ Code &   │ │ Team     │ │ Issue    │
│ deploys  │ │ alerts   │ │ tracking │
│[Connect] │ │[Connect] │ │[Connect] │
└──────────┘ └──────────┘ └──────────┘

┌──────────┐ ┌──────────┐
│ Vercel   │ │ Jira     │
│ Deploy   │ │ Project  │
│ previews │ │ mgmt     │
│[Connect] │ │[Connect] │
└──────────┘ └──────────┘

[ Skip for now → Go to Dashboard ]
```

Integration cards: each is a `Card` component with icon (Lucide or SVG), title, description, and `Button variant="outline"`. Connected state shows a green checkmark + "Connected" text.

All integrations are optional. `[Connect]` buttons open Clerk OAuth or a modal placeholder for now (actual integration logic is a separate feature).

After clicking "Go to Dashboard" (or all connected): `router.push('/dashboard')`.

---

## Auth Layout (`(auth)/layout.tsx`)

Remove the global `Header` for auth routes:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

The global layout wraps children with `DesignSystemShell` which includes the `Header`. The `(auth)` layout re-renders without the shell by using `generateStaticParams` override — or more simply: move `DesignSystemShell` rendering logic to check if current route is an auth route.

**Preferred approach:** Keep the auth routes completely separate from the shell by not nesting them under `DesignSystemShell`. Move the `ClerkProvider` wrapper up to root layout (already there), and let `(auth)/layout.tsx` render its own minimal html structure.

Actually simpler: the `DesignSystemShell` already wraps children in `<main className="min-h-[calc(100vh-64px)]">`. The auth layout just needs to override this. Since it's a nested layout in Next.js, the `(auth)/layout.tsx` will wrap inside the root layout. The header will still show. To remove the header for auth pages, refactor `DesignSystemShell` to accept a `hideHeader` prop, passed from a Server Component that reads the current path, OR extract `ClerkProvider` + `DesignSystemProvider` into separate providers and only use `Header` in non-auth routes.

**Decision:** Extract auth routes from the `DesignSystemShell`. Root layout becomes:

```
RootLayout
├── ClerkProvider
├── DesignSystemProvider
└── Route-conditional rendering:
    - (auth) routes → bare, no Header
    - All other routes → with Header
```

---

## Error Handling

| Scenario             | Behavior                                             |
| -------------------- | ---------------------------------------------------- |
| Wrong password       | Inline error below password field                    |
| Email already taken  | Inline error below email field                       |
| OAuth window closed  | Toast: "Sign in cancelled. Try again."               |
| Network error        | Toast: "Something went wrong. Please try again."     |
| Org slug taken       | Inline error below slug field (real-time)            |
| Clerk not configured | `hasClerkKey` guard → show static "Coming soon" page |

---

## Testing

- Unit: `sign-in-form.tsx`, `sign-up-form.tsx` state transitions (mock `useSignIn`/`useSignUp`)
- Unit: slug generation + validation logic
- Integration: Clerk `createOrganization` call in `create-workspace-step.tsx`
- E2E (Playwright): sign-up → email verify → onboarding → dashboard (happy path)

---

## Files to Create / Modify

| Action | File                                                               |
| ------ | ------------------------------------------------------------------ |
| Create | `apps/web/src/app/(auth)/layout.tsx`                               |
| Modify | `apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`          |
| Modify | `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`          |
| Create | `apps/web/src/app/onboarding/layout.tsx`                           |
| Create | `apps/web/src/app/onboarding/page.tsx`                             |
| Create | `apps/web/src/app/select-org/page.tsx`                             |
| Create | `apps/web/src/components/auth/auth-banner.tsx`                     |
| Create | `apps/web/src/components/auth/auth-split-layout.tsx`               |
| Create | `apps/web/src/components/auth/sign-in-form.tsx`                    |
| Create | `apps/web/src/components/auth/sign-up-form.tsx`                    |
| Create | `apps/web/src/components/auth/oauth-buttons.tsx`                   |
| Create | `apps/web/src/components/onboarding/onboarding-wizard.tsx`         |
| Create | `apps/web/src/components/onboarding/create-workspace-step.tsx`     |
| Create | `apps/web/src/components/onboarding/connect-integrations-step.tsx` |
| Modify | `apps/web/src/app/layout.tsx` (extract Shell into conditional)     |
| Modify | `apps/web/src/middleware.ts` (add onboarding/select-org to public) |

---

## Brand & Design Tokens

All components must use Design System tokens only (no hardcoded hex):

- Primary button: `bg-primary` (maps to `#6366f1` in light, same in dark)
- Brand gradient: CSS variable `--gradient-brand: linear-gradient(135deg, #6366f1, #7c3aed)`
- Auth banner background: forced `dark` variant via `class="dark"`
- Font: Inter (inherited from Design System)

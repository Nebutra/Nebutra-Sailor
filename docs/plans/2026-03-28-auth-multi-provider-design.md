# Auth Multi-Provider Architecture — Design Document

**Date:** 2026-03-28
**Goal:** Make Clerk and Better Auth work as switchable auth providers via a single preset config, with full front-end + back-end + database integration.

> **Note (2026-05-10):** NextAuth/Auth.js was briefly removed (2026-04-14) and then re-introduced as a real adapter on 2026-05-10. The doc below is once again the active design — three switchable providers (Clerk / Better Auth / NextAuth). The ephemeral 2026-03-29 deprecation has been retracted.

---

## Problem Statement

The system is hardcoded to Clerk:
- `apps/web/` imports `@clerk/nextjs` directly
- `proxy.ts` uses `clerkMiddleware()`
- Auth pages use Clerk's `<SignIn>` / `<SignUp>` components
- No self-hosted auth tables in Prisma schema
- China users cannot access Clerk (blocked by GFW)
- Self-hosting users don't want SaaS auth dependency

The `@nebutra/identity` adapter registry exists but only Clerk is wired end-to-end.

---

## Target Architecture

```
Preset config:
  authProvider: "clerk" | "better-auth" | "nextauth"

packages/
  auth/                         ← NEW: unified auth package
    src/
      providers/
        clerk.ts                ← Clerk adapter (existing logic, extracted)
        better-auth.ts          ← Better Auth adapter
        nextauth.ts             ← NextAuth/Auth.js adapter
      server.ts                 ← createAuth(config) factory
      client.ts                 ← React hooks (useUser, useSession, useOrganization)
      middleware.ts             ← createAuthMiddleware(config) for proxy.ts
      components/
        sign-in-form.tsx        ← Self-hosted login form (email/password + OAuth + phone)
        sign-up-form.tsx        ← Self-hosted registration form
        user-button.tsx         ← User avatar dropdown (works with all providers)
        org-switcher.tsx        ← Organization switcher (works with all providers)
      index.ts

  identity/                     ← EXISTING: backend adapter registry (keep as-is)
  sms/                          ← EXISTING: phone verification (works with all providers)

  db/prisma/schema.prisma       ← ADD: self-hosted auth tables (conditional)
```

---

## Provider Comparison

| Capability | Clerk | Better Auth | NextAuth |
|-----------|-------|-------------|----------|
| Self-hosted | No | Yes | Yes |
| Organizations | Built-in | Plugin | Manual |
| OAuth providers | 20+ | 20+ | 20+ |
| Email/password | Yes | Yes | Yes (Credentials) |
| Phone/SMS | Twilio only | Custom adapter | Custom adapter |
| Session strategy | JWT | JWT + DB | JWT + DB |
| UI components | Built-in | None | None |
| DB required | No | Yes (Prisma/Drizzle) | Yes (Prisma adapter) |
| China accessible | No | Yes | Yes |
| Webhooks | Yes (Svix) | Events API | Events/Callbacks |

---

## Implementation Phases

### Phase 1: `packages/auth` unified package

Create a provider-agnostic auth package that exports the same API regardless of which provider is configured.

#### Server API (`auth/server.ts`)

```ts
import type { AuthProvider, AuthConfig } from "./types.js";

export function createAuth(config: AuthConfig): AuthProvider {
  switch (config.provider) {
    case "clerk": return createClerkAuth(config);
    case "better-auth": return createBetterAuth(config);
    case "nextauth": return createNextAuth(config);
  }
}
```

#### Unified interface (`auth/types.ts`)

```ts
export interface AuthProvider {
  provider: "clerk" | "better-auth" | "nextauth";

  // Server-side
  getSession(request: Request): Promise<Session | null>;
  getUser(userId: string): Promise<User | null>;
  createUser(data: CreateUserInput): Promise<User>;

  // Organization (multi-tenant)
  getOrganization(orgId: string): Promise<Organization | null>;
  getUserOrganizations(userId: string): Promise<Organization[]>;
  createOrganization(data: CreateOrgInput): Promise<Organization>;

  // Middleware
  middleware(): (req: Request) => Promise<Response | void>;

  // Webhooks
  handleWebhook(request: Request): Promise<void>;
}

export interface Session {
  userId: string;
  organizationId?: string;
  role?: string;
  email?: string;
  expiresAt: Date;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
}
```

#### Client hooks (`auth/client.ts`)

```ts
// Provider-agnostic React hooks
export function useUser(): { user: User | null; isLoaded: boolean };
export function useSession(): { session: Session | null; isLoaded: boolean };
export function useOrganization(): { organization: Organization | null; isLoaded: boolean };
export function useSignIn(): { signIn: (method: SignInMethod) => Promise<void> };
export function useSignOut(): { signOut: () => Promise<void> };
```

### Phase 2: Better Auth provider

#### Dependencies
- `better-auth` — core
- `@better-auth/prisma` — Prisma adapter
- `better-auth/plugins/organization` — multi-tenant plugin

#### Prisma schema additions (conditional)

```prisma
// Only needed when authProvider != "clerk"
model AuthUser {
  id            String    @id @default(cuid())
  email         String?   @unique
  phone         String?   @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      AuthAccount[]
  sessions      AuthSession[]
}

model AuthAccount {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth" | "credentials" | "phone"
  provider          String  // "google" | "github" | "phone"
  providerAccountId String
  refreshToken      String?
  accessToken       String?
  expiresAt         Int?
  user              AuthUser @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model AuthSession {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  user      AuthUser @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuthVerification {
  id         String   @id @default(cuid())
  identifier String   // email or phone
  value      String   // verification token or OTP
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  @@unique([identifier, value])
}
```

#### Better Auth server setup

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma";
import { organization } from "better-auth/plugins/organization";

export function createBetterAuth(config: AuthConfig): AuthProvider {
  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true },
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
      github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
    },
    plugins: [organization()],
  });

  return {
    provider: "better-auth",
    getSession: (req) => auth.api.getSession({ headers: req.headers }),
    getUser: (id) => auth.api.getUser({ query: { id } }),
    middleware: () => auth.handler,
    // ... map other methods
  };
}
```

### Phase 3: NextAuth/Auth.js provider

#### Dependencies
- `next-auth@5` (Auth.js v5)
- `@auth/prisma-adapter`

#### NextAuth setup

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

export function createNextAuth(config: AuthConfig): AuthProvider {
  const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
      Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
      GitHub({ clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET }),
      Credentials({
        credentials: { email: {}, password: {} },
        authorize: async (credentials) => { /* verify against DB */ },
      }),
    ],
    callbacks: {
      session: ({ session, user }) => ({
        ...session,
        user: { ...session.user, id: user.id },
      }),
    },
  });

  return {
    provider: "nextauth",
    getSession: (req) => auth().then(s => mapSession(s)),
    middleware: () => handlers,
    // ... map other methods
  };
}
```

### Phase 4: Clerk provider (extract existing)

Move existing Clerk code into the new `packages/auth/providers/clerk.ts`:

```ts
import { clerkClient, clerkMiddleware, auth } from "@clerk/nextjs/server";

export function createClerkAuth(config: AuthConfig): AuthProvider {
  return {
    provider: "clerk",
    getSession: async (req) => {
      const { userId, orgId, orgRole } = await auth();
      if (!userId) return null;
      return { userId, organizationId: orgId, role: orgRole, expiresAt: new Date(Date.now() + 3600000) };
    },
    getUser: (id) => clerkClient.users.getUser(id).then(mapClerkUser),
    middleware: () => clerkMiddleware(),
    // ...
  };
}
```

### Phase 5: Self-hosted UI components

Create auth forms that work with Better Auth and NextAuth:

```
auth/components/
  sign-in-form.tsx    ← Email/password + OAuth buttons + phone tab
  sign-up-form.tsx    ← Registration with email verification
  user-button.tsx     ← Avatar dropdown (profile, sign out)
  org-switcher.tsx    ← Organization selector
  phone-login.tsx     ← Phone + SMS verification (uses @nebutra/sms)
```

These components use the unified `useSignIn()` / `useUser()` hooks, so they work regardless of provider.

When `authProvider: "clerk"`, these are NOT rendered — Clerk's built-in components are used instead.

### Phase 6: Preset config integration

```ts
// packages/preset/src/config.ts
export const AuthProviderId = z.enum(["clerk", "better-auth", "nextauth"]);

// Add to NebutraConfigSchema
authProvider: AuthProviderId.default("clerk"),
```

### Phase 7: proxy.ts dual-mode

```ts
// apps/web/src/proxy.ts
import { resolveConfig } from "@nebutra/preset";
import { createAuth } from "@nebutra/auth";

const config = resolveConfig();
const auth = createAuth({ provider: config.authProvider });

export default auth.middleware();
```

---

## SMS Integration

`@nebutra/sms` (already built) works with all three providers:
- **Clerk**: Not needed (Clerk has its own SMS, though unreliable in China)
- **Better Auth**: Wire into custom credentials provider for phone login
- **NextAuth**: Wire into Credentials provider with phone verification flow

---

## Migration Path

For existing Clerk users switching to Better Auth:
1. Change `authProvider: "better-auth"` in preset config
2. Run `prisma migrate dev` to create auth tables
3. Set OAuth env vars (GOOGLE_CLIENT_ID, etc.)
4. Deploy — self-hosted auth is live

No data migration needed — new users created in self-hosted DB. Existing Clerk users can re-register.

---

## Graceful Degradation

| Config | What happens |
|--------|-------------|
| `authProvider: "clerk"` (default) | Current behavior, no changes |
| `authProvider: "better-auth"` | Self-hosted, needs DB + OAuth env vars |
| `authProvider: "nextauth"` | Self-hosted, needs DB + OAuth env vars |
| No OAuth env vars | Email/password only |
| `@nebutra/sms` configured | Phone login available for all providers |

---

## Out of Scope

- Passkeys / WebAuthn (defer to provider-native support)
- SAML / Enterprise SSO (Clerk Enterprise or Better Auth enterprise plugin)
- User data migration between providers
- Multi-provider simultaneous (one provider at a time per deployment)

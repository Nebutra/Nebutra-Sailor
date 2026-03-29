# Nebutra-Sailor Auth Audit Report

## Executive Summary

The Nebutra-Sailor codebase is **tightly coupled to Clerk** across the web app and API gateway. While an abstract `@nebutra/auth` package exists, it serves primarily as a **documentation bridge** rather than a functional abstraction. Clerk implementations are hard-coded in 31+ files, making migration away from Clerk difficult.

---

## 1. @NEBUTRA/AUTH PACKAGE STRUCTURE

### Package Location
`packages/auth/` — A provider-agnostic abstraction layer (Phase 1 implementation only).

### File Structure
```
src/
├── types.ts              ← Canonical domain types (Session, User, Organization, SignInMethod)
├── server.ts             ← Factory function createAuth(config: AuthConfig)
├── client.ts             ← Client-side hook signatures (STUBS ONLY)
├── middleware.ts         ← Middleware factory (NOT IMPLEMENTED)
├── providers/
│   ├── clerk.ts          ← Clerk guidance bridge (returns null/throws)
│   ├── better-auth.ts    ← Better Auth implementation (WORKING)
│   └── nextauth.ts       ← NextAuth stub (NOT IMPLEMENTED)
├── components/           ← Re-exported sign-in/sign-up forms (UNUSED)
└── index.ts              ← Public exports
```

### Key Interface: AuthProvider
All providers must implement this contract:

```typescript
interface AuthProvider {
  provider: AuthProviderId;
  getSession(request?: Request): Promise<Session | null>;
  getUser(userId: string): Promise<User | null>;
  createUser(data: CreateUserInput): Promise<User>;
  getOrganization(orgId: string): Promise<Organization | null>;
  getUserOrganizations(userId: string): Promise<Organization[]>;
  createOrganization(data: CreateOrgInput): Promise<Organization>;
  middleware(): (req: Request) => Promise<Response | undefined>;
  handleWebhook(request: Request): Promise<void>;
}
```

### Clerk Provider Implementation (providers/clerk.ts)

**STATUS:** Documentation bridge — does NOT implement the interface functionally.

**Clerk Guidance Comments:**
- `getSession()`: Use `auth()` from `@clerk/nextjs/server` in server components
- `getUser()`: Use `clerkClient().users.getUser(userId)` 
- `createUser()`: Use `<SignUp />` component or `clerkClient().users.createUser()`
- `getOrganization()`: Use `clerkClient().organizations.getOrganization()`
- `getUserOrganizations()`: Use `clerkClient().users.getOrganizationMembershipList()` or `useOrganizationList()` in React
- `createOrganization()`: Use `<CreateOrganization />` component or `clerkClient().organizations.createOrganization()`
- `middleware()`: Throws — directs to use `clerkMiddleware()` from `@clerk/nextjs/server` directly
- `handleWebhook()`: Directs to Svix webhook verification (Clerk uses Svix backend)

### Dependencies
```json
{
  "better-auth": "^1.5.6",
  "@nebutra/logger": "workspace:*"
}
```
**NOTE:** No Clerk dependencies in `@nebutra/auth` package.json — Clerk is only referenced in documentation/comments.

---

## 2. WEB APP CLERK COUPLING (apps/web)

### Direct @clerk/nextjs Imports (31 files)

**Summary:** 31 files import from `@clerk/nextjs` or `@clerk/nextjs/server`.

### Critical Files

#### 1. `src/proxy.ts` (Edge Middleware)
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

export const proxy = hasClerkKey
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
      // ... intl middleware + CSP nonce
    })
  : devNoopProxy;
```
**Clerk APIs:** `clerkMiddleware()`, `auth.protect()`, `createRouteMatcher()`
**CSP Requirements:** Hardcoded Clerk domains:
- `https://clerk.accounts.dev`
- `https://*.clerk.accounts.dev`
- `https://api.clerk.com`
- `wss://*.clerk.accounts.dev`
- `https://img.clerk.com`

#### 2. `src/lib/auth.ts` (Auth Server Helpers)
```typescript
import { auth, currentUser } from "@clerk/nextjs/server";

export async function getAuth() {
  const { userId, orgId, sessionClaims } = await auth();
  return { userId, orgId, sessionClaims, isSignedIn: !!userId };
}

export async function getUser() {
  return await currentUser();
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return { userId };
}

export async function requireOrg() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/select-org");
  return { userId, orgId };
}

export async function getTenantContext() {
  const { orgId, sessionClaims } = await auth();
  return {
    tenantId: orgId,
    plan: (sessionClaims?.org_plan as string) || "FREE",
  };
}
```
**Clerk APIs:** `auth()`, `currentUser()` (server-side)
**Custom Claims:** `sessionClaims.org_plan` (custom Clerk session claim)

#### 3. `src/lib/api.ts` (API Client)
```typescript
export async function getAuthenticatedApi() {
  const { auth } = await import("@clerk/nextjs/server");
  const { getToken } = await auth();
  const token = (await getToken()) ?? undefined;  // ← Clerk JWT injection
  // ... returns client with token in Authorization header
}
```
**Clerk APIs:** `auth()`, `getToken()` (JWT extraction)

#### 4. `src/lib/api/client.ts` (Typed API Client)
```typescript
function createAuthMiddleware(token: string): Middleware {
  return {
    async onRequest({ request }) {
      request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  };
}

export async function getTypedApi() {
  const { auth } = await import("@clerk/nextjs/server");
  const { getToken } = await auth();
  const token = await getToken();
  
  const client = createClient<paths>({ baseUrl: API_BASE_URL });
  if (token) {
    client.use(createAuthMiddleware(token));
  }
  return client;
}
```
**Clerk APIs:** `auth()`, `getToken()`
**Comment:** "auto-injects Clerk JWT"

#### 5. `src/app/[locale]/layout.tsx` (Root Layout)
```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default async function RootLayout({ children, params }) {
  // ...
  return (
    <ClerkProvider nonce={nonce}>
      <html>
        <body>
          {/* ... */}
          <ErrorBoundary>{children}</ErrorBoundary>
          {/* ... */}
        </body>
      </html>
    </ClerkProvider>
  );
}
```
**Clerk APIs:** `<ClerkProvider />`
**Note:** Wraps entire app tree.

#### 6. `src/app/[locale]/providers/design-system-shell.tsx`
```typescript
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

function HeaderAuthControls() {
  const { isSignedIn } = useAuth();  // ← Client-side hook

  return (
    <div>
      {isSignedIn ? (
        <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
      ) : (
        <>
          <SignInButton mode="modal">
            <button>Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button>Sign Up</button>
          </SignUpButton>
        </>
      )}
    </div>
  );
}
```
**Clerk UI Components:** `<SignInButton />`, `<SignUpButton />`, `<UserButton />`
**Clerk Hooks:** `useAuth()`

#### 7. `src/components/auth/sign-in-form.tsx`
```typescript
import { useSignIn } from "@clerk/nextjs";

export function SignInForm() {
  const { signIn, fetchStatus } = useSignIn();  // ← Clerk sign-in hook

  async function handleSubmit(e) {
    await signIn.create({ identifier: email });
    const { error: pwError } = await signIn.password({ password, identifier: email });
    if (signIn.status === "complete") {
      await signIn.finalize();
      router.push("/");
    }
  }
  // ... form JSX
}
```
**Clerk APIs:** `useSignIn()` hook, `signIn.create()`, `signIn.password()`, `signIn.finalize()`
**Note:** Direct interaction with Clerk sign-in state machine.

#### 8. `src/components/auth/sign-up-form.tsx`
```typescript
import { useSignUp } from "@clerk/nextjs";

export function SignUpForm() {
  const { signUp, fetchStatus } = useSignUp();

  async function handleDetailsSubmit(e) {
    await signUp.create({ firstName, lastName, emailAddress: email });
    const { error: pwError } = await signUp.password({ password, emailAddress: email });
    await signUp.verifications.sendEmailCode();  // ← Email verification
    setPhase("verify");
  }

  async function handleVerify(e) {
    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize();
      router.push("/onboarding");
    }
  }
}
```
**Clerk APIs:** `useSignUp()`, `signUp.create()`, `signUp.password()`, `signUp.verifications.sendEmailCode()`, `signUp.verifications.verifyEmailCode()`, `signUp.finalize()`

#### 9. `src/components/auth/oauth-buttons.tsx`
```typescript
import { useSignIn, useSignUp } from "@clerk/nextjs";

export function OAuthButtons({ mode }) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
    const provider = mode === "signIn" ? signIn : signUp;
    await provider.sso({  // ← Clerk SSO
      strategy,
      redirectUrl: "/sso-callback",
      redirectCallbackUrl: mode === "signIn" ? "/" : "/onboarding",
    });
  }
}
```
**Clerk APIs:** `useSignIn()`, `useSignUp()`, `.sso()` method
**OAuth Strategies:** `oauth_google`, `oauth_github`

#### 10. `src/hooks/use-api.ts` (API Hook)
```typescript
import { useAuth } from "@clerk/nextjs";

export function useApi() {
  const { getToken } = useAuth();

  const authedGet = useCallback(
    async <T>(endpoint: string) => {
      const token = (await getToken()) ?? undefined;
      return api.get<T>(endpoint, { token });
    },
    [getToken],
  );
  // ... similar for POST, PUT, PATCH, DELETE
}
```
**Clerk APIs:** `useAuth()`, `getToken()`

#### 11. `src/hooks/usePermission.ts` (Permission Hook)
```typescript
import { useOrganization } from "@clerk/nextjs";

export function usePermission(): UsePermissionReturn {
  const { membership, isLoaded } = useOrganization();  // ← Clerk org context
  const role = resolveRole(membership?.role);  // membership.role from Clerk

  return {
    role,
    isLoading: !isLoaded,
    can: (scope) => hasPermission(role, scope),
    // ...
  };
}
```
**Clerk APIs:** `useOrganization()`, `membership.role`
**Note:** Permission logic tied to Clerk org roles.

#### 12. `src/app/[locale]/select-org/page.tsx`
```typescript
import { OrganizationList } from "@clerk/nextjs";

export default function SelectOrgPage() {
  return (
    <div>
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl="/"
        afterCreateOrganizationUrl="/onboarding"
      />
    </div>
  );
}
```
**Clerk UI Components:** `<OrganizationList />`
**Note:** Entire org selection flow delegated to Clerk component.

#### 13. `src/app/[locale]/(app)/settings/page.tsx`
```typescript
import { currentUser } from "@clerk/nextjs/server";

export default async function SettingsPage() {
  const user = await currentUser();

  return (
    <dl>
      <div>
        <dt>Name</dt>
        <dd>{user?.fullName ?? "—"}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{user?.primaryEmailAddress?.emailAddress ?? "—"}</dd>
      </div>
    </dl>
  );
}
```
**Clerk APIs:** `currentUser()`, accessing `fullName`, `primaryEmailAddress.emailAddress`

#### 14. Admin Pages (src/app/[locale]/(app)/admin/*)
Admin section uses `@clerk/backend` (backend SDK) for listing users/organizations.

---

## 3. API GATEWAY CLERK COUPLING (apps/api-gateway)

### File 1: `src/middlewares/tenantContext.ts`
```typescript
import { verifyToken } from "@clerk/backend";

export async function tenantContextMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (token) {
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY ?? "",
      });

      const userId = payload.sub;
      const organizationId = typeof payload.org_id === "string" ? payload.org_id : undefined;
      const role = typeof payload.org_role === "string" ? payload.org_role : undefined;

      if (userId) tenant.userId = userId;
      if (organizationId) tenant.organizationId = organizationId;
      if (role) tenant.role = role;
    } catch (error) {
      logger.warn("JWT verification failed, treating as unauthenticated", { error });
    }
  }

  c.set("tenant", tenant);
  await next();
}
```
**Clerk APIs:** `verifyToken()` from `@clerk/backend`
**JWT Claims Extraction:** 
- `payload.sub` → userId
- `payload.org_id` → organizationId
- `payload.org_role` → role
**Environment:** `CLERK_SECRET_KEY` required for verification.

### File 2: `src/routes/webhooks/clerk.ts`
```typescript
import { Webhook } from "svix";

export function createClerkWebhookRoutes(repos?: Partial<ClerkRepos>) {
  const app = new OpenAPIHono();

  app.openapi(clerkWebhookRoute, async (c) => {
    const rawBody = await c.req.text();
    const svixId = c.req.header("svix-id");
    const svixTimestamp = c.req.header("svix-timestamp");
    const svixSignature = c.req.header("svix-signature");

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return c.json({ error: "Webhook not configured" }, 500);
    }

    let payload: ClerkWebhookEvent;
    try {
      const wh = new Webhook(webhookSecret);
      payload = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      return c.json({ error: "Invalid signature" }, 400);
    }

    // Handle events...
  });

  return app;
}
```
**Clerk Webhooks Provider:** Svix
**Webhook Events Handled:**
- `user.created`, `user.updated`, `user.deleted`
- `organization.created`, `organization.updated`, `organization.deleted`
- `organizationMembership.created`, `organizationMembership.deleted`

**Event Handlers:**
```typescript
async function handleUserCreated(data: ClerkUserData, repo: UserRepository) {
  const email = resolvePrimaryEmail(data);
  const name = resolveUserName(data);
  const avatarUrl = data.image_url ?? data.profile_image_url ?? null;

  await repo.create({
    clerkId: data.id,  // ← Stores Clerk user ID
    email,
    name,
    avatarUrl,
  });
}

function mapClerkRole(clerkRole: string): Role {
  const roleMap = {
    "org:owner": "OWNER",
    "org:admin": "ADMIN",
    "org:member": "MEMBER",
    "org:viewer": "VIEWER",
  };
  return roleMap[clerkRole] ?? "MEMBER";
}
```
**Database Synchronization:** Webhooks sync Clerk data (users, orgs, memberships) to local Prisma database.

### File 3: `src/config/env.ts`
```typescript
const envSchema = z.object({
  // ...
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  // ...
});
```
**Required Environment Variables:**
- `CLERK_SECRET_KEY` (required) — for JWT verification
- `CLERK_WEBHOOK_SECRET` (optional) — for webhook verification

---

## 4. PRESET CONFIGURATION (packages/preset)

### File: `src/config.ts`
```typescript
export const AuthProviderId = z.enum(["clerk", "better-auth", "nextauth"]);

export const NebutraConfigSchema = z.object({
  authProvider: AuthProviderId.default("clerk"),
});
```
**Default:** `clerk`

**Usage:** Allows configuration of auth provider at startup, but **does not affect runtime behavior** — Clerk imports are hard-coded throughout apps/web.

---

## 5. COUPLING SUMMARY TABLE

| Component | Clerk Dependency | Impact | Refactor Difficulty |
|-----------|------------------|--------|---------------------|
| **Middleware (proxy.ts)** | `clerkMiddleware()` | Edge auth layer | High — affects all requests |
| **Server Helpers (auth.ts)** | `auth()`, `currentUser()` | Session/user resolution | Medium — localized to lib/ |
| **API Clients (api.ts, client.ts)** | `auth().getToken()` | JWT injection | Medium — token generation only |
| **Root Layout** | `<ClerkProvider />` | App tree wrapper | Low — replace with provider factory |
| **Auth Forms (sign-in, sign-up)** | `useSignIn()`, `useSignUp()` | Sign-in flow | High — core UX |
| **OAuth Buttons** | `.sso()`, `oauth_google`, `oauth_github` | OAuth integration | High — provider-specific |
| **UI Components** | `<SignInButton />`, `<UserButton />`, `<OrganizationList />` | Brand UI elements | Low — replaceab with custom components |
| **Permission Hook** | `useOrganization()`, `membership.role` | Authorization logic | High — auth claims extraction |
| **Admin Pages** | Clerk backend SDK | User/org management UI | Medium — backend only |
| **API Gateway JWT Verification** | `verifyToken()` from `@clerk/backend` | Auth validation | High — every request |
| **Webhook Handler** | Svix + Clerk event types | Data synchronization | High — DB sync pipeline |

---

## 6. KEY FINDINGS

### Abstraction Layer Issues
1. **`@nebutra/auth` is incomplete:**
   - Clerk provider throws or returns `null` in most methods
   - Client-side hooks are stubs (`client.ts` has no implementation)
   - Middleware factory is not implemented
   - Package has no Clerk dependencies (correct design, but misleading)

2. **Web App Ignores Abstraction:**
   - 31 files import `@clerk/nextjs` directly
   - No usage of `@nebutra/auth` anywhere in apps/web
   - `@nebutra/auth` components are never imported

3. **API Gateway is Clerk-specific:**
   - JWT verification hardcoded to Clerk
   - Webhook handler is Clerk+Svix-specific
   - No abstraction layer used

### Runtime Data Flow

```
Browser
  ↓
proxy.ts (clerkMiddleware)
  ↓
Session resolved via auth()
  ↓
API Client calls getToken() for JWT
  ↓
API Gateway (tenantContextMiddleware)
  ↓
verifyToken() extracts userId, orgId, role
  ↓
Database (User, Organization, OrganizationMember tables synced via Clerk webhooks)
```

### Environment Variable Requirements
**Required in production:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (web app)
- `CLERK_SECRET_KEY` (web app + API gateway)
- `CLERK_WEBHOOK_SECRET` (API gateway)

**CSP hardcoded for Clerk domains** in proxy.ts.

### Clerk-Specific Features Used
1. **Organizations** — Multi-tenant via Clerk org management
2. **Roles** — Clerk org roles (`org:owner`, `org:admin`, `org:member`, `org:viewer`)
3. **Custom Claims** — `org_plan` stored in session claims
4. **OAuth** — Google + GitHub via Clerk
5. **Email Verification** — Built into sign-up flow
6. **Webhooks** — Svix-based event delivery

---

## 7. REFACTORING ROADMAP (Phases)

### Phase 1: Abstract the Web App (Medium Effort)
1. Implement `@nebutra/auth/client` hooks as wrappers
2. Create `NebutraAuthProvider` factory that selects provider at runtime
3. Replace Clerk UI components with custom implementations using auth hooks

### Phase 2: Migrate API Gateway (High Effort)
1. Update `tenantContextMiddleware` to support provider-agnostic JWT verification
2. Create webhook dispatcher that routes to provider-specific handlers
3. Implement Better Auth + NextAuth webhook handlers

### Phase 3: Full Multi-Provider Support (High Effort)
1. Implement Better Auth client hooks
2. Implement NextAuth client hooks
3. Add environment-based provider selection (fallback to Clerk if no config)

---

## 8. FILES TO REFACTOR (Prioritized)

### Critical Path (Blocking Other Work)
1. `apps/web/src/proxy.ts` — Middleware selection
2. `apps/web/src/lib/auth.ts` — Session helpers
3. `apps/api-gateway/src/middlewares/tenantContext.ts` — JWT verification

### High Priority
4. `apps/web/src/app/[locale]/layout.tsx` — Auth provider selection
5. `apps/web/src/components/auth/sign-in-form.tsx` — Sign-in flow
6. `apps/web/src/components/auth/sign-up-form.tsx` — Sign-up flow
7. `apps/web/src/hooks/usePermission.ts` — Permission extraction
8. `apps/api-gateway/src/routes/webhooks/clerk.ts` — Webhook dispatcher

### Medium Priority
9. `apps/web/src/app/[locale]/providers/design-system-shell.tsx` — Auth UI components
10. `apps/web/src/hooks/use-api.ts` — API client token injection
11. All admin pages (listed above)

### Low Priority (Can Wait)
12. `apps/web/src/lib/api.ts` — Generic API client
13. `apps/web/src/lib/api/client.ts` — Typed API client
14. `apps/web/src/app/[locale]/select-org/page.tsx` — Org selection (can use custom component)


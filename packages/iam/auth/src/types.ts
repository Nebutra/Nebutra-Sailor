/**
 * @nebutra/auth — Unified auth type definitions
 *
 * These types define the provider-agnostic interface that all auth providers
 * (Clerk, Better Auth, NextAuth/Auth.js) must implement.
 */

// ─── Provider ID ───

/** Supported auth provider identifiers. */
export type AuthProviderId = "clerk" | "better-auth" | "nextauth" | "supabase" | "dev";

// ─── Configuration ───

/** Configuration passed to `createAuth()` to select and configure a provider. */
export interface AuthConfig {
  /** Which auth provider to use. */
  provider: AuthProviderId;

  /**
   * Optional provider-specific settings.
   * Each provider may define its own shape here.
   */
  options?: Record<string, unknown>;
}

// ─── Canonical Domain Types ───

/** A normalised user session returned by any provider. */
export interface Session {
  /** The authenticated user's ID. */
  userId: string;

  /** Active organization ID (multi-tenant). */
  organizationId?: string;

  /** Role within the active organization. */
  role?: string;

  /** User email (convenience — also on `User`). */
  email?: string;

  /** When the session expires. */
  expiresAt: Date;
}

/** Canonical user record. */
export interface User {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  imageUrl?: string;
  createdAt: Date;
}

/** Canonical organization record. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
}

// ─── Sign-in Methods ───

/** Discriminated union of supported sign-in methods. */
export type SignInMethod =
  | { type: "email-password"; email: string; password: string }
  | { type: "oauth"; provider: string; redirectUrl?: string }
  | { type: "phone"; phone: string; code: string };

/**
 * Result of an attempted sign-in.
 *
 * Providers should never throw on auth failures — return a normalized
 * `{ ok: false, error: { code, message } }` so call sites can branch on
 * `result.ok` without try/catch. Reserved error codes:
 *   • "invalid-credentials" — bad email/password
 *   • "client-side-only"    — method requires browser-side completion
 *                              (Clerk OAuth redirects, etc.)
 *   • "unsupported"         — provider does not support this method
 *   • "unknown"             — anything else; `message` carries detail
 */
export interface SignInResult {
  ok: boolean;
  userId?: string;
  organizationId?: string;
  /** For OAuth / magic-link flows where the browser must be redirected. */
  redirectTo?: string;
  error?: { code: string; message: string };
}

// ─── Capabilities (runtime probe) ───

/**
 * Runtime probe of what an auth provider instance actually supports.
 *
 * The probe reflects **runtime reality**, not config intent. For Better Auth,
 * plugin loading can fail silently — `capabilities` must reflect whether
 * the methods actually mounted on `auth.api`, not which plugins the operator
 * tried to enable.
 *
 * Apps should use this to gate UI affordances (e.g. only show the "Sign in
 * with passkey" button if `auth.capabilities.passkeys === true`).
 */
export interface AuthCapabilities {
  /** WebAuthn / passkey sign-in is available. */
  passkeys: boolean;
  /** Multi-tenant organizations (create, list, switch active org). */
  organizations: boolean;
  /** TOTP / authenticator-app second factor. */
  twoFactor: boolean;
  /** Passwordless email magic-link sign-in. */
  magicLink: boolean;
  /** Admin can impersonate another user. */
  impersonation: boolean;
}

// ─── Mutation Inputs ───

/** Input for creating a new user. */
export interface CreateUserInput {
  email?: string;
  phone?: string;
  name?: string;
  password?: string;
  imageUrl?: string;
}

/** Input for creating a new organization. */
export interface CreateOrgInput {
  name: string;
  slug?: string;
  plan?: string;
  createdByUserId: string;
}

// ─── Optional Capability Shapes (per ADR D5 / Phase 1.3) ───
//
// These are typed groupings of related methods that providers MAY implement.
// They are **optional properties** on AuthProvider — apps MUST type-narrow via
// the `capabilities` probe before calling, e.g.:
//
//   if (auth.capabilities.organizations && auth.organizations) {
//     await auth.organizations.create({ name: "Acme" });
//   }
//
// Per ADR D2, Better Auth is the only provider that exposes these shapes.
// Clerk reports `capabilities.passkeys === true` but `provider.passkeys` is
// `undefined` — consumers go through `@clerk/nextjs` directly. NextAuth's
// capabilities are all false; its shapes are likewise undefined.

/**
 * Result of {@link OrganizationCapability.setActive}.
 *
 * Callers MUST forward `headers` (typically a `Set-Cookie` rotating the
 * Better Auth session token to bind it to the new active org) onto the
 * outgoing HTTP response. Without this, the active organization selection
 * will not persist across subsequent requests.
 *
 * @example
 * ```ts
 * const result = await auth.organizations!.setActive(req, orgId);
 * return new Response(JSON.stringify({ ok: true }), { headers: result.headers });
 * ```
 *
 * Design note (Phase 2.3 / ADR D6): we surface this as an explicit return
 * value rather than hiding the cookie write inside middleware because there
 * is exactly ONE consumer of `setActive` in the codebase (the org-switcher
 * route). Following the Linear / Vercel SDK convention for low-consumer
 * APIs, explicit beats magical.
 */
export interface SetActiveResult {
  /** Response headers from the provider — forward to the outgoing HTTP response. */
  headers: Headers;
}

/** Multi-tenant organization management. */
export interface OrganizationCapability {
  /** Create a new organization. */
  create(input: {
    name: string;
    slug?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Organization>;
  /** List organizations a user belongs to. */
  list(userId: string): Promise<Organization[]>;
  /**
   * Set the active organization on a request's session.
   *
   * Returns a {@link SetActiveResult} carrying the provider's response
   * headers — callers MUST forward these (typically `Set-Cookie`) onto the
   * outgoing HTTP response, otherwise the selection will not persist.
   *
   * Throws when the user is not a member of the target organization,
   * the org does not exist, or the provider rejects the request.
   */
  setActive(req: Request, organizationId: string): Promise<SetActiveResult>;
  /** Invite a user to an organization by email. */
  invite(input: {
    email: string;
    organizationId: string;
    role?: string;
  }): Promise<{ invitationId: string }>;
  /** Accept a pending invitation. */
  acceptInvite(invitationId: string, userId: string): Promise<{ organizationId: string }>;
  /** List members of an organization. */
  members(organizationId: string): Promise<Array<{ userId: string; role: string; joinedAt: Date }>>;
  /** Remove a member from an organization. */
  removeMember(organizationId: string, userId: string): Promise<void>;
  /** Change a member's role. */
  updateMemberRole(organizationId: string, userId: string, role: string): Promise<void>;
}

/** WebAuthn / passkey enrollment + authentication. */
export interface PasskeyCapability {
  /** Begin passkey registration — returns a challenge for the browser to sign. */
  register(input: {
    userId: string;
    name?: string;
  }): Promise<{ challenge: string; options: unknown }>;
  /** Complete passkey authentication using the signed challenge response. */
  authenticate(input: { challenge: string; response: unknown }): Promise<SignInResult>;
  /** List a user's registered passkeys. */
  list(userId: string): Promise<Array<{ id: string; name?: string; createdAt: Date }>>;
  /** Revoke a passkey by id. */
  revoke(passkeyId: string): Promise<void>;
}

/** TOTP / authenticator-app second factor. */
export interface TwoFactorCapability {
  /** Enroll a user — returns TOTP secret + provisioning URI + backup codes. */
  enroll(userId: string): Promise<{ secret: string; otpauthUrl: string; backupCodes: string[] }>;
  /** Verify a TOTP / backup code. */
  verify(input: { userId: string; code: string }): Promise<{ ok: boolean }>;
  /** Regenerate (or view current) backup codes. */
  backupCodes(userId: string): Promise<{ codes: string[] }>;
  /** Disable 2FA for a user. */
  disable(userId: string): Promise<void>;
}

/** Passwordless email magic-link sign-in. */
export interface MagicLinkCapability {
  /** Send a magic link to the given email. */
  send(input: { email: string; redirectTo?: string }): Promise<{ ok: boolean }>;
  /** Verify the token from a clicked magic link and return a sign-in result. */
  verify(token: string): Promise<SignInResult>;
}

// ─── Provider Interface ───

/**
 * The unified auth provider interface.
 *
 * Every provider adapter must implement this contract so that application code
 * can call the same methods regardless of the underlying auth system.
 */
export interface AuthProvider {
  /** Which provider this instance wraps. */
  readonly provider: AuthProviderId;

  // ── Session & User ──

  /** Resolve the current session from an incoming request. */
  getSession(request?: Request): Promise<Session | null>;

  /** Fetch a user by ID. */
  getUser(userId: string): Promise<User | null>;

  /** Create a new user (self-hosted providers only). */
  createUser(data: CreateUserInput): Promise<User>;

  // ── Organizations (multi-tenant) ──

  /** Fetch an organization by ID. */
  getOrganization(orgId: string): Promise<Organization | null>;

  /** List all organizations a user belongs to. */
  getUserOrganizations(userId: string): Promise<Organization[]>;

  /** Create a new organization. */
  createOrganization(data: CreateOrgInput): Promise<Organization>;

  // ── Sign-in / Sign-out ──

  /**
   * Attempt a sign-in using the given method.
   *
   * Returns a normalized {@link SignInResult}. Implementations must NOT throw
   * on authentication failures — return `{ ok: false, error }` instead so
   * callers can branch on `result.ok` without try/catch.
   */
  signIn(method: SignInMethod): Promise<SignInResult>;

  /** End the current session associated with the incoming request. */
  signOut(request: Request): Promise<void>;

  // ── Capabilities ──

  /**
   * Runtime probe of which features this provider instance actually supports.
   * Reflects mounted plugins / live API surface — not config intent.
   */
  readonly capabilities: Readonly<AuthCapabilities>;

  // ── Middleware & Webhooks ──

  /** Return a request handler suitable for use as middleware (e.g. in proxy.ts). */
  middleware(): (req: Request) => Promise<Response | undefined>;

  /** Handle an incoming webhook from the auth provider. */
  handleWebhook(request: Request): Promise<void>;

  // ── Optional capability shapes (per ADR D5) ──
  //
  // Present only when the underlying provider plugin / SDK exposes the
  // feature at runtime. Apps must type-narrow via `capabilities.<feature>`
  // before calling — see the docs on each interface above.

  // Note: the explicit `| undefined` on each optional capability is required
  // because tsconfig.base sets `exactOptionalPropertyTypes: true`. With that
  // flag, `foo?: T` means "either omitted OR of exactly type T" — providers
  // that opt out of a capability by writing `{ organizations: undefined }`
  // would otherwise be rejected. Adding `| undefined` keeps the optional
  // semantics for consumers (narrow via `capabilities.<feature>`) while
  // letting providers be explicit about which capabilities they don't ship.

  /** Organization management — present when `capabilities.organizations === true`. */
  readonly organizations?: OrganizationCapability | undefined;

  /** Passkey / WebAuthn flows — present when `capabilities.passkeys === true`. */
  readonly passkeys?: PasskeyCapability | undefined;

  /** TOTP / 2FA flows — present when `capabilities.twoFactor === true`. */
  readonly twoFactor?: TwoFactorCapability | undefined;

  /** Magic-link sign-in — present when `capabilities.magicLink === true`. */
  readonly magicLink?: MagicLinkCapability | undefined;
}

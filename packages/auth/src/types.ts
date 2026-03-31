/**
 * @nebutra/auth — Unified auth type definitions
 *
 * These types define the provider-agnostic interface that all auth providers
 * (Clerk, Better Auth) must implement.
 */

// ─── Provider ID ───

/** Supported auth provider identifiers. */
export type AuthProviderId = "clerk" | "better-auth" | "nextauth";

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

  // ── Middleware & Webhooks ──

  /** Return a request handler suitable for use as middleware (e.g. in proxy.ts). */
  middleware(): (req: Request) => Promise<Response | undefined>;

  /** Handle an incoming webhook from the auth provider. */
  handleWebhook(request: Request): Promise<void>;
}

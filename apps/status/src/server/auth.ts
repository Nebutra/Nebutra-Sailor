/**
 * Self-hosted accounts: local email + password members, cookie sessions, and
 * API keys for machines.
 *
 * Nothing secret is stored in the clear. Passwords are scrypt hashes; session
 * cookies and API keys are random tokens of which only the sha256 is kept, so
 * a database dump cannot be replayed against the instance.
 *
 * The first owner can only be created while the instance has no members and
 * the caller presents STATUS_SETUP_TOKEN. Without that variable, setup is
 * closed — an instance exposed before its operator got to it cannot be claimed
 * by whoever finds it first.
 */
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { MemberRole } from "@/generated/prisma/client";
import type { StatusDb } from "./db";

export const SESSION_COOKIE = "ns_session";
export const SESSION_TTL_SECONDS = 30 * 86_400;

export const API_KEY_SCOPES = ["status:read", "evidence:write", "incidents:write"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export type { MemberRole };

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export class AuthError extends Error {
  constructor(
    readonly code:
      | "setup_disabled"
      | "setup_token_invalid"
      | "already_set_up"
      | "invalid_input"
      | "forbidden",
    message?: string,
  ) {
    super(message ?? code);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/** Constant-time string comparison that does not leak length through early return timing. */
function safeEqualString(a: string, b: string): boolean {
  return safeEqualHex(sha256(a), sha256(b));
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/** `salt:hash`, both hex. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"));
  return safeEqualHex(key.toString("hex"), hashHex);
}

// A hash of a password nobody has, so an unknown email costs the same scrypt
// time as a wrong password and does not reveal which addresses are members.
let decoyHash: Promise<string> | null = null;
function decoy(): Promise<string> {
  decoyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return decoyHash;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── Sessions ────────────────────────────────────────────────────────────────

export interface SessionMember {
  id: string;
  workspaceId: string;
  email: string;
  name: string | null;
  role: MemberRole;
}

export interface IssuedSession {
  /** The cookie value. Shown once; only its hash is stored. */
  token: string;
  expiresAt: Date;
  member: SessionMember;
}

/** Read the session token out of a Cookie header. */
export function sessionTokenFromCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      const value = part.slice(index + 1).trim();
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

/** `Set-Cookie` value for an issued session. */
export function sessionCookie(token: string, expiresAt: Date): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/** `Set-Cookie` value that clears the session cookie. */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

const memberSelect = { id: true, workspaceId: true, email: true, name: true, role: true } as const;

async function issueSession(
  db: StatusDb,
  member: SessionMember,
  now: Date,
): Promise<IssuedSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await db.session.create({ data: { id: sha256(token), memberId: member.id, expiresAt } });
  return { token, expiresAt, member };
}

/**
 * The member behind a request. Accepts either the raw Cookie header or the
 * bare token. Expired sessions are deleted on sight.
 */
export async function getSessionMember(
  db: StatusDb,
  cookieHeaderOrToken: string | null | undefined,
  now: Date = new Date(),
): Promise<SessionMember | null> {
  if (!cookieHeaderOrToken) return null;
  const token = cookieHeaderOrToken.includes("=")
    ? sessionTokenFromCookie(cookieHeaderOrToken)
    : cookieHeaderOrToken.trim();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { member: { select: memberSelect } },
  });
  if (!session) return null;
  if (session.expiresAt <= now) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session.member;
}

export async function signIn(
  db: StatusDb,
  email: string,
  password: string,
  now: Date = new Date(),
): Promise<IssuedSession | null> {
  // A self-hosted instance has one workspace; should an email exist in several,
  // the oldest membership wins.
  const member = await db.member.findFirst({
    where: { email: normalizeEmail(email) },
    orderBy: { createdAt: "asc" },
    select: { ...memberSelect, passwordHash: true },
  });
  if (!member?.passwordHash) {
    await verifyPassword(password, await decoy());
    return null;
  }
  if (!(await verifyPassword(password, member.passwordHash))) return null;
  const { passwordHash: _omit, ...publicMember } = member;
  return issueSession(db, publicMember, now);
}

export async function signOut(db: StatusDb, token: string): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { id: sha256(token) } });
}

// ── First-run setup ─────────────────────────────────────────────────────────

export const setupOwnerSchema = z.object({
  setupToken: z.string().min(1),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(256),
  name: z.string().trim().min(1).max(120).optional(),
  workspaceSlug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  workspaceName: z.string().trim().min(1).max(120).optional(),
});
export type SetupOwnerInput = z.input<typeof setupOwnerSchema>;

/** Whether this instance still accepts a first owner. */
export async function setupAvailable(
  db: StatusDb,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (!env.STATUS_SETUP_TOKEN) return false;
  return (await db.member.count()) === 0;
}

/**
 * Create the first owner — and the workspace, if `status.config.json` has not
 * already — then sign them in.
 */
export async function setupOwner(
  db: StatusDb,
  raw: SetupOwnerInput,
  options: { env?: NodeJS.ProcessEnv; now?: Date } = {},
): Promise<IssuedSession> {
  const env = options.env ?? process.env;
  const expected = env.STATUS_SETUP_TOKEN;
  if (!expected) throw new AuthError("setup_disabled", "STATUS_SETUP_TOKEN is not set");
  const parsed = setupOwnerSchema.safeParse(raw);
  if (!parsed.success) throw new AuthError("invalid_input", parsed.error.issues[0]?.message);
  const input = parsed.data;
  if (!safeEqualString(input.setupToken, expected)) throw new AuthError("setup_token_invalid");

  const passwordHash = await hashPassword(input.password);
  const member = await db.$transaction(async (tx) => {
    // Serialise concurrent setups: the second waits, then sees a member.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242)`;
    if ((await tx.member.count()) > 0) throw new AuthError("already_set_up");
    const workspace = await tx.workspace.upsert({
      where: { slug: input.workspaceSlug },
      create: { slug: input.workspaceSlug, name: input.workspaceName ?? input.workspaceSlug },
      update: {},
    });
    return tx.member.create({
      data: {
        workspaceId: workspace.id,
        email: normalizeEmail(input.email),
        name: input.name ?? null,
        passwordHash,
        role: "owner",
      },
      select: memberSelect,
    });
  });
  return issueSession(db, member, options.now ?? new Date());
}

// ── Roles ───────────────────────────────────────────────────────────────────

const ROLE_RANK: Record<MemberRole, number> = { editor: 0, admin: 1, owner: 2 };

export function hasRole(member: Pick<SessionMember, "role">, atLeast: MemberRole): boolean {
  return ROLE_RANK[member.role] >= ROLE_RANK[atLeast];
}

export const canManageKeys = (member: Pick<SessionMember, "role">) => hasRole(member, "admin");
export const canWriteIncidents = (member: Pick<SessionMember, "role">) => hasRole(member, "editor");

// ── API keys ────────────────────────────────────────────────────────────────

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AuthenticatedKey {
  id: string;
  workspaceId: string;
  scopes: ApiKeyScope[];
}

const scopesSchema = z.array(z.enum(API_KEY_SCOPES)).min(1);

const keySummarySelect = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

/** Returns the plaintext key once. Only its sha256 is stored. */
export async function createApiKey(
  db: StatusDb,
  workspaceId: string,
  name: string,
  scopes: ApiKeyScope[],
): Promise<{ key: string; apiKey: ApiKeySummary }> {
  const parsedScopes = scopesSchema.safeParse([...new Set(scopes)]);
  const trimmed = name.trim();
  if (!parsedScopes.success || !trimmed || trimmed.length > 120) {
    throw new AuthError("invalid_input", "A key needs a name and at least one known scope");
  }
  const key = `ns_${randomBytes(32).toString("base64url")}`;
  const row = await db.apiKey.create({
    data: {
      workspaceId,
      name: trimmed,
      prefix: key.slice(0, 10),
      hash: sha256(key),
      scopes: parsedScopes.data,
    },
    select: keySummarySelect,
  });
  return { key, apiKey: row as ApiKeySummary };
}

export async function listApiKeys(db: StatusDb, workspaceId: string): Promise<ApiKeySummary[]> {
  const rows = await db.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: keySummarySelect,
  });
  return rows as ApiKeySummary[];
}

/** Revoke within a workspace; returns false when the key is not that workspace's. */
export async function revokeApiKey(
  db: StatusDb,
  workspaceId: string,
  keyId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const { count } = await db.apiKey.updateMany({
    where: { id: keyId, workspaceId, revokedAt: null },
    data: { revokedAt: now },
  });
  return count > 0;
}

/** Pull the key out of `Authorization: Bearer ns_…`. */
export function bearerToken(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(headerValue.trim());
  return match?.[1] ?? null;
}

/**
 * Authenticate an Authorization header. Unknown, revoked, or under-scoped
 * keys all return null — callers answer 401/403 without saying which.
 */
export async function authenticateApiKey(
  db: StatusDb,
  headerValue: string | null | undefined,
  requiredScope: ApiKeyScope,
  now: Date = new Date(),
): Promise<AuthenticatedKey | null> {
  const token = bearerToken(headerValue);
  if (!token?.startsWith("ns_")) return null;
  const row = await db.apiKey.findUnique({
    where: { hash: sha256(token) },
    select: { id: true, workspaceId: true, scopes: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;
  const scopes = row.scopes.filter((s): s is ApiKeyScope =>
    (API_KEY_SCOPES as readonly string[]).includes(s),
  );
  if (!scopes.includes(requiredScope)) return null;
  await db.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: now } });
  return { id: row.id, workspaceId: row.workspaceId, scopes };
}

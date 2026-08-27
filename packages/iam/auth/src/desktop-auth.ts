import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@nebutra/db";

const DESKTOP_AUTH_SCHEMES = new Set([
  "foundry",
  "foundrypreview",
  "foundrydev",
  "foundrylocal",
  "foundryoss",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HANDOFF_TOKEN_PREFIX = "ndh_";
const SESSION_TOKEN_PREFIX = "nds_";
const HANDOFF_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type DesktopAuthMode = "sign-in" | "sign-up";

export type DesktopAuthRequest =
  | {
      ok: true;
      scheme: string;
      state: string;
      publicBeta: boolean;
    }
  | { ok: false; reason: "invalid_scheme" | "invalid_state" };

export interface DesktopAuthExecuteRawClient {
  $executeRaw: (query: Prisma.Sql) => Promise<number>;
}

export interface DesktopAuthQueryRawClient extends DesktopAuthExecuteRawClient {
  $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>;
}

export interface DesktopAuthTransactionClient {
  $transaction: PrismaClient["$transaction"];
}

interface BuildDesktopAuthStartUrlOptions {
  defaultLocale?: string;
}

interface IssueDesktopAuthHandoffOptions {
  client: DesktopAuthExecuteRawClient;
  userId: string;
  scheme: string;
  state: string;
  request: Request;
  now?: Date;
}

interface ConsumeDesktopAuthHandoffOptions {
  client: DesktopAuthTransactionClient;
  token: string;
  request: Request;
  now?: Date;
}

interface ResolveDesktopSessionOptions {
  client: DesktopAuthQueryRawClient;
  request: Request;
  now?: Date;
}

interface HandoffRow {
  id: string;
  user_id: string;
  scheme: string;
  state: string;
}

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

interface SessionRow extends UserRow {
  session_id: string;
  user_id: string;
  scheme: string;
  expires_at: Date | string;
}

export interface DesktopAuthUser {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}

export interface DesktopAuthSession {
  sessionId: string;
  scheme: string;
  expiresAt: Date | string;
  user: DesktopAuthUser;
}

export interface DesktopAuthExchange extends DesktopAuthSession {
  accessToken: string;
  tokenType: "Bearer";
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashDesktopAuthToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function clientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

function userAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}

function toDesktopUser(row: UserRow): DesktopAuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    imageUrl: row.image,
  };
}

function parseParams(source: Request | URL | URLSearchParams): URLSearchParams {
  if (source instanceof Request) return new URL(source.url).searchParams;
  if (source instanceof URL) return source.searchParams;
  return source;
}

export function parseDesktopAuthRequest(
  source: Request | URL | URLSearchParams,
): DesktopAuthRequest {
  const params = parseParams(source);
  const scheme = params.get("scheme")?.trim().toLowerCase() ?? "";
  const state = params.get("state")?.trim() ?? "";

  if (!DESKTOP_AUTH_SCHEMES.has(scheme)) {
    return { ok: false, reason: "invalid_scheme" };
  }

  if (!UUID_RE.test(state)) {
    return { ok: false, reason: "invalid_state" };
  }

  return {
    ok: true,
    scheme,
    state,
    publicBeta: params.get("public_beta") === "true",
  };
}

export function buildDesktopAuthStartUrl(
  request: Request,
  mode: DesktopAuthMode,
  options: BuildDesktopAuthStartUrlOptions = {},
): URL {
  const defaultLocale = options.defaultLocale ?? "en";
  const origin = new URL(request.url).origin;
  const authPath = mode === "sign-up" ? "sign-up" : "sign-in";
  const target = new URL(`/${defaultLocale}/${authPath}`, origin);
  const parsed = parseDesktopAuthRequest(request);

  if (!parsed.ok) {
    target.searchParams.set("error", "invalid_desktop_auth_request");
    return target;
  }

  const complete = new URL(`/${defaultLocale}/desktop-auth/complete`, origin);
  complete.searchParams.set("scheme", parsed.scheme);
  complete.searchParams.set("state", parsed.state);
  complete.searchParams.set("mode", mode);
  if (parsed.publicBeta) {
    complete.searchParams.set("public_beta", "true");
  }

  target.searchParams.set("returnUrl", `${complete.pathname}${complete.search}`);
  return target;
}

export async function issueDesktopAuthHandoff({
  client,
  userId,
  scheme,
  state,
  request,
  now = new Date(),
}: IssueDesktopAuthHandoffOptions): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = `${HANDOFF_TOKEN_PREFIX}${randomToken()}`;
  const expiresAt = new Date(now.getTime() + HANDOFF_TTL_MS);

  await client.$executeRaw(Prisma.sql`
    INSERT INTO "public"."desktop_auth_handoffs" (
      "id",
      "token_hash",
      "user_id",
      "scheme",
      "state",
      "expires_at",
      "ip_address",
      "user_agent",
      "created_at"
    )
    VALUES (
      ${randomUUID()},
      ${hashDesktopAuthToken(rawToken)},
      ${userId},
      ${scheme},
      ${state},
      ${expiresAt},
      ${clientIp(request)},
      ${userAgent(request)},
      ${now}
    )
  `);

  return { token: rawToken, expiresAt };
}

export async function consumeDesktopAuthHandoff({
  client,
  token,
  request,
  now = new Date(),
}: ConsumeDesktopAuthHandoffOptions): Promise<DesktopAuthExchange | null> {
  if (!token.startsWith(HANDOFF_TOKEN_PREFIX)) return null;

  return client.$transaction(async (tx) => {
    const handoffRows = await tx.$queryRaw<HandoffRow[]>(Prisma.sql`
      UPDATE "public"."desktop_auth_handoffs"
      SET "consumed_at" = ${now}
      WHERE "token_hash" = ${hashDesktopAuthToken(token)}
        AND "consumed_at" IS NULL
        AND "expires_at" > ${now}
      RETURNING "id", "user_id", "scheme", "state"
    `);
    const handoff = handoffRows[0];
    if (!handoff) return null;

    const userRows = await tx.$queryRaw<UserRow[]>(Prisma.sql`
      SELECT "id", "email", "name", "image"
      FROM "public"."auth_users"
      WHERE "id" = ${handoff.user_id}
      LIMIT 1
    `);
    const user = userRows[0];
    if (!user) return null;

    const accessToken = `${SESSION_TOKEN_PREFIX}${randomToken(48)}`;
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const sessionId = randomUUID();

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "public"."desktop_auth_sessions" (
        "id",
        "token_hash",
        "handoff_id",
        "user_id",
        "scheme",
        "expires_at",
        "ip_address",
        "user_agent",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${sessionId},
        ${hashDesktopAuthToken(accessToken)},
        ${handoff.id},
        ${handoff.user_id},
        ${handoff.scheme},
        ${expiresAt},
        ${clientIp(request)},
        ${userAgent(request)},
        ${now},
        ${now}
      )
    `);

    return {
      accessToken,
      tokenType: "Bearer" as const,
      sessionId,
      scheme: handoff.scheme,
      expiresAt,
      user: toDesktopUser(user),
    };
  });
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function resolveDesktopSession({
  client,
  request,
  now = new Date(),
}: ResolveDesktopSessionOptions): Promise<DesktopAuthSession | null> {
  const bearerToken = readBearerToken(request);
  if (!bearerToken?.startsWith(SESSION_TOKEN_PREFIX)) return null;

  const rows = await client.$queryRaw<SessionRow[]>(Prisma.sql`
    SELECT
      s."id" AS "session_id",
      s."user_id",
      s."scheme",
      s."expires_at",
      u."id",
      u."email",
      u."name",
      u."image"
    FROM "public"."desktop_auth_sessions" s
    INNER JOIN "public"."auth_users" u ON u."id" = s."user_id"
    WHERE s."token_hash" = ${hashDesktopAuthToken(bearerToken)}
      AND s."revoked_at" IS NULL
      AND s."expires_at" > ${now}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;

  await client.$executeRaw(Prisma.sql`
    UPDATE "public"."desktop_auth_sessions"
    SET "last_used_at" = ${now}, "updated_at" = ${now}
    WHERE "id" = ${row.session_id}
  `);

  return {
    sessionId: row.session_id,
    scheme: row.scheme,
    expiresAt: row.expires_at,
    user: toDesktopUser({
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
    }),
  };
}

import type { PrismaClient } from "@nebutra/db";

export type DeviceSessionKind = "web" | "desktop";
export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

interface WebAuthSessionRecord {
  id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

interface DesktopAuthSessionRecord {
  id: string;
  scheme: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

interface CountResult {
  count: number;
}

type AuthSessionFindManyArgs = Parameters<PrismaClient["authSession"]["findMany"]>[0];
type AuthSessionDeleteManyArgs = Parameters<PrismaClient["authSession"]["deleteMany"]>[0];
type DesktopAuthSessionFindManyArgs = Parameters<PrismaClient["desktopAuthSession"]["findMany"]>[0];
type DesktopAuthSessionUpdateManyArgs = Parameters<
  PrismaClient["desktopAuthSession"]["updateMany"]
>[0];

interface DeviceSessionDb {
  authSession: {
    deleteMany: (args: AuthSessionDeleteManyArgs) => Promise<CountResult>;
    findMany: (args: AuthSessionFindManyArgs) => Promise<WebAuthSessionRecord[]>;
  };
  desktopAuthSession: {
    findMany: (args: DesktopAuthSessionFindManyArgs) => Promise<DesktopAuthSessionRecord[]>;
    updateMany: (args: DesktopAuthSessionUpdateManyArgs) => Promise<CountResult>;
  };
}

export interface DeviceSession {
  id: string;
  kind: DeviceSessionKind;
  label: string;
  browser: string;
  platform: string;
  deviceType: DeviceType;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
  canRevoke: boolean;
}

export async function getDeviceSessions({
  currentWebSessionToken,
  db,
  userId,
}: {
  currentWebSessionToken?: string | null;
  db: DeviceSessionDb;
  userId: string;
}): Promise<DeviceSession[]> {
  const now = new Date();
  const [webSessions, desktopSessions] = await Promise.all([
    db.authSession.findMany({
      where: { userId, expiresAt: { gt: now } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        token: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    }),
    db.desktopAuthSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: [{ lastUsedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        scheme: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    }),
  ]);

  return [
    ...webSessions.map((session) => mapWebSession(session, currentWebSessionToken)),
    ...desktopSessions.map(mapDesktopSession),
  ].sort((a, b) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt));
}

export function readBetterAuthSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)better-auth\.session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function revokeDeviceSession({
  db,
  kind,
  sessionId,
  userId,
}: {
  db: DeviceSessionDb;
  kind: DeviceSessionKind;
  sessionId: string;
  userId: string;
}): Promise<CountResult> {
  if (kind === "desktop") {
    return db.desktopAuthSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return db.authSession.deleteMany({
    where: { id: sessionId, userId },
  });
}

export async function revokeOtherDeviceSessions({
  currentWebSessionToken,
  db,
  userId,
}: {
  currentWebSessionToken?: string | null;
  db: DeviceSessionDb;
  userId: string;
}): Promise<{ web: number; desktop: number; total: number }> {
  if (!currentWebSessionToken) {
    throw new Error("CURRENT_WEB_SESSION_REQUIRED");
  }

  const now = new Date();
  const [webResult, desktopResult] = await Promise.all([
    db.authSession.deleteMany({
      where: {
        userId,
        NOT: { token: currentWebSessionToken },
      },
    }),
    db.desktopAuthSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    }),
  ]);

  return {
    web: webResult.count,
    desktop: desktopResult.count,
    total: webResult.count + desktopResult.count,
  };
}

function mapWebSession(
  session: WebAuthSessionRecord,
  currentWebSessionToken?: string | null,
): DeviceSession {
  const metadata = parseUserAgent(session.userAgent);
  const isCurrent = Boolean(currentWebSessionToken && session.token === currentWebSessionToken);

  return {
    id: session.id,
    kind: "web",
    label: buildWebLabel(metadata),
    browser: metadata.browser,
    platform: metadata.platform,
    deviceType: metadata.deviceType,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    lastActiveAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    isCurrent,
    canRevoke: !isCurrent,
  };
}

function mapDesktopSession(session: DesktopAuthSessionRecord): DeviceSession {
  const lastActiveAt = session.lastUsedAt ?? session.updatedAt ?? session.createdAt;
  const appName = desktopSchemeLabel(session.scheme);

  return {
    id: session.id,
    kind: "desktop",
    label: `${appName} desktop`,
    browser: appName,
    platform: "Desktop app",
    deviceType: "desktop",
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    lastActiveAt: lastActiveAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    isCurrent: false,
    canRevoke: true,
  };
}

function desktopSchemeLabel(scheme: string): string {
  if (scheme === "foundry") return "Nebutra Foundry";
  if (scheme === "sailor") return "Nebutra Sailor";
  return `Nebutra ${titleCase(scheme)}`;
}

function parseUserAgent(userAgent: string | null): {
  browser: string;
  platform: string;
  deviceType: DeviceType;
} {
  const ua = userAgent ?? "";
  const browser = parseBrowser(ua);
  const platform = parsePlatform(ua);
  const deviceType = parseDeviceType(ua);

  return { browser, platform, deviceType };
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\/|CriOS\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  if (/Nebutra Foundry/i.test(ua)) return "Nebutra Foundry";
  return "Web browser";
}

function parsePlatform(ua: string): string {
  if (/Macintosh|Mac OS X|macOS/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPad|iPhone|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown platform";
}

function parseDeviceType(ua: string): DeviceType {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|iPod|Android/i.test(ua)) return "mobile";
  if (/Macintosh|Windows|Linux|macOS/i.test(ua)) return "desktop";
  return "unknown";
}

function buildWebLabel(metadata: ReturnType<typeof parseUserAgent>): string {
  if (metadata.platform === "Unknown platform") return metadata.browser;
  return `${metadata.browser} on ${metadata.platform}`;
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

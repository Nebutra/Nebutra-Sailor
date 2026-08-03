import { randomBytes } from "node:crypto";
import type { CreateSessionOptions, LeakSession, LeakSessionPublic, ResolverHit } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function sessionId(): string {
  return randomBytes(6).toString("hex");
}

export class SessionStore {
  private readonly sessions = new Map<string, LeakSession>();
  private readonly zone: string;
  private readonly answerIp: string;
  private readonly defaultTtlSec: number;
  private readonly maxSessions: number;

  constructor(opts: {
    zone: string;
    answerIp: string;
    defaultTtlSec?: number;
    maxSessions?: number;
  }) {
    this.zone = opts.zone.replace(/\.$/, "").toLowerCase();
    this.answerIp = opts.answerIp;
    this.defaultTtlSec = opts.defaultTtlSec ?? 120;
    this.maxSessions = opts.maxSessions ?? 5_000;
  }

  get zoneName(): string {
    return this.zone;
  }

  get answer(): string {
    return this.answerIp;
  }

  create(options: CreateSessionOptions = {}): LeakSessionPublic {
    this.gc();
    if (this.sessions.size >= this.maxSessions) {
      // Drop oldest
      const oldest = [...this.sessions.values()].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      )[0];
      if (oldest) this.sessions.delete(oldest.id);
    }
    const id = sessionId();
    const probeCount = Math.min(16, Math.max(4, options.probeCount ?? 8));
    const ttlSec = options.ttlSec ?? this.defaultTtlSec;
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
    // Labels: {i}.{sessionId}.s.{zone}
    const probeNames = Array.from({ length: probeCount }, (_, i) =>
      `${i + 1}.${id}.s.${this.zone}`.toLowerCase(),
    );
    const session: LeakSession = {
      id,
      createdAt,
      expiresAt,
      probeNames,
      zone: this.zone,
      answerIp: this.answerIp,
      hits: new Map(),
      queryCount: 0,
    };
    this.sessions.set(id, session);
    return this.toPublic(session);
  }

  get(id: string): LeakSessionPublic | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    if (Date.parse(s.expiresAt) < Date.now()) {
      this.sessions.delete(id);
      return null;
    }
    return this.toPublic(s);
  }

  /**
   * Record a recursive resolver IP that queried a name under our zone.
   * Name forms: `{n}.{sessionId}.s.{zone}` or any label containing session id.
   */
  recordQuery(qname: string, recursiveIp: string): void {
    const name = qname.replace(/\.$/, "").toLowerCase();
    if (!name.endsWith(`.${this.zone}`) && name !== this.zone) return;

    const labels = name.split(".");
    // Expect: index.sessionId.s.zone...
    const zoneLabels = this.zone.split(".");
    const relative = labels.slice(0, Math.max(0, labels.length - zoneLabels.length));
    // relative: [index, sessionId, 's'] or similar
    let sid: string | null = null;
    if (relative.length >= 2 && relative[relative.length - 1] === "s") {
      sid = relative[relative.length - 2] ?? null;
    } else if (relative.length >= 1) {
      // fallback: any label that matches an active session
      for (const lab of relative) {
        if (this.sessions.has(lab)) {
          sid = lab;
          break;
        }
      }
    }
    if (!sid) return;
    const session = this.sessions.get(sid);
    if (!session) return;
    if (Date.parse(session.expiresAt) < Date.now()) {
      this.sessions.delete(sid);
      return;
    }

    const ip = recursiveIp.replace(/^::ffff:/, "");
    session.queryCount += 1;
    const existing = session.hits.get(ip);
    const ts = nowIso();
    if (existing) {
      existing.count += 1;
      existing.lastSeenAt = ts;
      if (existing.sampleNames.length < 8 && !existing.sampleNames.includes(name)) {
        existing.sampleNames.push(name);
      }
    } else {
      const hit: ResolverHit = {
        ip,
        count: 1,
        firstSeenAt: ts,
        lastSeenAt: ts,
        sampleNames: [name],
      };
      session.hits.set(ip, hit);
    }
  }

  /** Whether qname is under our zone (for AA answers). */
  isAuthoritative(qname: string): boolean {
    const name = qname.replace(/\.$/, "").toLowerCase();
    return name === this.zone || name.endsWith(`.${this.zone}`);
  }

  private toPublic(s: LeakSession): LeakSessionPublic {
    const resolvers = [...s.hits.values()].sort((a, b) => b.count - a.count);
    return {
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      probeNames: s.probeNames,
      zone: s.zone,
      answerIp: s.answerIp,
      queryCount: s.queryCount,
      resolvers,
      ready: resolvers.length > 0,
      infrastructure: true,
    };
  }

  private gc() {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (Date.parse(s.expiresAt) < now) this.sessions.delete(id);
    }
  }
}

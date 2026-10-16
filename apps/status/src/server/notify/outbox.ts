/**
 * Subscribers and the delivery outbox.
 *
 * Every trigger — an incident written, a maintenance window opening, a
 * component changing state — only inserts `deliveries` rows, one per matching
 * subscriber, rendered in that subscriber's channel and language. The runner
 * sends them with retries and exponential backoff, so no API request ever
 * waits on a webhook or an SMTP server.
 */
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusDb } from "../db";
import { log } from "../log";
import { buildPageSnapshot, type SnapshotIncident } from "../snapshot";
import {
  type Channel,
  type Notice,
  type NoticeEvent,
  type RenderedPayload,
  render,
} from "./messages";
import {
  checkTarget,
  DeliveryError,
  defaultTransport,
  emailEnabled,
  send,
  type Transport,
} from "./transport";

export const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 6 * 3600_000;

/** 30 s, 1 min, 2 min … capped at 6 h. */
export function backoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

// ── Links ───────────────────────────────────────────────────────────────────

export function publicBase(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.STATUS_PUBLIC_URL?.trim().replace(/\/+$/, "");
  return configured || `http://localhost:${env.PORT ?? "3140"}`;
}

function pageUrl(slug: string): string {
  return slug === process.env.STATUS_DEFAULT_PAGE?.trim()
    ? `${publicBase()}/status`
    : `${publicBase()}/p/${encodeURIComponent(slug)}`;
}

function incidentUrl(slug: string, id: string): string {
  return `${publicBase()}/p/${encodeURIComponent(slug)}/incidents/${encodeURIComponent(id)}`;
}

function unsubscribeUrl(token: string): string {
  return `${publicBase()}/api/v1/subscriptions/unsubscribe?token=${token}`;
}

function confirmUrl(token: string): string {
  return `${publicBase()}/api/v1/subscriptions/confirm?token=${token}`;
}

// ── Subscribing ─────────────────────────────────────────────────────────────

export const CHANNELS = ["email", "webhook", "feishu", "dingtalk", "wecom", "slack"] as const;

export const subscribeSchema = z
  .object({
    channel: z.enum(CHANNELS),
    target: z.string().trim().min(3).max(2000),
    secret: z.string().trim().min(1).max(200).optional(),
    components: z.array(z.string().min(1).max(80)).max(100).default([]),
    locale: z.string().min(2).max(16).optional(),
  })
  .refine((v) => v.channel !== "email" || z.string().email().safeParse(v.target).success, {
    message: "target must be an email address",
    path: ["target"],
  });
export type SubscribeInput = z.input<typeof subscribeSchema>;

export class SubscribeError extends Error {
  constructor(
    readonly code: "email_disabled" | "invalid_target" | "unknown_components" | "invalid_input",
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function availableChannels(): Channel[] {
  return CHANNELS.filter((c) => c !== "email" || emailEnabled());
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export interface SubscribeResult {
  id: string;
  status: "pending_confirmation" | "active";
  /** Only for non-email channels: whoever added a bot holds its unsubscribe link. */
  unsubscribeUrl?: string;
}

/**
 * Email subscriptions wait for a confirmation link (double opt-in). Bots and
 * webhooks are active at once and receive a welcome message, which doubles
 * as proof the URL works. Subscribing again is idempotent; a lapsed one is
 * revived.
 */
export async function subscribe(
  db: StatusDb,
  page: { id: string; workspaceId: string; slug: string },
  raw: SubscribeInput,
  now: Date = new Date(),
): Promise<SubscribeResult> {
  const parsed = subscribeSchema.safeParse(raw);
  if (!parsed.success) throw new SubscribeError("invalid_input", parsed.error.issues[0]?.message);
  const input = parsed.data;
  if (input.channel === "email" && !emailEnabled()) throw new SubscribeError("email_disabled");
  const problem = checkTarget(input.channel, input.target);
  if (problem) throw new SubscribeError("invalid_target", problem);
  const target = input.channel === "email" ? input.target.toLowerCase() : input.target;

  const keys = [...new Set(input.components)];
  if (keys.length > 0) {
    const found = await db.component.findMany({
      where: { pageId: page.id, key: { in: keys }, isPublic: true },
      select: { key: true },
    });
    const missing = keys.filter((k) => !found.some((f) => f.key === k));
    if (missing.length > 0) throw new SubscribeError("unknown_components", missing.join(", "));
  }

  const email = input.channel === "email";
  const existing = await db.subscriber.findUnique({
    where: { pageId_channel_target: { pageId: page.id, channel: input.channel, target } },
  });
  const active = existing && !existing.unsubscribedAt && existing.confirmedAt;
  const data = {
    componentKeys: keys,
    locale: input.locale ?? null,
    secret: input.secret ?? null,
  };
  const subscriber = existing
    ? await db.subscriber.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(active
            ? {}
            : {
                token: newToken(),
                unsubscribedAt: null,
                confirmedAt: email ? null : now,
              }),
        },
      })
    : await db.subscriber.create({
        data: {
          workspaceId: page.workspaceId,
          pageId: page.id,
          channel: input.channel,
          target,
          token: newToken(),
          confirmedAt: email ? null : now,
          ...data,
        },
      });

  if (!active) {
    const event: NoticeEvent = email ? "subscription.confirm" : "subscription.welcome";
    const pageRow = await db.page.findUniqueOrThrow({ where: { id: page.id } });
    const notice: Notice = {
      event,
      page: { slug: pageRow.slug, title: pageRow.title, url: pageUrl(pageRow.slug) },
      unsubscribeUrl: unsubscribeUrl(subscriber.token),
      ...(email ? { confirmUrl: confirmUrl(subscriber.token) } : {}),
    };
    await db.delivery.create({
      data: {
        workspaceId: page.workspaceId,
        pageId: page.id,
        subscriberId: subscriber.id,
        event,
        payload: render(
          notice,
          input.channel,
          subscriber.locale ?? pageRow.locales[0] ?? null,
        ) as never,
        nextAttemptAt: now,
      },
    });
  }
  return {
    id: subscriber.id,
    status: subscriber.confirmedAt ? "active" : "pending_confirmation",
    ...(email ? {} : { unsubscribeUrl: unsubscribeUrl(subscriber.token) }),
  };
}

export async function confirmSubscription(
  db: StatusDb,
  token: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (!token) return false;
  const { count } = await db.subscriber.updateMany({
    where: { token, unsubscribedAt: null },
    data: { confirmedAt: now },
  });
  // Already confirmed counts as confirmed; the update above is idempotent
  // except that it moves confirmedAt, which only records the latest click.
  return count > 0;
}

export async function unsubscribe(
  db: StatusDb,
  token: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (!token) return false;
  const subscriber = await db.subscriber.findUnique({ where: { token } });
  if (!subscriber) return false;
  if (!subscriber.unsubscribedAt) {
    await db.$transaction([
      db.subscriber.update({ where: { id: subscriber.id }, data: { unsubscribedAt: now } }),
      db.delivery.updateMany({
        where: { subscriberId: subscriber.id, status: "pending" },
        data: { status: "cancelled" },
      }),
    ]);
  }
  return true;
}

// ── Enqueueing ──────────────────────────────────────────────────────────────

function matches(subscriberKeys: string[], affected: string[]): boolean {
  // Empty on either side means "everything": a subscriber of all components,
  // or an incident that names none and so concerns the whole page.
  return (
    subscriberKeys.length === 0 ||
    affected.length === 0 ||
    affected.some((k) => subscriberKeys.includes(k))
  );
}

async function activeSubscribers(db: StatusDb, pageId: string) {
  const rows = await db.subscriber.findMany({
    where: { pageId, confirmedAt: { not: null }, unsubscribedAt: null },
  });
  return rows.filter((s) => s.channel !== "email" || emailEnabled());
}

async function enqueue(
  db: StatusDb,
  page: { id: string; workspaceId: string; locales: string[] },
  event: NoticeEvent,
  affected: string[],
  notice: (token: string) => Notice,
  incidentId: string | null,
  now: Date,
): Promise<number> {
  const subscribers = (await activeSubscribers(db, page.id)).filter((s) =>
    matches(s.componentKeys, affected),
  );
  if (subscribers.length === 0) return 0;
  const rows: Prisma.DeliveryCreateManyInput[] = subscribers.map((s) => ({
    workspaceId: page.workspaceId,
    pageId: page.id,
    subscriberId: s.id,
    event,
    incidentId,
    payload: render(notice(s.token), s.channel, s.locale ?? page.locales[0] ?? null) as never,
    nextAttemptAt: now,
  }));
  await db.delivery.createMany({ data: rows });
  return rows.length;
}

function incidentNotice(
  page: { slug: string; title: string },
  incident: SnapshotIncident,
  locale: string | null,
): NonNullable<Notice["incident"]> {
  const last = incident.updates.at(-1);
  const message = (locale && last?.messageI18n?.[locale]) || last?.message || incident.title;
  return {
    id: incident.id,
    kind: incident.kind,
    title: incident.title,
    impact: incident.impact,
    status: incident.status,
    message,
    scheduledStart: incident.scheduledStart?.toISOString() ?? null,
    scheduledEnd: incident.scheduledEnd?.toISOString() ?? null,
    components: incident.componentKeys,
    url: incidentUrl(page.slug, incident.id),
    updatedAt: incident.updatedAt.toISOString(),
  };
}

/**
 * Queue notices for an incident or maintenance write. Never throws: a
 * notification problem must not fail the write that triggered it.
 */
export async function enqueueIncident(
  db: StatusDb,
  incident: SnapshotIncident,
  event: "incident.created" | "incident.updated" | "maintenance.started",
  now: Date = new Date(),
): Promise<number> {
  try {
    const row = await db.incident.findUnique({
      where: { id: incident.id },
      select: {
        page: { select: { id: true, workspaceId: true, slug: true, title: true, locales: true } },
      },
    });
    if (!row) return 0;
    const page = row.page;
    const subscribers = (await activeSubscribers(db, page.id)).filter((s) =>
      matches(s.componentKeys, incident.componentKeys),
    );
    if (subscribers.length === 0) return 0;
    await db.delivery.createMany({
      data: subscribers.map((s) => {
        const locale = s.locale ?? page.locales[0] ?? null;
        const notice: Notice = {
          event,
          page: { slug: page.slug, title: page.title, url: pageUrl(page.slug) },
          incident: incidentNotice(page, incident, locale),
          unsubscribeUrl: unsubscribeUrl(s.token),
        };
        return {
          workspaceId: page.workspaceId,
          pageId: page.id,
          subscriberId: s.id,
          event,
          incidentId: incident.id,
          payload: render(notice, s.channel, locale) as never,
          nextAttemptAt: now,
        };
      }),
    });
    return subscribers.length;
  } catch (error) {
    log.error("could not queue incident notifications", { incidentId: incident.id, err: error });
    return 0;
  }
}

/** Maintenance whose window has opened and whose subscribers have not been told. */
export async function enqueueMaintenanceStarts(
  db: StatusDb,
  now: Date = new Date(),
): Promise<number> {
  const due = await db.incident.findMany({
    where: {
      kind: "maintenance",
      status: { not: "resolved" },
      startNotifiedAt: null,
      scheduledStart: { lte: now },
    },
    select: { id: true, pageId: true, scheduledEnd: true },
  });
  let queued = 0;
  for (const m of due) {
    // Mark first: a crash after this skips one reminder rather than sending two.
    const { count } = await db.incident.updateMany({
      where: { id: m.id, startNotifiedAt: null },
      data: { startNotifiedAt: now },
    });
    if (count === 0) continue;
    if (m.scheduledEnd && m.scheduledEnd <= now) continue; // window already over
    const snapshot = await buildPageSnapshot(db, { id: m.pageId }, { now });
    const incident = snapshot?.maintenance.find((i) => i.id === m.id);
    if (incident) queued += await enqueueIncident(db, incident, "maintenance.started", now);
  }
  return queued;
}

export function componentNotificationsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.STATUS_NOTIFY_COMPONENT_CHANGES?.trim().toLowerCase() === "on";
}

/**
 * Compare each public component's evaluated state with the one subscribers
 * last heard about. The first evaluation only records; later changes notify.
 */
export async function enqueueComponentChanges(
  db: StatusDb,
  now: Date = new Date(),
): Promise<number> {
  const pages = await db.page.findMany({ select: { id: true } });
  let queued = 0;
  for (const { id } of pages) {
    const snapshot = await buildPageSnapshot(db, { id }, { now });
    if (!snapshot) continue;
    const notified = new Map(
      (
        await db.component.findMany({
          where: { pageId: id, isPublic: true },
          select: { id: true, notifiedState: true },
        })
      ).map((c) => [c.id, c.notifiedState]),
    );
    for (const c of snapshot.components) {
      const previous = notified.get(c.id) ?? null;
      const state = c.verdict.state;
      if (previous === state) continue;
      await db.component.update({ where: { id: c.id }, data: { notifiedState: state } });
      if (previous === null) continue;
      queued += await enqueue(
        db,
        snapshot.page,
        "component.changed",
        [c.key],
        (token) => ({
          event: "component.changed",
          page: {
            slug: snapshot.page.slug,
            title: snapshot.page.title,
            url: pageUrl(snapshot.page.slug),
          },
          component: {
            key: c.key,
            name: c.name,
            from: previous,
            to: state,
            checkedAt: c.verdict.checkedAt?.toISOString() ?? null,
          },
          unsubscribeUrl: unsubscribeUrl(token),
        }),
        null,
        now,
      );
    }
  }
  return queued;
}

// ── Sending ─────────────────────────────────────────────────────────────────

export interface DeliveryRun {
  sent: number;
  retried: number;
  dead: number;
  cancelled: number;
}

/** Send what is due, at most `limit` per call, `concurrency` at once. */
export async function processDeliveries(
  db: StatusDb,
  options: { now?: Date; limit?: number; concurrency?: number; transport?: Transport } = {},
): Promise<DeliveryRun> {
  const now = options.now ?? new Date();
  const transport = options.transport ?? defaultTransport;
  const due = await db.delivery.findMany({
    where: { status: "pending", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take: options.limit ?? 50,
    include: { subscriber: true },
  });
  const run: DeliveryRun = { sent: 0, retried: 0, dead: 0, cancelled: 0 };
  const queue = [...due];
  const worker = async () => {
    for (let d = queue.shift(); d; d = queue.shift()) {
      const s = d.subscriber;
      const confirming = d.event === "subscription.confirm";
      if (s.unsubscribedAt || (!s.confirmedAt && !confirming)) {
        await db.delivery.update({ where: { id: d.id }, data: { status: "cancelled" } });
        run.cancelled++;
        continue;
      }
      try {
        await send(
          { channel: s.channel, target: s.target, secret: s.secret },
          d.payload as unknown as RenderedPayload,
          transport,
          d.event,
        );
        await db.delivery.update({
          where: { id: d.id },
          data: {
            status: "sent",
            sentAt: transport.now(),
            attempts: d.attempts + 1,
            lastError: null,
          },
        });
        run.sent++;
      } catch (error) {
        const attempts = d.attempts + 1;
        const retryable = !(error instanceof DeliveryError) || error.retryable;
        const dead = !retryable || attempts >= MAX_ATTEMPTS;
        const message = error instanceof Error ? error.message : String(error);
        await db.delivery.update({
          where: { id: d.id },
          data: {
            attempts,
            lastError: message.slice(0, 500),
            ...(dead
              ? { status: "dead" }
              : { nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)) }),
          },
        });
        if (dead) {
          run.dead++;
          log.warn("delivery given up", {
            deliveryId: d.id,
            channel: s.channel,
            attempts,
            error: message,
          });
        } else {
          run.retried++;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 4, due.length) }, worker));
  return run;
}

import type {
  PebbleDiagnosticTicket,
  PebbleFeedback,
  PebbleFeedbackKind,
  PrismaClient,
} from "@nebutra/db";
import { getSystemDb } from "@nebutra/db";

/**
 * Pebble support intake — diagnostic tickets and ordinary feedback.
 *
 * Deliberately not tenant-scoped: submissions arrive from anonymous desktop
 * clients, so there is no signed-in tenant at write time. These repositories
 * therefore take a system client and are only reachable from the gateway's
 * Pebble routes, never from tenant-facing surfaces.
 *
 * Baseline policy (pebble ROADMAP.md, "Diagnostics protocol"): 10-minute token
 * lifetime, 4 MiB cap, 30-day retention.
 */

/** Objects and rows expire this long after the ticket is created. */
export const DIAGNOSTIC_RETENTION_DAYS = 30;

/** Hard cap on both the request body and the stored object. */
export const DIAGNOSTIC_MAX_BYTES = 4 * 1024 * 1024;

export interface OpenTicketData {
  bundleSubmissionId: string;
  declaredBytes: number;
  appVersion?: string | null;
  platform?: string | null;
}

export interface StoreTicketData {
  bucket: string;
  objectKey: string;
  storedBytes: number;
  checksumSha256: string;
}

export function retentionExpiryFrom(now: Date): Date {
  return new Date(now.getTime() + DIAGNOSTIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export class PebbleDiagnosticTicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Reserve a ticket for an about-to-happen upload.
   *
   * Idempotent on `bundleSubmissionId`: a client retrying the token call gets
   * the same ticket rebound to the new byte count rather than a second ticket
   * pointing at storage nobody will ever clean up. A ticket that already
   * stored an object is never reopened — that would strand the first object.
   */
  async open(data: OpenTicketData, now = new Date()): Promise<PebbleDiagnosticTicket> {
    const expiresAt = retentionExpiryFrom(now);

    const existing = await this.prisma.pebbleDiagnosticTicket.findUnique({
      where: { bundleSubmissionId: data.bundleSubmissionId },
    });

    if (existing && existing.status !== "PENDING_UPLOAD") {
      return existing;
    }

    return this.prisma.pebbleDiagnosticTicket.upsert({
      where: { bundleSubmissionId: data.bundleSubmissionId },
      create: {
        bundleSubmissionId: data.bundleSubmissionId,
        declaredBytes: data.declaredBytes,
        appVersion: data.appVersion ?? null,
        platform: data.platform ?? null,
        expiresAt,
      },
      update: {
        declaredBytes: data.declaredBytes,
        appVersion: data.appVersion ?? null,
        platform: data.platform ?? null,
        expiresAt,
      },
    });
  }

  async findById(id: string): Promise<PebbleDiagnosticTicket | null> {
    return this.prisma.pebbleDiagnosticTicket.findUnique({ where: { id } });
  }

  /**
   * Mark the object durable. Guarded on PENDING_UPLOAD so a replayed token
   * cannot overwrite the key of an already-stored ticket; returns null when
   * the guard rejects, and the caller treats that as a spent token.
   */
  async markStored(
    id: string,
    data: StoreTicketData,
    now = new Date(),
  ): Promise<PebbleDiagnosticTicket | null> {
    const { count } = await this.prisma.pebbleDiagnosticTicket.updateMany({
      where: { id, status: "PENDING_UPLOAD" },
      data: {
        status: "STORED",
        bucket: data.bucket,
        objectKey: data.objectKey,
        storedBytes: data.storedBytes,
        checksumSha256: data.checksumSha256,
        storedAt: now,
      },
    });

    if (count === 0) return null;
    return this.findById(id);
  }

  /**
   * Tombstone the ticket. Idempotent so a user who clicks delete twice, or a
   * support agent re-running the workflow, still gets a success — the contract
   * promises confirmation that the data is gone, not that this call was the
   * one that removed it.
   *
   * Returns the object that the caller must delete from storage, or null when
   * there was never one (pending or already deleted).
   */
  async markDeleted(
    id: string,
    now = new Date(),
  ): Promise<{ ticket: PebbleDiagnosticTicket; object: { bucket: string; key: string } | null }> {
    const ticket = await this.prisma.pebbleDiagnosticTicket.findUnique({ where: { id } });
    if (!ticket) throw new Error(`Pebble diagnostic ticket not found: ${id}`);

    const object =
      ticket.bucket && ticket.objectKey ? { bucket: ticket.bucket, key: ticket.objectKey } : null;

    if (ticket.status === "DELETED") return { ticket, object: null };

    const updated = await this.prisma.pebbleDiagnosticTicket.update({
      where: { id },
      data: {
        status: "DELETED",
        bucket: null,
        objectKey: null,
        checksumSha256: null,
        deletedAt: now,
      },
    });

    return { ticket: updated, object };
  }

  /** Retention sweep input: tickets past their horizon that still hold data. */
  async findExpired(now = new Date(), take = 200): Promise<PebbleDiagnosticTicket[]> {
    return this.prisma.pebbleDiagnosticTicket.findMany({
      where: { expiresAt: { lte: now }, status: { in: ["PENDING_UPLOAD", "STORED"] } },
      orderBy: { expiresAt: "asc" },
      take,
    });
  }
}

export interface RecordFeedbackData {
  submissionId: string;
  kind: PebbleFeedbackKind;
  message: string;
  contactEmail?: string | null;
  appVersion?: string | null;
  platform?: string | null;
  locale?: string | null;
}

export class PebbleFeedbackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Idempotent on `submissionId` so a client retrying through a flaky network
   * does not produce duplicate support tickets.
   */
  async record(data: RecordFeedbackData): Promise<PebbleFeedback> {
    return this.prisma.pebbleFeedback.upsert({
      where: { submissionId: data.submissionId },
      create: {
        submissionId: data.submissionId,
        kind: data.kind,
        message: data.message,
        contactEmail: data.contactEmail ?? null,
        appVersion: data.appVersion ?? null,
        platform: data.platform ?? null,
        locale: data.locale ?? null,
      },
      update: {},
    });
  }
}

export function getPebbleDiagnosticTicketRepository(
  prisma: PrismaClient = getSystemDb(),
): PebbleDiagnosticTicketRepository {
  return new PebbleDiagnosticTicketRepository(prisma);
}

export function getPebbleFeedbackRepository(
  prisma: PrismaClient = getSystemDb(),
): PebbleFeedbackRepository {
  return new PebbleFeedbackRepository(prisma);
}

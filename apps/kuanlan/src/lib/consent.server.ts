import { download, upload } from "@nebutra/storage";
import {
  type ConsentRecord,
  FACE_NOTICE_SLUG,
  FACE_NOTICE_VERSION,
  isConsentCurrent,
} from "./consent";
import { consentObjectKey } from "./resources";
import { requireR2 } from "./resources.server";

async function readStream(stream: ReadableStream): Promise<string> {
  const chunks: Uint8Array[] = [];
  // @ts-expect-error — the AWS SDK hands back a Node stream that is async
  // iterable; the declared web ReadableStream type does not say so.
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Read one person's consent. Absent is a legitimate answer, not a failure —
 * everyone starts without one.
 *
 * A record that cannot be parsed is treated as absent rather than thrown: a
 * corrupt object should make someone accept again, not lock them out of a
 * product they paid attention to.
 */
export async function readFaceConsent(
  userId: string,
  io: { get?: (key: string) => Promise<ReadableStream | null> } = {},
): Promise<ConsentRecord | null> {
  requireR2();

  const key = consentObjectKey(userId);
  const body = await (io.get ?? ((k: string) => download(k, "uploads")))(key);
  if (!body) return null;

  try {
    return JSON.parse(await readStream(body)) as ConsentRecord;
  } catch {
    return null;
  }
}

async function write(
  userId: string,
  record: ConsentRecord,
  put?: (key: string, body: Buffer) => Promise<unknown>,
): Promise<ConsentRecord> {
  const key = consentObjectKey(userId);
  const body = Buffer.from(JSON.stringify(record, null, 2), "utf8");
  await (
    put ??
    ((k: string, b: Buffer) => upload(k, b, { bucket: "uploads", contentType: "application/json" }))
  )(key, body);
  return record;
}

/**
 * Record that this person accepted the current notice.
 *
 * `ipAddress` and `userAgent` are kept because a consent record that cannot say
 * where it came from is weak evidence. They are not used for anything else.
 */
export async function grantFaceConsent(
  userId: string,
  context: { consentContext: string; ipAddress?: string; userAgent?: string },
  io: { put?: (key: string, body: Buffer) => Promise<unknown> } = {},
): Promise<ConsentRecord> {
  requireR2();

  return write(
    userId,
    {
      documentSlug: FACE_NOTICE_SLUG,
      documentVersion: FACE_NOTICE_VERSION,
      consentType: "EXPLICIT",
      consentGiven: true,
      consentedAt: new Date().toISOString(),
      consentContext: context.consentContext,
      ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
      ...(context.userAgent ? { userAgent: context.userAgent } : {}),
    },
    io.put,
  );
}

/**
 * Take it back.
 *
 * The record is stamped, not deleted: erasing it would destroy the evidence
 * that consent was ever given, which is the opposite of what a consent log is
 * for. Moments the person already has are untouched — those have their own
 * delete, and conflating the two would take away work they chose to keep.
 */
export async function withdrawFaceConsent(
  userId: string,
  io: {
    get?: (key: string) => Promise<ReadableStream | null>;
    put?: (key: string, body: Buffer) => Promise<unknown>;
  } = {},
): Promise<ConsentRecord | null> {
  requireR2();

  const existing = await readFaceConsent(userId, io);
  if (!existing || existing.withdrawnAt) return existing;

  return write(
    userId,
    { ...existing, consentGiven: false, withdrawnAt: new Date().toISOString() },
    io.put,
  );
}

/** The gate the shoot route asks. */
export async function hasCurrentFaceConsent(userId: string): Promise<boolean> {
  return isConsentCurrent(await readFaceConsent(userId));
}

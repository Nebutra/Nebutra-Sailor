/**
 * /pebble/diagnostics/* — reviewed diagnostic bundle upload and deletion.
 *
 * Protocol (pebble ROADMAP.md, "Diagnostics protocol"):
 *   1. POST /token   {bundle_submission_id, bytes} -> {token, upload_url, max_bytes}
 *   2. POST /upload  Bearer token + exact Content-Length + NDJSON -> {ticket_id}
 *   3. POST /delete/:ticketId  {} -> confirmation
 *
 * The upload URL is derived from the request that served the token, so it is
 * same-host by construction — the client rejects a cross-host URL, and that
 * check should never be the thing that catches a config mistake.
 *
 * Bytes land in private object storage. Objects are not discoverable by ticket
 * id: the key carries a random component that only the database row records.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";
import { DIAGNOSTIC_MAX_BYTES, getPebbleDiagnosticTicketRepository } from "@nebutra/repositories";
import { getUploadProvider } from "@nebutra/uploads";
import {
  DIAGNOSTIC_TOKEN_TTL_SECONDS,
  deriveUploadUrl,
  issueDiagnosticToken,
  readBearerToken,
  resolveTokenSecret,
  verifyDiagnosticToken,
} from "./diagnostics-token.js";
import { createIpRateLimit } from "./rate-limit.js";
import { submissionLogFields } from "./redact.js";

const NDJSON_CONTENT_TYPE = "application/x-ndjson";

export const diagnosticsRoutes = new OpenAPIHono();

function bucketName(): string {
  return process.env["PEBBLE_DIAGNOSTICS_BUCKET"]?.trim() || "nebutra-pebble-diagnostics";
}

/** Random suffix so an object is never addressable from the ticket id alone. */
function diagnosticObjectKey(ticketId: string): string {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  return `pebble/diagnostics/${ticketId}/${nonce}.ndjson`;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

// ─── POST /token ──────────────────────────────────────────────────────────────

const TokenRequestSchema = z.object({
  bundle_submission_id: z.string().min(1).max(191),
  bytes: z.number().int().positive().max(DIAGNOSTIC_MAX_BYTES),
  app_version: z.string().max(64).optional(),
  platform: z.string().max(32).optional(),
});

const TokenResponseSchema = z.object({
  token: z.string(),
  upload_url: z.string().url(),
  max_bytes: z.number().int(),
});

const tokenRoute = createRoute({
  method: "post",
  path: "/token",
  tags: ["Pebble"],
  summary: "Issue a diagnostic upload token",
  middleware: [createIpRateLimit(6)] as const,
  request: {
    body: { content: { "application/json": { schema: TokenRequestSchema } } },
  },
  responses: {
    200: {
      description: "Token issued",
      content: { "application/json": { schema: TokenResponseSchema } },
    },
    400: {
      description: "Malformed request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    413: {
      description: "Declared size above the cap",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limited",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

diagnosticsRoutes.openapi(tokenRoute, async (c) => {
  const input = c.req.valid("json");

  const ticket = await getPebbleDiagnosticTicketRepository().open({
    bundleSubmissionId: input.bundle_submission_id,
    declaredBytes: input.bytes,
    appVersion: input.app_version ?? null,
    platform: input.platform ?? null,
  });

  // A ticket that already holds an object must not mint a second token — that
  // would let a caller overwrite a stored bundle they no longer control.
  if (ticket.status !== "PENDING_UPLOAD") {
    return c.json(
      { error: "Conflict", message: "This bundle submission has already been uploaded." },
      400,
    );
  }

  const token = await issueDiagnosticToken(
    {
      ticketId: ticket.id,
      bundleSubmissionId: ticket.bundleSubmissionId,
      bytes: input.bytes,
    },
    resolveTokenSecret(),
  );

  logger.info(
    "Pebble diagnostic token issued",
    submissionLogFields({
      submissionId: input.bundle_submission_id,
      appVersion: input.app_version,
      platform: input.platform,
      bytes: input.bytes,
    }),
  );

  return c.json(
    {
      token,
      upload_url: deriveUploadUrl(c.req.url),
      max_bytes: DIAGNOSTIC_MAX_BYTES,
    },
    200,
  );
});

// ─── POST /upload ─────────────────────────────────────────────────────────────

const UploadResponseSchema = z.object({ ticket_id: z.string() });

const uploadRoute = createRoute({
  method: "post",
  path: "/upload",
  tags: ["Pebble"],
  summary: "Upload a redacted diagnostic bundle",
  description:
    "Requires a token from /token. Content-Type must be application/x-ndjson and Content-Length must match the byte count the token was issued for.",
  middleware: [createIpRateLimit(6)] as const,
  request: {
    body: { content: { [NDJSON_CONTENT_TYPE]: { schema: z.string() } } },
  },
  responses: {
    200: {
      description: "Bundle stored",
      content: { "application/json": { schema: UploadResponseSchema } },
    },
    400: {
      description: "Malformed upload",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Missing, invalid, expired, or spent token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    413: {
      description: "Body above the cap or above the declared size",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    415: {
      description: "Wrong content type",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limited",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

diagnosticsRoutes.openapi(uploadRoute, async (c) => {
  const claims = await verifyDiagnosticToken(
    readBearerToken(c.req.header("authorization")) ?? "",
    resolveTokenSecret(),
  );
  if (!claims) {
    return c.json({ error: "Unauthorized", message: "Invalid or expired upload token." }, 401);
  }

  if (!(c.req.header("content-type") ?? "").includes(NDJSON_CONTENT_TYPE)) {
    return c.json(
      { error: "Unsupported Media Type", message: `Content-Type must be ${NDJSON_CONTENT_TYPE}.` },
      415,
    );
  }

  // The protocol requires an exact Content-Length. Checking it before reading
  // means an oversized body is refused without buffering it.
  const declaredLength = Number(c.req.header("content-length") ?? "");
  if (!Number.isInteger(declaredLength) || declaredLength <= 0) {
    return c.json({ error: "Bad Request", message: "An exact Content-Length is required." }, 400);
  }
  if (declaredLength > DIAGNOSTIC_MAX_BYTES || declaredLength > claims.bytes) {
    return c.json(
      { error: "Payload Too Large", message: "Body exceeds the size this token was issued for." },
      413,
    );
  }

  const body = new Uint8Array(await c.req.arrayBuffer());
  if (body.byteLength !== declaredLength) {
    return c.json(
      { error: "Bad Request", message: "Body length does not match Content-Length." },
      400,
    );
  }

  const repository = getPebbleDiagnosticTicketRepository();
  const ticket = await repository.findById(claims.ticketId);
  if (!ticket || ticket.bundleSubmissionId !== claims.bundleSubmissionId) {
    return c.json({ error: "Unauthorized", message: "Token does not match a known ticket." }, 401);
  }
  if (ticket.status !== "PENDING_UPLOAD") {
    return c.json({ error: "Unauthorized", message: "This token has already been used." }, 401);
  }

  const bucket = bucketName();
  const key = diagnosticObjectKey(ticket.id);
  const checksum = await sha256Hex(body);

  // Private by construction: the provider is asked for a private ACL and the
  // key is unguessable, so nothing here is reachable without the database row.
  const provider = await getUploadProvider();
  const presigned = await provider.createPresignedUpload({
    bucket,
    key,
    contentType: NDJSON_CONTENT_TYPE,
    maxSize: DIAGNOSTIC_MAX_BYTES,
    acl: "private",
    metadata: { ticket_id: ticket.id },
  });

  const stored = await fetch(presigned.url, {
    method: presigned.method,
    headers: { ...presigned.headers, "content-type": NDJSON_CONTENT_TYPE },
    body: body as unknown as BodyInit,
  });

  if (!stored.ok) {
    logger.error("Pebble diagnostic bundle storage failed", {
      ticketId: ticket.id,
      status: stored.status,
    });
    return c.json({ error: "Bad Gateway", message: "Could not store the bundle." }, 400);
  }

  // Guarded on PENDING_UPLOAD, so two concurrent uploads with the same token
  // cannot both claim the ticket. The loser's object is orphaned, and the
  // retention sweep is what eventually removes it.
  const marked = await repository.markStored(ticket.id, {
    bucket,
    objectKey: key,
    storedBytes: body.byteLength,
    checksumSha256: checksum,
  });

  if (!marked) {
    await provider.deleteFile(bucket, key).catch(() => undefined);
    return c.json({ error: "Unauthorized", message: "This token has already been used." }, 401);
  }

  logger.info(
    "Pebble diagnostic bundle stored",
    submissionLogFields({
      submissionId: ticket.bundleSubmissionId,
      appVersion: ticket.appVersion,
      platform: ticket.platform,
      bytes: body.byteLength,
    }),
  );

  return c.json({ ticket_id: ticket.id }, 200);
});

// ─── POST /delete/:ticketId ───────────────────────────────────────────────────

const DeleteParamsSchema = z.object({
  ticketId: z.string().min(1).max(64),
});

const DeleteResponseSchema = z.object({
  ticket_id: z.string(),
  deleted: z.literal(true),
});

const deleteRoute = createRoute({
  method: "post",
  path: "/delete/{ticketId}",
  tags: ["Pebble"],
  summary: "Delete a diagnostic bundle at the user's request",
  description:
    "Idempotent. A success response confirms the ticket and its stored object are deleted, not merely scheduled.",
  middleware: [createIpRateLimit(12)] as const,
  request: { params: DeleteParamsSchema },
  responses: {
    200: {
      description: "Ticket and object deleted",
      content: { "application/json": { schema: DeleteResponseSchema } },
    },
    404: {
      description: "No such ticket",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limited",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

diagnosticsRoutes.openapi(deleteRoute, async (c) => {
  const { ticketId } = c.req.valid("param");
  const repository = getPebbleDiagnosticTicketRepository();

  const existing = await repository.findById(ticketId);
  if (!existing) {
    return c.json({ error: "Not Found", message: "No such diagnostic ticket." }, 404);
  }

  const { object } = await repository.markDeleted(ticketId);

  // Row first, then object. If the object delete fails we have already broken
  // the only pointer to it and the retention sweep will retry — the reverse
  // order could leave a live row pointing at a deleted object, which reads to
  // a support agent as "still stored".
  if (object) {
    const provider = await getUploadProvider();
    await provider.deleteFile(object.bucket, object.key);
  }

  logger.info("Pebble diagnostic ticket deleted", { ticketId });

  return c.json({ ticket_id: ticketId, deleted: true as const }, 200);
});

export { DIAGNOSTIC_TOKEN_TTL_SECONDS };

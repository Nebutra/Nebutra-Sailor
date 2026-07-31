import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_SECRET = "pebble-diagnostics-secret-at-least-32-bytes";

type Ticket = {
  id: string;
  bundleSubmissionId: string;
  status: "PENDING_UPLOAD" | "STORED" | "DELETED";
  declaredBytes: number;
  bucket: string | null;
  objectKey: string | null;
  appVersion: string | null;
  platform: string | null;
};

const tickets = new Map<string, Ticket>();
const feedback: Array<Record<string, unknown>> = [];
const deletedObjects: Array<{ bucket: string; key: string }> = [];

const diagnosticRepository = {
  open: vi.fn(async (data: { bundleSubmissionId: string; declaredBytes: number }) => {
    const existing = [...tickets.values()].find(
      (t) => t.bundleSubmissionId === data.bundleSubmissionId,
    );
    if (existing) {
      existing.declaredBytes = data.declaredBytes;
      return existing;
    }
    const ticket: Ticket = {
      id: `tkt_${tickets.size + 1}`,
      bundleSubmissionId: data.bundleSubmissionId,
      status: "PENDING_UPLOAD",
      declaredBytes: data.declaredBytes,
      bucket: null,
      objectKey: null,
      appVersion: null,
      platform: null,
    };
    tickets.set(ticket.id, ticket);
    return ticket;
  }),
  findById: vi.fn(async (id: string) => tickets.get(id) ?? null),
  markStored: vi.fn(
    async (id: string, data: { bucket: string; objectKey: string; storedBytes: number }) => {
      const ticket = tickets.get(id);
      if (!ticket || ticket.status !== "PENDING_UPLOAD") return null;
      ticket.status = "STORED";
      ticket.bucket = data.bucket;
      ticket.objectKey = data.objectKey;
      return ticket;
    },
  ),
  markDeleted: vi.fn(async (id: string) => {
    const ticket = tickets.get(id);
    if (!ticket) throw new Error("not found");
    const object =
      ticket.bucket && ticket.objectKey ? { bucket: ticket.bucket, key: ticket.objectKey } : null;
    if (ticket.status === "DELETED") return { ticket, object: null };
    ticket.status = "DELETED";
    ticket.bucket = null;
    ticket.objectKey = null;
    return { ticket, object };
  }),
};

const feedbackRepository = {
  record: vi.fn(async (data: Record<string, unknown>) => {
    feedback.push(data);
    return data;
  }),
};

vi.mock("@nebutra/repositories", () => ({
  DIAGNOSTIC_MAX_BYTES: 4 * 1024 * 1024,
  getPebbleDiagnosticTicketRepository: () => diagnosticRepository,
  getPebbleFeedbackRepository: () => feedbackRepository,
}));

vi.mock("@nebutra/uploads", () => ({
  getUploadProvider: async () => ({
    createPresignedUpload: async () => ({
      url: "https://storage.test/put",
      method: "PUT" as const,
      headers: {},
      expiresAt: new Date(Date.now() + 60_000),
    }),
    deleteFile: async (bucket: string, key: string) => {
      deletedObjects.push({ bucket, key });
    },
  }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

async function createApp() {
  const { pebbleRoutes } = await import("./index.js");
  const app = new OpenAPIHono();
  app.route("/pebble", pebbleRoutes);
  return app;
}

function ndjsonBody(text: string) {
  const bytes = new TextEncoder().encode(text);
  return { bytes, length: bytes.byteLength };
}

async function issueToken(
  app: Awaited<ReturnType<typeof createApp>>,
  bytes: number,
  extraHeaders: Record<string, string> = {},
) {
  const response = await app.request("/pebble/diagnostics/token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.7",
      // Default: public API host (production path after CF).
      "x-forwarded-host": "api.nebutra.com",
      "x-forwarded-proto": "https",
      ...extraHeaders,
    },
    body: JSON.stringify({ bundle_submission_id: "bundle_1", bytes }),
  });
  return { response, body: (await response.json()) as Record<string, string> };
}

describe("pebble support intake", () => {
  beforeEach(() => {
    tickets.clear();
    feedback.length = 0;
    deletedObjects.length = 0;
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("PEBBLE_DIAGNOSTICS_TOKEN_SECRET", TOKEN_SECRET);
    vi.stubEnv("PEBBLE_DIAGNOSTICS_BUCKET", "test-bucket");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("POST /pebble/v1/feedback", () => {
    it("accepts a JSON submission and keeps the message out of the response", async () => {
      const app = await createApp();

      const response = await app.request("/pebble/v1/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.1" },
        body: JSON.stringify({
          submission_id: "sub_1",
          message: "the terminal split resets on reload",
          contact_email: "user@example.com",
          app_version: "1.4.128",
        }),
      });

      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ submission_id: "sub_1", received: true });
      expect(feedback[0]).toMatchObject({
        submissionId: "sub_1",
        kind: "FEEDBACK",
        contactEmail: "user@example.com",
      });
    });

    it("accepts multipart submissions from legacy clients", async () => {
      const app = await createApp();
      const form = new FormData();
      form.set("submission_id", "sub_2");
      form.set("kind", "crash");
      form.set("message", "renderer crashed on open");

      const response = await app.request("/pebble/v1/feedback", {
        method: "POST",
        headers: { "cf-connecting-ip": "203.0.113.2" },
        body: form,
      });

      expect(response.status).toBe(202);
      expect(feedback[0]).toMatchObject({ submissionId: "sub_2", kind: "CRASH" });
    });

    it("rejects a submission with no message", async () => {
      const app = await createApp();

      const response = await app.request("/pebble/v1/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.3" },
        body: JSON.stringify({ submission_id: "sub_3", message: "" }),
      });

      expect(response.status).toBe(400);
      expect(feedback).toHaveLength(0);
    });

    it("accepts desktop legacy field names and synthesizes submission_id", async () => {
      const app = await createApp();

      const response = await app.request("/pebble/v1/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.4" },
        body: JSON.stringify({
          feedback: "terminal lost scrollback after restart",
          submission_type: "feedback",
          github_email: "builder@example.com",
          app_version: "1.4.200",
          platform: "darwin",
          os_release: "24.0.0",
          arch: "arm64",
        }),
      });

      expect(response.status).toBe(202);
      const body = (await response.json()) as { submission_id: string; received: boolean };
      expect(body.received).toBe(true);
      expect(body.submission_id).toMatch(/^desk_/);
      expect(feedback[0]).toMatchObject({
        kind: "FEEDBACK",
        contactEmail: "builder@example.com",
        message: "terminal lost scrollback after restart",
      });
    });
  });

  describe("POST /pebble/diagnostics/token", () => {
    it("returns an https upload URL on the public API host", async () => {
      const app = await createApp();
      const { response, body } = await issueToken(app, 1024);

      expect(response.status).toBe(200);
      expect(body["max_bytes"]).toBe(4 * 1024 * 1024);
      expect(String(body["upload_url"])).toBe("https://api.nebutra.com/pebble/diagnostics/upload");
    });

    it("returns brand-host path without /pebble when X-Original-URI is brand", async () => {
      const app = await createApp();
      const { response, body } = await issueToken(app, 1024, {
        "x-forwarded-host": "pebble.nebutra.com",
        "x-forwarded-proto": "https",
        "x-original-uri": "/diagnostics/token",
      });

      expect(response.status).toBe(200);
      expect(String(body["upload_url"])).toBe("https://pebble.nebutra.com/diagnostics/upload");
    });

    it("maps origin.nebutra.com to api.nebutra.com", async () => {
      const app = await createApp();
      const { response, body } = await issueToken(app, 1024, {
        "x-forwarded-host": "origin.nebutra.com",
        "x-forwarded-proto": "http",
      });

      expect(response.status).toBe(200);
      expect(String(body["upload_url"])).toBe("https://api.nebutra.com/pebble/diagnostics/upload");
    });

    it("refuses a byte count above the cap", async () => {
      const app = await createApp();
      const { response } = await issueToken(app, 8 * 1024 * 1024);
      expect(response.status).toBe(400);
    });
  });

  describe("POST /pebble/diagnostics/upload", () => {
    it("stores a bundle and returns its ticket id", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 200 }));
      const app = await createApp();
      const { bytes, length } = ndjsonBody('{"event":"startup"}\n');
      const { body: token } = await issueToken(app, length);

      const response = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token["token"]}`,
          "content-type": "application/x-ndjson",
          "content-length": String(length),
          "cf-connecting-ip": "203.0.113.7",
        },
        body: bytes,
      });

      expect(response.status).toBe(200);
      expect((await response.json()) as Record<string, string>).toHaveProperty("ticket_id");
      expect(fetchMock).toHaveBeenCalledWith("https://storage.test/put", expect.anything());
    });

    it("rejects an upload with no token", async () => {
      const app = await createApp();
      const { bytes, length } = ndjsonBody('{"event":"startup"}\n');

      const response = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers: {
          "content-type": "application/x-ndjson",
          "content-length": String(length),
          "cf-connecting-ip": "203.0.113.8",
        },
        body: bytes,
      });

      expect(response.status).toBe(401);
    });

    it("rejects a body larger than the token was issued for", async () => {
      const app = await createApp();
      const { body: token } = await issueToken(app, 16);
      const { bytes, length } = ndjsonBody("x".repeat(4096));

      const response = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token["token"]}`,
          "content-type": "application/x-ndjson",
          "content-length": String(length),
          "cf-connecting-ip": "203.0.113.9",
        },
        body: bytes,
      });

      expect(response.status).toBe(413);
    });

    it("rejects a content type other than NDJSON", async () => {
      const app = await createApp();
      const { bytes, length } = ndjsonBody('{"event":"startup"}\n');
      const { body: token } = await issueToken(app, length);

      const response = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token["token"]}`,
          "content-type": "application/json",
          "content-length": String(length),
          "cf-connecting-ip": "203.0.113.10",
        },
        body: bytes,
      });

      expect(response.status).toBe(415);
    });

    it("refuses to reuse a spent token", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
      const app = await createApp();
      const { bytes, length } = ndjsonBody('{"event":"startup"}\n');
      const { body: token } = await issueToken(app, length);

      const headers = {
        authorization: `Bearer ${token["token"]}`,
        "content-type": "application/x-ndjson",
        "content-length": String(length),
        "cf-connecting-ip": "203.0.113.11",
      };

      const first = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers,
        body: bytes,
      });
      const second = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers,
        body: bytes,
      });

      expect(first.status).toBe(200);
      expect(second.status).toBe(401);
    });
  });

  describe("POST /pebble/diagnostics/delete/:ticketId", () => {
    it("deletes the stored object and confirms", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
      const app = await createApp();
      const { bytes, length } = ndjsonBody('{"event":"startup"}\n');
      const { body: token } = await issueToken(app, length);

      const upload = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token["token"]}`,
          "content-type": "application/x-ndjson",
          "content-length": String(length),
          "cf-connecting-ip": "203.0.113.12",
        },
        body: bytes,
      });
      const { ticket_id: ticketId } = (await upload.json()) as { ticket_id: string };

      const response = await app.request(`/pebble/diagnostics/delete/${ticketId}`, {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.12" },
        body: "{}",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ticket_id: ticketId, deleted: true });
      expect(deletedObjects).toHaveLength(1);
    });

    it("is idempotent so a repeated delete still confirms", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
      const app = await createApp();
      const { bytes, length } = ndjsonBody('{"event":"startup"}\n');
      const { body: token } = await issueToken(app, length);

      const upload = await app.request("/pebble/diagnostics/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token["token"]}`,
          "content-type": "application/x-ndjson",
          "content-length": String(length),
          "cf-connecting-ip": "203.0.113.13",
        },
        body: bytes,
      });
      const { ticket_id: ticketId } = (await upload.json()) as { ticket_id: string };

      const headers = { "content-type": "application/json", "cf-connecting-ip": "203.0.113.13" };
      await app.request(`/pebble/diagnostics/delete/${ticketId}`, {
        method: "POST",
        headers,
        body: "{}",
      });
      const second = await app.request(`/pebble/diagnostics/delete/${ticketId}`, {
        method: "POST",
        headers,
        body: "{}",
      });

      expect(second.status).toBe(200);
      // The object was already gone; the second pass must not try to delete it again.
      expect(deletedObjects).toHaveLength(1);
    });

    it("returns 404 for an unknown ticket", async () => {
      const app = await createApp();

      const response = await app.request("/pebble/diagnostics/delete/tkt_missing", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.14" },
        body: "{}",
      });

      expect(response.status).toBe(404);
    });
  });
});

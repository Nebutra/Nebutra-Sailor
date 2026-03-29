/**
 * Consent Route Integration Tests
 *
 * Tests all routes in apps/api-gateway/src/routes/legal/consent.ts
 * using a wrapper app that mirrors the production middleware mount order.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock MUST be declared before the route module is imported.
vi.mock("@nebutra/db", () => ({
  prisma: {
    legalDocument: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userConsent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    cookieConsent: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    contactSubmission: {
      create: vi.fn(),
    },
  },
  Prisma: {},
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn().mockResolvedValue({
    provider: "better-auth",
    getSession: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@nebutra/logger", () => {
  const logFns = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  logFns.child.mockReturnValue(logFns);
  return { logger: logFns };
});

import { prisma } from "@nebutra/db";
import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";
import { consentRoutes } from "../routes/legal/consent.js";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

const app = new OpenAPIHono();
app.use("*", tenantContextMiddleware);
app.route("/", consentRoutes);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_HEADERS = s2sHeaders({ userId: "user-123", orgId: "org-456" });

function jsonRequest(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const opts: RequestInit = { method };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers = { "Content-Type": "application/json", ...headers };
  } else if (headers) {
    opts.headers = headers;
  }
  return app.request(path, opts);
}

function authedJsonRequest(method: string, path: string, body?: unknown) {
  return jsonRequest(method, path, body, AUTH_HEADERS);
}

function getRequest(path: string, headers?: Record<string, string>) {
  return app.request(path, { method: "GET", ...(headers && { headers }) });
}

function deleteRequest(path: string, headers?: Record<string, string>) {
  return app.request(path, { method: "DELETE", ...(headers && { headers }) });
}

function authedDeleteRequest(path: string) {
  return deleteRequest(path, AUTH_HEADERS);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockDocument = {
  id: "doc-1",
  slug: "terms-of-service",
  version: "2024-01",
  isActive: true,
  effectiveAt: new Date("2024-01-01"),
  locale: "en",
  type: "TERMS",
  title: "Terms of Service",
  summary: "Our terms",
  isRequired: true,
};

const mockConsent = {
  id: "consent-1",
  userId: null,
  organizationId: null,
  visitorId: "visitor-abc",
  documentId: "doc-1",
  documentSlug: "terms-of-service",
  documentVersion: "2024-01",
  consentType: "EXPLICIT",
  consentGiven: true,
  consentedAt: new Date("2025-01-01T00:00:00Z"),
  withdrawnAt: null,
  ipAddress: null,
  userAgent: null,
  consentContext: null,
  metadata: {},
};

const mockCookieConsent = {
  id: "cc-1",
  visitorId: "visitor-abc",
  userId: null,
  necessary: true,
  functional: false,
  analytics: true,
  marketing: false,
  thirdParty: false,
  ipAddress: null,
  userAgent: null,
  consentedAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
  expiresAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SERVICE_SECRET = TEST_SERVICE_SECRET;
});

// ===========================================================================
// POST /consent
// ===========================================================================

describe("POST /consent", () => {
  const validBody = {
    documentSlug: "terms-of-service",
    visitorId: "visitor-abc",
    consentType: "EXPLICIT",
  };

  it("returns 200 with consentId when document exists", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocument);
    (prisma.userConsent.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockConsent);

    const res = await authedJsonRequest("POST", "/consent", validBody);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.consentId).toBe("consent-1");
    expect(body.documentSlug).toBe("terms-of-service");
    expect(body.documentVersion).toBe("2024-01");
    const createCall = (prisma.userConsent.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createCall.data.userId).toBe("user-123");
    expect(createCall.data.organizationId).toBe("org-456");
  });

  it("returns 404 when the document is not found", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await authedJsonRequest("POST", "/consent", validBody);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(body.error.message).toContain("LegalDocument");
  });

  it("returns 400/422 when required field documentSlug is missing", async () => {
    const res = await authedJsonRequest("POST", "/consent", {
      visitorId: "visitor-abc",
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when required field visitorId is missing", async () => {
    const res = await authedJsonRequest("POST", "/consent", {
      documentSlug: "terms-of-service",
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 500 when Prisma throws on create", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocument);
    (prisma.userConsent.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await authedJsonRequest("POST", "/consent", validBody);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "record consent" },
    });
  });

  it("forwards optional consentType default correctly", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocument);
    (prisma.userConsent.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockConsent);

    // No consentType provided — Zod default is EXPLICIT
    const res = await authedJsonRequest("POST", "/consent", {
      documentSlug: "terms-of-service",
      visitorId: "visitor-abc",
    });

    expect(res.status).toBe(200);
    const createCall = (prisma.userConsent.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createCall.data.consentType).toBe("EXPLICIT");
  });
});

// ===========================================================================
// GET /consent/status
// ===========================================================================

describe("GET /consent/status", () => {
  it("returns 400 when documentSlug query param is missing", async () => {
    const res = await getRequest("/consent/status");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.name).toBe("ZodError");
    expect(body.error.message).toContain("documentSlug");
  });

  it("returns 404 when document is not found", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getRequest("/consent/status?documentSlug=missing-doc");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(body.error.message).toContain("LegalDocument");
  });

  it("returns 200 with hasConsented: false when no consent record exists", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocument);
    (prisma.userConsent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getRequest(
      "/consent/status?documentSlug=terms-of-service&visitorId=visitor-abc",
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasConsented).toBe(false);
    expect(body.needsReconsent).toBe(false);
    expect(body.currentVersion).toBe("2024-01");
  });

  it("returns hasConsented: true and needsReconsent: false when versions match", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocument);
    (prisma.userConsent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockConsent);

    const res = await getRequest(
      "/consent/status?documentSlug=terms-of-service&visitorId=visitor-abc",
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasConsented).toBe(true);
    expect(body.needsReconsent).toBe(false);
    expect(body.consentedVersion).toBe("2024-01");
  });

  it("returns needsReconsent: true when consent version is outdated", async () => {
    const outdatedDocument = { ...mockDocument, version: "2024-02" };
    const oldConsent = { ...mockConsent, documentVersion: "2024-01" };

    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      outdatedDocument,
    );
    (prisma.userConsent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(oldConsent);

    const res = await getRequest(
      "/consent/status?documentSlug=terms-of-service&visitorId=visitor-abc",
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasConsented).toBe(true);
    expect(body.needsReconsent).toBe(true);
    expect(body.currentVersion).toBe("2024-02");
    expect(body.consentedVersion).toBe("2024-01");
  });

  it("returns 500 when Prisma throws", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await getRequest(
      "/consent/status?documentSlug=terms-of-service&visitorId=visitor-abc",
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "get consent status" },
    });
  });
});

// ===========================================================================
// DELETE /consent
// ===========================================================================

describe("DELETE /consent", () => {
  it("returns 400 when documentSlug query param is missing", async () => {
    const res = await authedDeleteRequest("/consent");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.name).toBe("ZodError");
    expect(body.error.message).toContain("documentSlug");
  });

  it("returns 200 with success and withdrawnCount", async () => {
    (prisma.userConsent.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

    const res = await authedDeleteRequest(
      "/consent?documentSlug=terms-of-service&visitorId=visitor-abc",
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.withdrawnCount).toBe(2);
  });

  it("returns withdrawnCount: 0 when no matching records", async () => {
    (prisma.userConsent.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const res = await authedDeleteRequest(
      "/consent?documentSlug=terms-of-service&visitorId=unknown-visitor",
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.withdrawnCount).toBe(0);
  });

  it("returns 500 when Prisma throws", async () => {
    (prisma.userConsent.updateMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await authedDeleteRequest(
      "/consent?documentSlug=terms-of-service&visitorId=visitor-abc",
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "withdraw consent" },
    });
  });
});

// ===========================================================================
// POST /cookie-consent
// ===========================================================================

describe("POST /cookie-consent", () => {
  const validCookieBody = {
    visitorId: "visitor-abc",
    preferences: {
      functional: false,
      analytics: true,
      marketing: false,
      thirdParty: false,
    },
  };

  it("returns 200 with success and preferences on valid body", async () => {
    (prisma.cookieConsent.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieConsent);

    const res = await jsonRequest("POST", "/cookie-consent", validCookieBody);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.consentId).toBe("cc-1");
    expect(body.preferences).toMatchObject({
      necessary: true,
      functional: false,
      analytics: true,
      marketing: false,
      thirdParty: false,
    });
  });

  it("returns 400/422 when visitorId is missing", async () => {
    const res = await jsonRequest("POST", "/cookie-consent", {
      preferences: {
        functional: false,
        analytics: true,
        marketing: false,
        thirdParty: false,
      },
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when preferences object is missing", async () => {
    const res = await jsonRequest("POST", "/cookie-consent", {
      visitorId: "visitor-abc",
    });

    expect([400, 422]).toContain(res.status);
  });

  it("uses boolean defaults for omitted preference fields", async () => {
    (prisma.cookieConsent.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieConsent);

    const res = await jsonRequest("POST", "/cookie-consent", {
      visitorId: "visitor-abc",
      preferences: {},
    });

    // Zod defaults all preference booleans to false — should still pass validation
    expect(res.status).toBe(200);
  });

  it("returns 500 when Prisma throws", async () => {
    (prisma.cookieConsent.upsert as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await jsonRequest("POST", "/cookie-consent", validCookieBody);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "record cookie consent" },
    });
  });
});

// ===========================================================================
// GET /cookie-consent
// ===========================================================================

describe("GET /cookie-consent", () => {
  it("returns 400 when neither visitorId nor userId is provided", async () => {
    const res = await getRequest("/cookie-consent");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("visitorId or userId is required");
  });

  it("returns hasConsent: false when no consent record exists", async () => {
    (prisma.cookieConsent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getRequest("/cookie-consent?visitorId=visitor-abc");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasConsent).toBe(false);
    expect(body.preferences).toBeNull();
  });

  it("returns hasConsent: true with preferences when consent exists", async () => {
    (prisma.cookieConsent.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCookieConsent,
    );

    const res = await getRequest("/cookie-consent?visitorId=visitor-abc");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasConsent).toBe(true);
    expect(body.preferences).toMatchObject({
      necessary: true,
      functional: false,
      analytics: true,
      marketing: false,
      thirdParty: false,
    });
  });

  it("returns 500 when Prisma throws", async () => {
    (prisma.cookieConsent.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await getRequest("/cookie-consent?visitorId=visitor-abc");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "get cookie consent" },
    });
  });
});

// ===========================================================================
// GET /documents
// ===========================================================================

describe("GET /documents", () => {
  it("returns 200 with deduplicated documents list", async () => {
    (prisma.legalDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDocument]);

    const res = await getRequest("/documents");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.documents)).toBe(true);
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].slug).toBe("terms-of-service");
  });

  it("returns an empty array when no documents found", async () => {
    (prisma.legalDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await getRequest("/documents");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.documents).toHaveLength(0);
  });

  it("deduplicates documents with the same slug, keeping only the first (latest)", async () => {
    const olderDoc = { ...mockDocument, id: "doc-2", version: "2023-01" };
    (prisma.legalDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockDocument,
      olderDoc,
    ]);

    const res = await getRequest("/documents");
    const body = await res.json();

    expect(res.status).toBe(200);
    // Both have the same slug — only one should be returned
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].version).toBe("2024-01");
  });

  it("returns 500 when Prisma throws", async () => {
    (prisma.legalDocument.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await getRequest("/documents");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "list legal documents" },
    });
  });
});

// ===========================================================================
// GET /documents/:slug
// ===========================================================================

describe("GET /documents/:slug", () => {
  it("returns 200 with the document when found", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocument);

    const res = await getRequest("/documents/terms-of-service");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.document).toBeDefined();
    expect(body.document.slug).toBe("terms-of-service");
  });

  it("returns 404 when document not found", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getRequest("/documents/nonexistent");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(body.error.message).toContain("LegalDocument");
  });

  it("returns 500 when Prisma throws", async () => {
    (prisma.legalDocument.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await getRequest("/documents/terms-of-service");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "get legal document" },
    });
  });
});

// ===========================================================================
// POST /contact
// ===========================================================================

describe("POST /contact", () => {
  const validContactBody = {
    name: "Jane Doe",
    email: "jane@example.com",
    subject: "Test inquiry",
    message: "Hello, I have a question.",
  };

  it("returns 200 with submissionId on valid payload", async () => {
    (prisma.contactSubmission.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "sub-1",
      ...validContactBody,
      category: "general",
      status: "new",
    });

    const res = await jsonRequest("POST", "/contact", validContactBody);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.submissionId).toBe("sub-1");
    expect(typeof body.message).toBe("string");
  });

  it("returns 400/422 when required fields are missing", async () => {
    const res = await jsonRequest("POST", "/contact", {
      email: "jane@example.com",
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 400/422 when email is invalid", async () => {
    const res = await jsonRequest("POST", "/contact", {
      ...validContactBody,
      email: "not-an-email",
    });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 500 when Prisma throws", async () => {
    (prisma.contactSubmission.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await jsonRequest("POST", "/contact", validContactBody);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "DATABASE_ERROR",
      details: { operation: "submit contact form" },
    });
  });
});

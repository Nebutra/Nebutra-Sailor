import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSystemDb, getTenantDb, type Prisma } from "@nebutra/db";
import { DatabaseError, NotFoundError, toApiError } from "@nebutra/errors";
import { logger } from "@nebutra/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { requireAuth, requireOrganization } from "@/middlewares/tenantContext.js";

// AUDIT(no-tenant): /legal/documents and /contact are unauthenticated public
// endpoints (legal documents are global; contact form submissions precede
// any account). For /consent and /cookie-consent we prefer the tenant-scoped
// client when an organizationId is present in the Hono context.
const systemDb = getSystemDb();

function dbForTenant(organizationId: string | undefined) {
  return organizationId ? getTenantDb(organizationId) : systemDb;
}

const log = logger.child({ service: "consent" });

type ConsentEnv = {
  Variables: { userId?: string; organizationId?: string };
};
export const consentRoutes = new OpenAPIHono<ConsentEnv>();

// ============================================
// Route-level auth middleware
// ============================================

// POST /consent and DELETE /consent require authentication — any member can
// record or withdraw their own consent.
consentRoutes.use("/consent", requireAuth, requireOrganization);

// ============================================
// Shared error helper
// ============================================

/**
 * Return an API error response with a dynamic status code.
 * OpenAPIHono's strict typing requires declared response codes;
 * we cast via `never` because error shapes are validated at the
 * OpenAPI-spec level rather than at compile time.
 */
function jsonError(
  c: Parameters<Parameters<typeof consentRoutes.openapi>[1]>[0],
  error: unknown,
  statusCode: ContentfulStatusCode,
) {
  return c.json(toApiError(error), statusCode) as never;
}

// ============================================
// Validation Schemas
// ============================================

const recordConsentSchema = z.object({
  documentSlug: z.string().min(1),
  documentVersion: z.string().optional(),
  consentType: z.enum(["EXPLICIT", "IMPLICIT", "OPT_IN", "OPT_OUT"]).default("EXPLICIT"),
  context: z.string().optional(),
  visitorId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const cookieConsentSchema = z.object({
  visitorId: z.string().min(1),
  preferences: z.object({
    functional: z.boolean().default(false),
    analytics: z.boolean().default(false),
    marketing: z.boolean().default(false),
    thirdParty: z.boolean().default(false),
  }),
});

const contactFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  category: z
    .enum(["general", "sales", "support", "legal", "privacy", "partnership", "press"])
    .default("general"),
});

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  requestId: z.string().optional(),
});

// ============================================
// Document Consent Routes
// ============================================

const recordConsentRoute = createRoute({
  method: "post",
  path: "/consent",
  tags: ["Legal"],
  summary: "Record document consent",
  description: "Record user consent for a legal document (e.g. terms of service, privacy policy)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: recordConsentSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Consent recorded successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            consentId: z.string(),
            documentSlug: z.string(),
            documentVersion: z.string(),
            consentedAt: z.string().or(z.date()),
          }),
        },
      },
    },
    404: {
      description: "Legal document not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(recordConsentRoute, async (c) => {
  const data = c.req.valid("json");
  const tenant = c.get("tenant");
  const userId = tenant?.userId;
  const organizationId = tenant?.organizationId;
  const db = dbForTenant(organizationId);

  try {
    const document = await db.legalDocument.findFirst({
      where: {
        slug: data.documentSlug,
        isActive: true,
        ...(data.documentVersion && { version: data.documentVersion }),
      },
      orderBy: { effectiveAt: "desc" },
    });

    if (!document) {
      const notFound = new NotFoundError("LegalDocument", data.documentSlug);
      return jsonError(c, notFound, notFound.statusCode as ContentfulStatusCode);
    }

    const consentData: Parameters<typeof db.userConsent.create>[0]["data"] = {
      visitorId: data.visitorId,
      documentId: document.id,
      documentSlug: document.slug,
      documentVersion: document.version,
      consentType: data.consentType,
      consentGiven: true,
      consentContext: data.context ?? null,
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
    };

    if (userId) consentData.userId = userId;
    if (organizationId) consentData.organizationId = organizationId;

    const ipAddress = c.req.header("x-forwarded-for") || c.req.header("x-real-ip");
    if (ipAddress) consentData.ipAddress = ipAddress;

    const userAgent = c.req.header("user-agent");
    if (userAgent) consentData.userAgent = userAgent;

    const consent = await db.userConsent.create({ data: consentData });

    return c.json(
      {
        success: true as const,
        consentId: consent.id,
        documentSlug: consent.documentSlug,
        documentVersion: consent.documentVersion,
        consentedAt: consent.consentedAt,
      },
      200,
    );
  } catch (error) {
    const dbError = new DatabaseError("record consent", error instanceof Error ? error : undefined);
    log.error("Failed to record consent", { error, userId, organizationId });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

// ============================================
// Get Consent Status
// ============================================

const consentStatusRoute = createRoute({
  method: "get",
  path: "/consent/status",
  tags: ["Legal"],
  summary: "Get consent status",
  description:
    "Check whether a user has consented to a specific legal document and whether re-consent is needed",
  request: {
    query: z.object({
      documentSlug: z.string().min(1),
      visitorId: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Consent status retrieved",
      content: {
        "application/json": {
          schema: z.object({
            hasConsented: z.boolean(),
            consentedVersion: z.string().nullable(),
            currentVersion: z.string(),
            needsReconsent: z.boolean(),
            lastConsentedAt: z.string().or(z.date()).nullable(),
          }),
        },
      },
    },
    404: {
      description: "Legal document not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(consentStatusRoute, async (c) => {
  const { documentSlug, visitorId } = c.req.valid("query");
  const tenant = c.get("tenant");
  const userId = tenant?.userId;
  const db = dbForTenant(tenant?.organizationId);

  try {
    const currentDocument = await db.legalDocument.findFirst({
      where: { slug: documentSlug, isActive: true },
      orderBy: { effectiveAt: "desc" },
    });

    if (!currentDocument) {
      const notFound = new NotFoundError("LegalDocument", documentSlug);
      return jsonError(c, notFound, notFound.statusCode as ContentfulStatusCode);
    }

    const consent = await db.userConsent.findFirst({
      where: {
        documentSlug,
        consentGiven: true,
        withdrawnAt: null,
        OR: [...(userId ? [{ userId }] : []), ...(visitorId ? [{ visitorId }] : [])],
      },
      orderBy: { consentedAt: "desc" },
    });

    const hasConsented = !!consent;
    const needsReconsent = hasConsented && consent.documentVersion !== currentDocument.version;

    return c.json(
      {
        hasConsented,
        consentedVersion: consent?.documentVersion ?? null,
        currentVersion: currentDocument.version,
        needsReconsent,
        lastConsentedAt: consent?.consentedAt ?? null,
      },
      200,
    );
  } catch (error) {
    const dbError = new DatabaseError(
      "get consent status",
      error instanceof Error ? error : undefined,
    );
    log.error("Failed to get consent status", {
      error,
      documentSlug,
      userId,
      visitorId,
    });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

// ============================================
// Withdraw Consent
// ============================================

const withdrawConsentRoute = createRoute({
  method: "delete",
  path: "/consent",
  tags: ["Legal"],
  summary: "Withdraw consent",
  description: "Withdraw previously given consent for a legal document",
  request: {
    query: z.object({
      documentSlug: z.string().min(1),
      visitorId: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Consent withdrawn",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            withdrawnCount: z.number(),
          }),
        },
      },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(withdrawConsentRoute, async (c) => {
  const { documentSlug, visitorId } = c.req.valid("query");
  const tenant = c.get("tenant");
  const userId = tenant?.userId;
  const db = dbForTenant(tenant?.organizationId);

  try {
    const result = await db.userConsent.updateMany({
      where: {
        documentSlug,
        withdrawnAt: null,
        OR: [...(userId ? [{ userId }] : []), ...(visitorId ? [{ visitorId }] : [])],
      },
      data: {
        withdrawnAt: new Date(),
        consentGiven: false,
      },
    });

    return c.json(
      {
        success: true as const,
        withdrawnCount: result.count,
      },
      200,
    );
  } catch (error) {
    const dbError = new DatabaseError(
      "withdraw consent",
      error instanceof Error ? error : undefined,
    );
    log.error("Failed to withdraw consent", {
      error,
      documentSlug,
      userId,
      visitorId,
    });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

// ============================================
// Cookie Consent Endpoints
// ============================================

const recordCookieConsentRoute = createRoute({
  method: "post",
  path: "/cookie-consent",
  tags: ["Legal"],
  summary: "Record cookie consent",
  description: "Record or update cookie consent preferences for a visitor",
  request: {
    body: {
      content: {
        "application/json": {
          schema: cookieConsentSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Cookie consent recorded",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            consentId: z.string(),
            preferences: z.object({
              necessary: z.boolean(),
              functional: z.boolean(),
              analytics: z.boolean(),
              marketing: z.boolean(),
              thirdParty: z.boolean(),
            }),
            consentedAt: z.string().or(z.date()),
            expiresAt: z.string().or(z.date()),
          }),
        },
      },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(recordCookieConsentRoute, async (c) => {
  const data = c.req.valid("json");
  const tenant = c.get("tenant");
  const userId = tenant?.userId;
  const db = dbForTenant(tenant?.organizationId);

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  try {
    const createData: Parameters<typeof db.cookieConsent.upsert>[0]["create"] = {
      visitorId: data.visitorId,
      necessary: true,
      functional: data.preferences.functional,
      analytics: data.preferences.analytics,
      marketing: data.preferences.marketing,
      thirdParty: data.preferences.thirdParty,
      expiresAt,
    };
    if (userId) createData.userId = userId;

    const ipAddress = c.req.header("x-forwarded-for") || c.req.header("x-real-ip");
    if (ipAddress) createData.ipAddress = ipAddress;

    const userAgent = c.req.header("user-agent");
    if (userAgent) createData.userAgent = userAgent;

    const updateData: Parameters<typeof db.cookieConsent.upsert>[0]["update"] = {
      functional: data.preferences.functional,
      analytics: data.preferences.analytics,
      marketing: data.preferences.marketing,
      thirdParty: data.preferences.thirdParty,
      expiresAt,
    };
    if (userId) updateData.userId = userId;
    if (ipAddress) updateData.ipAddress = ipAddress;
    if (userAgent) updateData.userAgent = userAgent;

    const consent = await db.cookieConsent.upsert({
      where: { visitorId: data.visitorId },
      create: createData,
      update: updateData,
    });

    return c.json(
      {
        success: true as const,
        consentId: consent.id,
        preferences: {
          necessary: consent.necessary,
          functional: consent.functional,
          analytics: consent.analytics,
          marketing: consent.marketing,
          thirdParty: consent.thirdParty,
        },
        consentedAt: consent.consentedAt,
        expiresAt: consent.expiresAt,
      },
      200,
    );
  } catch (error) {
    const dbError = new DatabaseError(
      "record cookie consent",
      error instanceof Error ? error : undefined,
    );
    log.error("Failed to record cookie consent", {
      error,
      userId,
      visitorId: data.visitorId,
    });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

// ============================================
// Get Cookie Consent
// ============================================

const getCookieConsentRoute = createRoute({
  method: "get",
  path: "/cookie-consent",
  tags: ["Legal"],
  summary: "Get cookie consent preferences",
  description: "Retrieve current cookie consent preferences for a visitor or user",
  request: {
    query: z.object({
      visitorId: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Cookie consent preferences",
      content: {
        "application/json": {
          schema: z.object({
            hasConsent: z.boolean(),
            preferences: z
              .object({
                necessary: z.boolean(),
                functional: z.boolean(),
                analytics: z.boolean(),
                marketing: z.boolean(),
                thirdParty: z.boolean(),
              })
              .nullable(),
            consentedAt: z.string().or(z.date()).optional(),
            updatedAt: z.string().or(z.date()).optional(),
            expiresAt: z.string().or(z.date()).optional(),
          }),
        },
      },
    },
    400: {
      description: "Missing required parameter",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(getCookieConsentRoute, async (c) => {
  const { visitorId } = c.req.valid("query");
  const tenant = c.get("tenant");
  const userId = tenant?.userId;
  const db = dbForTenant(tenant?.organizationId);

  if (!visitorId && !userId) {
    return c.json({ error: "visitorId or userId is required" }, 400);
  }

  try {
    const consent = await db.cookieConsent.findFirst({
      where: {
        OR: [...(visitorId ? [{ visitorId }] : []), ...(userId ? [{ userId }] : [])],
        expiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!consent) {
      return c.json(
        {
          hasConsent: false,
          preferences: null,
        },
        200,
      );
    }

    return c.json(
      {
        hasConsent: true,
        preferences: {
          necessary: consent.necessary,
          functional: consent.functional,
          analytics: consent.analytics,
          marketing: consent.marketing,
          thirdParty: consent.thirdParty,
        },
        consentedAt: consent.consentedAt,
        updatedAt: consent.updatedAt,
        expiresAt: consent.expiresAt,
      },
      200,
    );
  } catch (error) {
    const dbError = new DatabaseError(
      "get cookie consent",
      error instanceof Error ? error : undefined,
    );
    log.error("Failed to get cookie consent", { error, visitorId, userId });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

// ============================================
// Legal Documents Endpoints
// ============================================

const listDocumentsRoute = createRoute({
  method: "get",
  path: "/documents",
  tags: ["Legal"],
  summary: "List legal documents",
  description: "List all active legal documents, optionally filtered by locale and type",
  request: {
    query: z.object({
      locale: z.string().default("en").optional(),
      type: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "List of legal documents",
      content: {
        "application/json": {
          schema: z.object({
            documents: z.array(
              z.object({
                id: z.string(),
                slug: z.string(),
                type: z.string(),
                locale: z.string(),
                version: z.string(),
                title: z.string(),
                summary: z.string().nullable(),
                effectiveAt: z.string().or(z.date()),
                isRequired: z.boolean(),
              }),
            ),
          }),
        },
      },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(listDocumentsRoute, async (c) => {
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  const { locale: rawLocale, type } = c.req.valid("query");
  const locale = rawLocale || "en";

  try {
    // Legal documents are global (not tenant-scoped) — use the system client.
    const documents = await systemDb.legalDocument.findMany({
      where: {
        isActive: true,
        locale,
        ...(type && { type: type as never }),
      },
      orderBy: { effectiveAt: "desc" },
      select: {
        id: true,
        slug: true,
        type: true,
        locale: true,
        version: true,
        title: true,
        summary: true,
        effectiveAt: true,
        isRequired: true,
      },
    });

    // Deduplicate by slug (keep latest version)
    const uniqueDocs = documents.reduce(
      (acc, doc) => {
        if (!acc[doc.slug]) {
          acc[doc.slug] = doc;
        }
        return acc;
      },
      {} as Record<string, (typeof documents)[0]>,
    );

    return c.json({ documents: Object.values(uniqueDocs) }, 200);
  } catch (error) {
    const dbError = new DatabaseError(
      "list legal documents",
      error instanceof Error ? error : undefined,
    );
    log.error("Failed to list documents", { error, locale, type });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

// ============================================
// Get Single Document
// ============================================

const getDocumentRoute = createRoute({
  method: "get",
  path: "/documents/{slug}",
  tags: ["Legal"],
  summary: "Get legal document",
  description: "Retrieve a specific legal document by its slug",
  request: {
    params: z.object({
      slug: z.string().min(1),
    }),
    query: z.object({
      locale: z.string().default("en").optional(),
      version: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Legal document found",
      content: {
        "application/json": {
          schema: z.object({
            document: z.object({}).passthrough(),
          }),
        },
      },
    },
    404: {
      description: "Legal document not found",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(getDocumentRoute, async (c) => {
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  const { slug } = c.req.valid("param");
  const { locale: rawLocale, version } = c.req.valid("query");
  const locale = rawLocale || "en";

  try {
    // Legal documents are global (not tenant-scoped) — use the system client.
    const document = await systemDb.legalDocument.findFirst({
      where: {
        slug,
        locale,
        isActive: true,
        ...(version && { version }),
      },
      orderBy: { effectiveAt: "desc" },
    });

    if (!document) {
      const notFound = new NotFoundError("LegalDocument", slug);
      return jsonError(c, notFound, notFound.statusCode as ContentfulStatusCode);
    }

    return c.json({ document }, 200);
  } catch (error) {
    const dbError = new DatabaseError(
      "get legal document",
      error instanceof Error ? error : undefined,
    );
    log.error("Failed to get document", { error, slug, locale, version });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

// ============================================
// Contact Form Endpoint
// ============================================

const contactFormRoute = createRoute({
  method: "post",
  path: "/contact",
  tags: ["Legal"],
  summary: "Submit contact form",
  description:
    "Submit a contact form inquiry. Responses are typically provided within 1-2 business days.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: contactFormSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Contact form submitted successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            submissionId: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Database error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

consentRoutes.openapi(contactFormRoute, async (c) => {
  const data = c.req.valid("json");

  try {
    // Contact form is public, pre-auth — no tenant context available.
    const submission = await systemDb.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        company: data.company ?? null,
        phone: data.phone ?? null,
        subject: data.subject,
        message: data.message,
        category: data.category,
        status: "new",
        ipAddress: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? null,
        userAgent: c.req.header("user-agent") ?? null,
      },
    });

    // Send notification email via Resend asynchronously to not block UI
    import("@nebutra/email")
      .then(({ sendContactFormReceivedEmail }) => {
        return sendContactFormReceivedEmail({
          to: data.email,
          name: data.name,
          subject: data.subject,
        });
      })
      .catch((err) => {
        log.error("Failed to enqueue contact form email", { error: err, email: data.email });
      });

    return c.json(
      {
        success: true as const,
        submissionId: submission.id,
        message: "Your message has been received. We will respond within 1-2 business days.",
      },
      200,
    );
  } catch (error) {
    const dbError = new DatabaseError(
      "submit contact form",
      error instanceof Error ? error : undefined,
    );
    log.error("Failed to submit contact form", {
      error,
      email: data.email,
      category: data.category,
    });
    return jsonError(c, dbError, dbError.statusCode as ContentfulStatusCode);
  }
});

export default consentRoutes;

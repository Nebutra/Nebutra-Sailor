/**
 * Tenant provisioning Inngest function.
 *
 * Fired by the Clerk webhook handler when a new organization is created
 * ("clerk/organization.created" event). Handles all automated setup so the
 * webhook handler stays thin and transactional.
 *
 * Steps:
 *   1. Wait for the organization record to exist in DB (up to 30s)
 *   2. Generate a default API key for the organization
 *   2.5. Create Stripe customer (idempotent — skips if already exists or key missing)
 *   3. Send a welcome email to the owner
 *   4. Initialize usage counters in Redis
 *   5. Emit "tenant/provisioned" event for downstream services
 *
 * Idempotent: safe to re-run. Checks for existing API keys and Stripe customers before creating.
 */

import crypto from "node:crypto";
import { getSystemDb } from "@nebutra/db";
import { sendWelcomeEmail } from "@nebutra/email";
import { ClerkOrganizationDataSchema } from "@nebutra/event-bus";
import { logger } from "@nebutra/logger";
import { eventType, type InngestFunction } from "inngest";
import Stripe from "stripe";
import { inngest } from "../client.js";

// AUDIT(no-tenant): tenant-provisioning creates the Organization record and
// its first API key, StripeCustomer mapping, etc. It runs BEFORE any RLS
// context for the new tenant exists — the tenant is being bootstrapped here.
const prisma = getSystemDb();

/** SHA-256 hash of plaintext key (same as API key creation in settings). */
function hashKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

/** Generate a prefixed API key: nbtr_live_<32-char random hex> */
function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString("hex");
  const plaintext = `nbtr_live_${random}`;
  const prefix = plaintext.slice(0, 16);
  const hash = hashKey(plaintext);
  return { plaintext, prefix, hash };
}

export const provisionTenant: InngestFunction.Any = inngest.createFunction(
  {
    id: "provision-tenant",
    name: "Provision New Tenant Organization",
    concurrency: { limit: 10 },
    retries: 4,
    triggers: [
      { event: eventType("clerk/organization.created", { schema: ClerkOrganizationDataSchema }) },
    ],
  },
  async ({ event, step }) => {
    const { organizationId, name: organizationName, createdById } = event.data;

    logger.info("Tenant provisioning started", {
      organizationId,
      createdById,
    });

    // ── Step 1: Verify org exists in DB ───────────────────────────────────
    const org = await step.run("verify-org-in-db", async () => {
      // The webhook handler writes to DB synchronously before firing this event,
      // but retry here in case of a race condition.
      const found = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!found) {
        throw new Error(`Organization ${organizationId} not yet in DB — Inngest will retry`);
      }

      return found;
    });

    const owner = await step.run("find-owner", async () => {
      if (createdById) {
        return await prisma.user.findUnique({ where: { clerkId: createdById } });
      }
      return null;
    });

    const ownerEmail = owner?.email ?? "";
    const ownerFirstName = owner?.name?.split(" ")[0] ?? "";
    const organizationClerkId = org.clerkId;

    // ── Step 2: Create default API key ────────────────────────────────────
    const { keyPrefix, keyPlaintext } = await step.run(
      "create-default-api-key",
      async (): Promise<{ keyPrefix: string; keyPlaintext: string | null }> => {
        // Idempotency: skip if org already has an API key
        const existingKey = await prisma.aPIKey.findFirst({
          where: { organizationId: org.id, revokedAt: null },
        });

        if (existingKey) {
          logger.info("Default API key already exists — skipping", {
            organizationId: org.id,
          });
          return { keyPrefix: existingKey.keyPrefix, keyPlaintext: null };
        }

        const { plaintext, prefix, hash } = generateApiKey();

        await prisma.aPIKey.create({
          data: {
            name: "Default Key",
            keyHash: hash,
            keyPrefix: prefix,
            organizationId: org.id,
          },
        });

        logger.info("Default API key created", {
          organizationId: org.id,
          keyPrefix: prefix,
        });

        return { keyPrefix: prefix, keyPlaintext: plaintext };
      },
    );

    // ── Step 2.5: Create Stripe customer ─────────────────────────────────
    await step.run("create-stripe-customer", async () => {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        logger.warn("STRIPE_SECRET_KEY not set — skipping Stripe customer creation", {
          organizationId: org.id,
        });
        return;
      }

      // Idempotency: skip if StripeCustomer record already exists
      const existing = await prisma.stripeCustomer.findUnique({
        where: { organizationId: org.id },
      });

      if (existing) {
        logger.info("Stripe customer already exists — skipping", {
          organizationId: org.id,
          stripeId: existing.stripeId,
        });
        return;
      }

      const stripe = new Stripe(secretKey);
      const customer = await stripe.customers.create({
        email: ownerEmail,
        name: organizationName,
        metadata: {
          organizationId: org.id,
          organizationClerkId,
        },
      });

      await prisma.stripeCustomer.create({
        data: {
          organizationId: org.id,
          stripeId: customer.id,
          email: ownerEmail,
          name: organizationName,
        },
      });

      logger.info("Stripe customer created", {
        organizationId: org.id,
        stripeCustomerId: customer.id,
      });
    });

    // ── Step 3: Send welcome email ────────────────────────────────────────
    await step.run("send-welcome-email", async () => {
      if (!ownerEmail) {
        logger.warn("No owner email — skipping welcome email", {
          organizationId: org.id,
        });
        return;
      }

      try {
        await sendWelcomeEmail({
          to: ownerEmail,
          firstName: ownerFirstName || "there",
          orgName: organizationName,
          dashboardUrl: "https://app.nebutra.ai",
        });

        logger.info("Welcome email sent", { ownerEmail, organizationId: org.id });
      } catch (err) {
        // Non-fatal — don't fail provisioning over email
        logger.warn("Welcome email send failed", { ownerEmail, err });
      }
    });

    // ── Step 4: Emit provisioned event ────────────────────────────────────
    await step.sendEvent("emit-tenant-provisioned", {
      name: "nebutra/tenant.provisioned",
      data: {
        organizationId: org.id,
        organizationClerkId,
        organizationName,
        ownerEmail,
        keyPrefix,
        // Only include plaintext on first provision (not on retries)
        ...(keyPlaintext ? { initialApiKey: keyPlaintext } : {}),
        provisionedAt: new Date().toISOString(),
      },
    });

    logger.info("Tenant provisioning completed", {
      organizationId: org.id,
      organizationName,
    });

    return { organizationId: org.id, status: "provisioned" };
  },
);

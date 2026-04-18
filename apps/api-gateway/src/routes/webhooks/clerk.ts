import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSystemDb, type Role } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import {
  type JsonValue,
  OrganizationMemberRepository,
  OrganizationRepository,
  UserRepository,
  WebhookEventRepository,
} from "@nebutra/repositories";
import { Webhook } from "svix";
import { inngest } from "../../inngest/client.js";

// AUDIT(no-tenant): Clerk webhooks manage user/org lifecycle and arrive
// without a request-scoped tenant context. Repository writes below use
// the system-scope Prisma client resolved from the webhook payload.
const prisma = getSystemDb();

const log = logger.child({ service: "clerk-webhook" });

// ============================================
// Clerk webhook event types
// ============================================

interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification: { status: string } | null;
}

interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  profile_image_url: string | null;
}

interface ClerkOrganizationData {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  created_by?: string;
}

interface ClerkOrganizationMembershipData {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  public_user_data: {
    user_id: string;
  };
}

type ClerkWebhookEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "organization.created"
  | "organization.updated"
  | "organization.deleted"
  | "organizationMembership.created"
  | "organizationMembership.deleted"
  | (string & Record<never, never>); // allow unknown types without widening known types

interface ClerkWebhookEvent {
  type: ClerkWebhookEventType;
  data: unknown;
}

// ============================================
// Repository bundle type
// ============================================

export interface ClerkRepos {
  userRepo: UserRepository;
  orgRepo: OrganizationRepository;
  memberRepo: OrganizationMemberRepository;
  webhookEventRepo: WebhookEventRepository;
}

// ============================================
// Role mapping
// ============================================

function mapClerkRole(clerkRole: string): Role {
  const roleMap: Record<string, Role> = {
    "org:owner": "OWNER",
    "org:admin": "ADMIN",
    "org:member": "MEMBER",
    "org:viewer": "VIEWER",
  };
  return roleMap[clerkRole] ?? "MEMBER";
}

// ============================================
// OpenAPI route definition
// ============================================

const clerkWebhookRoute = createRoute({
  method: "post",
  path: "/clerk",
  tags: ["Webhooks"],
  summary: "Clerk webhook handler",
  description:
    "Receives Clerk webhook events for user and organization lifecycle management. Signature verification is handled by the Svix SDK.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook received and queued for processing",
      content: {
        "application/json": {
          schema: z.object({
            received: z.literal(true),
            skipped: z.boolean().optional(),
          }),
        },
      },
    },
    400: {
      description: "Invalid signature or missing svix headers",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Webhook not configured",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

// ============================================
// Factory function
// ============================================

export function createClerkWebhookRoutes(repos?: Partial<ClerkRepos>): OpenAPIHono {
  const resolvedRepos: ClerkRepos = {
    userRepo: repos?.userRepo ?? new UserRepository(prisma),
    orgRepo: repos?.orgRepo ?? new OrganizationRepository(prisma),
    memberRepo: repos?.memberRepo ?? new OrganizationMemberRepository(prisma),
    webhookEventRepo: repos?.webhookEventRepo ?? new WebhookEventRepository(prisma),
  };

  const app = new OpenAPIHono();

  // ============================================
  // Route handler
  // ============================================

  app.openapi(clerkWebhookRoute, async (c) => {
    const rawBody = await c.req.text();
    const svixId = c.req.header("svix-id");
    const svixTimestamp = c.req.header("svix-timestamp");
    const svixSignature = c.req.header("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return c.json({ error: "Missing svix headers" }, 400);
    }

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      log.error("CLERK_WEBHOOK_SECRET not configured");
      return c.json({ error: "Webhook not configured" }, 500);
    }

    let payload: ClerkWebhookEvent;
    try {
      const wh = new Webhook(webhookSecret);
      payload = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      log.error("Clerk webhook signature verification failed", err);
      return c.json({ error: "Invalid signature" }, 400);
    }

    // Atomic idempotency claim — relies on the unique constraint
    // `@@unique([provider, eventId])` on WebhookEvent. The first pod to
    // insert the row wins; concurrent retries short-circuit on P2002.
    const claim = await resolvedRepos.webhookEventRepo.claim({
      provider: "clerk",
      eventId: svixId,
      eventType: payload.type,
      payload: payload as unknown as JsonValue,
    });

    if (!claim.claimed) {
      log.info("Clerk event already received, skipping", {
        svixId,
        type: payload.type,
      });
      return c.json({ received: true as const, skipped: true }, 200);
    }

    // Respond immediately; process asynchronously
    const response = c.json({ received: true as const }, 200);

    handleClerkEvent(payload, resolvedRepos)
      .then(async () => {
        await resolvedRepos.webhookEventRepo.markProcessed("clerk", svixId);
      })
      .catch(async (err: unknown) => {
        log.error("Clerk event handler error", err, { type: payload.type });
        await resolvedRepos.webhookEventRepo
          .markFailed("clerk", svixId, err instanceof Error ? err.message : "Unknown error")
          .catch(() => {
            // Best-effort — do not throw inside catch
          });
      });

    return response;
  });

  return app;
}

// Backward-compat named export — keeps apps/api-gateway/src/routes/webhooks/index.ts unchanged
export const clerkWebhookRoutes = createClerkWebhookRoutes();

// ============================================
// Event dispatcher
// ============================================

async function handleClerkEvent(event: ClerkWebhookEvent, repos: ClerkRepos): Promise<void> {
  switch (event.type) {
    case "user.created":
      await handleUserCreated(event.data as ClerkUserData, repos.userRepo);
      break;
    case "user.updated":
      await handleUserUpdated(event.data as ClerkUserData, repos.userRepo);
      break;
    case "user.deleted":
      await handleUserDeleted(event.data as ClerkUserData, repos.userRepo);
      break;
    case "organization.created":
      await handleOrganizationCreated(event.data as ClerkOrganizationData, repos.orgRepo);
      break;
    case "organization.updated":
      await handleOrganizationUpdated(event.data as ClerkOrganizationData, repos.orgRepo);
      break;
    case "organization.deleted":
      await handleOrganizationDeleted(event.data as ClerkOrganizationData, repos.orgRepo);
      break;
    case "organizationMembership.created":
      await handleMembershipCreated(
        event.data as ClerkOrganizationMembershipData,
        repos.orgRepo,
        repos.userRepo,
        repos.memberRepo,
      );
      break;
    case "organizationMembership.deleted":
      await handleMembershipDeleted(
        event.data as ClerkOrganizationMembershipData,
        repos.orgRepo,
        repos.userRepo,
        repos.memberRepo,
      );
      break;
    default:
      log.info("Unhandled Clerk event type", { type: event.type });
  }
}

// ============================================
// User handlers
// ============================================

function resolveUserName(data: ClerkUserData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function resolvePrimaryEmail(data: ClerkUserData): string {
  const primary = data.email_addresses.find((e) => e.verification?.status === "verified");
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? "";
}

async function handleUserCreated(data: ClerkUserData, repo: UserRepository): Promise<void> {
  const email = resolvePrimaryEmail(data);
  const name = resolveUserName(data);
  const avatarUrl = data.image_url ?? data.profile_image_url ?? null;

  await repo.create({
    clerkId: data.id,
    email,
    ...(name !== null && { name }),
    ...(avatarUrl !== null && { avatarUrl }),
  });

  log.info("User created", { clerkId: data.id, email });
}

async function handleUserUpdated(data: ClerkUserData, repo: UserRepository): Promise<void> {
  const email = resolvePrimaryEmail(data);
  const name = resolveUserName(data);
  const avatarUrl = data.image_url ?? data.profile_image_url ?? null;

  await repo.updateByClerkId(data.id, { email, name, avatarUrl });

  log.info("User updated", { clerkId: data.id, email });
}

async function handleUserDeleted(data: ClerkUserData, repo: UserRepository): Promise<void> {
  // Cascade deletes on OrganizationMember, Wallet, etc. are handled by DB constraints
  await repo.deleteByClerkId(data.id);

  log.info("User deleted", { clerkId: data.id });
}

// ============================================
// Organization handlers
// ============================================

async function handleOrganizationCreated(
  data: ClerkOrganizationData,
  repo: OrganizationRepository,
): Promise<void> {
  const org = await repo.create({
    clerkId: data.id,
    name: data.name,
    slug: data.slug,
  });

  log.info("Organization created", {
    clerkId: data.id,
    name: data.name,
    slug: data.slug,
  });

  // Trigger async tenant provisioning (default API key + welcome email).
  // Fire-and-forget — a provisioning failure must NOT fail the webhook response.
  const payload = {
    name: "clerk/organization.created",
    data: {
      organizationId: org.id,
      name: data.name,
      slug: data.slug,
      createdById: data.created_by,
    },
  };

  void inngest.send(payload).catch((err) => {
    log.warn("Failed to enqueue tenant provisioning event", {
      clerkId: data.id,
      orgId: org.id,
      err,
    });
  });
}

async function handleOrganizationUpdated(
  data: ClerkOrganizationData,
  repo: OrganizationRepository,
): Promise<void> {
  await repo.updateByClerkId(data.id, {
    name: data.name,
    slug: data.slug,
  });

  log.info("Organization updated", { clerkId: data.id, name: data.name });
}

async function handleOrganizationDeleted(
  data: ClerkOrganizationData,
  repo: OrganizationRepository,
): Promise<void> {
  // Cascade deletes on members, content, products, etc. handled by DB constraints
  await repo.deleteByClerkId(data.id);

  log.info("Organization deleted", { clerkId: data.id });
}

// ============================================
// Membership handlers
// ============================================

async function handleMembershipCreated(
  data: ClerkOrganizationMembershipData,
  orgRepo: OrganizationRepository,
  userRepo: UserRepository,
  memberRepo: OrganizationMemberRepository,
): Promise<void> {
  const orgClerkId = data.organization.id;
  const userClerkId = data.public_user_data.user_id;
  const role = mapClerkRole(data.role);

  const [organization, user] = await Promise.all([
    orgRepo.findByClerkId(orgClerkId),
    userRepo.findByClerkId(userClerkId),
  ]);

  if (!organization) {
    log.error("Organization not found for membership.created", null, {
      orgClerkId,
      membershipId: data.id,
    });
    return;
  }

  if (!user) {
    log.error("User not found for membership.created", null, {
      userClerkId,
      membershipId: data.id,
    });
    return;
  }

  await memberRepo.upsert({
    organizationId: organization.id,
    userId: user.id,
    role,
  });

  log.info("Organization membership created", {
    organizationId: organization.id,
    userId: user.id,
    role,
  });
}

async function handleMembershipDeleted(
  data: ClerkOrganizationMembershipData,
  orgRepo: OrganizationRepository,
  userRepo: UserRepository,
  memberRepo: OrganizationMemberRepository,
): Promise<void> {
  const orgClerkId = data.organization.id;
  const userClerkId = data.public_user_data.user_id;

  const [organization, user] = await Promise.all([
    orgRepo.findByClerkId(orgClerkId),
    userRepo.findByClerkId(userClerkId),
  ]);

  if (!organization || !user) {
    log.error("Organization or user not found for membership.deleted", null, {
      orgClerkId,
      userClerkId,
      membershipId: data.id,
    });
    return;
  }

  await memberRepo.deleteByOrganizationAndUser(organization.id, user.id);

  log.info("Organization membership deleted", {
    organizationId: organization.id,
    userId: user.id,
  });
}

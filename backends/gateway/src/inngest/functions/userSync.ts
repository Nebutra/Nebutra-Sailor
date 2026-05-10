import { getSystemDb } from "@nebutra/db";
import { ClerkUserDataSchema } from "@nebutra/event-bus";
import { UserRepository } from "@nebutra/repositories";
import { eventType, type InngestFunction } from "inngest";
import { inngest } from "../client.js";

// AUDIT(no-tenant): Clerk user lifecycle events do not carry an
// organizationId — the User row is per-Clerk-user, not per-tenant.
const userRepo = new UserRepository(getSystemDb());

/**
 * Inngest function: upsert a Clerk user into the database on
 * `clerk/user.created` and `clerk/user.updated` events.
 *
 * event.data is fully typed via Zod v4 Standard Schema — no manual assertion needed.
 */
export const syncUserToDB: InngestFunction.Any = inngest.createFunction(
  {
    id: "sync-user-to-db",
    name: "Sync Clerk User to Database",
    concurrency: { limit: 10 },
    retries: 3,
    triggers: [
      { event: eventType("clerk/user.created", { schema: ClerkUserDataSchema }) },
      { event: eventType("clerk/user.updated", { schema: ClerkUserDataSchema }) },
    ],
  },
  async ({ event, step }) => {
    const { userId, email, firstName, lastName, imageUrl } = event.data;

    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

    await step.run("upsert-user", async () => {
      await userRepo.upsertByClerkId({
        clerkId: userId,
        email,
        name: fullName,
        avatarUrl: imageUrl ?? null,
      });
    });
  },
);

/**
 * Inngest function: remove a Clerk user from the database on
 * `clerk/user.deleted` events.
 */
export const deleteUserFromDB: InngestFunction.Any = inngest.createFunction(
  {
    id: "delete-user-from-db",
    name: "Delete Clerk User from Database",
    concurrency: { limit: 10 },
    retries: 3,
    triggers: [{ event: eventType("clerk/user.deleted", { schema: ClerkUserDataSchema }) }],
  },
  async ({ event, step }) => {
    const { userId } = event.data;

    await step.run("delete-user", async () => {
      await userRepo.deleteIfExistsByClerkId(userId);
    });
  },
);

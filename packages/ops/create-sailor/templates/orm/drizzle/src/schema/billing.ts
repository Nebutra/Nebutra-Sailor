import { integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./tenant";

/**
 * Subscription + UsageLedger mirrors for the commerce/billing flow. The
 * Prisma side owns writes; Drizzle is read-mostly for now.
 */

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  externalId: text("external_id"),
  seats: integer("seats").notNull().default(1),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageLedger = pgTable("usage_ledger", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  meter: text("meter").notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
  metadata: jsonb("metadata"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type UsageLedgerEntry = typeof usageLedger.$inferSelect;

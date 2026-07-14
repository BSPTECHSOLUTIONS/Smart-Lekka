import { pgTable, serial, integer, text, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jcbSettlementsTable = pgTable("jcb_settlements", {
  id: serial("id").primaryKey(),
  jcbUserId: integer("jcb_user_id").notNull(),
  supervisorId: integer("supervisor_id").notNull(),
  settlementDate: date("settlement_date").notNull(),
  amountReceived: numeric("amount_received", { precision: 12, scale: 2 }).notNull().default("0"),
  expensesPaid: numeric("expenses_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  previousPending: numeric("previous_pending", { precision: 12, scale: 2 }).notNull().default("0"),
  totalToCollect: numeric("total_to_collect", { precision: 12, scale: 2 }).notNull().default("0"),
  collected: numeric("collected", { precision: 12, scale: 2 }).notNull().default("0"),
  pending: numeric("pending", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJcbSettlementSchema = createInsertSchema(jcbSettlementsTable).omit({ id: true, createdAt: true });
export type InsertJcbSettlement = z.infer<typeof insertJcbSettlementSchema>;
export type JcbSettlement = typeof jcbSettlementsTable.$inferSelect;

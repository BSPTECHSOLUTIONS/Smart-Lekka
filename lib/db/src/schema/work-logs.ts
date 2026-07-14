import { pgTable, serial, integer, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workLogsTable = pgTable("work_logs", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  jcbUserId: integer("jcb_user_id"),
  fieldName: text("field_name").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  totalHours: real("total_hours").notNull(),
  amount: real("amount").notNull(),
  paidAmount: real("paid_amount").notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkLogSchema = createInsertSchema(workLogsTable).omit({ id: true, createdAt: true, paidAmount: true, status: true });
export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
export type WorkLog = typeof workLogsTable.$inferSelect;

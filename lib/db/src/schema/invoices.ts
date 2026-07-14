import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  supervisorId: integer("supervisor_id").notNull(),
  clientId: integer("client_id"),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientMobile: text("client_mobile"),
  totalAmount: real("total_amount").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceItemsTable = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const invoicePaymentsTable = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  amountPaid: real("amount_paid").notNull(),
  note: text("note"),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItemsTable).omit({ id: true });
export const insertInvoicePaymentSchema = createInsertSchema(invoicePaymentsTable).omit({ id: true });

export type Invoice = typeof invoicesTable.$inferSelect;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
export type InvoicePayment = typeof invoicePaymentsTable.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

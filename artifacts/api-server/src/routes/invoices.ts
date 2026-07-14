import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, invoiceItemsTable, invoicePaymentsTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/invoices/next-number — MUST be before /:id route
router.get("/invoices/next-number", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "supervisor") { res.status(403).json({ error: "Forbidden" }); return; }

  const all = await db
    .select({ invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable)
    .where(eq(invoicesTable.supervisorId, user.userId));

  const nums = all
    .map((r) => parseInt(r.invoiceNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  res.json({ invoiceNumber: `INV-${String(next).padStart(4, "0")}` });
});

// GET /api/invoices — list invoices for this supervisor
router.get("/invoices", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "supervisor") { res.status(403).json({ error: "Forbidden" }); return; }

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.supervisorId, user.userId))
    .orderBy(invoicesTable.createdAt);

  res.json(invoices.reverse());
});

// POST /api/invoices — create invoice with items
router.post("/invoices", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "supervisor") { res.status(403).json({ error: "Forbidden" }); return; }

  const { invoiceNumber, clientName, clientMobile, items, paidAmount, notes } = req.body as {
    invoiceNumber: string;
    clientName: string;
    clientMobile?: string;
    items: Array<{ description: string; amount: number }>;
    paidAmount?: number;
    notes?: string;
  };

  if (!invoiceNumber || !clientName || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "invoiceNumber, clientName, and items are required" }); return;
  }

  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const paid = Number(paidAmount) || 0;
  const status = paid >= totalAmount ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      supervisorId: user.userId,
      invoiceNumber,
      clientName,
      clientMobile: clientMobile || null,
      totalAmount,
      paidAmount: paid,
      status,
      notes: notes || null,
    })
    .returning();

  await db.insert(invoiceItemsTable).values(
    items.map((item, idx) => ({
      invoiceId: invoice.id,
      description: item.description,
      amount: Number(item.amount) || 0,
      sortOrder: idx,
    }))
  );

  if (paid > 0) {
    await db.insert(invoicePaymentsTable).values({
      invoiceId: invoice.id,
      amountPaid: paid,
      note: "Initial payment",
    });
  }

  res.status(201).json(invoice);
});

// GET /api/invoices/:id — invoice detail with items & payments
router.get("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "supervisor") { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt(req.params.id);
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.supervisorId, user.userId)));

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, id))
    .orderBy(invoiceItemsTable.sortOrder);

  const payments = await db
    .select()
    .from(invoicePaymentsTable)
    .where(eq(invoicePaymentsTable.invoiceId, id))
    .orderBy(invoicePaymentsTable.paymentDate);

  res.json({ ...invoice, items, payments });
});

// DELETE /api/invoices/:id
router.delete("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "supervisor") { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt(req.params.id);
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.supervisorId, user.userId)));

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
  await db.delete(invoicePaymentsTable).where(eq(invoicePaymentsTable.invoiceId, id));
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));

  res.json({ success: true });
});

// POST /api/invoices/:id/payments — record a payment
router.post("/invoices/:id/payments", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "supervisor") { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt(req.params.id);
  const { amountPaid, note } = req.body as { amountPaid: number; note?: string };

  if (!amountPaid || amountPaid <= 0) { res.status(400).json({ error: "amountPaid must be positive" }); return; }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.supervisorId, user.userId)));

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const [payment] = await db
    .insert(invoicePaymentsTable)
    .values({ invoiceId: id, amountPaid, note: note || null })
    .returning();

  const newPaid = invoice.paidAmount + amountPaid;
  const newStatus = newPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";

  await db
    .update(invoicesTable)
    .set({ paidAmount: newPaid, status: newStatus })
    .where(eq(invoicesTable.id, id));

  res.status(201).json({ payment, newPaidAmount: newPaid, newStatus });
});

export default router;

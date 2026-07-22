import { Router, type IRouter } from "express";
import { db, paymentsTable, workersTable, workLogsTable } from "@workspace/db";
import { and, eq, asc, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreatePaymentBody } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Allocate a payment amount across unpaid work logs (FIFO by startTime).
 * Returns the unallocated remainder (overpayment / advance).
 */
async function allocateFIFO(workerId: number, paymentAmount: number): Promise<number> {
  const entries = await db
    .select()
    .from(workLogsTable)
    .where(and(eq(workLogsTable.workerId, workerId), ne(workLogsTable.status, "PAID")))
    .orderBy(asc(workLogsTable.startTime));

  let remaining = paymentAmount;

  for (const entry of entries) {
    if (remaining <= 0) break;
    const due = entry.amount - entry.paidAmount;
    if (due <= 0) continue;

    if (remaining >= due) {
      await db.update(workLogsTable).set({ paidAmount: entry.amount, status: "PAID" }).where(eq(workLogsTable.id, entry.id));
      remaining -= due;
    } else {
      await db.update(workLogsTable).set({ paidAmount: entry.paidAmount + remaining, status: "PARTIAL" }).where(eq(workLogsTable.id, entry.id));
      remaining = 0;
    }
  }

  return remaining;
}

router.post("/payments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { workerId, amountPaid, jcbUserId } = parsed.data;

  if (amountPaid <= 0) {
    res.status(400).json({ error: "Payment amount must be greater than 0" });
    return;
  }

  const user = req.user!;
  const condition = user.clientId
    ? and(eq(workersTable.id, workerId), eq(workersTable.clientId, user.clientId))
    : and(eq(workersTable.id, workerId), eq(workersTable.userId, user.userId));

  const [worker] = await db.select().from(workersTable).where(condition);
  if (!worker) {
    res.status(403).json({ error: "Worker not found or access denied" });
    return;
  }

  // Record the payment first
  const [payment] = await db
    .insert(paymentsTable)
    .values({ workerId, amountPaid, jcbUserId: jcbUserId ?? null })
    .returning();

  // Apply existing advance balance + new payment through FIFO
  const existingAdvance = worker.advanceBalance ?? 0;
  const totalToAllocate = existingAdvance + amountPaid;
  const unallocated = await allocateFIFO(workerId, totalToAllocate);

  // Store any unallocated remainder as new advance balance
  await db
    .update(workersTable)
    .set({ advanceBalance: unallocated })
    .where(eq(workersTable.id, workerId));

  res.status(201).json({
    id: payment.id,
    workerId: payment.workerId,
    jcbUserId: payment.jcbUserId,
    amountPaid: payment.amountPaid,
    paymentDate: payment.paymentDate.toISOString(),
    advanceBalance: unallocated,
  });
});

export default router;

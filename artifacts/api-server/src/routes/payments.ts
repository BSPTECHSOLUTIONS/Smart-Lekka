import { Router, type IRouter } from "express";
import { db, paymentsTable, workersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreatePaymentBody } from "@workspace/api-zod";
import { allocateAdvanceFIFO } from "../lib/advance-allocation";

const router: IRouter = Router();

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
  const unallocated = await allocateAdvanceFIFO(workerId, totalToAllocate);

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

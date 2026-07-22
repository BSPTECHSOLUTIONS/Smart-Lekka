import { Router, type IRouter } from "express";
import { db, workLogsTable, workersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateWorkLogBody, GetActiveWorkLogResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const activeSessionStore = new Map<string, { workerId: number; workerName: string | null; fieldName: string; startTime: string }>();

router.get("/work-logs/active", requireAuth, async (req, res): Promise<void> => {
  const userId = String(req.user!.userId);
  const session = activeSessionStore.get(userId);
  if (session) {
    res.json(GetActiveWorkLogResponse.parse({
      active: true,
      workerId: session.workerId,
      workerName: session.workerName,
      fieldName: session.fieldName,
      startTime: session.startTime,
    }));
  } else {
    res.json(GetActiveWorkLogResponse.parse({ active: false, workerId: null, workerName: null, fieldName: null, startTime: null }));
  }
});

router.post("/work-logs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWorkLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { workerId, fieldName, startTime, endTime, totalHours, amount } = parsed.data;
  const user = req.user!;

  // Validate worker ownership (clientId-based or legacy userId)
  const condition = user.clientId
    ? and(eq(workersTable.id, workerId), eq(workersTable.clientId, user.clientId))
    : and(eq(workersTable.id, workerId), eq(workersTable.userId, user.userId));

  const [worker] = await db.select().from(workersTable).where(condition);
  if (!worker) {
    res.status(403).json({ error: "Worker not found or access denied" });
    return;
  }

  const userId = String(user.userId);
  activeSessionStore.delete(userId);

  const [log] = await db.insert(workLogsTable).values({
    workerId,
    jcbUserId: user.userId,
    fieldName,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    totalHours,
    amount,
    paidAmount: 0,
    status: "PENDING",
  }).returning();

  res.status(201).json({
    id: log.id,
    workerId: log.workerId,
    jcbUserId: log.jcbUserId,
    workerName: worker.name ?? null,
    fieldName: log.fieldName,
    startTime: log.startTime.toISOString(),
    endTime: log.endTime.toISOString(),
    totalHours: log.totalHours,
    amount: log.amount,
    paidAmount: log.paidAmount,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
  });
});

/**
 * PATCH /work-logs/:id/mark-paid
 * Mark a single work entry as fully paid
 */
router.patch("/work-logs/:id/mark-paid", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid work log id" });
    return;
  }

  const [log] = await db
    .select({ id: workLogsTable.id, workerId: workLogsTable.workerId, amount: workLogsTable.amount, status: workLogsTable.status })
    .from(workLogsTable)
    .where(eq(workLogsTable.id, id));

  if (!log) {
    res.status(404).json({ error: "Work log not found" });
    return;
  }

  const user = req.user!;
  const condition = user.clientId
    ? and(eq(workersTable.id, log.workerId), eq(workersTable.clientId, user.clientId))
    : and(eq(workersTable.id, log.workerId), eq(workersTable.userId, user.userId));

  const [worker] = await db.select().from(workersTable).where(condition);
  if (!worker) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (log.status === "PAID") {
    res.status(400).json({ error: "Entry is already paid" });
    return;
  }

  const [updated] = await db
    .update(workLogsTable)
    .set({ paidAmount: log.amount, status: "PAID" })
    .where(eq(workLogsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status, paidAmount: updated.paidAmount });
});

/**
 * DELETE /work-logs/:id
 * Delete a work log entry — supervisor/admin only, blocked if any payment has been made
 */
router.delete("/work-logs/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  if (user.role !== "supervisor" && user.role !== "admin") {
    res.status(403).json({ error: "Only supervisors can delete work entries" });
    return;
  }

  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid work log id" });
    return;
  }

  const [log] = await db
    .select()
    .from(workLogsTable)
    .where(eq(workLogsTable.id, id));

  if (!log) {
    res.status(404).json({ error: "Work log not found" });
    return;
  }

  // Block deletion if any payment has already been allocated to this entry
  if ((log.paidAmount ?? 0) > 0) {
    res.status(400).json({ error: "Cannot delete an entry that has already been partially or fully paid" });
    return;
  }

  // Verify worker ownership
  const ownerCondition = user.clientId
    ? and(eq(workersTable.id, log.workerId), eq(workersTable.clientId, user.clientId))
    : and(eq(workersTable.id, log.workerId), eq(workersTable.userId, user.userId));

  const [worker] = await db.select().from(workersTable).where(ownerCondition);
  if (!worker) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(workLogsTable).where(eq(workLogsTable.id, id));
  res.status(204).end();
});

export { activeSessionStore };
export default router;

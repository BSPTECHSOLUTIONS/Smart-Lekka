import { Router, type IRouter } from "express";
import { db, workersTable, workLogsTable, paymentsTable, usersTable } from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import type { AuthPayload } from "../middlewares/auth";
import {
  CreateWorkerBody,
  GetWorkerParams,
  GetWorkerLogsParams,
  GetWorkerPaymentsParams,
  ListWorkersResponse,
  GetWorkerResponse,
  GetWorkerLogsResponse,
  GetWorkerPaymentsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * For a supervisor, get the IDs of JCB users directly under them.
 */
async function getSupervisorJcbIds(supervisorUserId: number, clientId: number): Promise<number[]> {
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(
      eq(usersTable.supervisorId, supervisorUserId),
      eq(usersTable.clientId, clientId),
      eq(usersTable.role, "user"),
    ));
  return rows.map(r => r.id);
}

/**
 * Get a worker's summary scoped to a set of JCB user IDs.
 * If jcbIds is null → count all work logs for that worker (admin / legacy).
 */
async function getWorkerSummaryForJcbs(
  workerId: number,
  jcbIds: number[] | null,
): Promise<{ totalEarned: number; totalPaid: number } | null> {
  if (jcbIds != null && jcbIds.length === 0) {
    return { totalEarned: 0, totalPaid: 0 };
  }

  // Scope both earned and paid to the same JCB IDs so pendingAmount is always correct.
  // totalPaid uses paidAmount on work_logs (populated by FIFO allocation) — never from
  // paymentsTable directly, which is unscoped and would cause negative pendingAmount when
  // a payment covers work from multiple JCBs.
  const logsWhere = jcbIds != null
    ? and(eq(workLogsTable.workerId, workerId), inArray(workLogsTable.jcbUserId, jcbIds))
    : eq(workLogsTable.workerId, workerId);

  const [row] = await db
    .select({
      totalEarned: sql<number>`coalesce(sum(amount), 0)`,
      totalPaid: sql<number>`coalesce(sum(paid_amount), 0)`,
    })
    .from(workLogsTable)
    .where(logsWhere);

  return {
    totalEarned: Number(row?.totalEarned ?? 0),
    totalPaid: Number(row?.totalPaid ?? 0),
  };
}

/**
 * Resolve the effective JCB IDs to scope data for a given user:
 * - Admin with no clientId → null (unrestricted)
 * - Supervisor → their own assigned JCB users
 * - JCB user → [their own userId]
 * - Explicit jcbUserId override → [jcbUserId] (validated against scope)
 */
async function resolveJcbScope(
  user: AuthPayload,
  explicitJcbUserId: number | null,
): Promise<number[] | null> {
  // No client → admin with legacy data, unrestricted
  if (!user.clientId) return null;

  if (user.role === "user") {
    // JCB user always sees only their own sessions
    return [user.userId];
  }

  if (user.role === "supervisor") {
    const myJcbIds = await getSupervisorJcbIds(user.userId, user.clientId);
    if (explicitJcbUserId != null) {
      // Only allow the filter if that JCB belongs to this supervisor
      return myJcbIds.includes(explicitJcbUserId) ? [explicitJcbUserId] : myJcbIds;
    }
    return myJcbIds;
  }

  // Admin with a clientId (rare) — allow explicit JCB filter
  if (explicitJcbUserId != null) return [explicitJcbUserId];
  return null; // admin sees all
}

router.get("/workers", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const explicitJcbUserId = req.query.jcbUserId ? parseInt(String(req.query.jcbUserId)) : null;

  const jcbIds = await resolveJcbScope(user, isNaN(explicitJcbUserId ?? NaN) ? null : explicitJcbUserId);

  // Base worker query — scoped by client or owner
  const baseCondition = user.clientId
    ? eq(workersTable.clientId, user.clientId)
    : eq(workersTable.userId, user.userId);

  const workers = await db
    .select()
    .from(workersTable)
    .where(baseCondition)
    .orderBy(workersTable.name);

  const summaries = await Promise.all(workers.map(async (w) => {
    const s = await getWorkerSummaryForJcbs(w.id, jcbIds);
    if (!s) return null;
    return {
      id: w.id,
      name: w.name,
      mobile: w.mobile,
      createdAt: w.createdAt.toISOString(),
      totalEarned: s.totalEarned,
      totalPaid: s.totalPaid,
      pendingAmount: s.totalEarned - s.totalPaid,
    };
  }));

  res.json(ListWorkersResponse.parse(summaries.filter(Boolean)));
});

router.post("/workers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;

  const baseCondition = user.clientId
    ? eq(workersTable.clientId, user.clientId)
    : eq(workersTable.userId, user.userId);

  // Check for duplicate mobile number
  if (parsed.data.mobile) {
    const mobileConflict = await db
      .select({ id: workersTable.id, name: workersTable.name, mobile: workersTable.mobile })
      .from(workersTable)
      .where(and(baseCondition, eq(workersTable.mobile, parsed.data.mobile)));
    if (mobileConflict.length > 0) {
      res.status(409).json({
        error: "A worker with this mobile number already exists.",
        existingWorker: {
          id: mobileConflict[0].id,
          name: mobileConflict[0].name,
          mobile: mobileConflict[0].mobile,
        },
      });
      return;
    }
  }

  const values = user.clientId
    ? { ...parsed.data, clientId: user.clientId, userId: null }
    : { ...parsed.data, userId: user.userId, clientId: null };

  const [worker] = await db.insert(workersTable).values(values).returning();
  res.status(201).json({
    id: worker.id,
    name: worker.name,
    mobile: worker.mobile,
    createdAt: worker.createdAt.toISOString(),
  });
});

router.get("/workers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = req.user!;
  const workerId = params.data.id;

  const baseCondition = user.clientId
    ? and(eq(workersTable.id, workerId), eq(workersTable.clientId, user.clientId))
    : and(eq(workersTable.id, workerId), eq(workersTable.userId, user.userId));

  const [worker] = await db.select().from(workersTable).where(baseCondition);
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  const jcbIds = await resolveJcbScope(user, null);
  const s = await getWorkerSummaryForJcbs(workerId, jcbIds);
  if (!s) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  res.json(GetWorkerResponse.parse({
    id: worker.id,
    name: worker.name,
    mobile: worker.mobile,
    createdAt: worker.createdAt.toISOString(),
    totalEarned: s.totalEarned,
    totalPaid: s.totalPaid,
    pendingAmount: s.totalEarned - s.totalPaid,
  }));
});

router.get("/workers/:id/logs", requireAuth, async (req, res): Promise<void> => {
  const params = GetWorkerLogsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.user!;
  const workerId = params.data.id;

  const baseCondition = user.clientId
    ? and(eq(workersTable.id, workerId), eq(workersTable.clientId, user.clientId))
    : and(eq(workersTable.id, workerId), eq(workersTable.userId, user.userId));

  const [worker] = await db.select().from(workersTable).where(baseCondition);
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  // Always return ALL logs for this worker so payment dialog shows full pending.
  // Each log carries jcbUserId so the UI can distinguish per-JCB attribution.
  const logCondition = eq(workLogsTable.workerId, workerId);

  const logs = await db
    .select({
      id: workLogsTable.id,
      workerId: workLogsTable.workerId,
      jcbUserId: workLogsTable.jcbUserId,
      fieldName: workLogsTable.fieldName,
      startTime: workLogsTable.startTime,
      endTime: workLogsTable.endTime,
      totalHours: workLogsTable.totalHours,
      amount: workLogsTable.amount,
      paidAmount: workLogsTable.paidAmount,
      status: workLogsTable.status,
      createdAt: workLogsTable.createdAt,
      workerName: workersTable.name,
    })
    .from(workLogsTable)
    .leftJoin(workersTable, eq(workLogsTable.workerId, workersTable.id))
    .where(logCondition)
    .orderBy(workLogsTable.startTime);

  res.json(GetWorkerLogsResponse.parse(logs.map(l => ({
    id: l.id,
    workerId: l.workerId,
    workerName: l.workerName,
    fieldName: l.fieldName,
    startTime: l.startTime.toISOString(),
    endTime: l.endTime.toISOString(),
    totalHours: l.totalHours,
    amount: l.amount,
    paidAmount: l.paidAmount ?? 0,
    status: (l.status ?? "PENDING") as "PENDING" | "PARTIAL" | "PAID",
    createdAt: l.createdAt.toISOString(),
  }))));
});

router.get("/workers/:id/payments", requireAuth, async (req, res): Promise<void> => {
  const params = GetWorkerPaymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.user!;
  const workerId = params.data.id;

  const baseCondition = user.clientId
    ? and(eq(workersTable.id, workerId), eq(workersTable.clientId, user.clientId))
    : and(eq(workersTable.id, workerId), eq(workersTable.userId, user.userId));

  const [worker] = await db.select().from(workersTable).where(baseCondition);
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.workerId, workerId))
    .orderBy(paymentsTable.paymentDate);

  res.json(GetWorkerPaymentsResponse.parse(payments.map(p => ({
    id: p.id,
    workerId: p.workerId,
    amountPaid: p.amountPaid,
    paymentDate: p.paymentDate.toISOString(),
  }))));
});

export default router;

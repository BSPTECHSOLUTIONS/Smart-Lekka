import { Router, type IRouter } from "express";
import { db, settingsTable, workLogsTable, workersTable, usersTable } from "@workspace/db";
import { eq, sql, and, inArray, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { SetRateBody, GetRateResponse, SetRateResponse, GetDashboardSummaryResponse } from "@workspace/api-zod";
import type { AuthPayload } from "../middlewares/auth";

const router: IRouter = Router();

async function getOrCreateSetting(userId: number) {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
  if (rows.length > 0) return rows[0];
  const [s] = await db.insert(settingsTable).values({ amountPerHour: 150, userId }).returning();
  return s;
}

/**
 * Returns the effective JCB user IDs whose earnings should count for this user:
 * - Admin (no clientId): null = unrestricted
 * - Supervisor: only their assigned JCB users
 * - JCB user: only themselves
 */
async function getEffectiveJcbIds(user: AuthPayload): Promise<number[] | null> {
  if (user.role === "user") return [user.userId];

  if (user.role === "supervisor" && user.clientId) {
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(
        eq(usersTable.supervisorId, user.userId),
        eq(usersTable.clientId, user.clientId),
        eq(usersTable.role, "user"),
      ));
    return rows.map(r => r.id);
  }

  return null; // admin — no restriction
}

/**
 * Get all worker IDs visible to this user (scoped by client or legacy userId).
 */
async function getWorkerIdsForUser(user: AuthPayload): Promise<number[]> {
  if (user.clientId) {
    const workers = await db
      .select({ id: workersTable.id })
      .from(workersTable)
      .where(eq(workersTable.clientId, user.clientId));
    return workers.map(w => w.id);
  }
  const workers = await db
    .select({ id: workersTable.id })
    .from(workersTable)
    .where(eq(workersTable.userId, user.userId));
  return workers.map(w => w.id);
}

router.get("/settings/rate", requireAuth, async (req, res): Promise<void> => {
  const setting = await getOrCreateSetting(req.user!.userId);
  res.json(GetRateResponse.parse({ amountPerHour: setting.amountPerHour }));
});

router.post("/settings/rate", requireAuth, async (req, res): Promise<void> => {
  const parsed = SetRateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const setting = await getOrCreateSetting(req.user!.userId);
  const [updated] = await db
    .update(settingsTable)
    .set({ amountPerHour: parsed.data.amountPerHour })
    .where(and(eq(settingsTable.id, setting.id), eq(settingsTable.userId, req.user!.userId)))
    .returning();
  res.json(SetRateResponse.parse({ amountPerHour: updated.amountPerHour }));
});

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const setting = await getOrCreateSetting(user.userId);

  const workerIds = await getWorkerIdsForUser(user);
  let jcbIds = await getEffectiveJcbIds(user);

  // Optional JCB filter for supervisors
  if (user.role === "supervisor" && req.query.jcbUserId) {
    const requestedId = parseInt(req.query.jcbUserId as string);
    if (jcbIds === null || jcbIds.includes(requestedId)) {
      jcbIds = [requestedId];
    }
  }

  // Optional date range filter
  const fromStr = req.query.from as string | undefined;
  const toStr = req.query.to as string | undefined;
  const fromDate = fromStr ? new Date(fromStr + "T00:00:00.000Z") : null;
  const toDate = toStr ? new Date(toStr + "T23:59:59.999Z") : null;

  let totalEarned = 0;
  let totalPaid = 0;
  let workerCount = 0;

  if (workerIds.length > 0) {
    // Build condition: JCB scope + optional date range
    const buildLogsCondition = (extra?: ReturnType<typeof and>) => {
      const parts = [
        jcbIds !== null ? inArray(workLogsTable.jcbUserId, jcbIds) : undefined,
        inArray(workLogsTable.workerId, workerIds),
        fromDate ? gte(workLogsTable.startTime, fromDate) : undefined,
        toDate ? lte(workLogsTable.startTime, toDate) : undefined,
        extra,
      ].filter(Boolean);
      return parts.length === 1 ? parts[0]! : and(...(parts as [typeof parts[0], ...typeof parts]));
    };

    if (jcbIds !== null && jcbIds.length === 0) {
      totalEarned = 0;
      totalPaid = 0;
      workerCount = 0;
    } else {
      const logsCondition = buildLogsCondition();

      // Both totalEarned and totalPaid from work_logs for consistent JCB scoping
      const [row] = await db
        .select({
          earned: sql<number>`coalesce(sum(amount), 0)`,
          paid: sql<number>`coalesce(sum(paid_amount), 0)`,
        })
        .from(workLogsTable)
        .where(logsCondition);

      totalEarned = Number(row?.earned ?? 0);
      totalPaid = Number(row?.paid ?? 0);

      const workerWithLogs = await db
        .selectDistinct({ workerId: workLogsTable.workerId })
        .from(workLogsTable)
        .where(logsCondition);
      workerCount = workerWithLogs.length;
    }
  }

  res.json(GetDashboardSummaryResponse.parse({
    totalWorkers: workerCount,
    totalEarned,
    totalPaid,
    totalPending: totalEarned - totalPaid,
    amountPerHour: setting.amountPerHour,
  }));
});

export default router;

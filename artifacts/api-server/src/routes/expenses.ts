import { Router, type IRouter } from "express";
import { db, expensesTable, usersTable } from "@workspace/db";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import type { AuthPayload } from "../middlewares/auth";
import {
  CreateExpenseBody,
  AddExpensePaymentBody,
  AddExpensePaymentParams,
  ListExpensesResponse,
  ExpenseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toItem(e: typeof expensesTable.$inferSelect) {
  const totalPaid = (e.amountPaid || 0) + (e.supervisorPaidAmount || 0);
  const pending = Math.max(0, e.amount - totalPaid);
  return ExpenseItem.parse({
    id: e.id,
    description: e.description,
    category: e.category,
    amount: e.amount,
    amountPaid: e.amountPaid,
    supervisorPaidAmount: e.supervisorPaidAmount || 0,
    pendingAmount: pending,
    isPaid: pending <= 0,
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
  });
}

/**
 * Get the set of user IDs whose expenses are visible to the requesting user.
 * - Admin with clientId → all users in that client
 * - Admin without clientId → unrestricted (null = no userId filter)
 * - Supervisor → only their own assigned JCB users
 * - JCB user → only themselves
 */
async function resolveExpenseUserIds(user: AuthPayload, explicitJcbUserId?: string): Promise<number[] | null> {
  if (user.role === "user") {
    // JCB user sees only their own expenses
    return [user.userId];
  }

  if (user.role === "supervisor" && user.clientId) {
    // Supervisor sees only expenses from their own JCB users
    const myJcbs = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(
        eq(usersTable.supervisorId, user.userId),
        eq(usersTable.clientId, user.clientId),
        eq(usersTable.role, "user"),
      ));
    const myJcbIds = myJcbs.map(u => u.id);

    if (explicitJcbUserId) {
      const id = parseInt(explicitJcbUserId);
      if (!isNaN(id) && myJcbIds.includes(id)) return [id];
      return myJcbIds; // ignore invalid/out-of-scope filter
    }
    return myJcbIds;
  }

  if (user.role === "admin" && user.clientId) {
    // Admin scoped to a client
    if (explicitJcbUserId) {
      const id = parseInt(explicitJcbUserId);
      if (!isNaN(id)) return [id];
    }
    const clientUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.clientId, user.clientId));
    return clientUsers.map(u => u.id);
  }

  // Admin with no clientId → null means no userId restriction
  if (explicitJcbUserId) {
    const id = parseInt(explicitJcbUserId);
    if (!isNaN(id)) return [id];
  }
  return null;
}

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { from, to, jcbUserId } = req.query as { from?: string; to?: string; jcbUserId?: string };

  const userIds = await resolveExpenseUserIds(user, jcbUserId);

  const conditions: ReturnType<typeof eq>[] = [];

  if (userIds !== null) {
    if (userIds.length === 0) {
      res.json(ListExpensesResponse.parse([]));
      return;
    }
    conditions.push(inArray(expensesTable.userId, userIds) as any);
  }

  if (from) conditions.push(gte(expensesTable.date, new Date(from)) as any);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(expensesTable.date, toDate) as any);
  }

  const rows = conditions.length > 0
    ? await db.select().from(expensesTable).where(and(...conditions)).orderBy(expensesTable.date)
    : await db.select().from(expensesTable).orderBy(expensesTable.date);

  res.json(ListExpensesResponse.parse(rows.map(toItem)));
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { description, category, amount, date } = parsed.data;
  const [expense] = await db
    .insert(expensesTable)
    .values({ userId: req.user!.userId, description, category, amount, date: new Date(date) })
    .returning();
  res.status(201).json(toItem(expense));
});

router.post("/expenses/:id/payments", requireAuth, async (req, res): Promise<void> => {
  const params = AddExpensePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AddExpensePaymentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Supervisors can update payments for expenses belonging to their JCBs
  const userIds = await resolveExpenseUserIds(req.user!);
  const whereClause = userIds !== null
    ? and(eq(expensesTable.id, params.data.id), inArray(expensesTable.userId, userIds))
    : eq(expensesTable.id, params.data.id);

  const [expense] = await db.select().from(expensesTable).where(whereClause as any);
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const isSupervisor = req.user!.role === "supervisor" || req.user!.role === "admin";
  const totalAlreadyPaid = (expense.amountPaid || 0) + (expense.supervisorPaidAmount || 0);
  const remaining = Math.max(0, expense.amount - totalAlreadyPaid);
  const addAmount = Math.min(body.data.amountPaid, remaining);

  const updateFields = isSupervisor
    ? { supervisorPaidAmount: (expense.supervisorPaidAmount || 0) + addAmount }
    : { amountPaid: (expense.amountPaid || 0) + addAmount };

  const [updated] = await db
    .update(expensesTable)
    .set(updateFields)
    .where(eq(expensesTable.id, expense.id))
    .returning();

  res.json(toItem(updated));
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = AddExpensePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userIds = await resolveExpenseUserIds(req.user!);
  const whereClause = userIds !== null
    ? and(eq(expensesTable.id, params.data.id), inArray(expensesTable.userId, userIds))
    : eq(expensesTable.id, params.data.id);

  const [deleted] = await db.delete(expensesTable).where(whereClause as any).returning();
  if (!deleted) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.status(204).end();
});

export default router;

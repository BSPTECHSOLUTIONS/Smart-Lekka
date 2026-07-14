import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { db } from "@workspace/db";
import { workLogsTable, expensesTable, jcbSettlementsTable, usersTable, paymentsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, inArray, desc, lt } from "drizzle-orm";

const router = Router();

// Helper: resolve which jcbUserIds a supervisor can see
async function resolveJcbUserIds(supervisorId: number): Promise<number[]> {
  const jcbUsers = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.role, "user"), eq(usersTable.supervisorId, supervisorId)));
  return jcbUsers.map((u) => u.id);
}

// GET /api/jcb-report/cards — per-JCB summary cards for supervisor
// Query params: from=YYYY-MM-DD, to=YYYY-MM-DD (defaults to today)
router.get("/jcb-report/cards", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== "supervisor") return res.status(403).json({ error: "Forbidden" });

  const jcbIds = await resolveJcbUserIds(user.userId);
  if (jcbIds.length === 0) return res.json([]);

  const jcbUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, mobile: usersTable.mobile })
    .from(usersTable)
    .where(inArray(usersTable.id, jcbIds));

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const fromStr = (req.query.from as string) || todayStr;
  const toStr = (req.query.to as string) || todayStr;
  const rangeStart = new Date(fromStr + "T00:00:00.000Z");
  const rangeEnd = new Date(toStr + "T23:59:59.999Z");

  const cards = await Promise.all(
    jcbUsers.map(async (jcb) => {
      // Work logs (for hours & sites count)
      const logs = await db
        .select()
        .from(workLogsTable)
        .where(
          and(
            eq(workLogsTable.jcbUserId, jcb.id),
            gte(workLogsTable.startTime, rangeStart),
            lte(workLogsTable.startTime, rangeEnd)
          )
        );

      // Payments attributed to this JCB in date range
      const pmts = await db
        .select({ amountPaid: paymentsTable.amountPaid })
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.jcbUserId, jcb.id),
            gte(paymentsTable.paymentDate, rangeStart),
            lte(paymentsTable.paymentDate, rangeEnd)
          )
        );

      const amountReceived = pmts.reduce((s, p) => s + (p.amountPaid || 0), 0);
      const totalHours = logs.reduce((s, l) => s + l.totalHours, 0);
      const sites = new Set(logs.map((l) => l.fieldName)).size;

      const expenses = await db
        .select()
        .from(expensesTable)
        .where(
          and(
            eq(expensesTable.userId, jcb.id),
            gte(expensesTable.date, rangeStart),
            lte(expensesTable.date, rangeEnd)
          )
        );
      const expensesPaid = expenses.reduce((s, e) => s + (e.amountPaid || 0), 0);
      const netAmount = amountReceived - expensesPaid;

      const prevSettlements = await db
        .select()
        .from(jcbSettlementsTable)
        .where(
          and(
            eq(jcbSettlementsTable.jcbUserId, jcb.id),
            lt(jcbSettlementsTable.settlementDate, fromStr)
          )
        );
      const previousPending = prevSettlements.reduce(
        (s, st) => s + parseFloat((st.pending as string) || "0"),
        0
      );

      return {
        jcbId: jcb.id,
        jcbName: jcb.name,
        jcbMobile: jcb.mobile,
        amountReceived,
        expensesPaid,
        netAmount,
        previousPending,
        totalToCollect: netAmount + previousPending,
        totalHours,
        sitesCount: sites,
      };
    })
  );

  return res.json(cards);
});

// GET /api/jcb-users — lightweight list of JCB users visible to the caller
router.get("/jcb-users", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role === "user") {
    const [me] = await db
      .select({ id: usersTable.id, name: usersTable.name, mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, user.userId));
    return res.json(me ? [me] : []);
  }
  if (user.role === "supervisor") {
    const jcbIds = await resolveJcbUserIds(user.userId);
    if (jcbIds.length === 0) return res.json([]);
    const jcbUsers = await db
      .select({ id: usersTable.id, name: usersTable.name, mobile: usersTable.mobile })
      .from(usersTable)
      .where(inArray(usersTable.id, jcbIds));
    return res.json(jcbUsers);
  }
  // Admin: all JCB users
  const jcbUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, mobile: usersTable.mobile })
    .from(usersTable)
    .where(eq(usersTable.role, "user"));
  return res.json(jcbUsers);
});

// GET /api/jcb-report/trend?jcbUserId=&days=10 — daily trend data
router.get("/jcb-report/trend", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== "supervisor") return res.status(403).json({ error: "Forbidden" });

  const jcbIds = await resolveJcbUserIds(user.userId);
  if (jcbIds.length === 0) return res.json([]);

  const jcbUserId = req.query.jcbUserId ? parseInt(req.query.jcbUserId as string) : null;
  const targetIds = jcbUserId && jcbIds.includes(jcbUserId) ? [jcbUserId] : jcbIds;
  const days = Math.min(parseInt((req.query.days as string) || "10"), 30);

  const results: Array<{ date: string; income: number; expenses: number; hours: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayStart = new Date(dateStr + "T00:00:00.000Z");
    const dayEnd = new Date(dateStr + "T23:59:59.999Z");

    const logs = await db
      .select({ amount: workLogsTable.amount, totalHours: workLogsTable.totalHours })
      .from(workLogsTable)
      .where(and(inArray(workLogsTable.jcbUserId, targetIds), gte(workLogsTable.startTime, dayStart), lte(workLogsTable.startTime, dayEnd)));

    const exps = await db
      .select({ amountPaid: expensesTable.amountPaid })
      .from(expensesTable)
      .where(and(inArray(expensesTable.userId, targetIds), gte(expensesTable.date, dayStart), lte(expensesTable.date, dayEnd)));

    results.push({
      date: dateStr,
      income: logs.reduce((s, l) => s + (l.amount || 0), 0),
      expenses: exps.reduce((s, e) => s + (e.amountPaid || 0), 0),
      hours: logs.reduce((s, l) => s + l.totalHours, 0),
    });
  }

  return res.json(results);
});

// GET /api/jcb-report/settlements?jcbUserId= — list settlements
router.get("/jcb-report/settlements", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== "supervisor") return res.status(403).json({ error: "Forbidden" });

  const jcbUserId = req.query.jcbUserId ? parseInt(req.query.jcbUserId as string) : null;
  const jcbIds = await resolveJcbUserIds(user.userId);

  const targetIds = jcbUserId && jcbIds.includes(jcbUserId) ? [jcbUserId] : jcbIds;
  if (targetIds.length === 0) return res.json([]);

  const settlements = await db
    .select()
    .from(jcbSettlementsTable)
    .where(inArray(jcbSettlementsTable.jcbUserId, targetIds))
    .orderBy(desc(jcbSettlementsTable.settlementDate));

  return res.json(settlements);
});

// POST /api/jcb-report/settlements — record a settlement
router.post("/jcb-report/settlements", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== "supervisor") return res.status(403).json({ error: "Forbidden" });

  const {
    jcbUserId,
    settlementDate,
    amountReceived,
    expensesPaid,
    netAmount,
    previousPending,
    totalToCollect,
    collected,
    notes,
  } = req.body;

  if (!jcbUserId || !settlementDate) {
    return res.status(400).json({ error: "jcbUserId and settlementDate are required" });
  }

  const jcbIds = await resolveJcbUserIds(user.userId);
  if (!jcbIds.includes(parseInt(jcbUserId))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const collectedAmt = parseFloat(collected || "0");
  const totalAmt = parseFloat(totalToCollect || "0");
  const pending = Math.max(0, totalAmt - collectedAmt);

  const [settlement] = await db
    .insert(jcbSettlementsTable)
    .values({
      jcbUserId: parseInt(jcbUserId),
      supervisorId: user.userId,
      settlementDate,
      amountReceived: String(parseFloat(amountReceived || "0")),
      expensesPaid: String(parseFloat(expensesPaid || "0")),
      netAmount: String(parseFloat(netAmount || "0")),
      previousPending: String(parseFloat(previousPending || "0")),
      totalToCollect: String(parseFloat(totalToCollect || "0")),
      collected: String(collectedAmt),
      pending: String(pending),
      notes: notes || null,
    })
    .returning();

  return res.status(201).json(settlement);
});

// GET /api/jcb-report?date=&jcbUserId= — report for a specific JCB + date
router.get("/jcb-report", requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== "supervisor") return res.status(403).json({ error: "Forbidden" });

  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const jcbUserId = req.query.jcbUserId ? parseInt(req.query.jcbUserId as string) : null;

  const jcbIds = await resolveJcbUserIds(user.userId);
  if (jcbIds.length === 0) return res.json({ sites: [], summary: null });

  const targetIds = jcbUserId && jcbIds.includes(jcbUserId) ? [jcbUserId] : jcbIds;

  const dayStart = new Date(dateStr + "T00:00:00.000Z");
  const dayEnd = new Date(dateStr + "T23:59:59.999Z");

  const logs = await db
    .select()
    .from(workLogsTable)
    .where(
      and(
        inArray(workLogsTable.jcbUserId, targetIds),
        gte(workLogsTable.startTime, dayStart),
        lte(workLogsTable.startTime, dayEnd)
      )
    );

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(
      and(
        inArray(expensesTable.userId, targetIds),
        gte(expensesTable.date, dayStart),
        lte(expensesTable.date, dayEnd)
      )
    );

  // Payments attributed to these JCBs on this date
  const dayPayments = await db
    .select({ amountPaid: paymentsTable.amountPaid })
    .from(paymentsTable)
    .where(
      and(
        inArray(paymentsTable.jcbUserId, targetIds),
        gte(paymentsTable.paymentDate, dayStart),
        lte(paymentsTable.paymentDate, dayEnd)
      )
    );

  const amountReceived = dayPayments.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const totalHours = logs.reduce((s, l) => s + l.totalHours, 0);
  const expensesPaid = expenses.reduce((s, e) => s + (e.amountPaid || 0), 0);
  const netAmount = amountReceived - expensesPaid;
  const sites = new Set(logs.map((l) => l.fieldName)).size;

  const prevSettlements = await db
    .select()
    .from(jcbSettlementsTable)
    .where(
      and(
        inArray(jcbSettlementsTable.jcbUserId, targetIds),
        lt(jcbSettlementsTable.settlementDate, dateStr)
      )
    );
  const previousPending = prevSettlements.reduce(
    (s, st) => s + parseFloat((st.pending as string) || "0"),
    0
  );

  const sites_data = logs.map((l) => ({
    id: l.id,
    fieldName: l.fieldName,
    startTime: l.startTime,
    endTime: l.endTime,
    totalHours: l.totalHours,
    amount: l.amount,
    paidAmount: l.paidAmount,
    status: l.status,
    jcbUserId: l.jcbUserId,
  }));

  return res.json({
    date: dateStr,
    summary: {
      amountReceived,
      expensesPaid,
      netAmount,
      totalHours,
      sitesCount: sites,
      previousPending,
      totalToCollect: netAmount + previousPending,
    },
    sites: sites_data,
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      amountPaid: e.amountPaid,
      date: e.date,
    })),
  });
});

export default router;

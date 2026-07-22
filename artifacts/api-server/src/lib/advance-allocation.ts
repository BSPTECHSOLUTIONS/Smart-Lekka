import { db, workLogsTable, workersTable } from "@workspace/db";
import { and, eq, asc, ne } from "drizzle-orm";

/**
 * Allocate an amount (a new payment, and/or the customer's existing
 * advance/credit balance) across a worker's unpaid work logs, oldest first.
 * Returns whatever is left over once every currently-known unpaid session
 * has been covered — this remainder becomes (or stays) the advance balance.
 *
 * Called from two places:
 *  - payments.ts, when a new payment comes in (existingAdvance + amountPaid)
 *  - work-logs.ts, right after a new session is created, so that any
 *    existing credit is immediately applied to it instead of sitting
 *    unused until the next payment. Without this second call site, a
 *    vehicle's own scoped "pending" total goes stale the moment a new
 *    session is added after the credit was earned, even though the
 *    customer's overall total is still correct.
 */
export async function allocateAdvanceFIFO(workerId: number, amountToAllocate: number): Promise<number> {
  if (amountToAllocate <= 0) return amountToAllocate;

  const entries = await db
    .select()
    .from(workLogsTable)
    .where(and(eq(workLogsTable.workerId, workerId), ne(workLogsTable.status, "PAID")))
    .orderBy(asc(workLogsTable.startTime));

  let remaining = amountToAllocate;

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

/**
 * Apply a worker's existing advance balance (if any) to their currently
 * unpaid sessions, and persist the new (usually smaller, often zero)
 * remainder back onto the worker row.
 */
export async function reallocateExistingAdvance(workerId: number): Promise<number> {
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, workerId));
  const existingAdvance = worker?.advanceBalance ?? 0;
  if (existingAdvance <= 0) return existingAdvance;

  const unallocated = await allocateAdvanceFIFO(workerId, existingAdvance);

  if (unallocated !== existingAdvance) {
    await db.update(workersTable).set({ advanceBalance: unallocated }).where(eq(workersTable.id, workerId));
  }

  return unallocated;
}

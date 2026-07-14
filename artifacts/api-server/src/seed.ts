import bcrypt from "bcryptjs";
import { db, usersTable, workersTable, workLogsTable, paymentsTable, settingsTable, clientsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { logger } from "./lib/logger";

export async function seedDatabase() {
  const existingUsers = await db.select().from(usersTable);

  if (existingUsers.length === 0) {
    logger.info("Seeding database with initial data...");
    await _seed();
    logger.info("Database seeded successfully.");
  } else {
    logger.info("Database already seeded, skipping full seed.");
    await _migrateOrphanedData(existingUsers[0].id);
    await _ensureTestRoles();
  }
}

async function _migrateOrphanedData(adminId: number) {
  const orphanedWorkers = await db
    .select()
    .from(workersTable)
    .where(isNull(workersTable.userId));

  if (orphanedWorkers.length > 0) {
    logger.info({ count: orphanedWorkers.length }, "Migrating orphaned workers to admin user...");
    for (const w of orphanedWorkers) {
      await db.update(workersTable).set({ userId: adminId }).where(eq(workersTable.id, w.id));
    }
    logger.info("Orphaned workers migrated.");
  }

  const orphanedSettings = await db
    .select()
    .from(settingsTable)
    .where(isNull(settingsTable.userId));

  if (orphanedSettings.length > 0) {
    logger.info({ count: orphanedSettings.length }, "Migrating orphaned settings to admin user...");
    for (const s of orphanedSettings) {
      await db.update(settingsTable).set({ userId: adminId }).where(eq(settingsTable.id, s.id));
    }
    logger.info("Orphaned settings migrated.");
  }
}

/**
 * Ensures demo supervisor + JCB test accounts exist.
 * Safe to call multiple times — skips if already created.
 */
async function _ensureTestRoles() {
  const supervisorMobile = "9988776655";
  const existing = await db.select().from(usersTable).where(eq(usersTable.mobile, supervisorMobile));
  if (existing.length > 0) return;

  logger.info("Adding demo supervisor + JCB test accounts...");

  const rate = 150;
  const d = (y: number, mo: number, da: number, h: number, mi = 0) =>
    new Date(y, mo - 1, da, h, mi);

  // Create a demo client
  const [demoClient] = await db.insert(clientsTable).values({
    name: "BSP Demo Farm",
    mobile: "9900000000",
  }).returning();

  // Create supervisor linked to client
  const supHash = await bcrypt.hash("super123", 10);
  const [supervisor] = await db.insert(usersTable).values({
    name: "Ravi Supervisor",
    mobile: supervisorMobile,
    password: supHash,
    role: "supervisor",
    clientId: demoClient.id,
  }).returning();
  await db.insert(settingsTable).values({ amountPerHour: rate, userId: supervisor.id });

  // Create JCB users linked to the demo client
  const jcb1Hash = await bcrypt.hash("jcb123", 10);
  const jcb2Hash = await bcrypt.hash("jcb456", 10);
  const [jcb1, jcb2] = await db.insert(usersTable).values([
    { name: "JCB-001", mobile: "JCB001", password: jcb1Hash, role: "user", clientId: demoClient.id, supervisorId: supervisor.id },
    { name: "JCB-002", mobile: "JCB002", password: jcb2Hash, role: "user", clientId: demoClient.id, supervisorId: supervisor.id },
  ]).returning();
  await db.insert(settingsTable).values([
    { amountPerHour: rate, userId: jcb1.id },
    { amountPerHour: rate, userId: jcb2.id },
  ]);

  // Shared workers under this client
  const [wa, wb, wc, wd] = await db.insert(workersTable).values([
    { name: "Arjun Patel",   mobile: "9800000001", clientId: demoClient.id },
    { name: "Kavita Sharma", mobile: "9800000002", clientId: demoClient.id },
    { name: "Laxman Reddy",  mobile: "9800000003", clientId: demoClient.id },
    { name: "Meena Devi",    mobile: "9800000004", clientId: demoClient.id },
  ]).returning();

  // JCB-001 work logs
  const jcb1Logs = await db.insert(workLogsTable).values([
    { workerId: wa.id, jcbUserId: jcb1.id, fieldName: "North Plot",   startTime: d(2026,2,5,7),   endTime: d(2026,2,5,15),  totalHours: 8,   amount: 8*rate   },
    { workerId: wa.id, jcbUserId: jcb1.id, fieldName: "East Block",   startTime: d(2026,3,10,8),  endTime: d(2026,3,10,14), totalHours: 6,   amount: 6*rate   },
    { workerId: wb.id, jcbUserId: jcb1.id, fieldName: "South Field",  startTime: d(2026,3,20,7),  endTime: d(2026,3,20,17), totalHours: 10,  amount: 10*rate  },
    { workerId: wb.id, jcbUserId: jcb1.id, fieldName: "Main Plot",    startTime: d(2026,4,8,6,30),endTime: d(2026,4,8,12),  totalHours: 5.5, amount: 5.5*rate },
    { workerId: wc.id, jcbUserId: jcb1.id, fieldName: "West Paddock", startTime: d(2026,4,15,7),  endTime: d(2026,4,15,13), totalHours: 6,   amount: 6*rate   },
  ]).returning();

  // JCB-002 work logs
  const jcb2Logs = await db.insert(workLogsTable).values([
    { workerId: wa.id, jcbUserId: jcb2.id, fieldName: "South Plot",   startTime: d(2026,2,18,8),  endTime: d(2026,2,18,16), totalHours: 8, amount: 8*rate  },
    { workerId: wb.id, jcbUserId: jcb2.id, fieldName: "East Block",   startTime: d(2026,3,5,7),   endTime: d(2026,3,5,15),  totalHours: 8, amount: 8*rate  },
    { workerId: wc.id, jcbUserId: jcb2.id, fieldName: "Main Plot",    startTime: d(2026,3,28,9),  endTime: d(2026,3,28,17), totalHours: 8, amount: 8*rate  },
    { workerId: wd.id, jcbUserId: jcb2.id, fieldName: "North Block",  startTime: d(2026,4,10,7),  endTime: d(2026,4,10,15), totalHours: 8, amount: 8*rate  },
    { workerId: wd.id, jcbUserId: jcb2.id, fieldName: "West Paddock", startTime: d(2026,4,18,8),  endTime: d(2026,4,18,12), totalHours: 4, amount: 4*rate  },
  ]).returning();

  // Payments for client workers
  await db.insert(paymentsTable).values([
    { workerId: wa.id, amountPaid: 2000, paymentDate: d(2026,3,1,10)  },
    { workerId: wa.id, amountPaid: 1000, paymentDate: d(2026,4,1,9)   },
    { workerId: wb.id, amountPaid: 1500, paymentDate: d(2026,4,5,11)  },
    { workerId: wc.id, amountPaid: 900,  paymentDate: d(2026,4,16,10) },
  ]);

  // Apply FIFO payment allocation to work logs
  const allocation = [
    { logs: [...jcb1Logs.filter(l => l.workerId === wa.id), ...jcb2Logs.filter(l => l.workerId === wa.id)], totalPayments: 3000 },
    { logs: [...jcb1Logs.filter(l => l.workerId === wb.id), ...jcb2Logs.filter(l => l.workerId === wb.id)], totalPayments: 1500 },
    { logs: [...jcb1Logs.filter(l => l.workerId === wc.id), ...jcb2Logs.filter(l => l.workerId === wc.id)], totalPayments: 900  },
  ];

  for (const { logs, totalPayments } of allocation) {
    let rem = totalPayments;
    const sorted = [...logs].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    for (const log of sorted) {
      if (rem <= 0) break;
      if (rem >= log.amount) {
        await db.update(workLogsTable).set({ paidAmount: log.amount, status: "PAID" }).where(eq(workLogsTable.id, log.id));
        rem -= log.amount;
      } else {
        await db.update(workLogsTable).set({ paidAmount: rem, status: "PARTIAL" }).where(eq(workLogsTable.id, log.id));
        rem = 0;
      }
    }
  }

  logger.info("Demo supervisor + JCB test accounts created.");
}

async function _seed() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  const [admin, regularUser] = await db.insert(usersTable).values([
    { name: "Admin", mobile: "9999999999", password: adminHash, role: "admin" },
    { name: "Farm User", mobile: "9876543210", password: userHash, role: "user" },
  ]).returning();

  const rate = 150;
  await db.insert(settingsTable).values([
    { amountPerHour: rate, userId: admin.id },
    { amountPerHour: rate, userId: regularUser.id },
  ]);

  const [w1, w2, w3, w4] = await db.insert(workersTable).values([
    { name: "Ramesh Kumar", mobile: "9876500001", userId: admin.id },
    { name: "Suresh Pal",   mobile: "9876500002", userId: admin.id },
    { name: "Mohan Singh",  mobile: "9876500003", userId: admin.id },
    { name: "Priya Devi",   mobile: "9876500004", userId: admin.id },
  ]).returning();

  const d = (y: number, mo: number, da: number, h: number, mi = 0) =>
    new Date(y, mo - 1, da, h, mi);

  await db.insert(workLogsTable).values([
    { workerId: w1.id, fieldName: "North Field",  startTime: d(2026,1,10,7),  endTime: d(2026,1,10,15),  totalHours: 8,  amount: 8*rate },
    { workerId: w1.id, fieldName: "East Field",   startTime: d(2026,2,15,8),  endTime: d(2026,2,15,14),  totalHours: 6,  amount: 6*rate },
    { workerId: w1.id, fieldName: "North Field",  startTime: d(2026,3,5,7),   endTime: d(2026,3,5,17),   totalHours: 10, amount: 10*rate },
    { workerId: w1.id, fieldName: "South Block",  startTime: d(2026,4,1,6,30),endTime: d(2026,4,1,11,30),totalHours: 5,  amount: 5*rate },
    { workerId: w2.id, fieldName: "West Paddock", startTime: d(2026,2,20,7),  endTime: d(2026,2,20,14),  totalHours: 7,  amount: 7*rate },
    { workerId: w2.id, fieldName: "South Block",  startTime: d(2026,3,18,8),  endTime: d(2026,3,18,17),  totalHours: 9,  amount: 9*rate },
    { workerId: w2.id, fieldName: "Main Plot",    startTime: d(2026,4,7,7),   endTime: d(2026,4,7,11),   totalHours: 4,  amount: 4*rate },
    { workerId: w3.id, fieldName: "Main Plot",    startTime: d(2026,3,12,6),  endTime: d(2026,3,12,18),  totalHours: 12, amount: 12*rate },
    { workerId: w3.id, fieldName: "East Field",   startTime: d(2026,4,10,8),  endTime: d(2026,4,10,14),  totalHours: 6,  amount: 6*rate },
    { workerId: w4.id, fieldName: "West Paddock", startTime: d(2026,3,22,7,30),endTime: d(2026,3,22,15,30),totalHours: 8, amount: 8*rate },
    { workerId: w4.id, fieldName: "North Field",  startTime: d(2026,4,14,8),  endTime: d(2026,4,14,11),  totalHours: 3,  amount: 3*rate },
  ]);

  await db.insert(paymentsTable).values([
    { workerId: w1.id, amountPaid: 2000, paymentDate: d(2026,2,1,10) },
    { workerId: w1.id, amountPaid: 1000, paymentDate: d(2026,3,10,11) },
    { workerId: w2.id, amountPaid: 1050, paymentDate: d(2026,3,1,9) },
    { workerId: w2.id, amountPaid: 1350, paymentDate: d(2026,4,1,10) },
    { workerId: w2.id, amountPaid: 600,  paymentDate: d(2026,4,8,14) },
    { workerId: w3.id, amountPaid: 1500, paymentDate: d(2026,4,5,9) },
  ]);
}

import { Router, type IRouter } from "express";
import { db, clientsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * GET /client/me — returns the current user's client info (for any role).
 * Admin with no client returns a generic "Admin" record.
 */
router.get("/client/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!user.clientId) {
    res.json({ id: null, name: "Smart Lekka Admin", mobile: null });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, user.clientId));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json({ id: client.id, name: client.name, mobile: client.mobile ?? null });
});

router.get("/clients", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  res.json(clients.map(c => ({
    id: c.id, name: c.name, mobile: c.mobile, createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/clients", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { name, mobile } = req.body ?? {};
  if (!name || typeof name !== "string") { res.status(400).json({ error: "name is required" }); return; }
  const [client] = await db.insert(clientsTable).values({ name, mobile: mobile || null }).returning();
  res.status(201).json({ id: client.id, name: client.name, mobile: client.mobile, createdAt: client.createdAt.toISOString() });
});

router.put("/clients/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, mobile } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (mobile !== undefined) updates.mobile = mobile || null;
  const [client] = await db.update(clientsTable).set(updates).where(eq(clientsTable.id, id)).returning();
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json({ id: client.id, name: client.name, mobile: client.mobile, createdAt: client.createdAt.toISOString() });
});

router.delete("/clients/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.sendStatus(204);
});

/**
 * GET /clients/:id/jcbs — returns all supervisors AND JCB users for a client.
 * Admin only. Used by the admin panel to build the hierarchy.
 */
router.get("/clients/:id/jcbs", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const jcbs = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      mobile: usersTable.mobile,
      role: usersTable.role,
      supervisorId: usersTable.supervisorId,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.clientId, id))
    .orderBy(usersTable.name);
  res.json(jcbs.map(u => ({
    id: u.id, name: u.name, mobile: u.mobile, role: u.role,
    supervisorId: u.supervisorId, createdAt: u.createdAt.toISOString(),
  })));
});

/**
 * GET /jcb-users — returns JCB users scoped to the requesting user's visibility:
 *   Admin   → all role="user" JCB accounts
 *   Supervisor → only their own assigned JCB users (supervisorId = user.userId)
 *   JCB user → only themselves
 */
router.get("/jcb-users", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  if (user.role === "admin") {
    const jcbs = await db
      .select({ id: usersTable.id, name: usersTable.name, mobile: usersTable.mobile, clientId: usersTable.clientId })
      .from(usersTable)
      .where(eq(usersTable.role, "user"))
      .orderBy(usersTable.name);
    res.json(jcbs.map(u => ({ id: u.id, name: u.name, mobile: u.mobile, clientId: u.clientId })));
    return;
  }

  if (user.role === "supervisor" && user.clientId) {
    // Only JCB users where this supervisor is the assigned supervisor
    const jcbs = await db
      .select({ id: usersTable.id, name: usersTable.name, mobile: usersTable.mobile, clientId: usersTable.clientId })
      .from(usersTable)
      .where(and(
        eq(usersTable.clientId, user.clientId),
        eq(usersTable.role, "user"),
        eq(usersTable.supervisorId, user.userId),
      ))
      .orderBy(usersTable.name);
    res.json(jcbs.map(u => ({ id: u.id, name: u.name, mobile: u.mobile, clientId: u.clientId })));
    return;
  }

  if (user.role === "user") {
    // JCB users see only themselves in the filter list
    res.json([{ id: user.userId, name: "", mobile: user.mobile, clientId: user.clientId }]);
    return;
  }

  res.json([]);
});

export default router;

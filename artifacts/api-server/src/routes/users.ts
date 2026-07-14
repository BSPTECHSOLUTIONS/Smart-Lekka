import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  CreateUserBody,
  UpdateUserBody,
  UpdateUserParams,
  DeleteUserParams,
  ListUsersResponse,
  UpdateUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(ListUsersResponse.parse(users.map(u => ({
    id: u.id, name: u.name, mobile: u.mobile, role: u.role, createdAt: u.createdAt.toISOString(),
  }))));
});

router.post("/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, mobile, password, role } = parsed.data;
  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, mobile, password: hashed, role }).returning();
  res.status(201).json({ id: user.id, name: user.name, mobile: user.mobile, role: user.role, createdAt: user.createdAt.toISOString() });
});

/**
 * POST /users/jcb — create a JCB user or supervisor linked to a client
 */
router.post("/users/jcb", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { name, mobile, password, clientId, supervisorId, role } = req.body ?? {};
  if (!name || !mobile || !password || !clientId) {
    res.status(400).json({ error: "name, mobile, password, clientId are required" }); return;
  }
  const validRole = role === "supervisor" ? "supervisor" : "user";
  const hashed = await bcrypt.hash(String(password), 10);
  const [user] = await db.insert(usersTable).values({
    name: String(name),
    mobile: String(mobile),
    password: hashed,
    role: validRole,
    clientId: Number(clientId),
    supervisorId: supervisorId ? Number(supervisorId) : null,
  }).returning();
  res.status(201).json({
    id: user.id, name: user.name, mobile: user.mobile, role: user.role,
    clientId: user.clientId, supervisorId: user.supervisorId,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: Record<string, unknown> = {};
  if (parsed.data.password) updates.password = await bcrypt.hash(parsed.data.password, 10);
  if (parsed.data.name != null) updates.name = parsed.data.name;
  // Also support mobile and supervisorId updates from raw body (not in zod schema)
  if (req.body.mobile) updates.mobile = String(req.body.mobile);
  if (req.body.supervisorId !== undefined) updates.supervisorId = req.body.supervisorId ? Number(req.body.supervisorId) : null;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(UpdateUserResponse.parse({ id: user.id, name: user.name, mobile: user.mobile, role: user.role, createdAt: user.createdAt.toISOString() }));
});

router.delete("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [user] = await db.delete(usersTable).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.sendStatus(204);
});

export default router;

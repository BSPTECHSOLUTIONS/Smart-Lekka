import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { mobile, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile));
  if (!user) {
    res.status(401).json({ error: "Invalid JCB number / mobile or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid JCB number / mobile or password" });
    return;
  }
  const token = signToken({
    userId: user.id,
    role: user.role,
    mobile: user.mobile,
    clientId: user.clientId ?? null,
  });
  res.json(LoginResponse.parse({
    token,
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  }));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetMeResponse.parse({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }));
});

export default router;

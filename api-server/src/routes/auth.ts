import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { logActivity } from "../lib/activity";
import { requireAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    await logActivity({ action: "تسجيل دخول", target: username, type: "auth", userId: user.id, username: user.username });
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        theme: user.theme,
        language: user.language,
        createdAt: user.createdAt.toISOString(),
      }
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password, email } = parsed.data;
  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (existing) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      username,
      email,
      passwordHash,
      role: "user",
      theme: "dark",
      language: "ar",
    }).returning();
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    await logActivity({ action: "تسجيل حساب جديد", target: username, type: "auth", userId: user.id, username: user.username });
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        theme: user.theme,
        language: user.language,
        createdAt: user.createdAt.toISOString(),
      }
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      theme: user.theme,
      language: user.language,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "GetMe error");
    res.status(500).json({ error: "Server error" });
  }
});

// Admin-only: create a new user account
router.post("/admin/users", requireAuth, async (req, res) => {
  if (req.session.role !== "owner") {
    res.status(403).json({ error: "ليس لديك صلاحية إنشاء حسابات" });
    return;
  }
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || username.length < 2 || username.length > 32 || !password || password.length < 4) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }
  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (existing) {
      res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const { expiryDays } = req.body as { expiryDays?: number };
    const expiresAt = expiryDays && expiryDays > 0
      ? new Date(Date.now() + expiryDays * 86400000)
      : null;
    const [user] = await db.insert(usersTable).values({
      username,
      email: `${username}@serverhub.local`,
      passwordHash,
      role: "user",
      theme: "dark",
      language: "ar",
      ...(expiresAt ? { expiresAt } : {}),
    }).returning();
    await logActivity({ action: `إنشاء حساب: ${username}`, target: username, type: "auth", userId: req.session.userId, username: req.session.username });
    res.json({ success: true, id: user.id, username: user.username });
  } catch (err) {
    req.log.error({ err }, "CreateUser error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;

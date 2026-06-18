import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { UpdateSettingsBody, ChangePasswordBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      userId: user.id,
      theme: user.theme,
      language: user.language,
      displayName: user.displayName ?? user.username,
      email: user.email,
    });
  } catch (err) {
    req.log.error({ err }, "Get settings error");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/settings", requireAuth, async (req, res) => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.theme) updates.theme = parsed.data.theme;
  if (parsed.data.language) updates.language = parsed.data.language;
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
  if (parsed.data.email) updates.email = parsed.data.email;

  try {
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.session.userId!)).returning();
    res.json({
      id: updated.id,
      userId: updated.id,
      theme: updated.theme,
      language: updated.language,
      displayName: updated.displayName ?? updated.username,
      email: updated.email,
    });
  } catch (err) {
    req.log.error({ err }, "Update settings error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/settings/change-password", requireAuth, async (req, res) => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

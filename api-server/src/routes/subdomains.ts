import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { logActivity } from "../lib/activity";
import { CreateSubdomainBody, DeleteSubdomainParams } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { subdomainsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();
const MAIN_DOMAIN = process.env.MAIN_DOMAIN ?? "Host.X";

router.get("/subdomains", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const items = await db.select().from(subdomainsTable).where(eq(subdomainsTable.userId, userId));
    res.json(items.map(s => ({
      id: s.id,
      subdomain: s.subdomain,
      targetPath: s.targetPath,
      type: s.type,
      status: s.status,
      fullDomain: `${s.subdomain}.${MAIN_DOMAIN}`,
      createdAt: s.createdAt.toISOString(),
      userId: s.userId,
    })));
  } catch (err) {
    req.log.error({ err }, "List subdomains error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/subdomains/create", requireAuth, async (req, res) => {
  const parsed = CreateSubdomainBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { subdomain, targetPath, type } = parsed.data;
  const userId = req.session.userId!;
  const username = req.session.username!;

  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    res.status(400).json({ error: "Subdomain can only contain letters, numbers, and hyphens" });
    return;
  }

  try {
    const [existing] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.subdomain, subdomain.toLowerCase()));
    if (existing) {
      res.status(409).json({ error: "Subdomain already taken" });
      return;
    }
    const [created] = await db.insert(subdomainsTable).values({
      subdomain: subdomain.toLowerCase(),
      targetPath,
      type,
      status: "active",
      userId,
    }).returning();
    await logActivity({ action: `إنشاء نطاق فرعي: ${subdomain}`, target: subdomain, type: "subdomain", userId, username });
    res.status(201).json({
      id: created.id,
      subdomain: created.subdomain,
      targetPath: created.targetPath,
      type: created.type,
      status: created.status,
      fullDomain: `${created.subdomain}.${MAIN_DOMAIN}`,
      createdAt: created.createdAt.toISOString(),
      userId: created.userId,
    });
  } catch (err) {
    req.log.error({ err }, "Create subdomain error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/subdomains/:subdomainId", requireAuth, async (req, res) => {
  const parsed = DeleteSubdomainParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const subdomainId = parsed.data.subdomainId;
  const userId = req.session.userId!;
  const username = req.session.username!;
  try {
    const [sub] = await db.select().from(subdomainsTable)
      .where(and(eq(subdomainsTable.id, subdomainId), eq(subdomainsTable.userId, userId)));
    if (!sub) {
      res.status(404).json({ error: "Subdomain not found" });
      return;
    }
    await db.delete(subdomainsTable).where(eq(subdomainsTable.id, subdomainId));
    await logActivity({ action: `حذف نطاق فرعي: ${sub.subdomain}`, target: sub.subdomain, type: "subdomain", userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete subdomain error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

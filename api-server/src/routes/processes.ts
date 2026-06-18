import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { logActivity } from "../lib/activity";
import { StartProcessBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { processesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ChildProcess, spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

const router: IRouter = Router();

const runningProcs: Map<number, { proc: ChildProcess; logs: string[] }> = new Map();

function getUserDir(username: string): string {
  const base = process.env.USER_FILES_DIR ?? path.join(os.homedir(), "hostx-files");
  const dir = path.join(base, username);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

router.get("/processes", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const procs = await db.select().from(processesTable).where(eq(processesTable.userId, userId));
    res.json(procs.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      command: p.command,
      startedAt: p.startedAt?.toISOString() ?? null,
      pid: p.pid,
      port: p.port,
      memoryMb: p.memoryMb,
      cpuPercent: p.cpuPercent,
      userId: p.userId,
    })));
  } catch (err) {
    req.log.error({ err }, "List processes error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/processes/start", requireAuth, async (req, res) => {
  const parsed = StartProcessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, type, command, workingDir, port, env } = parsed.data;
  const userId = req.session.userId!;
  const username = req.session.username!;
  const cwd = workingDir
    ? path.join(getUserDir(username), workingDir)
    : getUserDir(username);

  try {
    const [proc] = await db.insert(processesTable).values({
      name,
      type,
      status: "running",
      command,
      workingDir: workingDir ?? null,
      port: port ?? null,
      userId,
      startedAt: new Date(),
    }).returning();

    const fullEnv = { ...process.env, ...env };
    const child = spawn(command, { shell: true, cwd, env: fullEnv, detached: false });
    const logs: string[] = [];

    child.stdout?.on("data", (data: Buffer) => {
      logs.push(data.toString());
      if (logs.length > 500) logs.shift();
    });
    child.stderr?.on("data", (data: Buffer) => {
      logs.push(`[stderr] ${data.toString()}`);
      if (logs.length > 500) logs.shift();
    });
    child.on("exit", async (code) => {
      runningProcs.delete(proc.id);
      await db.update(processesTable)
        .set({ status: code === 0 ? "stopped" : "error", pid: null })
        .where(eq(processesTable.id, proc.id));
    });

    runningProcs.set(proc.id, { proc: child, logs });

    await db.update(processesTable).set({ pid: child.pid ?? null }).where(eq(processesTable.id, proc.id));
    await logActivity({ action: `تشغيل ${type}: ${name}`, target: name, type: "process", userId, username });

    res.json({
      id: proc.id,
      name: proc.name,
      type: proc.type,
      status: "running",
      command: proc.command,
      startedAt: proc.startedAt?.toISOString() ?? null,
      pid: child.pid ?? null,
      port: proc.port,
      memoryMb: null,
      cpuPercent: null,
      userId: proc.userId,
    });
  } catch (err) {
    req.log.error({ err }, "Start process error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/processes/:processId/stop", requireAuth, async (req, res) => {
  const processId = parseInt(String(req.params["processId"] ?? ""));
  if (isNaN(processId)) {
    res.status(400).json({ error: "Invalid process ID" });
    return;
  }
  const userId = req.session.userId!;
  const username = req.session.username!;
  try {
    const [proc] = await db.select().from(processesTable)
      .where(and(eq(processesTable.id, processId), eq(processesTable.userId, userId)));
    if (!proc) {
      res.status(404).json({ error: "Process not found" });
      return;
    }
    const running = runningProcs.get(processId);
    if (running) {
      running.proc.kill("SIGTERM");
      runningProcs.delete(processId);
    }
    await db.update(processesTable).set({ status: "stopped", pid: null }).where(eq(processesTable.id, processId));
    await logActivity({ action: `إيقاف: ${proc.name}`, target: proc.name, type: "process", userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Stop process error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/processes/:processId/restart", requireAuth, async (req, res) => {
  const processId = parseInt(String(req.params["processId"] ?? ""));
  if (isNaN(processId)) {
    res.status(400).json({ error: "Invalid process ID" });
    return;
  }
  const userId = req.session.userId!;
  const username = req.session.username!;
  try {
    const [proc] = await db.select().from(processesTable)
      .where(and(eq(processesTable.id, processId), eq(processesTable.userId, userId)));
    if (!proc) {
      res.status(404).json({ error: "Process not found" });
      return;
    }
    const running = runningProcs.get(processId);
    if (running) {
      running.proc.kill("SIGTERM");
      runningProcs.delete(processId);
    }
    const cwd = proc.workingDir
      ? path.join(getUserDir(username), proc.workingDir)
      : getUserDir(username);
    const child = spawn(proc.command, { shell: true, cwd, detached: false });
    const logs: string[] = [];
    child.stdout?.on("data", (data: Buffer) => { logs.push(data.toString()); });
    child.stderr?.on("data", (data: Buffer) => { logs.push(`[stderr] ${data.toString()}`); });
    child.on("exit", async (code) => {
      runningProcs.delete(processId);
      await db.update(processesTable)
        .set({ status: code === 0 ? "stopped" : "error", pid: null })
        .where(eq(processesTable.id, processId));
    });
    runningProcs.set(processId, { proc: child, logs });
    await db.update(processesTable).set({ status: "running", pid: child.pid ?? null, startedAt: new Date() }).where(eq(processesTable.id, processId));
    await logActivity({ action: `إعادة تشغيل: ${proc.name}`, target: proc.name, type: "process", userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Restart process error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/processes/:processId/logs", requireAuth, async (req, res) => {
  const processId = parseInt(String(req.params["processId"] ?? ""));
  if (isNaN(processId)) {
    res.status(400).json({ error: "Invalid process ID" });
    return;
  }
  const running = runningProcs.get(processId);
  const logs = running?.logs ?? ["(لا يوجد إخراج — البروسيس متوقف أو لم يبدأ بعد)"];
  res.json({ processId: String(processId), logs });
});

export default router;

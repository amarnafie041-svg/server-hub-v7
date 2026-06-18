import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { logActivity } from "../lib/activity";
import { ExecuteCommandBody, InstallPackageBody } from "@workspace/api-zod";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";

const router: IRouter = Router();
const execAsync = promisify(exec);

function getUserDir(username: string): string {
  const base = process.env.USER_FILES_DIR ?? path.join(os.homedir(), "hostx-files");
  const dir = path.join(base, username);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const BLOCKED = ["rm -rf /", "sudo rm", "mkfs", "dd if=", "> /dev/"];

function isBlockedCommand(cmd: string): boolean {
  return BLOCKED.some(b => cmd.includes(b));
}

/** Translate pip/pip3 → python3 -m pip --break-system-packages so it always works */
function normalizeCommand(cmd: string): string {
  // pip / pip3 → python3 -m pip
  let result = cmd
    .replace(/^pip3?\s+/, "python3 -m pip ")
    .replace(/^pip3?\s*$/, "python3 -m pip");
  // Add --break-system-packages to pip install/uninstall/download if not already present
  if (/^python3 -m pip (install|uninstall|download)/.test(result) && !result.includes("--break-system-packages")) {
    result = result.replace(
      /^(python3 -m pip (install|uninstall|download))/,
      "$1 --break-system-packages"
    );
  }
  return result;
}

const PYTHONLIBS = path.join(os.homedir(), ".pythonlibs", "bin");

const ENV = {
  ...process.env,
  PATH: [
    PYTHONLIBS,
    process.env.PATH,
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/local/sbin",
    "/usr/sbin",
    "/sbin",
    "/home/user/.local/bin",
  ].filter(Boolean).join(":"),
  PYTHONUSERBASE: path.join(os.homedir(), ".pythonlibs"),
};

router.post("/terminal/execute", requireAuth, async (req, res) => {
  const parsed = ExecuteCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { command: rawCommand, workingDir } = parsed.data;
  const command = normalizeCommand(rawCommand);
  if (isBlockedCommand(command)) {
    res.status(403).json({ error: "Command not allowed", success: false, output: "⛔ هذا الأمر محظور لأسباب أمنية", exitCode: 1 });
    return;
  }
  const username = req.session.username!;
  const cwd = workingDir
    ? path.join(getUserDir(username), workingDir)
    : getUserDir(username);
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      env: ENV,
    });
    const output = (stdout + (stderr ? "\n" + stderr : "")).trim();
    await logActivity({ action: `تنفيذ أمر: ${command.slice(0, 50)}`, target: command.slice(0, 100), type: "terminal", userId: req.session.userId, username });
    res.json({ success: true, output: output || "(no output)", exitCode: 0, error: null });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    const output = ((e.stdout ?? "") + "\n" + (e.stderr ?? "")).trim();
    res.json({ success: false, output: output || "Command failed", exitCode: e.code ?? 1, error: null });
  }
});

router.post("/terminal/install", requireAuth, async (req, res) => {
  const parsed = InstallPackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { packageManager, packages } = parsed.data;
  const username = req.session.username!;
  const cwd = getUserDir(username);

  const pkgStr = packages.join(" ");
  let command: string;
  switch (packageManager) {
    case "pip":
      command = `python3 -m pip install --break-system-packages ${pkgStr}`;
      break;
    case "npm":
      command = `npm install ${pkgStr}`;
      break;
    case "composer":
      command = `composer require ${pkgStr}`;
      break;
    case "apt":
      command = `apt-get install -y ${pkgStr}`;
      break;
    default:
      res.status(400).json({ error: "Unknown package manager" });
      return;
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
      env: ENV,
    });
    const output = (stdout + (stderr ? "\n" + stderr : "")).trim();
    await logActivity({ action: `تثبيت حزمة: ${pkgStr}`, target: packageManager, type: "terminal", userId: req.session.userId, username });
    res.json({ success: true, output: output || "Installed successfully", exitCode: 0, error: null });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    const output = ((e.stdout ?? "") + "\n" + (e.stderr ?? "")).trim();
    res.json({ success: false, output: output || "Installation failed", exitCode: e.code ?? 1, error: null });
  }
});

export default router;

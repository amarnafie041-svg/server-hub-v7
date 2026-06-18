import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { logActivity } from "../lib/activity";
import { ListFilesQueryParams, ReadFileQueryParams, WriteFileBody, DeleteFileQueryParams, CreateDirectoryBody, RenameFileBody, UploadFileBody, TouchFileBody } from "@workspace/api-zod";
import fs from "fs";
import path from "path";
import os from "os";

const router: IRouter = Router();

function getUserDir(username: string): string {
  const base = process.env.USER_FILES_DIR ?? path.join(os.homedir(), "hostx-files");
  const dir = path.join(base, username);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safePath(base: string, reqPath: string): string | null {
  const resolved = path.resolve(path.join(base, reqPath || ""));
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function getIcon(name: string, isDir: boolean): string {
  if (isDir) return "folder";
  const ext = path.extname(name).toLowerCase();
  const icons: Record<string, string> = {
    ".py": "python", ".js": "js", ".ts": "ts", ".html": "html", ".htm": "html",
    ".css": "css", ".php": "php", ".json": "json", ".md": "markdown",
    ".sh": "terminal", ".zip": "archive", ".tar": "archive", ".gz": "archive",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
    ".svg": "image", ".mp4": "video", ".mp3": "audio", ".pdf": "pdf",
    ".txt": "text", ".env": "config", ".yml": "config", ".yaml": "config",
    ".xml": "code", ".sql": "database",
  };
  return icons[ext] ?? "file";
}

function getLanguage(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const langs: Record<string, string> = {
    ".py": "python", ".js": "javascript", ".ts": "typescript", ".jsx": "javascript",
    ".tsx": "typescript", ".html": "html", ".htm": "html", ".css": "css",
    ".php": "php", ".json": "json", ".xml": "xml", ".yaml": "yaml",
    ".yml": "yaml", ".md": "markdown", ".sh": "shell", ".bash": "shell",
    ".sql": "sql", ".cpp": "cpp", ".c": "c", ".java": "java",
    ".go": "go", ".rs": "rust", ".rb": "ruby",
  };
  return langs[ext] ?? "text";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

router.get("/files/list", requireAuth, async (req, res) => {
  const parsed = ListFilesQueryParams.safeParse(req.query);
  const reqPath = parsed.success ? (parsed.data.path ?? "") : "";
  const username = req.session.username!;
  const base = getUserDir(username);
  const fullPath = safePath(base, reqPath);
  if (!fullPath) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    if (!fs.existsSync(fullPath)) {
      res.json([]);
      return;
    }
    const entries = fs.readdirSync(fullPath);
    const result = entries.map(name => {
      const entryPath = path.join(fullPath, name);
      try {
        const stat = fs.statSync(entryPath);
        const isDir = stat.isDirectory();
        const relPath = path.join(reqPath || "", name);
        return {
          name,
          path: relPath,
          isDir,
          size: isDir ? "-" : formatSize(stat.size),
          sizeBytes: stat.size,
          modified: stat.mtime.toISOString(),
          ext: isDir ? "" : path.extname(name).toLowerCase().slice(1),
          icon: getIcon(name, isDir),
          language: isDir ? null : getLanguage(name),
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "List files error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/files/read", requireAuth, async (req, res) => {
  const parsed = ReadFileQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.path) {
    res.status(400).json({ error: "Path required" });
    return;
  }
  const username = req.session.username!;
  const base = getUserDir(username);
  const fullPath = safePath(base, parsed.data.path);
  if (!fullPath) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      res.status(400).json({ error: "Is a directory" });
      return;
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    const name = path.basename(fullPath);
    res.json({
      path: parsed.data.path,
      content,
      language: getLanguage(name),
      isText: true,
    });
  } catch (err) {
    req.log.error({ err }, "Read file error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/files/write", requireAuth, async (req, res) => {
  const parsed = WriteFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { path: reqPath, content } = parsed.data;
  const username = req.session.username!;
  const base = getUserDir(username);
  const fullPath = safePath(base, reqPath);
  if (!fullPath) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
    await logActivity({ action: "حفظ ملف", target: reqPath, type: "file", userId: req.session.userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Write file error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/files/delete", requireAuth, async (req, res) => {
  const parsed = DeleteFileQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.path) {
    res.status(400).json({ error: "Path required" });
    return;
  }
  const username = req.session.username!;
  const base = getUserDir(username);
  const fullPath = safePath(base, parsed.data.path);
  if (!fullPath) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    await logActivity({ action: "حذف ملف", target: parsed.data.path, type: "file", userId: req.session.userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete file error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/files/mkdir", requireAuth, async (req, res) => {
  const parsed = CreateDirectoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const username = req.session.username!;
  const base = getUserDir(username);
  const fullPath = safePath(base, parsed.data.path);
  if (!fullPath) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    fs.mkdirSync(fullPath, { recursive: true });
    await logActivity({ action: "إنشاء مجلد", target: parsed.data.path, type: "file", userId: req.session.userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Mkdir error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/files/upload", requireAuth, async (req, res) => {
  const parsed = UploadFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { path: reqPath, content } = parsed.data;
  const username = req.session.username!;
  const base = getUserDir(username);
  const fullPath = safePath(base, reqPath);
  if (!fullPath) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const buf = Buffer.from(content, "base64");
    fs.writeFileSync(fullPath, buf);
    await logActivity({ action: "رفع ملف", target: reqPath, type: "file", userId: req.session.userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Upload error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/files/touch", requireAuth, async (req, res) => {
  const parsed = TouchFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { path: reqPath } = parsed.data;
  const username = req.session.username!;
  const base = getUserDir(username);
  const fullPath = safePath(base, reqPath);
  if (!fullPath) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, "", "utf-8");
    }
    await logActivity({ action: "إنشاء ملف", target: reqPath, type: "file", userId: req.session.userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Touch error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/files/rename", requireAuth, async (req, res) => {
  const parsed = RenameFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const username = req.session.username!;
  const base = getUserDir(username);
  const oldFull = safePath(base, parsed.data.oldPath);
  const newFull = safePath(base, parsed.data.newPath);
  if (!oldFull || !newFull) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    fs.renameSync(oldFull, newFull);
    await logActivity({ action: "إعادة تسمية", target: parsed.data.oldPath, type: "file", userId: req.session.userId, username });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Rename error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

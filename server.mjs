import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "5000", 10);
const API_PORT = PORT + 1;
const PUBLIC_DIR = path.resolve(__dirname, "host-x", "dist", "public");

// Create database tables if they don't exist
async function createTables() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const enums = [
      `CREATE TYPE role AS ENUM ('owner', 'user')`,
      `CREATE TYPE theme AS ENUM ('dark', 'light')`,
      `CREATE TYPE process_type AS ENUM ('python', 'nodejs', 'php', 'html', 'bot')`,
      `CREATE TYPE process_status AS ENUM ('running', 'stopped', 'error')`,
      `CREATE TYPE subdomain_type AS ENUM ('html', 'python', 'nodejs', 'php')`,
      `CREATE TYPE subdomain_status AS ENUM ('active', 'inactive')`,
      `CREATE TYPE activity_type AS ENUM ('process', 'file', 'auth', 'subdomain', 'terminal')`,
    ];
    for (const sql of enums) {
      try { await pool.query(sql); } catch (e) { if (!e.message.includes("already exists")) throw e; }
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
      password_hash TEXT NOT NULL, display_name TEXT, role role NOT NULL DEFAULT 'user',
      theme theme NOT NULL DEFAULT 'dark', language TEXT NOT NULL DEFAULT 'ar',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(), expires_at TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS processes (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, type process_type NOT NULL,
      status process_status NOT NULL DEFAULT 'stopped', command TEXT NOT NULL,
      working_dir TEXT, port INTEGER, pid INTEGER, memory_mb REAL, cpu_percent REAL,
      user_id INTEGER NOT NULL, started_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS subdomains (
      id SERIAL PRIMARY KEY, subdomain TEXT NOT NULL UNIQUE, target_path TEXT NOT NULL,
      type subdomain_type NOT NULL, status subdomain_status NOT NULL DEFAULT 'active',
      user_id INTEGER NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS activity (
      id SERIAL PRIMARY KEY, action TEXT NOT NULL, target TEXT NOT NULL,
      type activity_type NOT NULL, user_id INTEGER, username TEXT,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    // Promote elmodmen to owner if exists
    await pool.query("UPDATE users SET role = 'owner' WHERE username = 'elmodmen' AND role != 'owner'");
    console.log("Database tables ready");
  } catch (err) {
    console.error("Table creation error:", err.message);
  } finally {
    await pool.end();
  }
}

// Start API server on API_PORT
await createTables();
const api = spawn("node", ["--enable-source-maps", "api-server/dist/index.mjs"], {
  cwd: __dirname,
  stdio: "inherit",
  env: { ...process.env, PORT: String(API_PORT) },
});

api.on("exit", (code) => {
  process.exit(code ?? 0);
});

const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    const opts = {
      hostname: "localhost", port: API_PORT,
      path: url.pathname + url.search,
      method: req.method, headers: req.headers,
    };
    const proxy = http.request(opts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    req.pipe(proxy);
    return;
  }

  if (!fs.existsSync(PUBLIC_DIR)) {
    res.writeHead(503, { "Content-Type": "text/html" });
    res.end("<h1>Frontend not built yet</h1>");
    return;
  }

  let filePath2 = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = path.resolve(PUBLIC_DIR, "." + filePath2);

  if (!fs.existsSync(fullPath)) {
    const indexPath = path.resolve(PUBLIC_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(indexPath));
      return;
    }
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(fullPath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(fs.readFileSync(fullPath));
});

server.listen(PORT, () => {
  console.log(`Frontend server on :${PORT}, API on :${API_PORT}`);
});

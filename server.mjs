import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "5000", 10);
const API_PORT = PORT + 1;
const PUBLIC_DIR = path.resolve(__dirname, "host-x", "dist", "public");

// Start API server on API_PORT
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

  // Proxy /api/* to the API server
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

  // Serve frontend
  if (!fs.existsSync(PUBLIC_DIR)) {
    res.writeHead(503, { "Content-Type": "text/html" });
    res.end("<h1>Frontend not built</h1><p>Run: cd host-x && npm install && npm run build</p>");
    return;
  }

  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = path.resolve(PUBLIC_DIR, "." + filePath);

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

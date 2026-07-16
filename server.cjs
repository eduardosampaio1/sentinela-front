// Static server for the Sentinela SPA + static prototypes under /projects.
//
// Why not `serve -s dist`: serve's --single mode rewrites EVERY nested .html
// (and directory) to the root index.html, so static prototype pages under
// /projects can't be served. This server uses the correct precedence:
//   1) exact file  2) <path>.html (clean URLs)  3) <path>/index.html (dir)
//   4) SPA fallback -> /index.html
// No dependencies (Node built-ins only).
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");
const PORT = process.env.PORT || 8080;
const INDEX = path.join(DIST, "index.html");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function send(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(status, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    // hashed build assets are immutable; HTML must revalidate so deploys show up
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
}

// Resolve a request path to a real file inside DIST, or null.
function resolve(urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  // normalize + block path traversal
  const abs = path.normalize(path.join(DIST, rel));
  if (abs !== DIST && !abs.startsWith(DIST + path.sep)) return null;

  if (isFile(abs)) return abs;                          // exact file
  if (isFile(abs + ".html")) return abs + ".html";       // clean URL -> .html
  const dirIndex = path.join(abs, "index.html");
  if (isFile(dirIndex)) return dirIndex;                 // directory -> index.html
  return null;
}

http
  .createServer((req, res) => {
    const hit = resolve(req.url || "/");
    if (hit) return send(res, hit);
    // SPA fallback: let the React router handle client-side routes
    if (isFile(INDEX)) return send(res, INDEX);
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  })
  .listen(PORT, () => {
    console.log(`sentinela-front static server on :${PORT} (dist=${DIST})`);
  });

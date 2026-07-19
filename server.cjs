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
  const raw = urlPath.split("?")[0].split("#")[0];
  // decodeURIComponent throws URIError on malformed percent-encoding ("/%",
  // "/%zz"), and req.url is attacker-controlled -- internet scanners send these
  // constantly. An uncaught throw here kills the process, so a single bad
  // request used to crash-loop the whole site. Malformed => no file match.
  let rel;
  try {
    rel = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // normalize + block path traversal
  const abs = path.normalize(path.join(DIST, rel));
  if (abs !== DIST && !abs.startsWith(DIST + path.sep)) return null;

  if (isFile(abs)) return abs;                          // exact file
  if (isFile(abs + ".html")) return abs + ".html";       // clean URL -> .html
  const dirIndex = path.join(abs, "index.html");
  if (isFile(dirIndex)) return dirIndex;                 // directory -> index.html
  return null;
}

const server = http.createServer((req, res) => {
  // Second layer: no single request may ever take the process down. Anything
  // unexpected becomes a 500 for that one client, not a container restart.
  try {
    const hit = resolve(req.url || "/");
    if (hit) return send(res, hit);
    // SPA fallback: let the React router handle client-side routes
    if (isFile(INDEX)) return send(res, INDEX);
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  } catch (err) {
    console.error(`request failed: ${req.method} ${req.url}`, err);
    if (res.headersSent) return res.destroy();
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal server error");
  }
});

// Malformed HTTP framing shouldn't surface as an uncaught 'clientError' either.
server.on("clientError", (err, socket) => {
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  socket.destroy();
});

server.listen(PORT, () => {
  console.log(`sentinela-front static server on :${PORT} (dist=${DIST})`);
});

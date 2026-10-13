import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleBeta } from "../server/beta.mjs";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(project, "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function withinRoot(path) {
  const difference = relative(root, path);
  return (
    difference !== ".." &&
    !difference.startsWith(`..${sep}`) &&
    !difference.startsWith(sep)
  );
}

function fail(res, status, message) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(message);
}

async function serveStatic(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD");
    fail(res, 405, "Method not allowed");
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
  } catch {
    fail(res, 400, "Invalid path");
    return;
  }
  if (pathname.includes("\0") || pathname.includes("\\")) {
    fail(res, 400, "Invalid path");
    return;
  }
  let file = resolve(root, `.${pathname}`);
  if (!withinRoot(file)) {
    fail(res, 403, "Forbidden");
    return;
  }
  try {
    let info;
    try {
      info = await stat(file);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      // Navigation routes may use the homepage; a missing asset must be a 404.
      if (
        extname(pathname) ||
        pathname.startsWith("/assets/") ||
        pathname.startsWith("/api/")
      ) {
        fail(res, 404, "Not found");
        return;
      }
      file = resolve(root, "index.html");
      info = await stat(file);
    }
    if (info.isDirectory()) file = resolve(file, "index.html");
    const canonical = await realpath(file);
    if (!withinRoot(canonical)) {
      fail(res, 403, "Forbidden");
      return;
    }
    const content = await readFile(canonical);
    const extension = extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": types[extension] || "application/octet-stream",
      "Content-Length": content.length,
      "Cache-Control":
        extension === ".html"
          ? "no-cache"
          : file.includes(`${sep}assets${sep}`) && /-[\w-]{8,}\./.test(file)
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR")
      fail(res, 404, "Not found");
    else {
      console.error("Static content could not be served.");
      fail(res, 500, "Server error");
    }
  }
}

try {
  await stat(resolve(root, "index.html"));
} catch {
  console.error("Build the site first with npm run build.");
  process.exit(1);
}
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw new Error("PORT must be a valid port number.");

const server = createServer(async (req, res) => {
  if (!(await handleBeta(req, res))) await serveStatic(req, res);
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(port, host, () => {
  const address = server.address();
  console.log(`Side Quest is running at http://${host}:${address.port}`);
});
server.on("error", () => {
  console.error("The web server could not start. Check HOST and PORT.");
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));

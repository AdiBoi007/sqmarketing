import { appendFile, mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BODY = 8 * 1024;
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 12;

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function reply(res, status, payload) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function parseJson(input) {
  try {
    const serialized =
      typeof input === "string" || Buffer.isBuffer(input)
        ? input.toString()
        : JSON.stringify(input);
    if (!serialized) throw new Error();
    if (Buffer.byteLength(serialized, "utf8") > MAX_BODY) {
      throw new RequestError(413, "That request is too large.");
    }
    const value = JSON.parse(serialized);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, "Please send a valid signup.");
  }
}

async function readJson(req) {
  const declaredSize = req.headers["content-length"];
  if (
    declaredSize !== undefined &&
    (!/^\d+$/.test(String(declaredSize)) || Number(declaredSize) > MAX_BODY)
  ) {
    req.resume();
    throw new RequestError(413, "That request is too large.");
  }
  // Vercel's Node helper exposes an already-consumed, lazily parsed body.
  // Local servers and deployments with NODEJS_HELPERS=0 use the raw stream.
  if ("body" in req) {
    try {
      const body = req.body;
      if (body !== undefined) return parseJson(body);
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError(400, "Please send a valid signup.");
    }
  }
  if (req.readableEnded) return parseJson("");
  return new Promise((accept, reject) => {
    let size = 0;
    let chunks = [];
    let tooLarge = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        chunks = [];
        if (!tooLarge)
          reject(new RequestError(413, "That request is too large."));
        tooLarge = true;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.once("end", () => {
      if (tooLarge) return;
      try {
        accept(parseJson(Buffer.concat(chunks)));
      } catch (error) {
        reject(error);
      }
    });
    req.once("aborted", () =>
      reject(new RequestError(400, "The request was interrupted.")),
    );
    req.once("error", reject);
  });
}

function validate(value) {
  const name =
    typeof value.name === "string"
      ? value.name.trim().replace(/\s+/g, " ")
      : "";
  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const campus = value.campus;
  if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new RequestError(
      400,
      "Please enter your name, up to 100 characters.",
    );
  }
  if (
    !email ||
    email.length > 254 ||
    /[\u0000-\u001f\u007f]/.test(email) ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
  ) {
    throw new RequestError(400, "Please enter a valid email address.");
  }
  if (!["USYD", "Other"].includes(campus)) {
    throw new RequestError(400, "Please choose your university.");
  }
  return { name, email, campus };
}

/** Persistent, dependency-free signup handler shared by Vite and production. */
export function createBetaHandler({
  dataDirectory = process.env.BETA_DATA_DIR ||
    resolve(dirname(fileURLToPath(import.meta.url)), "../data"),
  persistSignup,
  getClientAddress = (req) => req.socket?.remoteAddress || "unknown",
} = {}) {
  const file = resolve(dataDirectory, "beta-signups.jsonl");
  const attempts = new Map();
  const emails = new Set();
  let loaded = false;
  let needsNewline = false;
  let queue = Promise.resolve();

  async function persist(signup) {
    if (process.env.VERCEL)
      throw new Error("Durable signup storage is required on Vercel.");
    // Serialize initialization, deduplication, and appends in one process.
    const work = queue.then(async () => {
      if (!loaded) {
        let saved = "";
        try {
          saved = await readFile(file, "utf8");
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        for (const line of saved.split("\n")) {
          if (!line) continue;
          try {
            const entry = JSON.parse(line);
            if (typeof entry.email === "string")
              emails.add(entry.email.toLowerCase());
          } catch {
            /* A partial final line must not prevent future signups. */
          }
        }
        needsNewline = Boolean(saved && !saved.endsWith("\n"));
        loaded = true;
      }
      if (emails.has(signup.email)) return;
      await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
      const entry = {
        id: randomUUID(),
        ...signup,
        submittedAt: new Date().toISOString(),
      };
      await appendFile(
        file,
        `${needsNewline ? "\n" : ""}${JSON.stringify(entry)}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      needsNewline = false;
      emails.add(signup.email);
    });
    queue = work.catch(() => {});
    return work;
  }

  return async function handleBeta(req, res, next = () => {}) {
    let pathname;
    try {
      pathname = new URL(req.url, "http://localhost").pathname;
    } catch {
      next();
      return false;
    }
    if (pathname !== "/api/beta") {
      next();
      return false;
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      reply(res, 405, { ok: false, error: "Please submit the beta form." });
      return true;
    }

    const now = Date.now();
    // Local requests use the socket; hosted adapters may use a trusted edge header.
    const ip = getClientAddress(req);
    const previous = attempts.get(ip);
    const attempt =
      previous && now - previous.started < WINDOW_MS
        ? previous
        : { started: now, count: 0 };
    attempt.count += 1;
    attempts.set(ip, attempt);
    if (attempts.size > 1024) {
      for (const [key, entry] of attempts) {
        if (now - entry.started >= WINDOW_MS) attempts.delete(key);
      }
    }
    if (attempt.count > MAX_ATTEMPTS) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((WINDOW_MS - (now - attempt.started)) / 1000)),
      );
      reply(res, 429, {
        ok: false,
        error: "A few too many attempts. Try again in a minute.",
      });
      req.resume();
      return true;
    }

    try {
      if (
        !/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")
      ) {
        req.resume();
        throw new RequestError(415, "Please send a valid signup.");
      }
      const value = await readJson(req);
      // Bots receive the same response without adding a record.
      if (typeof value.website === "string" && value.website.trim()) {
        reply(res, 200, { ok: true });
        return true;
      }
      await (persistSignup || persist)(validate(value));
      reply(res, 200, { ok: true });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 503;
      if (status === 503)
        console.error("Beta signup storage is temporarily unavailable.");
      reply(res, status, {
        ok: false,
        error:
          status === 503
            ? "Signups are temporarily unavailable. Please try again shortly."
            : error.message,
      });
    }
    return true;
  };
}

export const handleBeta = createBetaHandler();

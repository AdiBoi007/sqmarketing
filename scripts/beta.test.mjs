import assert from "node:assert/strict";
import { test } from "node:test";
import { Readable } from "node:stream";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBetaHandler } from "../server/beta.mjs";
import { createBlobSignupStore } from "../server/blob-signups.mjs";

const signup = {
  name: "Test Student",
  email: "student@example.com",
  campus: "USYD",
};

async function request(
  handler,
  {
    body = signup,
    parsed = true,
    headers = {},
    address = "127.0.0.1",
    method = "POST",
  } = {},
) {
  const req = Readable.from(parsed ? [] : [Buffer.from(body)]);
  Object.assign(req, {
    url: "/api/beta",
    method,
    headers: { "content-type": "application/json", ...headers },
    socket: { remoteAddress: address },
  });
  if (parsed)
    Object.defineProperty(req, "body", {
      get: () => {
        if (body instanceof Error) throw body;
        return body;
      },
    });
  const res = {
    headers: {},
    status: 0,
    writableEnded: false,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    writeHead(status, values) {
      this.status = status;
      Object.assign(this.headers, values);
    },
    end(value) {
      this.payload = JSON.parse(value);
      this.writableEnded = true;
    },
  };
  await handler(req, res);
  return res;
}

function memoryBlob() {
  const records = new Map();
  let lastPath;
  const options = {
    hasCredentials: () => true,
    async putBlob(pathname, body, settings) {
      assert.equal(settings.access, "private");
      assert.equal(settings.allowOverwrite, false);
      assert.equal(settings.addRandomSuffix, false);
      lastPath = pathname;
      if (records.has(pathname)) throw new Error("Already exists");
      records.set(pathname, body);
    },
    async getBlob(pathname, settings) {
      assert.equal(settings.access, "private");
      assert.equal(settings.useCache, false);
      const body = records.get(pathname);
      return body === undefined
        ? null
        : {
            statusCode: 200,
            blob: { size: Buffer.byteLength(body) },
            stream: new Blob([body]).stream(),
          };
    },
  };
  return {
    records,
    options,
    get pathname() {
      return lastPath;
    },
  };
}

test("private create-only storage deduplicates across instances and preserves the first signup", async () => {
  const blob = memoryBlob();
  const firstStore = createBlobSignupStore(blob.options);
  const secondStore = createBlobSignupStore(blob.options);
  await firstStore(signup);
  const original = [...blob.records.values()][0];
  await Promise.all([
    firstStore({ ...signup, name: "Changed Name" }),
    secondStore({ ...signup, campus: "Other" }),
  ]);
  assert.equal(blob.records.size, 1);
  assert.equal([...blob.records.values()][0], original);
  assert.match(blob.pathname, /^beta-signups\/[a-f0-9]{64}\.json$/);
  const saved = JSON.parse(original);
  assert.equal(saved.email, signup.email);
  assert.equal(saved.name, signup.name);
  assert.ok(saved.id && Number.isFinite(Date.parse(saved.submittedAt)));
});

test("missing credentials and unconfirmed write errors cannot claim persistence", async () => {
  let calls = 0;
  const unavailable = createBlobSignupStore({
    hasCredentials: () => false,
    putBlob: async () => {
      calls += 1;
    },
  });
  await assert.rejects(unavailable(signup));
  assert.equal(calls, 0);
  const outage = new Error("Storage unavailable");
  const failed = createBlobSignupStore({
    hasCredentials: () => true,
    putBlob: async () => {
      throw outage;
    },
    getBlob: async () => null,
  });
  await assert.rejects(failed(signup), (error) => error === outage);
  const denied = createBlobSignupStore({
    hasCredentials: () => true,
    putBlob: async () => {
      throw outage;
    },
    getBlob: async () => {
      throw new Error("Access denied");
    },
  });
  await assert.rejects(denied(signup), (error) => error === outage);
});

test("a write with a lost reply succeeds only when the durable matching record is confirmed", async () => {
  const blob = memoryBlob();
  const store = createBlobSignupStore({
    ...blob.options,
    putBlob: async (...args) => {
      await blob.options.putBlob(...args);
      throw new Error("Reply lost");
    },
  });
  await store(signup);
  assert.equal(blob.records.size, 1);
  blob.records.set(
    blob.pathname,
    JSON.stringify({
      ...JSON.parse(blob.records.get(blob.pathname)),
      email: "different@example.com",
    }),
  );
  await assert.rejects(store(signup));
  blob.records.set(blob.pathname, "invalid JSON");
  await assert.rejects(store(signup));
  blob.records.set(blob.pathname, "x".repeat(8193));
  await assert.rejects(store(signup));
});

test("Vercel parsed JSON and local raw JSON share validation and successful persistence", async () => {
  const saved = [];
  const handler = createBetaHandler({
    persistSignup: async (value) => saved.push(value),
  });
  const response = await request(handler, {
    body: {
      ...signup,
      name: "  Test   Student ",
      email: "STUDENT@EXAMPLE.COM",
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload, { ok: true });
  assert.deepEqual(saved[0], signup);
  const raw = await request(handler, {
    body: JSON.stringify(signup),
    parsed: false,
  });
  assert.equal(raw.status, 200);
  assert.equal(saved.length, 2);
});

test("parsed and raw body caps, malformed JSON, invalid fields, and honeypot exclude records", async () => {
  let writes = 0;
  const handler = createBetaHandler({
    persistSignup: async () => {
      writes += 1;
    },
  });
  assert.equal(
    (await request(handler, { headers: { "content-length": "8193" } })).status,
    413,
  );
  assert.equal(
    (await request(handler, { body: { ...signup, extra: "x".repeat(8193) } }))
      .status,
    413,
  );
  assert.equal(
    (await request(handler, { body: " ".repeat(8193), parsed: false })).status,
    413,
  );
  assert.equal(
    (await request(handler, { body: new Error("Malformed JSON") })).status,
    400,
  );
  assert.equal(
    (await request(handler, { body: "{", parsed: false })).status,
    400,
  );
  assert.equal((await request(handler, { body: [] })).status, 400);
  assert.equal(
    (await request(handler, { body: { ...signup, email: "invalid" } })).status,
    400,
  );
  assert.equal(
    (await request(handler, { body: { ...signup, campus: "Invalid" } })).status,
    400,
  );
  assert.equal(
    (await request(handler, { body: { ...signup, name: "x".repeat(101) } }))
      .status,
    400,
  );
  const bot = await request(handler, { body: { ...signup, website: "spam" } });
  assert.equal(bot.status, 200);
  assert.deepEqual(bot.payload, { ok: true });
  assert.equal(writes, 0);
});

test("persistence rejection returns 503 instead of successful signup", async () => {
  const handler = createBetaHandler({
    persistSignup: async () => {
      throw new Error("Unavailable");
    },
  });
  const response = await request(handler);
  assert.equal(response.status, 503);
  assert.equal(response.payload.ok, false);
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("an injected trusted client address prevents proxy-wide rate limiting", async () => {
  const handler = createBetaHandler({
    persistSignup: async () => {},
    getClientAddress: (req) => req.headers["trusted-client"],
  });
  for (let i = 0; i < 12; i += 1) {
    assert.equal(
      (await request(handler, { headers: { "trusted-client": "client-a" } }))
        .status,
      200,
    );
  }
  const blocked = await request(handler, {
    headers: { "trusted-client": "client-a" },
  });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers["Retry-After"]) > 0);
  assert.equal(
    (await request(handler, { headers: { "trusted-client": "client-b" } }))
      .status,
    200,
  );
});

test("local JSONL persists and deduplicates after handler restart, using temporary data only", async () => {
  const folder = await mkdtemp(join(tmpdir(), "side-quest-beta-test-"));
  const vercel = process.env.VERCEL;
  delete process.env.VERCEL;
  try {
    const handler = createBetaHandler({ dataDirectory: folder });
    const response = await request(handler);
    assert.equal(response.status, 200);
    const restarted = createBetaHandler({ dataDirectory: folder });
    assert.equal((await request(restarted)).status, 200);
    const lines = (await readFile(join(folder, "beta-signups.jsonl"), "utf8"))
      .trim()
      .split("\n");
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).email, signup.email);
  } finally {
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
    await rm(folder, { recursive: true, force: true });
  }
});

test("Vercel cannot fall back to an ephemeral local signup file", async () => {
  const folder = await mkdtemp(join(tmpdir(), "side-quest-no-fallback-test-"));
  const vercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const response = await request(
      createBetaHandler({ dataDirectory: folder }),
    );
    assert.equal(response.status, 503);
    assert.equal(response.payload.ok, false);
    await assert.rejects(access(join(folder, "beta-signups.jsonl")));
  } finally {
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
    await rm(folder, { recursive: true, force: true });
  }
});

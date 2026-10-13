import { createHash, randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";

const MAX_RECORD_BYTES = 8192;

function hasStorageCredentials() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

/** One immutable private record per normalized email, shared across instances. */
export function createBlobSignupStore({
  putBlob = put,
  getBlob = get,
  hasCredentials = hasStorageCredentials,
} = {}) {
  return async function persistSignup(signup) {
    if (!hasCredentials())
      throw new Error("Durable signup storage is not configured.");
    const hash = createHash("sha256").update(signup.email).digest("hex");
    const pathname = `beta-signups/${hash}.json`;
    const entry = {
      id: randomUUID(),
      ...signup,
      submittedAt: new Date().toISOString(),
    };
    try {
      await putBlob(pathname, JSON.stringify(entry), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: false,
      });
    } catch (writeError) {
      // The SDK has no distinct AlreadyExists error. Confirm an actual record
      // before treating any failed create as a duplicate, including lost replies.
      let existing;
      try {
        existing = await getBlob(pathname, {
          access: "private",
          useCache: false,
        });
        if (
          !existing ||
          existing.statusCode !== 200 ||
          !existing.stream ||
          existing.blob.size > MAX_RECORD_BYTES
        )
          throw writeError;
        const saved = await new Response(existing.stream).json();
        if (
          saved.email !== signup.email ||
          typeof saved.name !== "string" ||
          !saved.name ||
          !["USYD", "Other"].includes(saved.campus) ||
          typeof saved.id !== "string" ||
          !saved.id ||
          typeof saved.submittedAt !== "string" ||
          !Number.isFinite(Date.parse(saved.submittedAt))
        ) {
          throw writeError;
        }
      } catch {
        throw writeError;
      }
    }
  };
}

export const persistBlobSignup = createBlobSignupStore();

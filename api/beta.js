import { isIP } from "node:net";
import { createBetaHandler } from "../server/beta.mjs";
import { persistBlobSignup } from "../server/blob-signups.mjs";

// Vercel supplies and protects this client-IP header at its edge.
// https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
function getClientAddress(request) {
  const header =
    process.env.VERCEL && request.headers["x-vercel-forwarded-for"];
  const address = typeof header === "string" ? header.split(",")[0].trim() : "";
  return isIP(address) ? address : request.socket?.remoteAddress || "unknown";
}

export default createBetaHandler({
  persistSignup: persistBlobSignup,
  getClientAddress,
});

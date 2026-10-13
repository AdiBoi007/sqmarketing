import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
check(/<!doctype html>/i.test(html), "The document needs an HTML doctype.");
check(
  /<html\b[^>]*\blang=["']en(?:-[a-z]+)?["']/i.test(html),
  "The document needs an English language declaration.",
);
check(
  /<meta\b[^>]*name=["']viewport["']/i.test(html),
  "The document needs a responsive viewport.",
);
check(
  (html.match(/<h1\b/gi) || []).length === 1,
  "The page needs exactly one primary heading.",
);
check(/<main\b/i.test(html), "The campus story needs a main landmark.");
check(
  /<form\b[^>]*id=["']beta-form["']/i.test(html),
  "The waitlist form must exist.",
);

check(
  /<form\b[^>]*method=["']post["']/i.test(html),
  "The signup must never put personal fields into a GET URL.",
);
check(
  /id=["']world-status["'][^>]*role=["']status["']/i.test(html),
  "Map interactions need a status announcement.",
);

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(
  (match) => match[1],
);
check(new Set(ids).size === ids.length, "HTML IDs must be unique.");
for (const match of html.matchAll(/\bhref=["']#([^"']+)["']/g)) {
  check(ids.includes(match[1]), `Navigation target #${match[1]} is missing.`);
}
for (const name of ["name", "email", "campus", "website"]) {
  check(
    new RegExp(`<(?:input|select)\\b[^>]*\\bname=["']${name}["']`, "i").test(
      html,
    ),
    `Signup field ${name} is missing.`,
  );
}
check(
  /<input\b[^>]*type=["']email["']/i.test(html),
  "Email needs the native email input type.",
);
check(
  /<input\b[^>]*name=["']name["'][^>]*required/i.test(html) ||
    /<input\b[^>]*required[^>]*name=["']name["']/i.test(html),
  "Signup name must be required.",
);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function checkReference(reference, owner) {
  if (
    !reference ||
    /^(?:https?:|data:|blob:|mailto:|tel:|#|\/\/)/.test(reference)
  )
    return;
  const clean = reference.split(/[?#]/)[0];
  if (!clean || clean.startsWith("/api/")) return;
  let path;
  try {
    path = decodeURIComponent(clean);
  } catch {
    errors.push(`Invalid asset URL in ${owner}: ${clean}`);
    return;
  }
  const relative = path.startsWith("/") ? path.slice(1) : path;
  const candidates = path.startsWith("/")
    ? [resolve(root, "public", relative), resolve(root, relative)]
    : [
        resolve(dirname(resolve(root, owner)), relative),
        resolve(root, "public", relative),
      ];
  check(
    (await Promise.all(candidates.map(exists))).some(Boolean),
    `Missing local reference in ${owner}: ${clean}`,
  );
}

// Check shipped references, including responsive images and CSS backgrounds.
for (const match of html.matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/g)) {
  await checkReference(match[1], "index.html");
}
for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/g)) {
  for (const source of match[1].split(","))
    await checkReference(source.trim().split(/\s+/)[0], "index.html");
}
async function sourceFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await sourceFiles(path)));
    else if ([".css", ".js"].includes(extname(path))) output.push(path);
  }
  return output;
}
const source = resolve(root, "src");
check(await exists(source), "The frontend source directory is missing.");
if (await exists(source)) {
  for (const file of await sourceFiles(source)) {
    const content = await readFile(file, "utf8");
    const owner = file.slice(root.length + 1);
    if (file.endsWith(".css")) {
      for (const match of content.matchAll(
        /url\(\s*["']?([^"')\s]+)["']?\s*\)/g,
      ))
        await checkReference(match[1], owner);
    }
    if (file.endsWith(".js")) {
      for (const match of content.matchAll(
        /(?:from\s*|import\s*)["']([^"']+)["']/g,
      )) {
        if (match[1].startsWith(".")) await checkReference(match[1], owner);
      }
      for (const match of content.matchAll(
        /["'`](\/(?:images|assets|fonts)\/[^"'`\s]+)["'`]/g,
      )) {
        if (!match[1].includes("${")) await checkReference(match[1], owner);
      }
    }
  }
}
for (const file of ["server/beta.mjs", "scripts/serve.mjs", "vite.config.js"]) {
  check(
    await exists(resolve(root, file)),
    `Required runtime file ${file} is missing.`,
  );
}
assert.equal(
  errors.length,
  0,
  `Site checks failed:\n${errors.map((error) => `  - ${error}`).join("\n")}`,
);
console.log(
  "Site checks passed: semantic landmarks, navigation, signup fields, local assets, and runtime files.",
);

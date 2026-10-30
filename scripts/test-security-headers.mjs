import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { securityHeaders } from "./security-headers.mjs";

test("CSP hashes exactly the emitted inline scripts and blocks inline event handlers and frames", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fixtheweb-csp-"));
  try {
    await mkdir(path.join(directory, "den"));
    const script = 'console.log("an inline bootstrap");';
    await writeFile(path.join(directory, "index.html"), `<script type="module">${script}</script><script src="/app.js"></script>`);
    await writeFile(path.join(directory, "den", "index.html"), `<script>${script}</script>`);
    const headers = await securityHeaders(directory);
    const digest = createHash("sha256").update(script).digest("base64");
    assert.equal(headers.match(new RegExp(digest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")).length, 1);
    assert.match(headers, /script-src 'self' 'sha256-/);
    assert.doesNotMatch(headers.split("script-src ")[1].split(";")[0], /unsafe-inline|unsafe-eval/);
    for (const directive of ["script-src-attr 'none'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'"]) assert.ok(headers.includes(directive));
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /X-Frame-Options: DENY/);
    assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
  } finally {
    // Only remove the fresh directory created by this test, under the intended temp directory.
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("fixtheweb-csp-"));
    await rm(directory, { recursive: true });
  }
});

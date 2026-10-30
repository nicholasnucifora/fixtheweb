import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export async function securityHeaders(directory) {
  const hashes = new Set();
  async function scan(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (entry.name.endsWith(".html")) {
        const html = await readFile(file, "utf8");
        for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
          if (/\bsrc\s*=/i.test(attrs) || !body.trim()) continue;
          hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
        }
      }
    }
  }
  await scan(directory);
  // Runtime positioning and theme styles need inline CSS; scripts use exact build-generated hashes.
  const policy = [
    "default-src 'self'", `script-src 'self' ${[...hashes].sort().join(" ")}`.trim(),
    "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data:",
    "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'none'",
    "frame-ancestors 'none'", "form-action 'self'",
  ].join("; ");
  return `/*\n  Content-Security-Policy: ${policy}\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n  Strict-Transport-Security: max-age=31536000\n  Cross-Origin-Opener-Policy: same-origin\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL("../dist/", import.meta.url));
  await writeFile(path.join(directory, "_headers"), await securityHeaders(directory));
  process.stdout.write("Generated security headers and inline-script hashes.\n");
}

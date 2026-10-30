// Coupon validation and signing secrets live only in the Worker, outside the public site bundle.
const COOKIE = "__Host-den_access";
const LIFETIME = 365 * 24 * 60 * 60;
const encoder = new TextEncoder();
const normalize = (code) => code.trim().toUpperCase().replace(/[\s-]/g, "");
const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const hash = async (text) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
const configured = (env) => /^[a-f0-9]{64}$/.test(env.DEN_COUPON_SHA256 ?? "") && typeof env.DEN_SESSION_SECRET === "string" && env.DEN_SESSION_SECRET.length >= 32;
const keyFor = (env) => crypto.subtle.importKey("raw", encoder.encode(env.DEN_SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
const sign = async (key, text) => hex(await crypto.subtle.sign("HMAC", key, encoder.encode(text)));
const fromHex = (text) => Uint8Array.from(text.match(/../g) ?? [], (b) => Number.parseInt(b, 16));
const cookie = (value) => `${COOKIE}=${value}; Path=/; Max-Age=${LIFETIME}; Secure; HttpOnly; SameSite=Strict`;

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store, private",
    "CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "Vary": "Cookie, Origin",
    ...headers,
  } });
}

async function session(request, env) {
  if (!configured(env)) return null;
  const cookies = (request.headers.get("Cookie") ?? "").split(";").map((part) => part.trim());
  const matches = cookies.filter((part) => part.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(COOKIE.length + 1);
  if (!/^v1\.\d{10}\.\d{10}\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return null;
  const [version, issued, expires, couponTag, signature] = token.split(".");
  const now = Math.floor(Date.now() / 1000);
  if (+issued > now || +expires <= now || +expires - +issued !== LIFETIME) return null;
  const key = await keyFor(env);
  const valid = await crypto.subtle.verify("HMAC", key, fromHex(signature), encoder.encode(`${version}.${issued}.${expires}.${couponTag}`));
  if (!valid || couponTag !== await sign(key, `coupon:${env.DEN_COUPON_SHA256}`)) return null;
  return { expiresAt: +expires * 1000 };
}

// Read a bounded stream, including when Content-Length is absent or incorrect.
async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function access(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if ((origin && origin !== url.origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return json({ ok: false, why: "Open the coupon form on this site and try again." }, 403);
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    return json({ ok: false, why: "A secure connection is required." }, 400);
  }
  if (request.method === "GET") {
    const current = await session(request, env);
    return json({ unlocked: !!current, expiresAt: current?.expiresAt ?? 0 });
  }
  if (request.method !== "POST") return json({ ok: false, why: "Method not allowed." }, 405, { Allow: "GET, POST" });
  // JSON + exact Origin prevent cross-site forms from redeeming a coupon into another browser.
  if (origin !== url.origin) return json({ ok: false, why: "Open the coupon form on this site and try again." }, 403);
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ ok: false, why: "Send a JSON coupon request." }, 415);
  }
  if (!configured(env)) return json({ ok: false, why: "Coupons aren't available yet. Check back soon." }, 503);
  // Fail closed if the platform limiter is missing or unavailable. Never use per-process counters.
  if (!env.DEN_COUPON_RATE_LIMITER) return json({ ok: false, why: "Coupon checking is temporarily unavailable. Try again later." }, 503);
  const { success } = await env.DEN_COUPON_RATE_LIMITER.limit({ key: `den:${request.headers.get("CF-Connecting-IP") ?? "unknown"}` });
  if (!success) return json({ ok: false, why: "Too many attempts. Wait a minute and try again." }, 429, { "Retry-After": "60" });
  const body = await readBody(request);
  if (!body || typeof body.code !== "string" || body.code.length > 128) return json({ ok: false, why: "Enter a valid coupon code." }, 400);
  const code = normalize(body.code);
  if (!code) return json({ ok: false, why: "Enter your coupon code first." }, 400);
  const candidate = await hash(code);
  // Compare fixed-length digests without an early return on the first different character.
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= candidate.charCodeAt(i) ^ env.DEN_COUPON_SHA256.charCodeAt(i);
  if (difference !== 0) return json({ ok: false, why: "That coupon doesn't work. Check the code and try again." }, 400);
  const key = await keyFor(env);
  const now = Math.floor(Date.now() / 1000);
  const tag = await sign(key, `coupon:${env.DEN_COUPON_SHA256}`);
  const payload = `v1.${now}.${now + LIFETIME}.${tag}`;
  const token = `${payload}.${await sign(key, payload)}`;
  return json({ ok: true }, 200, { "Set-Cookie": cookie(token) });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/den/access") {
      try {
        return await access(request, env);
      } catch {
        // Never send coupon values, signing secrets or internal diagnostics to clients.
        return json({ ok: false, why: "Couldn't check your coupon. Please try again later." }, 503);
      }
    }
    if (path.startsWith("/api/")) return json({ ok: false, why: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};

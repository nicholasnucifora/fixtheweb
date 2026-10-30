import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";
import worker from "../worker/index.mjs";

const origin = "https://example.test";
const coupon = "WEBBYDEN";
const hash = createHash("sha256").update(coupon).digest("hex");
const secret = "test-only-random-signing-key-at-least-32-characters";
const defaults = { speed: 1, flies: "normal", predators: "normal", fights: true };
const plain = (value) => JSON.parse(JSON.stringify(value));
const envFor = (patch = {}) => ({ DEN_COUPON_SHA256: hash, DEN_SESSION_SECRET: secret, DEN_COUPON_RATE_LIMITER: { limit: async () => ({ success: true }) }, ...patch });
function request(method = "GET", body, headers = {}) {
  const allHeaders = new Headers({ ...(method === "POST" ? { Origin: origin, "Content-Type": "application/json" } : {}), ...headers });
  return new Request(`${origin}/api/den/access`, { method, headers: allHeaders, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
}
const redeem = (env, code = coupon) => worker.fetch(request("POST", { code }), env);
const cookieOf = (response) => response.headers.get("Set-Cookie")?.split(";")[0] ?? "";
const status = async (env, cookie = "") => (await worker.fetch(request("GET", undefined, { Cookie: cookie }), env)).json();

test("missing coupon, signing key or limiter never grants access", async () => {
  for (const patch of [{ DEN_COUPON_SHA256: "" }, { DEN_SESSION_SECRET: "short" }, { DEN_COUPON_RATE_LIMITER: undefined }]) {
    const env = envFor(patch);
    assert.equal((await status(env)).unlocked, false);
    const response = await redeem(env);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Set-Cookie"), null);
  }
});

test("valid coupon issues a signed Secure, HttpOnly, host-only, SameSite cookie", async () => {
  const env = envFor();
  const response = await redeem(env, " web-by den \n");
  assert.equal(response.status, 200);
  const header = response.headers.get("Set-Cookie");
  assert.match(header, /^__Host-den_access=/);
  for (const flag of ["Secure", "HttpOnly", "SameSite=Strict", "Path=/"]) assert.ok(header.includes(flag));
  assert.ok(!header.includes("Domain="));
  assert.ok(!header.includes(hash));
  assert.ok(!header.includes(coupon));
  const current = await status(env, cookieOf(response));
  assert.equal(current.unlocked, true);
  assert.ok(current.expiresAt > Date.now());
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("incorrect, empty, malformed and oversized coupons cannot set a cookie", async () => {
  for (const body of [{ code: "wrong" }, { code: " - " }, { code: "x".repeat(129) }, { code: 123 }, null, "{invalid", "x".repeat(2048)]) {
    const response = await worker.fetch(request("POST", body), envFor());
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Set-Cookie"), null);
  }
});

test("forged, edited, duplicate and malformed session cookies are rejected", async () => {
  const env = envFor();
  const valid = cookieOf(await redeem(env));
  const edited = valid.slice(0, -1) + (valid.endsWith("a") ? "b" : "a");
  for (const cookie of [`__Host-den_access=true`, `__Host-den_access=${hash}`, edited, `${valid}; ${valid}`, "__Host-den_access=v1.9999999999.9999999999.bad.bad"]) {
    assert.equal((await status(env, cookie)).unlocked, false);
  }
});

test("expiry, signing-key rotation and coupon rotation invalidate previous sessions", async (t) => {
  const env = envFor();
  const cookie = cookieOf(await redeem(env));
  assert.equal((await status(envFor({ DEN_SESSION_SECRET: secret + "rotated" }), cookie)).unlocked, false);
  assert.equal((await status(envFor({ DEN_COUPON_SHA256: "a".repeat(64) }), cookie)).unlocked, false);
  const now = Date.now();
  t.mock.method(Date, "now", () => now + 366 * 24 * 60 * 60 * 1000);
  assert.equal((await status(env, cookie)).unlocked, false);
});

test("cross-site, missing-origin and form requests cannot redeem coupons", async () => {
  for (const headers of [{ Origin: "https://attacker.test" }, { Origin: "null" }, { Origin: "" }, { "Sec-Fetch-Site": "cross-site" }]) {
    assert.equal((await worker.fetch(request("POST", { code: coupon }, headers), envFor())).status, 403);
  }
  const noOrigin = request("POST", { code: coupon });
  noOrigin.headers.delete("Origin");
  assert.equal((await worker.fetch(noOrigin, envFor())).status, 403);
  assert.equal((await worker.fetch(request("POST", "code=WEBBYDEN", { "Content-Type": "application/x-www-form-urlencoded" }), envFor())).status, 415);
  assert.equal((await worker.fetch(request("DELETE"), envFor())).status, 405);
});

test("rate limits and limiter errors fail closed without leaking diagnostics", async () => {
  let key;
  const limited = envFor({ DEN_COUPON_RATE_LIMITER: { limit: async (input) => { key = input.key; return { success: false }; } } });
  const response = await worker.fetch(request("POST", { code: coupon }, { "CF-Connecting-IP": "192.0.2.8" }), limited);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(key, "den:192.0.2.8");
  const error = await redeem(envFor({ DEN_COUPON_RATE_LIMITER: { limit() { throw new Error(secret); } } }));
  assert.equal(error.status, 503);
  assert.ok(!(await error.text()).includes(secret));
});

test("public assets still pass through and unknown API routes do not become assets", async () => {
  const env = envFor({ ASSETS: { fetch: async () => new Response("static page") } });
  assert.equal(await (await worker.fetch(new Request(`${origin}/den`), env)).text(), "static page");
  assert.equal((await worker.fetch(new Request(`${origin}/api/missing`), env)).status, 404);
});

const bundledClient = build({
  stdin: { contents: 'export * from "./src/scripts/den/access.ts"; export * from "./src/scripts/den/settings.ts"; export {parseLook} from "./src/scripts/spider-string/look.ts";', resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, format: "cjs", write: false, define: { "import.meta.env.DEV": "false" },
}).then((result) => result.outputFiles[0].text);

async function client({ env = envFor(), stored = new Map(), cookies = true, initialCookie = "", fetchOverride } = {}) {
  let cookie = initialCookie;
  const window = Object.assign(new EventTarget(), { setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1 });
  const document = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const fetch = fetchOverride ?? (async (_url, options = {}) => {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    const method = options.method ?? "GET";
    const response = await worker.fetch(request(method, options.body, { Cookie: cookie }), env);
    if (cookies && response.headers.has("Set-Cookie")) cookie = cookieOf(response);
    return response;
  });
  const localStorage = { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  const module = { exports: {} };
  vm.runInNewContext(await bundledClient, { module, exports: module.exports, document, window, localStorage, fetch, AbortSignal, CustomEvent, location: { search: "?unlock-all" } });
  return { ...module.exports, stored, env, document, cookie: () => cookie };
}

test("client ignores forged localStorage and production URL unlock shortcuts", async () => {
  const h = await client({ stored: new Map([["den:coupon", hash], ["spider:unlocks", "[]"]]) });
  assert.equal(await h.refreshDenAccess(), false);
  assert.equal(h.hasDenAccess(), false);
  assert.equal(h.stored.get("spider:unlocks"), "[]");
  h.change({ speed: 8 });
  assert.deepEqual(plain(h.settings), defaults);
});

test("client redemption, reload, settings restore and server revocation work together", async () => {
  const h = await client({ stored: new Map([["den:settings", JSON.stringify({ ...defaults, speed: 4 })]]) });
  assert.deepEqual(plain(h.settings), defaults);
  assert.equal((await h.redeemDenCoupon("web-by den")).ok, true);
  assert.equal(h.hasDenAccess(), true);
  assert.equal(h.settings.speed, 4);
  const reload = await client({ initialCookie: h.cookie(), stored: h.stored });
  assert.equal(await reload.refreshDenAccess(), true);
  assert.equal(reload.settings.speed, 4);
  h.env.DEN_SESSION_SECRET += "rotate";
  assert.equal(await h.refreshDenAccess(), false);
  assert.deepEqual(plain(h.settings), defaults);
});

test("missing API, network failures and blocked cookies never unlock the client", async () => {
  for (const fetchOverride of [async () => new Response("<html>not found</html>", { status: 404 }), async () => { throw new Error("Offline"); }]) {
    const h = await client({ fetchOverride });
    assert.equal(await h.refreshDenAccess(), false);
    assert.equal((await h.redeemDenCoupon(coupon)).ok, false);
  }
  const h = await client({ cookies: false });
  const result = await h.redeemDenCoupon(coupon);
  assert.equal(result.ok, false);
  assert.match(result.why, /cookies/);
  assert.equal(h.hasDenAccess(), false);
});

test("a delayed successful status cannot reopen access after a newer locked response", async () => {
  const pending = [];
  const h = await client({ fetchOverride: () => new Promise((resolve) => pending.push(resolve)) });
  const old = h.refreshDenAccess();
  const newer = h.refreshDenAccess();
  pending[1](Response.json({ unlocked: false, expiresAt: 0 }));
  await newer;
  pending[0](Response.json({ unlocked: true, expiresAt: Date.now() + 60_000 }));
  await old;
  assert.equal(h.hasDenAccess(), false);
});

test("prototype names and unsupported values in saved settings and looks are ignored", async () => {
  const h = await client({ stored: new Map([["den:settings", '{"speed":999,"flies":"__proto__","predators":"constructor","fights":"false"}']]) });
  await h.redeemDenCoupon(coupon);
  assert.deepEqual(plain(h.settings), defaults);
  h.change(JSON.parse('{"__proto__":{"polluted":true},"speed":999,"flies":"toString"}'));
  assert.deepEqual(plain(h.settings), defaults);
  assert.equal(h.settings.polluted, undefined);
  const look = h.parseLook('{"skin":"__proto__","pattern":"constructor","thread":"toString","tints":{"hat":"__proto__"}}');
  assert.equal(look.skin, "ink");
  assert.equal(look.pattern, "none");
  assert.equal(look.thread, "silk");
});

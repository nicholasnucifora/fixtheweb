/** Paid access comes only from the server's signed, HttpOnly cookie. Never trust localStorage. */
export const ACCESS_EVENT = "den:access";
const ENDPOINT = "/api/den/access";
let expiresAt = 0;
let revision = 0;
let started = false;
let expiryTimer = 0;
export const hasDenAccess = () => expiresAt > Date.now();
export type CouponResult = { ok: true; persisted: true } | { ok: false; why: string };

function update(until: number) {
  const previous = expiresAt;
  expiresAt = Number.isFinite(until) && until > Date.now() ? until : 0;
  window.clearTimeout(expiryTimer);
  if (expiresAt) expiryTimer = window.setTimeout(() => update(0), Math.min(expiresAt - Date.now(), 2_147_483_647));
  if (previous !== expiresAt) document.dispatchEvent(new CustomEvent(ACCESS_EVENT));
}

export async function refreshDenAccess(): Promise<boolean> {
  const current = ++revision;
  try {
    const response = await fetch(ENDPOINT, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    const data = response.ok && response.headers.get("Content-Type")?.includes("application/json") ? await response.json() : null;
    if (current === revision) update(data?.unlocked === true && typeof data.expiresAt === "number" ? data.expiresAt : 0);
  } catch {
    if (current === revision) update(0);
  }
  return hasDenAccess();
}

export async function redeemDenCoupon(typed: string): Promise<CouponResult> {
  if (!typed.trim().replace(/[\s-]/g, "")) return { ok: false, why: "Enter your coupon code first." };
  if (typed.length > 128) return { ok: false, why: "That coupon is too long. Check the code and try again." };
  ++revision; // A pre-redemption status response must not overwrite the newly verified session.
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: typed }),
      signal: AbortSignal.timeout(8000),
    });
    const data = response.headers.get("Content-Type")?.includes("application/json") ? await response.json() : null;
    if (!response.ok || data?.ok !== true) return { ok: false, why: typeof data?.why === "string" ? data.why : "Couldn't check your coupon. Please try again later." };
    // Confirm the browser accepted the cookie; there is no insecure local-storage fallback.
    if (!await refreshDenAccess()) return { ok: false, why: "Allow cookies for this site, then try your coupon again." };
    return { ok: true, persisted: true };
  } catch {
    return { ok: false, why: "Couldn't check your coupon. Please try again later." };
  }
}

export function startDenAccess() {
  if (!started) {
    started = true;
    window.addEventListener("focus", () => { void refreshDenAccess(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refreshDenAccess();
    });
    window.setInterval(() => { if (document.visibilityState === "visible") void refreshDenAccess(); }, 60_000);
  }
  return refreshDenAccess();
}

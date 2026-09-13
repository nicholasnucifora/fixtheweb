import { config } from "./config";

/**
 * A snack you can drag to the spider: a fly, or (from the Spider Den) a ladybird, a moth or a cookie.
 *
 * It's drawn on the same canvas as everything else, with an invisible element
 * riding along as the grab target (the same trick the spider uses). As it gets
 * near, the spider's mouth opens; let go close enough and it's eaten.
 */

export type Snack = "fly" | "ladybird" | "moth" | "cookie";

/** Where a snack turns up (viewport px), and which one. Without x/y it's config.feed's spot. */
export interface SpawnOptions {
  kind?: Snack;
  x?: number;
  y?: number;
}

export interface SpiderHere {
  /** The spider's mouth, in document px, and how big the spider is (b). */
  x: number;
  y: number;
  unit: number;
}

const dark = matchMedia("(prefers-color-scheme: dark)");

export function createFood(
  root: HTMLElement,
  spider: () => SpiderHere,
  onNear: (amount: number) => void,
  onEaten: (kind: Snack) => void,
) {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  // Presses here belong to the fly: the string and the pluck leave them alone.
  el.dataset.spiderIgnore = "";
  Object.assign(el.style, {
    position: "absolute",
    top: "0",
    left: "0",
    pointerEvents: "auto",
    touchAction: "none",
    cursor: "grab",
    borderRadius: "50%",
  });
  el.hidden = true;
  root.append(el);

  let out = false;
  let kind: Snack = "fly";
  let held = false;
  let pointerId: number | null = null;
  const at = { x: 0, y: 0 };
  const drift = { x: 0, y: 0 };
  const grabbed = { x: 0, y: 0 };
  let wing = 0;
  let wander = 0;

  const docPoint = (e: PointerEvent) => ({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY });

  el.addEventListener("pointerdown", (e) => {
    if (!out || e.button !== 0 || pointerId !== null) return;
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // window listeners still see the moves
    }
    pointerId = e.pointerId;
    held = true;
    const p = docPoint(e);
    grabbed.x = at.x - p.x;
    grabbed.y = at.y - p.y;
    document.documentElement.classList.add("spider-held");
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      if (!held || e.pointerId !== pointerId) return;
      const p = docPoint(e);
      at.x = p.x + grabbed.x;
      at.y = p.y + grabbed.y;
    },
    { passive: true },
  );

  const letGo = (e: PointerEvent) => {
    if (!held || e.pointerId !== pointerId) return;
    held = false;
    pointerId = null;
    document.documentElement.classList.remove("spider-held");
    const near = spider();
    if (Math.hypot(at.x - near.x, at.y - near.y) <= config.feed.eatDistance * near.unit) {
      out = false;
      el.hidden = true;
      onEaten(kind);
    }
  };
  window.addEventListener("pointerup", letGo);
  window.addEventListener("pointercancel", letGo);

  return {
    get out() {
      return out;
    },

    /** Puts a snack on screen, away from the spider so there's something to drag. */
    spawn(options: SpawnOptions = {}) {
      const page = document.documentElement;
      // innerWidth as the fallback: the page can still be laying out when this is called.
      const w = page.clientWidth || window.innerWidth;
      const h = page.clientHeight || window.innerHeight;
      out = true;
      held = false;
      kind = options.kind ?? "fly";
      at.x = window.scrollX + (options.x ?? w * config.feed.spawnX);
      at.y = window.scrollY + (options.y ?? h * config.feed.spawnY);
      drift.x = drift.y = 0;
      el.hidden = false;
    },

    clear() {
      out = false;
      held = false;
      el.hidden = true;
    },

    update(dt: number) {
      if (!out) {
        onNear(0);
        return;
      }
      const feed = config.feed;
      const near = spider();
      wing += dt * feed.wingSpeed * Math.PI * 2;

      if (!held) {
        // Left alone it mills about in the air.
        wander += dt;
        drift.x = Math.sin(wander * 1.7) * feed.flutter * near.unit;
        drift.y = Math.sin(wander * 2.3 + 1.1) * feed.flutter * near.unit * 0.7;
      }

      // The mouth opens as it comes close.
      const distance = Math.hypot(at.x + drift.x - near.x, at.y + drift.y - near.y) / near.unit;
      const span = Math.max(0.001, feed.openDistance - feed.eatDistance);
      onNear(Math.max(0, Math.min(1, (feed.openDistance - distance) / span)));

      const size = feed.flySize * near.unit;
      const grab = size * (1 + feed.grabArea);
      el.style.width = `${grab}px`;
      el.style.height = `${grab}px`;
      el.style.transform = `translate(${at.x + drift.x - window.scrollX}px, ${at.y + drift.y - window.scrollY}px) translate(-50%, -50%)`;
    },

    /** Drawn in document px, like the string and spider — and outlined the same way, so it shows on a dark page. */
    draw(ctx: CanvasRenderingContext2D, unit: number) {
      if (!out) return;
      drawSnack(ctx, kind, at.x + drift.x, at.y + drift.y, config.feed.flySize * unit, wing);
    },
  };
}

/**
 * A snack, centred on x, y at about `size` across. `wing` is the wing-beat phase (radians).
 * Outlined like the spider, so it shows on a dark page.
 */
export function drawSnack(ctx: CanvasRenderingContext2D, kind: Snack, x: number, y: number, size: number, wing = 0) {
  if (kind === "fly") drawFly(ctx, x, y, size, wing);
  else drawBug(ctx, kind, x, y, size, wing);
}

function drawFly(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, wing: number) {
  const c = config.colors;
  const flap = Math.sin(wing) * 0.5 + 0.6;
  const wings: [number, number, number, number, number][] = [-1, 1].map((side) => [
    side * size * 0.42,
    -size * 0.28,
    size * 0.42,
    size * 0.2 * flap,
    side * 0.5,
  ]);

  ctx.save();
  ctx.translate(x, y);
  const body = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.36, 0, 0, Math.PI * 2);
  };
  const wing2 = ([wx, wy, rx, ry, turn]: [number, number, number, number, number]) => {
    ctx.beginPath();
    ctx.ellipse(wx, wy, rx, Math.max(0.5, ry), turn, 0, Math.PI * 2);
  };

  // Same outline as the spider: a light edge so it reads against a dark page.
  if (c.outlineMode === "always" || (c.outlineMode === "dark" && dark.matches)) {
    ctx.fillStyle = ctx.strokeStyle = c.outline;
    ctx.lineWidth = c.outlineWidth * size * 4;
    for (const w of wings) {
      wing2(w);
      ctx.fill();
      ctx.stroke();
    }
    body();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = c.body;
  // Wings first, so the body sits over them.
  ctx.globalAlpha = 0.55;
  for (const w of wings) {
    wing2(w);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  body();
  ctx.fill();
  ctx.restore();
}

/** The Spider Den's other snacks. A moth flaps at a lazier fraction of the fly's wing beat. */
function drawBug(ctx: CanvasRenderingContext2D, kind: Exclude<Snack, "fly">, x: number, y: number, size: number, wing: number) {
  const c = config.colors;
  const s = size;
  const parts: { path: Path2D; color: string; alpha?: number }[] = [];
  const details: { path: Path2D; color: string; width: number }[] = [];
  const circle = (cx: number, cy: number, r: number) => {
    const p = new Path2D();
    p.arc(cx * s, cy * s, r * s, 0, Math.PI * 2);
    return p;
  };
  const line = (d: [number, number][]) => {
    const p = new Path2D();
    d.forEach(([px, py], i) => (i ? p.lineTo(px * s, py * s) : p.moveTo(px * s, py * s)));
    return p;
  };

  if (kind === "ladybird") {
    parts.push({ path: circle(0, -0.34, 0.22), color: c.body });
    parts.push({ path: circle(0, 0.04, 0.46), color: "#d9473f" });
    details.push({ path: line([[0, -0.4], [0, 0.5]]), color: c.body, width: 0.06 });
    for (const [sx, sy, r] of [[-0.22, -0.08, 0.09], [0.22, -0.08, 0.09], [-0.2, 0.22, 0.08], [0.2, 0.22, 0.08], [0, 0.38, 0.06]]) {
      details.push({ path: circle(sx, sy, r), color: c.body, width: 0 });
    }
  } else if (kind === "moth") {
    const flap = 0.55 + 0.45 * Math.abs(Math.sin(wing * 0.35));
    for (const side of [-1, 1]) {
      const p = new Path2D();
      p.ellipse(side * 0.36 * s, -0.08 * s, 0.4 * s * flap, 0.3 * s, side * 0.5, 0, Math.PI * 2);
      parts.push({ path: p, color: "#d8c7a2" });
      const low = new Path2D();
      low.ellipse(side * 0.26 * s, 0.22 * s, 0.24 * s * flap, 0.18 * s, -side * 0.4, 0, Math.PI * 2);
      parts.push({ path: low, color: "#c4ae84" });
    }
    const body = new Path2D();
    body.ellipse(0, 0.05 * s, 0.1 * s, 0.34 * s, 0, 0, Math.PI * 2);
    parts.push({ path: body, color: "#6f5a3e" });
    details.push({ path: line([[-0.03, -0.26], [-0.2, -0.55]]), color: "#6f5a3e", width: 0.04 });
    details.push({ path: line([[0.03, -0.26], [0.2, -0.55]]), color: "#6f5a3e", width: 0.04 });
  } else {
    // A cookie, obviously. No tracking, though.
    parts.push({ path: circle(0, 0, 0.56), color: "#c98f4f" });
    for (const [cx, cy, r] of [[-0.22, -0.2, 0.08], [0.18, -0.26, 0.06], [0.26, 0.1, 0.08], [-0.12, 0.2, 0.07], [0.02, -0.02, 0.05]]) {
      details.push({ path: circle(cx, cy, r), color: "#4a3326", width: 0 });
    }
  }

  ctx.save();
  ctx.translate(x, y);
  if (c.outlineMode === "always" || (c.outlineMode === "dark" && dark.matches)) {
    ctx.fillStyle = ctx.strokeStyle = c.outline;
    ctx.lineWidth = c.outlineWidth * size * 4;
    for (const { path } of parts) {
      ctx.fill(path);
      ctx.stroke(path);
    }
  }
  for (const { path, color, alpha } of parts) {
    ctx.globalAlpha = alpha ?? 1;
    ctx.fillStyle = color;
    ctx.fill(path);
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = "round";
  for (const { path, color, width } of details) {
    if (width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width * s;
      ctx.stroke(path);
    } else {
      ctx.fillStyle = color;
      ctx.fill(path);
    }
  }
  ctx.restore();
}

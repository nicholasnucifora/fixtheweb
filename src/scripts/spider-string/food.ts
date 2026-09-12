import { config } from "./config";

/**
 * A fly you can drag to the spider.
 *
 * It's drawn on the same canvas as everything else, with an invisible element
 * riding along as the grab target (the same trick the spider uses). As it gets
 * near, the spider's mouth opens; let go close enough and it's eaten.
 */

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
  onEaten: () => void,
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
      onEaten();
    }
  };
  window.addEventListener("pointerup", letGo);
  window.addEventListener("pointercancel", letGo);

  return {
    get out() {
      return out;
    },

    /** Puts a fly on screen, away from the spider so there's something to drag. */
    spawn() {
      const page = document.documentElement;
      // innerWidth as the fallback: the page can still be laying out when this is called.
      const w = page.clientWidth || window.innerWidth;
      const h = page.clientHeight || window.innerHeight;
      out = true;
      held = false;
      at.x = window.scrollX + w * config.feed.spawnX;
      at.y = window.scrollY + h * config.feed.spawnY;
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
      const feed = config.feed;
      const c = config.colors;
      const size = feed.flySize * unit;
      const flap = Math.sin(wing) * 0.5 + 0.6;
      const wings: [number, number, number, number, number][] = [-1, 1].map((side) => [
        side * size * 0.42,
        -size * 0.28,
        size * 0.42,
        size * 0.2 * flap,
        side * 0.5,
      ]);

      ctx.save();
      ctx.translate(at.x + drift.x, at.y + drift.y);
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
    },
  };
}

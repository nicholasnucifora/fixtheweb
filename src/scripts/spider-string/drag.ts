import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import { isIgnored } from "./ignore";
import type { Rope } from "./rope";

/**
 * Grab, drag and release: the spider by its element, or the string anywhere
 * along it (config.drag.grabString).
 *
 * Pointer events only record where the pointer is; `step` does the moving,
 * inside the physics loop, so the held point eases toward the pointer and
 * keeps its momentum when let go.
 *
 * Drag it within the string's reach and the string goes slack; drag beyond and
 * the string gives less and less, like a rubber band: it shudders as it winds
 * up, and flings the spider when you let go.
 *
 * While anything is held, text selection and native drag-and-drop are
 * blocked, otherwise the browser can start dragging selected page content
 * (the "no drop" cursor).
 */
export function createDrag(root: HTMLElement, bob: HTMLElement, rope: Rope) {
  const html = document.documentElement;
  let pointerId: number | null = null;
  /** Rope point being held. */
  let held: number | null = null;
  /** Point let go since the last step, so its fling can be capped. */
  let released: number | null = null;
  let overSpider = false;
  let overString = false;
  let unit = 0;
  /** How far past its natural reach the held point is pulled, as a fraction of the string's length. */
  let stretch = 0;
  /** 0–1 through the rubber band's give: drives the shudder, and the fling on release. */
  let tension = 0;
  let releasedTension = 0;
  const pointer = { x: 0, y: 0 };
  const offset = { x: 0, y: 0 };

  const tailIndex = () => rope.points.length - 1;
  const docPoint = (e: PointerEvent) => ({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY });

  /** Rope point to grab at (x, y), if the string is close enough there. */
  const stringAt = (x: number, y: number) => {
    if (!config.drag.grabString || !unit) return null;
    const hit = rope.nearest(x, y);
    return hit.distance <= config.drag.stringHitWidth * unit ? Math.max(1, hit.index) : null;
  };

  /** Mirrors hover/held state onto data attributes and page-wide cursor classes. */
  const refresh = () => {
    const spiderHeld = held === tailIndex();
    const stringHeld = held !== null && !spiderHeld;
    root.dataset.spider = spiderHeld ? "held" : overSpider && held === null ? "hover" : "idle";
    root.dataset.string = stringHeld ? "held" : overString && !overSpider && held === null ? "hover" : "idle";
    html.classList.toggle("spider-held", held !== null);
    html.classList.toggle("spider-string-hover", root.dataset.string === "hover");
  };

  const grab = (e: PointerEvent, index: number) => {
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Not capturable: window listeners still see the moves.
    }
    pointerId = e.pointerId;
    held = index;
    Object.assign(pointer, docPoint(e));
    // Hold it where it was grabbed rather than snapping it to the pointer.
    const p = rope.points[index];
    offset.x = p.x - pointer.x;
    offset.y = p.y - pointer.y;
    refresh();
    const part = index === tailIndex() ? "spider" : "string";
    root.dispatchEvent(new CustomEvent("spider:grab", { bubbles: true, detail: { part } }));
  };

  const release = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    released = held;
    releasedTension = tension;
    pointerId = null;
    held = null;
    // The pointer may have ended up away from the string; don't leave the grab cursor behind.
    overString = stringAt(pointer.x, pointer.y) !== null;
    refresh();
    root.dispatchEvent(new CustomEvent("spider:release", { bubbles: true, detail: { tension: releasedTension } }));
  };

  // Capture phase, so the press is claimed before the page acts on it.
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || pointerId !== null) return;
      if (bob.contains(e.target as Node)) {
        grab(e, tailIndex());
        return;
      }
      if (isIgnored(e.target)) return;
      const p = docPoint(e);
      const index = stringAt(p.x, p.y);
      if (index !== null) grab(e, index);
    },
    { capture: true },
  );

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId === pointerId) {
        Object.assign(pointer, docPoint(e));
        return;
      }
      if (pointerId !== null) return;
      const p = docPoint(e);
      const near = !isIgnored(e.target) && stringAt(p.x, p.y) !== null;
      if (near !== overString) {
        overString = near;
        refresh();
      }
    },
    { passive: true },
  );

  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("lostpointercapture", release);

  const blockWhileHeld = (e: Event) => {
    if (pointerId !== null) e.preventDefault();
  };
  document.addEventListener("selectstart", blockWhileHeld);
  document.addEventListener("dragstart", blockWhileHeld);

  bob.addEventListener("pointerenter", () => {
    overSpider = true;
    refresh();
  });
  bob.addEventListener("pointerleave", () => {
    overSpider = false;
    refresh();
  });
  refresh();

  /** Where held point `index` wants to be for the pointer's position, px. Also sets `stretch` and `tension`. */
  const target = (a: AnchorFrame, index: number) => {
    const pull = config.pull;
    // How far this point can get from the anchor with the string at its natural length.
    const span = (rope.length * index) / tailIndex();
    const reach = span * config.drag.reach;
    const give = pull.stretch * span;
    const x = pointer.x + offset.x - a.x;
    const y = pointer.y + offset.y - a.y;

    // Past its reach the string keeps giving, but less and less: a rubber band that never breaks.
    const beyond = (excess: number) =>
      give > 0 && excess > 0 ? give * (1 - Math.exp(-excess / Math.max(1e-6, pull.softness * span))) : 0;

    let point: { x: number; y: number };
    let extra = 0;
    if (config.drag.axis === "x") {
      const limit = reach * Math.sin((config.drag.maxAngle * Math.PI) / 180);
      const dx = Math.max(-limit, Math.min(limit, x));
      extra = beyond(Math.abs(x) - limit);
      const scale = reach > 0 ? (reach + extra) / reach : 1;
      point = { x: a.x + dx * scale, y: a.y + Math.sqrt(Math.max(0, reach * reach - dx * dx)) * scale };
    } else {
      const d = Math.hypot(x, y) || 1;
      extra = beyond(d - reach);
      // Within its reach it simply follows the pointer, and the string goes slack.
      const scale = d > reach ? (reach + extra) / d : 1;
      point = { x: a.x + x * scale, y: a.y + y * scale };
    }

    // Held against an edge it stays on screen, but the pull still winds up: like stretching against a wall.
    const onScreen = (q: { x: number; y: number }) => {
      const page = document.documentElement;
      const w = page.clientWidth || 0;
      const h = page.clientHeight || 0;
      if (!config.edges.enabled || w <= 0 || h <= 0) return q;
      const r = config.edges.spiderSize * config.look.width * a.unit;
      return {
        x: Math.min(Math.max(q.x, window.scrollX + r), window.scrollX + w - r),
        y: Math.min(Math.max(q.y, window.scrollY + r), window.scrollY + h - r),
      };
    };
    point = onScreen(point);

    tension = give > 0 ? extra / give : 0;
    const out = Math.hypot(point.x - a.x, point.y - a.y);
    stretch = span > 0 ? Math.max(0, (out - span) / span) : 0;

    // Wound up tight, the string shudders: it wants to snap back.
    if (pull.shake > 0 && tension > pull.shakeStart) {
      const over = (tension - pull.shakeStart) / Math.max(1e-6, 1 - pull.shakeStart);
      const t = performance.now() / 1000;
      const wobble =
        0.7 * Math.sin(t * pull.shakeSpeed * Math.PI * 2) +
        0.3 * Math.sin(t * pull.shakeSpeed * 3.1 * Math.PI * 2 + 1.3);
      const amount = over * pull.shake * a.unit * wobble;
      const len = out || 1;
      point = { x: point.x - ((point.y - a.y) / len) * amount, y: point.y + ((point.x - a.x) / len) * amount };
    }

    return onScreen(point);
  };

  return {
    /** Index of the rope point being held, or null. */
    get held() {
      return held;
    },

    /** How far past its length the string is being pulled, so the rope can be let out to match. */
    get stretch() {
      return stretch;
    },

    /** 0–1 through the rubber band's give, for anything that wants to react to the wind-up. */
    get tension() {
      return tension;
    },

    /** Runs once per physics step, after masses are set and before the rope integrates. */
    step(a: AnchorFrame, dt: number) {
      unit = a.unit;

      if (released !== null) {
        const p = rope.points[released];
        const wound = releasedTension;
        released = null;
        releasedTension = 0;
        if (p) {
          // Keep the fling, within reason.
          const max = config.drag.maxThrow * a.unit * dt;
          const vx = p.x - p.px;
          const vy = p.y - p.py;
          const v = Math.hypot(vx, vy);
          if (v > max) {
            p.px = p.x - (vx / v) * max;
            p.py = p.y - (vy / v) * max;
          }
          // A wound-up string snaps back: an extra kick toward the anchor, the tighter it was wound.
          if (wound > 0 && config.pull.fling > 0) {
            const dx = a.x - p.x;
            const dy = a.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            const kick = config.pull.fling * a.unit * wound * dt;
            p.px -= (dx / d) * kick;
            p.py -= (dy / d) * kick;
          }
        }
      }

      if (held === null) {
        stretch = 0;
        tension = 0;
        return;
      }
      const p = rope.points[held];
      if (!p) return;
      p.w = 0;
      const t = target(a, held);
      const k = 1 - Math.exp(-config.drag.follow * dt);
      p.px = p.x;
      p.py = p.y;
      p.x += (t.x - p.x) * k;
      p.y += (t.y - p.y) * k;
    },
  };
}

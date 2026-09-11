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
    pointerId = null;
    held = null;
    // The pointer may have ended up away from the string; don't leave the grab cursor behind.
    overString = stringAt(pointer.x, pointer.y) !== null;
    refresh();
    root.dispatchEvent(new CustomEvent("spider:release", { bubbles: true }));
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

  /** Where held point `index` wants to be for the current pointer position, px. */
  const target = (a: AnchorFrame, index: number) => {
    const reach = ((rope.length * index) / tailIndex()) * config.drag.reach;
    const x = pointer.x + offset.x - a.x;
    const y = pointer.y + offset.y - a.y;

    if (config.drag.axis === "x") {
      const limit = reach * Math.sin((config.drag.maxAngle * Math.PI) / 180);
      const dx = Math.max(-limit, Math.min(limit, x));
      return { x: a.x + dx, y: a.y + Math.sqrt(reach * reach - dx * dx) };
    }

    const d = Math.hypot(x, y);
    const k = d > reach ? reach / d : 1;
    return { x: a.x + x * k, y: a.y + y * k };
  };

  return {
    /** Index of the rope point being held, or null. */
    get held() {
      return held;
    },

    /** Runs once per physics step, after masses are set and before the rope integrates. */
    step(a: AnchorFrame, dt: number) {
      unit = a.unit;

      if (released !== null) {
        const p = rope.points[released];
        released = null;
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
        }
      }

      if (held === null) return;
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

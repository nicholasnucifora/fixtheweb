import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import { isIgnored } from "./ignore";
import type { Particles } from "./particles";
import type { Rope } from "./rope";

/** Swipe speed (b/s) that counts as a "normal" pluck when swipe speed influence is on. */
const TYPICAL_SWIPE = 6;

/**
 * Brushing the pointer across the string plucks it: a small kick where it was
 * crossed and a burst of dashes flicking off it.
 *
 * Crossings are found by testing the pointer's path since last frame against
 * the string, so fast swipes still register.
 */
export function createPluck(root: HTMLElement, rope: Rope, particles: Particles) {
  let current: { x: number; y: number } | null = null;
  let previous: { x: number; y: number } | null = null;
  /** Per link: time (s) it can next pluck. */
  const readyAt: number[] = [];

  window.addEventListener(
    "pointermove",
    (e) => (current = isIgnored(e.target) ? null : { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY }),
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => (current = previous = null));

  /** `strength` scales launch speed (1 = normal). */
  const burst = (x: number, y: number, nx: number, ny: number, unit: number, strength: number) => {
    const c = config.particles;
    for (let i = 0; i < c.count; i++) {
      const side = c.sides === "both" && i % 2 === 1 ? -1 : 1;
      const angle = Math.atan2(ny * side, nx * side) + ((Math.random() * 2 - 1) * c.spread * Math.PI) / 180;
      const speed = (c.speedMin + Math.random() * (c.speedMax - c.speedMin)) * unit * strength;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      particles.spawn({
        x: x + dirX * c.gap * unit,
        y: y + dirY * c.gap * unit,
        vx: dirX * speed,
        vy: dirY * speed,
        length: c.length * unit,
        width: Math.max(1, c.thickness * unit),
        life: c.life,
        drag: c.drag,
        gravity: c.gravity * unit,
        shrink: c.shrink,
      });
    }
  };

  return {
    /**
     * Once per frame. `now` and `dt` (time since last frame) are real seconds.
     * Pass `enabled: false` while something is held.
     */
    update(a: AnchorFrame, now: number, dt: number, enabled: boolean) {
      const from = previous;
      previous = current;
      if (!enabled || !config.pluck.enabled || !from || !current || dt <= 0) return;

      const speed = Math.hypot(current.x - from.x, current.y - from.y) / dt / a.unit;
      if (speed < config.pluck.minSpeed) return;

      const hit = rope.intersect(from.x, from.y, current.x, current.y);
      if (!hit || now < (readyAt[hit.index] ?? 0)) return;
      readyAt[hit.index] = now + config.pluck.cooldown;

      // Normal to the string, facing the way the pointer was moving.
      const p = rope.points[hit.index];
      const q = rope.points[hit.index + 1];
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      let nx = -(q.y - p.y) / len;
      let ny = (q.x - p.x) / len;
      if (nx * (current.x - from.x) + ny * (current.y - from.y) < 0) {
        nx = -nx;
        ny = -ny;
      }

      const swipe = Math.min(Math.max(speed / TYPICAL_SWIPE, 0.25), 3);
      const strength = 1 + (swipe - 1) * config.pluck.speedInfluence;

      const r = config.pluck.radius;
      const kick = config.pluck.impulse * a.unit * strength;
      for (let k = -r; k <= r; k++) {
        const falloff = 1 - Math.abs(k) / (r + 1);
        rope.addVelocity(hit.index + k, nx * kick * falloff, ny * kick * falloff, 1 / config.sim.rate);
      }

      burst(hit.x, hit.y, nx, ny, a.unit, strength);
      root.dispatchEvent(new CustomEvent("spider:pluck", { bubbles: true, detail: { x: hit.x, y: hit.y } }));
    },
  };
}

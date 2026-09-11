import { createAnchor } from "./anchor";
import { config } from "./config";
import { createDrag } from "./drag";
import { Particles } from "./particles";
import { createPluck } from "./pluck";
import { createRenderer } from "./render";
import { Rope } from "./rope";
import { createSpider } from "./spider";

/** Mounts every `[data-spider-string]` rig on the page, plus the tuning panel with ?tune. */
export function mountAll() {
  document.querySelectorAll<HTMLElement>("[data-spider-string]").forEach(mount);
  if (new URLSearchParams(location.search).has("tune")) {
    import("./tune").then((m) => m.mountTuner());
  }
}

function mount(root: HTMLElement) {
  const glyph = document.querySelector(root.dataset.anchor ?? "");
  const canvas = root.querySelector("canvas");
  const bob = root.querySelector<HTMLElement>("[data-bob]");
  if (!(glyph instanceof SVGGraphicsElement) || !canvas || !bob) {
    console.warn("[spider-string] anchor glyph, canvas or bob missing", root.dataset.anchor);
    return;
  }

  const anchor = createAnchor(glyph);
  const rope = new Rope(config.rope.segments);
  const particles = new Particles();
  const drag = createDrag(root, bob, rope);
  const pluck = createPluck(root, rope, particles);
  const renderer = createRenderer(root, canvas);
  const spider = createSpider(bob, rope);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  let placed = false;
  let time = 0;
  let pending = 0;
  let last = performance.now();

  // Gentle, travelling gusts: two out-of-step waves running down the string.
  const breeze = (i: number, strength: number) => {
    const s = (i / (rope.points.length - 1)) * config.sway.ripple;
    const t = time * config.sway.speed * Math.PI * 2;
    return strength * (0.65 * Math.sin(t + s * 2.2) + 0.35 * Math.sin(t * 2.3 + s * 5 + 1.3));
  };

  const tick = (now: number) => {
    // rAF timestamps can land slightly before `last`, hence the clamp at 0.
    const real = Math.max(0, Math.min((now - last) / 1000, config.sim.maxFrame));
    last = now;

    const a = anchor.measure();
    if (a) {
      if (drag.held === null && config.rope.segments !== rope.points.length - 1) {
        rope.setSegments(config.rope.segments);
      }
      const length = config.rope.length * a.unit;
      if (Math.abs(length - rope.length) > 0.01) rope.setLength(length);
      if (!placed) {
        rope.reset(a.x, a.y);
        placed = true;
      }

      // Big jumps (first layout, a resize) carry the string along instead of flinging it.
      const jx = a.x - rope.head.x;
      const jy = a.y - rope.head.y;
      if (Math.hypot(jx, jy) > config.anchor.snapDistance * a.unit) rope.translate(jx, jy);

      const dt = real * config.sim.timeScale;
      const step = 1 / config.sim.rate;
      const gravity = config.rope.gravity * a.unit;
      const sway = reducedMotion.matches ? 0 : config.sway.strength * a.unit;
      let steps = 0;
      for (pending += dt; pending >= step; pending -= step, steps++) {
        time += step;
        rope.setMass(config.rope.mass);
        rope.head.x = rope.head.px = a.x;
        rope.head.y = rope.head.py = a.y;
        drag.step(a, step);
        rope.integrate(step, gravity, config.rope.drag, config.bob.drag, (i) => breeze(i, sway));
        rope.solve(config.rope.iterations, config.rope.stiffness, config.rope.maxStretch);
      }

      // Draw part-way between the last two physics steps, so motion is even at any refresh rate.
      const alpha = pending / step;
      particles.update(dt);
      renderer.draw(rope, particles, a, alpha);
      spider.update(a, dt, steps * step, alpha);
      // After drawing: a pluck nudges the string's step history, which would skew this frame's blend.
      pluck.update(a, now / 1000, real, drag.held === null);
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

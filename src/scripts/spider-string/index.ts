import { createAnchor } from "./anchor";
import { createAnimations } from "./animation";
import { config } from "./config";
import { createDrag } from "./drag";
import { createFood } from "./food";
import { createMood } from "./mood";
import { Particles } from "./particles";
import { createPluck } from "./pluck";
import { createRenderer } from "./render";
import { Rope } from "./rope";
import { createSpeedLines } from "./speedlines";
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
  const animations = createAnimations(rope, () => drag.held !== null);
  // What it feels about what you're doing, and so the face it pulls (Faces tab).
  const mood = createMood(
    root,
    rope,
    () => drag.held !== null,
    () => drag.held === rope.points.length - 1,
  );
  const spider = createSpider(bob, rope, animations.state, mood.face);
  // Air streaks behind it when it's moving fast; drawn behind the spider, so their own particles.
  const wind = new Particles();
  const speedLines = createSpeedLines(wind);
  let foodNear = 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // Food: dragged to the spider's mouth, which needs to know where that is and how big it is.
  let unit = 0;
  const food = createFood(
    root,
    () => {
      const [x, y] = spider.mouth();
      return { x, y, unit };
    },
    (amount) => {
      animations.mouthOpen(amount);
      foodNear = amount;
    },
    () => {
      animations.eat();
      mood.ate();
    },
  );
  document.addEventListener("spider:play", (e) => {
    if ((e as CustomEvent).detail?.id === "feed") food.spawn();
  });
  document.addEventListener("spider:reset", () => food.clear());

  let placed = false;
  let behind: boolean | null = null;
  /** How far the rope is currently let out past its length: follows the pull, eases back after a release. */
  let letOut = 0;
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
      unit = a.unit;
      if (config.rope.behind !== behind) {
        behind = config.rope.behind;
        root.toggleAttribute("data-behind", behind);
      }
      if (drag.held === null && config.rope.segments !== rope.points.length - 1) {
        rope.setSegments(config.rope.segments);
      }
      // Animations can be paying the thread out, so they get a say in how long the string is.
      const tail = rope.tail;
      const sideways = (Math.abs(tail.x - tail.px) * config.sim.rate) / a.unit;
      animations.update(a, real * config.sim.timeScale, sideways);
      // Asleep, it hangs a little lower (Faces → Asleep).
      const length = config.rope.length * a.unit * animations.state.lengthFactor * (1 + mood.face.sag);
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
        // Let the rope out as far as it's being pulled, so a wound-up string stretches evenly, and
        // reel it back in over a moment when released instead of snapping it back in one step.
        const want = drag.held === null ? config.rope.maxStretch : Math.max(config.rope.maxStretch, drag.stretch);
        letOut = want >= letOut ? want : want + (letOut - want) * Math.exp(-step / Math.max(0.001, config.pull.snapBack));
        rope.solve(
          config.rope.iterations,
          config.rope.stiffness,
          letOut,
          config.rope.compression,
          step,
          config.rope.springBack,
          config.rope.springDamping,
        );
        if (config.edges.enabled) {
          const page = document.documentElement;
          rope.contain(
            window.scrollX,
            window.scrollY,
            window.scrollX + page.clientWidth,
            window.scrollY + page.clientHeight,
            config.edges.bounce,
            config.edges.friction,
            config.edges.spiderSize * config.look.width * animations.state.size * a.unit,
          );
        }
      }

      // Draw part-way between the last two physics steps, so motion is even at any refresh rate.
      const alpha = pending / step;
      particles.update(dt);
      const velocity: [number, number] = [
        ((tail.x - tail.px) * config.sim.rate) / a.unit,
        ((tail.y - tail.py) * config.sim.rate) / a.unit,
      ];
      mood.update(dt, {
        unit: a.unit,
        anchor: [a.x, a.y],
        center: spider.center(),
        radius: spider.radius(),
        foodNear: food.out ? foodNear : 0,
        busy: animations.busy,
      });
      spider.update(a, dt, steps * step, alpha, renderer.pixelRatio);
      speedLines.update(dt, spider.center(), velocity, a.unit, spider.radius());
      wind.update(dt);
      food.update(dt);
      renderer.draw(
        rope,
        particles,
        a,
        alpha,
        (ctx) => {
          wind.draw(ctx);
          spider.draw(ctx);
          food.draw(ctx, a.unit);
        },
        spider.stringShift(),
      );
      // After drawing: a pluck nudges the string's step history, which would skew this frame's blend.
      pluck.update(a, now / 1000, real, drag.held === null);
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

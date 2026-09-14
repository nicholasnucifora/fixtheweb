import { config } from "../spider-string/config";
import { den } from "./config";
import type { Critter } from "./critter";
import type { Vec, Web } from "./web";

/**
 * Predators that come into the Spider Den hunting spiders: a bird that flies in, circles over its
 * prey and swoops, and a frog that hops up onto something low and shoots its tongue out. (The third,
 * the pirate spider, is a spider: see critter.ts.)
 *
 * They pick on the small, slow and old. Once one commits (the bird swoops, the frog takes aim), its
 * target gets a chance to get away, and spiders nearby panic (world.ts does that, from `hunting`).
 * Grab the spider it's after and it misses. Press a predator and it may be shooed off.
 */

export type HunterKind = "bird" | "frog";

export interface HuntWorld {
  web: Web;
  unit: number;
  critters: Critter[];
  /** The best spider for a hunter at (x, y) to go after within `range` px, or null. */
  choose(x: number, y: number, range: number): Critter | null;
  /** A hunter's committed to going for `target` from (x, y): it (and anyone near) reacts. */
  threaten(target: Critter, x: number, y: number): void;
  /** It's caught `target`, which it now carries at `hold()` (den px). */
  caught(target: Critter, kind: HunterKind, hold: () => Vec): void;
}

export interface Hunter {
  kind: HunterKind;
  x: number;
  y: number;
  /** Going for someone right now: spiders near it panic. */
  readonly hunting: boolean;
  readonly done: boolean;
  /** The spider it's got hold of, if any. */
  readonly holding: Critter | null;
  target: Critter | null;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, colors: { ink: string; surface: string; outline: boolean }): void;
  /** Is (x, y) on it? */
  hit(x: number, y: number): boolean;
  /** Pressed: it may leave. True if it does. */
  shoo(): boolean;
}

const between = (a: number, b: number) => a + Math.random() * (b - a);
const catchable = (c: Critter | null) => !!c && !c.held && (c.mode === "web" || c.mode === "dangle" || c.mode === "air");

// ── The bird ─────────────────────────────────────────────────────────────────

export function createBird(world: HuntWorld): Hunter {
  const { web } = world;
  const u = () => world.unit;
  const size = () => den.bird.size * u();
  const fromLeft = Math.random() < 0.5;
  let x = fromLeft ? -size() * 2 : web.width + size() * 2;
  let y = between(0.05, 0.3) * web.height;
  let vx = 0;
  let vy = 0;
  let state: "in" | "circle" | "dive" | "climb" | "out" | "away" = "in";
  let t = 0;
  let flap = 0;
  let tries = 0;
  let target: Critter | null = null;
  let carrying: Critter | null = null;
  let angle = 0;
  let facing = fromLeft ? 1 : -1;

  const pickTarget = () => {
    target = world.choose(web.width / 2, web.height / 2, Math.max(web.width, web.height));
    return target;
  };
  /** Where it circles, over a spider at `ty`: above it, but never off the top. */
  const above = (ty: number) => Math.max(size() * 0.7, ty - size() * 1.8);
  pickTarget();

  const steer = (tx: number, ty: number, speed: number, turn: number, dt: number) => {
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy) || 1;
    const want: Vec = [(dx / d) * speed, (dy / d) * speed];
    const k = 1 - Math.exp(-turn * dt);
    vx += (want[0] - vx) * k;
    vy += (want[1] - vy) * k;
    x += vx * dt;
    y += vy * dt;
    return d;
  };

  const me: Hunter = {
    kind: "bird",
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get hunting() {
      return state === "circle" || state === "dive";
    },
    get done() {
      return state === "out" || state === "away" ? x < -size() * 3 || x > web.width + size() * 3 || y < -size() * 3 : false;
    },
    get holding() {
      return carrying;
    },
    get target() {
      return target;
    },
    set target(c) {
      target = c;
    },

    update(dt) {
      t += dt;
      const speed = den.bird.speed * u();
      flap += dt * (state === "dive" ? 4 : state === "circle" ? 7 : 9);
      if (vx) facing = vx > 0 ? 1 : -1;
      if (state === "in") {
        if (!target || target.mode === "ghost" || !target.alive) pickTarget();
        if (!target) {
          state = "out";
          return;
        }
        const [tx, ty] = target.center();
        if (steer(tx, above(ty), speed, 2.5, dt) < size()) {
          state = "circle";
          t = 0;
          angle = Math.atan2(y - above(ty), x - tx);
        }
      } else if (state === "circle") {
        if (!target || !target.alive) {
          state = pickTarget() ? "in" : "out";
          return;
        }
        const [tx, ty] = target.center();
        angle += dt * 2.2;
        const r = size() * 1.4;
        steer(tx + Math.cos(angle) * r * 1.4, above(ty) + Math.sin(angle) * r * 0.5, speed, 5, dt);
        if (t > den.bird.circle) {
          state = "dive";
          t = 0;
          world.threaten(target, x, y);
        }
      } else if (state === "dive") {
        if (!target) {
          state = "climb";
          return;
        }
        const [tx, ty] = target.center();
        // It homes in, but it can only turn so fast: something that jumps away gets away.
        const d = steer(tx, ty, den.bird.dive * u(), 3.2, dt);
        if (d < size() * 0.45) {
          if (catchable(target) && target.alive) {
            carrying = target;
            state = "away";
            world.caught(target, "bird", () => [x, y + size() * 0.45]);
          } else {
            state = "climb";
            t = 0;
          }
        } else if (t > 2.4) {
          state = "climb";
          t = 0;
        }
      } else if (state === "climb") {
        steer(x + facing * size() * 4, -size() * 0.5, speed, 2, dt);
        if (t > 1.1) {
          tries++;
          if (tries >= den.bird.tries || !pickTarget()) state = "out";
          else {
            state = "circle";
            t = 0;
          }
        }
      } else {
        // Out of here, up and away (with its catch).
        steer(x + facing * size() * 6, -size() * 6, speed * 1.2, 1.5, dt);
      }
    },

    draw(ctx, colors) {
      const s = size();
      const diving = state === "dive";
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(facing, 1);
      ctx.rotate(Math.atan2(vy, Math.abs(vx) || 1) * (diving ? 0.9 : 0.35));
      const wing = diving ? -0.9 : Math.sin(flap) * 0.9;
      const shapes: [Path2D, string][] = [];
      const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
        const p = new Path2D();
        p.ellipse(cx * s, cy * s, rx * s, ry * s, rot, 0, Math.PI * 2);
        return p;
      };
      const poly = (pts: Vec[]) => {
        const p = new Path2D();
        pts.forEach(([px, py], i) => (i ? p.lineTo(px * s, py * s) : p.moveTo(px * s, py * s)));
        p.closePath();
        return p;
      };
      const brown = "#8c6a54";
      const dark = "#5e4436";
      const cream = "#f1e6d2";
      shapes.push([poly([[-0.42, -0.02], [-0.75, -0.14], [-0.72, 0.08]]), dark]);
      shapes.push([ell(0, 0, 0.44, 0.27), brown]);
      shapes.push([ell(0.08, 0.1, 0.3, 0.15), cream]);
      shapes.push([ell(0.36, -0.14, 0.2, 0.19), brown]);
      shapes.push([poly([[0.52, -0.16], [0.7, -0.1], [0.52, -0.05]]), "#e8a33c"]);
      const wingPath = new Path2D();
      wingPath.ellipse(-0.05 * s, -0.08 * s, 0.34 * s, 0.13 * s, wing, 0, Math.PI * 2);
      if (colors.outline) {
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.strokeStyle = colors.surface;
        ctx.lineJoin = "round";
        for (const [p] of shapes) ctx.stroke(p);
        ctx.stroke(wingPath);
      }
      for (const [p, fill] of shapes) {
        ctx.fillStyle = fill;
        ctx.fill(p);
      }
      ctx.fillStyle = dark;
      ctx.fill(wingPath);
      ctx.fillStyle = "#1b1e29";
      ctx.beginPath();
      ctx.arc(0.42 * s, -0.17 * s, 0.035 * s, 0, Math.PI * 2);
      ctx.fill();
      // Feet out, reaching, when it swoops.
      if (diving || carrying) {
        ctx.strokeStyle = "#e8a33c";
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(0.05 * s, 0.24 * s);
        ctx.lineTo(0.1 * s, 0.45 * s);
        ctx.moveTo(-0.05 * s, 0.24 * s);
        ctx.lineTo(-0.02 * s, 0.45 * s);
        ctx.stroke();
      }
      ctx.restore();
    },

    hit(px, py) {
      return Math.hypot(px - x, py - y) < size() * 0.6;
    },

    shoo() {
      if (state === "away" || state === "out" || Math.random() > den.predators.shoo) return false;
      state = "out";
      vy = -den.bird.speed * u();
      return true;
    },
  };
  return me;
}

// ── The frog ─────────────────────────────────────────────────────────────────

export function createFrog(world: HuntWorld): Hunter {
  const { web } = world;
  const u = () => world.unit;
  const size = () => den.frog.size * u();
  // A perch: somewhere solid (the scenery, or the ground) within reach of a spider, if there is one.
  const perchNear = (): Vec | null => {
    const prey = world.choose(web.width / 2, web.height / 2, Infinity);
    if (!prey) return null;
    const [cx, cy] = prey.center();
    const reach = den.frog.tongue * u() * 0.85;
    const node = web.nodeNear(cx, cy, size() * 0.5, reach, (n) => web.isPinned(n) && web.y(n) > cy - reach * 0.3, true);
    if (node >= 0) return [web.x(node), web.y(node)];
    if (web.height - cy < reach) return [Math.max(size(), Math.min(web.width - size(), cx + between(-0.5, 0.5) * reach)), web.height - size() * 0.1];
    return null;
  };
  const anyPerch = (): Vec => {
    const node = web.nodeNear(between(0.15, 0.85) * web.width, web.height * 0.88, 0, web.height * 0.55, (n) => web.isPinned(n) && web.y(n) > web.height * 0.5, true);
    return node >= 0 ? [web.x(node), web.y(node)] : [between(0.2, 0.8) * web.width, web.height - size() * 0.1];
  };
  let perch: Vec = perchNear() ?? anyPerch();
  const start: Vec = [perch[0] + (Math.random() < 0.5 ? -1 : 1) * size() * 3, web.height + size()];
  let from: Vec = start;
  let x = start[0];
  let y = start[1];
  let state: "in" | "wait" | "hop" | "aim" | "strike" | "gulp" | "out" = "in";
  let t = 0;
  let stayed = 0;
  let tries = 0;
  let hops = 0;
  let target: Critter | null = null;
  let carrying: Critter | null = null;
  let aimAt: Vec = [0, 0];
  let tongue = 0;
  /** Whether this strike has checked for a catch yet. */
  let struck = false;
  let facing = 1;
  let look: Vec = [0, -1];
  const mouth = (): Vec => [x + facing * size() * 0.32, y - size() * 0.42];

  const me: Hunter = {
    kind: "frog",
    get x() {
      return x;
    },
    get y() {
      return y - size() * 0.4;
    },
    get hunting() {
      return state === "aim" || state === "strike";
    },
    get done() {
      return state === "out" && y > web.height + size() * 1.5;
    },
    get holding() {
      return carrying;
    },
    get target() {
      return target;
    },
    set target(c) {
      target = c;
    },

    update(dt) {
      t += dt;
      const f = den.frog;
      const hop = (from: Vec, to: Vec, time: number) => {
        const k = Math.min(1, t / time);
        x = from[0] + (to[0] - from[0]) * k;
        y = from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * size() * 1.4;
        return k >= 1;
      };
      if (state === "in" || state === "hop") {
        if (hop(from, perch, state === "in" ? 0.7 : 0.55)) {
          state = "wait";
          t = 0;
        }
      } else if (state === "wait") {
        stayed += dt;
        target = world.choose(...mouth(), f.tongue * u());
        if (target) {
          const [tx, ty] = target.center();
          facing = tx >= x ? 1 : -1;
          look = [tx - x, ty - y];
          if (t > f.wait * 0.4) {
            state = "aim";
            t = 0;
            world.threaten(target, x, y);
          }
        } else if (stayed > f.stay) {
          state = "out";
          from = [x, y];
          t = 0;
        } else if (t > f.wait && hops < 4) {
          // Nobody in reach: it hops somewhere closer to someone.
          const next = perchNear();
          t = 0;
          if (next && Math.hypot(next[0] - x, next[1] - y) > size()) {
            from = [x, y];
            perch = next;
            facing = next[0] >= x ? 1 : -1;
            state = "hop";
            hops++;
          }
        }
      } else if (state === "aim") {
        if (target) {
          const [tx, ty] = target.center();
          look = [tx - x, ty - y];
          facing = tx >= x ? 1 : -1;
        }
        if (t > f.aim) {
          if (!target || !target.alive) {
            state = "wait";
            t = 0;
            return;
          }
          // It shoots where the spider is now: anything that's moved by then is missed.
          aimAt = target.center();
          struck = false;
          state = "strike";
          t = 0;
        }
      } else if (state === "strike") {
        const out = 0.12;
        const back = 0.28;
        if (t < out) tongue = t / out;
        else {
          if (!struck && target) {
            struck = true;
            const [mx, my] = mouth();
            const reach = f.tongue * u();
            const d = Math.hypot(aimAt[0] - mx, aimAt[1] - my);
            const tip: Vec = d > reach ? [mx + ((aimAt[0] - mx) / d) * reach, my + ((aimAt[1] - my) / d) * reach] : aimAt;
            const [cx, cy] = target.center();
            if (catchable(target) && target.alive && Math.hypot(cx - tip[0], cy - tip[1]) < Math.max(target.radius() * 1.1, u() * 0.2)) {
              carrying = target;
              world.caught(target, "frog", () => {
                const [ox, oy] = mouth();
                return [ox + (tip[0] - ox) * tongue, oy + (tip[1] - oy) * tongue];
              });
            }
          }
          tongue = Math.max(0, 1 - (t - out) / back);
        }
        if (t > out + back) {
          tries++;
          state = carrying ? "gulp" : tries >= den.frog.tries ? "out" : "wait";
          from = [x, y];
          t = 0;
        }
      } else if (state === "gulp") {
        if (t > 0.5) {
          carrying = null;
          state = tries >= f.tries || Math.random() < f.full ? "out" : "wait";
          from = [x, y];
          t = 0;
        }
      } else if (state === "out") {
        hop(from, [from[0] + facing * size() * 3, web.height + size() * 2], 0.7);
      }
    },

    draw(ctx, colors) {
      const s = size();
      const green = "#6fae6a";
      const belly = "#cfe6b8";
      const darkGreen = "#4d8a4f";
      ctx.save();
      // The tongue first, from its mouth out to where it's shooting.
      if (state === "strike" && tongue > 0) {
        const [mx, my] = mouth();
        const reach = den.frog.tongue * u();
        const d = Math.hypot(aimAt[0] - mx, aimAt[1] - my) || 1;
        const len = Math.min(d, reach) * tongue;
        const tx = mx + ((aimAt[0] - mx) / d) * len;
        const ty = my + ((aimAt[1] - my) / d) * len;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#e07a8a";
        ctx.lineWidth = Math.max(3, s * 0.07);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = "#d25a6e";
        ctx.beginPath();
        ctx.arc(tx, ty, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.translate(x, y);
      ctx.scale(facing, 1);
      const crouch = state === "aim" ? Math.min(1, t / 0.3) * 0.12 : state === "gulp" ? Math.sin(t * 20) * 0.04 : 0;
      ctx.scale(1 + crouch * 0.5, 1 - crouch);
      const shapes: [Path2D, string][] = [];
      const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
        const p = new Path2D();
        p.ellipse(cx * s, cy * s, rx * s, ry * s, rot, 0, Math.PI * 2);
        return p;
      };
      shapes.push([ell(-0.3, -0.12, 0.26, 0.14, 0.3), darkGreen]);
      shapes.push([ell(0, -0.3, 0.42, 0.3), green]);
      shapes.push([ell(0.1, -0.2, 0.26, 0.16), belly]);
      shapes.push([ell(0.26, -0.03, 0.12, 0.06), darkGreen]);
      shapes.push([ell(0.02, -0.56, 0.13, 0.13), green]);
      shapes.push([ell(0.3, -0.56, 0.13, 0.13), green]);
      if (colors.outline) {
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.strokeStyle = colors.surface;
        for (const [p] of shapes) ctx.stroke(p);
      }
      for (const [p, fill] of shapes) {
        ctx.fillStyle = fill;
        ctx.fill(p);
      }
      // Eyes, watching whoever it's after.
      const dl = Math.hypot(look[0], look[1]) || 1;
      const lx = ((look[0] * facing) / dl) * s * 0.04;
      const ly = (look[1] / dl) * s * 0.04;
      for (const ex of [0.02, 0.3]) {
        ctx.fillStyle = "#fbf7e8";
        ctx.beginPath();
        ctx.arc(ex * s, -0.58 * s, 0.085 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1b1e29";
        ctx.beginPath();
        ctx.ellipse(ex * s + lx, -0.58 * s + ly, 0.045 * s, state === "aim" ? 0.02 * s : 0.05 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#2f5a33";
      ctx.lineWidth = Math.max(1.2, s * 0.025);
      ctx.beginPath();
      ctx.moveTo(-0.05 * s, -0.4 * s);
      ctx.quadraticCurveTo(0.2 * s, state === "gulp" ? -0.34 * s : -0.37 * s, 0.4 * s, -0.42 * s);
      ctx.stroke();
      ctx.restore();
    },

    hit(px, py) {
      return Math.hypot(px - x, py - (y - size() * 0.3)) < size() * 0.55;
    },

    shoo() {
      if (state === "out" || state === "in" || Math.random() > den.predators.shoo) return false;
      state = "out";
      from = [x, y];
      t = 0;
      return true;
    },
  };
  return me;
}

/** Gravity in den px/s², for anything that needs it. */
export const denGravity = (unit: number) => config.rope.gravity * unit;

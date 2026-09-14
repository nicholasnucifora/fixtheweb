import { den } from "./config";
import type { Break, Vec, Web } from "./web";

/**
 * Broken threads in the Spider Den. A thread that breaks splits where it went: each half dangles
 * from the end still tied to the web, swinging down under gravity, then fades away. A piece of web
 * cut loose from everything falls as it is, turning a little as it goes.
 *
 * Each piece is a short chain of points (Verlet, like the spiders' strings), in den px.
 */

interface Piece {
  /** x, y and last x, y per point. */
  pts: Float32Array;
  /** Node the first point hangs from, or −1 if it's free. */
  node: number;
  link: number;
  age: number;
}

export function createDebris() {
  let pieces: Piece[] = [];

  /** A chain from `from` to `to`, hanging from `node` (−1: falling free), `count` links long. */
  const chain = (from: Vec, to: Vec, node: number, push: Vec = [0, 0]) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    if (length < 2) return;
    const count = Math.max(1, Math.min(8, Math.round(length / 10)));
    const pts = new Float32Array((count + 1) * 4);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = from[0] + (to[0] - from[0]) * t;
      const y = from[1] + (to[1] - from[1]) * t;
      pts[i * 4] = x;
      pts[i * 4 + 1] = y;
      pts[i * 4 + 2] = x - push[0] * t;
      pts[i * 4 + 3] = y - push[1] * t;
    }
    pieces.push({ pts, node, link: length / count, age: 0 });
  };

  return {
    /** What a broken thread leaves behind. */
    add(b: Break) {
      const cutAt: Vec = [b.a[0] + (b.b[0] - b.a[0]) * b.t, b.a[1] + (b.b[1] - b.a[1]) * b.t];
      if (b.falls) {
        // Falls as it is, with a little push so they don't all go in step.
        chain(b.a, b.b, -1, [(Math.random() - 0.5) * 0.6, (Math.random() - 0.3) * 0.4]);
      } else {
        // Each half springs back a little from the break as it goes.
        chain(b.a, cutAt, b.heldA);
        chain(b.b, cutAt, b.heldB);
      }
      const most = Math.max(1, Math.round(den.breaking.most));
      if (pieces.length > most) pieces = pieces.slice(pieces.length - most);
    },

    clear() {
      pieces = [];
    },

    get count() {
      return pieces.length;
    },

    update(dt: number, web: Web, gravity: number) {
      const fade = Math.max(0.1, den.breaking.fade);
      const g = gravity * den.breaking.gravity;
      const steps = Math.min(4, Math.max(1, Math.ceil(dt * 120)));
      const h = dt / steps;
      const keep = Math.exp(-2.5 * h);
      for (const p of pieces) {
        p.age += dt;
        const n = p.pts.length / 4;
        // Curling up as it fades.
        const link = p.link * (1 - 0.35 * Math.min(1, p.age / fade));
        for (let s = 0; s < steps; s++) {
          for (let i = 0; i < n; i++) {
            const k = i * 4;
            const x = p.pts[k];
            const y = p.pts[k + 1];
            const vx = (x - p.pts[k + 2]) * keep;
            const vy = (y - p.pts[k + 3]) * keep;
            p.pts[k + 2] = x;
            p.pts[k + 3] = y;
            p.pts[k] = x + vx;
            p.pts[k + 1] = y + vy + g * h * h;
          }
          if (p.node >= 0) {
            p.pts[0] = p.pts[2] = web.x(p.node);
            p.pts[1] = p.pts[3] = web.y(p.node);
          }
          for (let pass = 0; pass < 3; pass++) {
            for (let i = 0; i < n - 1; i++) {
              const a = i * 4;
              const b = a + 4;
              const dx = p.pts[b] - p.pts[a];
              const dy = p.pts[b + 1] - p.pts[a + 1];
              const d = Math.hypot(dx, dy) || 1;
              const diff = (d - link) / d;
              const pinned = i === 0 && p.node >= 0;
              const wa = pinned ? 0 : 0.5;
              const wb = pinned ? 1 : 0.5;
              p.pts[a] += dx * diff * wa;
              p.pts[a + 1] += dy * diff * wa;
              p.pts[b] -= dx * diff * wb;
              p.pts[b + 1] -= dy * diff * wb;
            }
          }
        }
      }
      pieces = pieces.filter((p) => p.age < fade && p.pts[1] < web.height + 200);
    },

    /** Den px, in the web's colour and strength. */
    draw(ctx: CanvasRenderingContext2D, color: string) {
      if (!pieces.length) return;
      const fade = Math.max(0.1, den.breaking.fade);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = den.webs.thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const p of pieces) {
        const t = p.age / fade;
        ctx.globalAlpha = den.webs.opacity * 0.8 * (t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5);
        ctx.beginPath();
        ctx.moveTo(p.pts[0], p.pts[1]);
        for (let i = 4; i < p.pts.length; i += 4) ctx.lineTo(p.pts[i], p.pts[i + 1]);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

export type Debris = ReturnType<typeof createDebris>;

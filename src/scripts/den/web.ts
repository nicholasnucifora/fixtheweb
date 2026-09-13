import { den } from "./config";

/**
 * The webs filling the Spider Den, as one network of threads that spiders walk along and flung
 * things crash through.
 *
 * Orb webs are spread across the den: spokes out from a hub, a spiral of rings across them, and a
 * frame around the outside that the spokes are tied to. Neighbouring webs are joined by bridge
 * threads, and the webs near the den's edges are moored to them.
 *
 * It's a graph: nodes (where threads meet) joined by edges (straight threads, like the spiral of a
 * real orb web, which runs straight from spoke to spoke). Every node sits at its built place plus a
 * small springy offset, so a push makes the threads give and ripple back (Webs → Wobble).
 *
 * Positions are CSS px in the den, from its top-left corner.
 */

export type Vec = [number, number];

/** A place on a thread: `t` is how far along edge `edge`, from its first node to its second. */
export interface Spot {
  edge: number;
  t: number;
}
export interface Hit extends Spot {
  x: number;
  y: number;
  /** For a crossing, how far along the line tested (0–1); for `nearest`, how far away (px). */
  along: number;
}

const enum Kind {
  Spoke,
  Ring,
  Frame,
  Bridge,
  Mooring,
}

/** Small, fast, seeded: the same seed and size always build the same webs. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Web {
  width = 0;
  height = 0;
  /** px per b. */
  unit = 1;

  // Nodes: built position, springy offset and its velocity, and which web each belongs to (−1 for a mooring).
  private bx: number[] = [];
  private by: number[] = [];
  private ox = new Float32Array(0);
  private oy = new Float32Array(0);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private pinned: boolean[] = [];
  private nodeWeb: number[] = [];
  /** Edges at each node. */
  private links: number[][] = [];

  // Edges.
  private ea: number[] = [];
  private eb: number[] = [];
  private kind: Kind[] = [];

  /** Each web's hub node and reach. */
  hubs: { node: number; radius: number }[] = [];

  // Spatial lookups: edges and nodes by grid cell.
  private cell = 32;
  private cols = 1;
  private rows = 1;
  private edgeCells: number[][] = [];
  private nodeCells: number[][] = [];
  private stamp = new Uint32Array(0);
  private stampNow = 1;
  /** Is anything still wobbling? When it all settles, the wobble stops being worked out. */
  private moving = false;

  get nodeCount() {
    return this.bx.length;
  }
  get edgeCount() {
    return this.ea.length;
  }

  // ── Building ──────────────────────────────────────────────────────────────

  build(width: number, height: number, unit: number, seed: number) {
    this.width = width;
    this.height = height;
    this.unit = unit;
    this.bx = [];
    this.by = [];
    this.pinned = [];
    this.nodeWeb = [];
    this.ea = [];
    this.eb = [];
    this.kind = [];
    this.hubs = [];
    const rand = random(seed);
    const w = den.webs;

    const node = (x: number, y: number, web: number, pinned = false) => {
      this.bx.push(x);
      this.by.push(y);
      this.pinned.push(pinned);
      this.nodeWeb.push(web);
      return this.bx.length - 1;
    };
    const edge = (a: number, b: number, kind: Kind) => {
      if (a === b) return;
      this.ea.push(a);
      this.eb.push(b);
      this.kind.push(kind);
    };

    // Hubs on a jittered grid, so webs fill the den without lining up.
    const spacing = Math.max(20, w.spacing * unit);
    const cols = Math.max(1, Math.round(width / spacing));
    const rows = Math.max(1, Math.round(height / spacing));
    const cw = width / cols;
    const ch = height / rows;
    const frames: number[][] = [];
    const centres: Vec[] = [];
    const inside = 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const webIndex = this.hubs.length;
        const hx = (c + 0.5) * cw + (rand() - 0.5) * 0.4 * cw;
        const hy = (r + 0.5) * ch + (rand() - 0.5) * 0.4 * ch;
        const radius = Math.min(cw, ch) * w.radius * (0.85 + rand() * 0.3);
        const hub = node(hx, hy, webIndex);
        this.hubs.push({ node: hub, radius });
        centres.push([hx, hy]);

        const count = Math.max(5, Math.round(w.spokes + (rand() - 0.5) * 4));
        const turn = rand() * Math.PI * 2;
        const step = (Math.PI * 2) / count;
        const spokes = Array.from({ length: count }, (_, i) => {
          const angle = turn + i * step + (rand() - 0.5) * 0.45 * step;
          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          // As far as it reaches, but never out of the den.
          const toX = dx > 0 ? (width - inside - hx) / dx : dx < 0 ? (inside - hx) / dx : Infinity;
          const toY = dy > 0 ? (height - inside - hy) / dy : dy < 0 ? (inside - hy) / dy : Infinity;
          const reach = Math.max(4, Math.min(radius * (0.88 + rand() * 0.3), toX, toY));
          return { dx, dy, reach, chain: [hub] as number[] };
        });

        // Rings: a tight little mesh round the hub, a gap, then the catching spiral out to the edge.
        const gap = Math.max(3, w.ringGap * unit);
        const radii: number[] = [];
        for (const f of [0.055, 0.11]) if (f * radius > 3) radii.push(f * radius);
        const spiralFrom = Math.max(radius * 0.24, (radii[radii.length - 1] ?? 0) + gap);
        for (let rr = spiralFrom; rr < radius * 1.1; rr += gap * (0.9 + rand() * 0.2)) {
          radii.push(rr);
        }
        const ringNodes: (number | null)[][] = radii.map((rr, k) =>
          spokes.map((s, i) => {
            const at = rr * (1 + 0.045 * Math.sin(i * 1.7 + k * 0.9 + turn));
            if (at > s.reach * 0.94) return null;
            const n = node(hx + s.dx * at, hy + s.dy * at, webIndex);
            s.chain.push(n);
            return n;
          }),
        );
        ringNodes.forEach((ring, k) => {
          const hubMesh = radii[k] < radius * 0.2;
          ring.forEach((a, i) => {
            const b = ring[(i + 1) % ring.length];
            if (a === null || b === null) return;
            if (!hubMesh && rand() < w.torn) return;
            edge(a, b, Kind.Ring);
          });
        });

        // Spokes, from the hub out through their ring nodes to the frame.
        const frame: number[] = [];
        for (const s of spokes) {
          const end = node(hx + s.dx * s.reach, hy + s.dy * s.reach, webIndex);
          s.chain.push(end);
          frame.push(end);
          for (let k = 0; k < s.chain.length - 1; k++) edge(s.chain[k], s.chain[k + 1], Kind.Spoke);
        }
        frame.forEach((a, i) => edge(a, frame[(i + 1) % frame.length], Kind.Frame));
        frames.push(frame);
      }
    }

    // Bridges between neighbouring webs: the nearest bits of their frames.
    const nearestTo = (list: number[], x: number, y: number) =>
      list.reduce((best, n) => (Math.hypot(this.bx[n] - x, this.by[n] - y) < Math.hypot(this.bx[best] - x, this.by[best] - y) ? n : best));
    for (let a = 0; a < centres.length; a++) {
      for (let b = a + 1; b < centres.length; b++) {
        const d = Math.hypot(centres[a][0] - centres[b][0], centres[a][1] - centres[b][1]);
        if (d > Math.max(cw, ch) * 1.55 || rand() > w.bridges) continue;
        const from = nearestTo(frames[a], ...centres[b]);
        const to = nearestTo(frames[b], ...centres[a]);
        edge(from, to, Kind.Bridge);
      }
    }

    // Moorings: webs near an edge of the den are tied to it.
    frames.forEach((frame, i) => {
      const [hx, hy] = centres[i];
      const reach = this.hubs[i].radius * 1.6;
      const sides: [number, number, (n: number) => Vec][] = [
        [hy, 0, (n) => [this.bx[n], 0]],
        [height - hy, 1, (n) => [this.bx[n], height]],
        [hx, 2, (n) => [0, this.by[n]]],
        [width - hx, 3, (n) => [width, this.by[n]]],
      ];
      for (const [distance, side, onto] of sides) {
        if (distance > reach) continue;
        const target: Vec = side === 0 ? [hx, 0] : side === 1 ? [hx, height] : side === 2 ? [0, hy] : [width, hy];
        const from = nearestTo(frame, ...target);
        const [x, y] = onto(from);
        const slide = (rand() - 0.5) * this.hubs[i].radius * 0.5;
        const pin = node(side < 2 ? Math.max(0, Math.min(width, x + slide)) : x, side < 2 ? y : Math.max(0, Math.min(height, y + slide)), -1, true);
        edge(from, pin, Kind.Mooring);
      }
    });

    const n = this.bx.length;
    this.ox = new Float32Array(n);
    this.oy = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.links = Array.from({ length: n }, () => []);
    this.ea.forEach((a, e) => {
      this.links[a].push(e);
      this.links[this.eb[e]].push(e);
    });
    this.index();
  }

  /** Files every edge and node under the grid cells it covers. */
  private index() {
    this.cell = Math.max(24, this.unit * 0.4);
    this.cols = Math.max(1, Math.ceil(this.width / this.cell) + 1);
    this.rows = Math.max(1, Math.ceil(this.height / this.cell) + 1);
    this.edgeCells = Array.from({ length: this.cols * this.rows }, () => []);
    this.nodeCells = Array.from({ length: this.cols * this.rows }, () => []);
    const pad = this.unit * 0.3;
    for (let e = 0; e < this.ea.length; e++) {
      const [x0, y0, x1, y1] = this.box(this.bx[this.ea[e]], this.by[this.ea[e]], this.bx[this.eb[e]], this.by[this.eb[e]], pad);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) this.edgeCells[cy * this.cols + cx].push(e);
    }
    for (let i = 0; i < this.bx.length; i++) {
      const [cx, cy] = this.cellOf(this.bx[i], this.by[i]);
      this.nodeCells[cy * this.cols + cx].push(i);
    }
    this.stamp = new Uint32Array(Math.max(this.ea.length, this.bx.length));
  }

  private cellOf(x: number, y: number): Vec {
    return [
      Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cell))),
      Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cell))),
    ];
  }
  private box(ax: number, ay: number, bx: number, by: number, pad: number) {
    const [x0, y0] = this.cellOf(Math.min(ax, bx) - pad, Math.min(ay, by) - pad);
    const [x1, y1] = this.cellOf(Math.max(ax, bx) + pad, Math.max(ay, by) + pad);
    return [x0, y0, x1, y1];
  }
  /** Every edge filed near the box, once each. */
  private edgesNear(ax: number, ay: number, bx: number, by: number, pad: number, visit: (e: number) => void) {
    const [x0, y0, x1, y1] = this.box(ax, ay, bx, by, pad);
    const mark = ++this.stampNow;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const e of this.edgeCells[cy * this.cols + cx]) {
          if (this.stamp[e] === mark) continue;
          this.stamp[e] = mark;
          visit(e);
        }
      }
    }
  }

  // ── Where things are ──────────────────────────────────────────────────────

  x(n: number) {
    return this.bx[n] + this.ox[n];
  }
  y(n: number) {
    return this.by[n] + this.oy[n];
  }
  ends(e: number): [number, number] {
    return [this.ea[e], this.eb[e]];
  }
  webOf(n: number) {
    return this.nodeWeb[n];
  }
  isPinned(n: number) {
    return this.pinned[n];
  }
  linksOf(n: number) {
    return this.links[n];
  }
  other(e: number, n: number) {
    return this.ea[e] === n ? this.eb[e] : this.ea[e];
  }
  length(e: number) {
    return Math.hypot(this.x(this.eb[e]) - this.x(this.ea[e]), this.y(this.eb[e]) - this.y(this.ea[e]));
  }
  point(spot: Spot): Vec {
    const a = this.ea[spot.edge];
    const b = this.eb[spot.edge];
    if (a === undefined) return [0, 0];
    return [this.x(a) + (this.x(b) - this.x(a)) * spot.t, this.y(a) + (this.y(b) - this.y(a)) * spot.t];
  }
  /** The edge joining two nodes, if there is one. */
  between(a: number, b: number) {
    return this.links[a]?.find((e) => this.other(e, a) === b) ?? -1;
  }

  /** The nearest place on any thread within `within` px of (x, y). */
  nearest(x: number, y: number, within: number): Hit | null {
    let best: Hit | null = null;
    this.edgesNear(x, y, x, y, within, (e) => {
      const ax = this.x(this.ea[e]);
      const ay = this.y(this.ea[e]);
      const dx = this.x(this.eb[e]) - ax;
      const dy = this.y(this.eb[e]) - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      const px = ax + dx * t;
      const py = ay + dy * t;
      const d = Math.hypot(px - x, py - y);
      if (d <= within && (!best || d < best.along)) best = { edge: e, t, x: px, y: py, along: d };
    });
    return best;
  }

  /** Every thread the line from (ax, ay) to (bx, by) crosses, nearest the start first. */
  crossings(ax: number, ay: number, bx: number, by: number): Hit[] {
    const hits: Hit[] = [];
    this.edgesNear(ax, ay, bx, by, 1, (e) => {
      const cx = this.x(this.ea[e]);
      const cy = this.y(this.ea[e]);
      const sx = this.x(this.eb[e]) - cx;
      const sy = this.y(this.eb[e]) - cy;
      const rx = bx - ax;
      const ry = by - ay;
      const denom = rx * sy - ry * sx;
      if (denom === 0) return;
      const along = ((cx - ax) * sy - (cy - ay) * sx) / denom;
      const t = ((cx - ax) * ry - (cy - ay) * rx) / denom;
      if (along < 0 || along > 1 || t < 0 || t > 1) return;
      hits.push({ edge: e, t, x: ax + rx * along, y: ay + ry * along, along });
    });
    return hits.sort((p, q) => p.along - q.along);
  }

  /** Unit vector across edge `e` (either way). */
  normal(e: number): Vec {
    const dx = this.x(this.eb[e]) - this.x(this.ea[e]);
    const dy = this.y(this.eb[e]) - this.y(this.ea[e]);
    const d = Math.hypot(dx, dy) || 1;
    return [-dy / d, dx / d];
  }

  /** A node between `from` and `to` px from (x, y) that passes `ok`, picked at random, or −1. */
  nodeNear(x: number, y: number, from: number, to: number, ok: (n: number) => boolean = () => true, rand = Math.random) {
    const found: number[] = [];
    const [x0, y0] = this.cellOf(x - to, y - to);
    const [x1, y1] = this.cellOf(x + to, y + to);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const n of this.nodeCells[cy * this.cols + cx]) {
          const d = Math.hypot(this.bx[n] - x, this.by[n] - y);
          if (d >= from && d <= to && !this.pinned[n] && ok(n)) found.push(n);
        }
      }
    }
    return found.length ? found[Math.floor(rand() * found.length)] : -1;
  }

  /** The shortest way along the threads from node `from` to node `to` (not counting `from`), or null. */
  path(from: number, to: number): number[] | null {
    if (from === to) return [];
    const n = this.bx.length;
    if (from < 0 || to < 0 || from >= n || to >= n) return null;
    const g = new Float64Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    const heap: [number, number][] = [];
    const push = (f: number, node: number) => {
      heap.push([f, node]);
      let i = heap.length - 1;
      while (i > 0) {
        const up = (i - 1) >> 1;
        if (heap[up][0] <= heap[i][0]) break;
        [heap[up], heap[i]] = [heap[i], heap[up]];
        i = up;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const tx = this.bx[to];
    const ty = this.by[to];
    g[from] = 0;
    push(0, from);
    while (heap.length) {
      const [, at] = pop();
      if (done[at]) continue;
      if (at === to) break;
      done[at] = 1;
      for (const e of this.links[at]) {
        const next = this.other(e, at);
        if (done[next] || this.pinned[next]) continue;
        const cost = g[at] + Math.hypot(this.bx[next] - this.bx[at], this.by[next] - this.by[at]);
        if (cost < g[next]) {
          g[next] = cost;
          came[next] = at;
          push(cost + Math.hypot(tx - this.bx[next], ty - this.by[next]), next);
        }
      }
    }
    if (came[to] < 0) return null;
    const out: number[] = [];
    for (let at = to; at !== from; at = came[at]) out.push(at);
    return out.reverse();
  }

  // ── Wobble ────────────────────────────────────────────────────────────────

  /** Pushes the threads around (x, y) at velocity (vx, vy) px/s, fading out over `reach` px. */
  push(x: number, y: number, vx: number, vy: number, reach = den.wobble.reach * this.unit) {
    const wob = den.wobble;
    if (!wob.enabled || reach <= 0) return;
    const most = this.unit * 4;
    const [x0, y0] = this.cellOf(x - reach, y - reach);
    const [x1, y1] = this.cellOf(x + reach, y + reach);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const n of this.nodeCells[cy * this.cols + cx]) {
          if (this.pinned[n]) continue;
          const d = Math.hypot(this.x(n) - x, this.y(n) - y);
          if (d >= reach) continue;
          const f = (1 - d / reach) ** 2 * wob.push;
          this.vx[n] = Math.max(-most, Math.min(most, this.vx[n] + vx * f));
          this.vy[n] = Math.max(-most, Math.min(most, this.vy[n] + vy * f));
          this.moving = true;
        }
      }
    }
  }

  step(dt: number) {
    const wob = den.wobble;
    if (!this.moving || dt <= 0) return;
    if (!wob.enabled) {
      this.ox.fill(0);
      this.oy.fill(0);
      this.vx.fill(0);
      this.vy.fill(0);
      this.moving = false;
      return;
    }
    const w = Math.PI * 2 * wob.spring;
    const k = w * w;
    const c = 2 * wob.damping * w;
    const couple = k * wob.carry;
    const n = this.bx.length;
    const ax = new Float32Array(n);
    const ay = new Float32Array(n);
    const steps = Math.min(8, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    const limit = this.unit * 0.6;
    let energy = 0;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < n; i++) {
        ax[i] = -k * this.ox[i] - c * this.vx[i];
        ay[i] = -k * this.oy[i] - c * this.vy[i];
      }
      for (let e = 0; e < this.ea.length; e++) {
        const a = this.ea[e];
        const b = this.eb[e];
        const dx = (this.ox[b] - this.ox[a]) * couple;
        const dy = (this.oy[b] - this.oy[a]) * couple;
        ax[a] += dx;
        ay[a] += dy;
        ax[b] -= dx;
        ay[b] -= dy;
      }
      energy = 0;
      for (let i = 0; i < n; i++) {
        if (this.pinned[i]) continue;
        this.vx[i] += ax[i] * h;
        this.vy[i] += ay[i] * h;
        this.ox[i] = Math.max(-limit, Math.min(limit, this.ox[i] + this.vx[i] * h));
        this.oy[i] = Math.max(-limit, Math.min(limit, this.oy[i] + this.vy[i] * h));
        energy += Math.abs(this.ox[i]) + Math.abs(this.vx[i]) * h + Math.abs(this.oy[i]) + Math.abs(this.vy[i]) * h;
      }
    }
    if (energy < 0.02) {
      this.ox.fill(0);
      this.oy.fill(0);
      this.vx.fill(0);
      this.vy.fill(0);
      this.moving = false;
    }
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  /** Strokes every thread in `color`: the frame and spokes a touch stronger than the spiral. */
  draw(ctx: CanvasRenderingContext2D, color: string) {
    const w = den.webs;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = w.thickness;
    ctx.lineCap = "round";
    for (const rings of [false, true]) {
      ctx.globalAlpha = w.opacity * (rings ? 0.72 : 1);
      ctx.beginPath();
      for (let e = 0; e < this.ea.length; e++) {
        if ((this.kind[e] === Kind.Ring) !== rings) continue;
        const a = this.ea[e];
        const b = this.eb[e];
        ctx.moveTo(this.x(a), this.y(a));
        ctx.lineTo(this.x(b), this.y(b));
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

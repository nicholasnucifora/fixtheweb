import { den } from "./config";
import type { Scene } from "./scenes";

/**
 * The webs in the Spider Den, as one network of threads that spiders walk along and flung things
 * crash through, spun between the things in a scene (scenes.ts): branches, a window frame, fence
 * posts.
 *
 * Each orb web is spun the way a real one is. A spot with things all round it gets anchor lines tied
 * out to them (now and then forking into two as they reach it), a frame strung between the ends of
 * those, spokes from the hub out to the frame, and a spiral wound round the spokes that follows the
 * frame's shape. Corners where two things meet get a tangle of cobweb, and long single bridge lines
 * run between things across the gaps.
 *
 * It's a graph: nodes (where threads meet) joined by edges (straight threads, like the spiral of a
 * real orb web, which runs straight from spoke to spoke). The scene's supports are in it too, as
 * edges that aren't drawn, so spiders can walk along a branch from one web to the next. Every
 * thread's node sits at its built place plus a small springy offset, so a push makes the threads
 * give and ripple back (Webs → Wobble); nodes on supports stay put.
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
  Spiral,
  Frame,
  Anchor,
  Bridge,
  Cobweb,
  /** Part of the scenery (a branch, a frame): walked along, never drawn. */
  Support,
}

/** Small, fast, seeded: the same seed and size always build the same webs. */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A straight piece of a support, for casting rays at. */
interface Piece {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  length: number;
  /** Which support, and how far along it this piece starts (px). */
  support: number;
  from: number;
}

export class Web {
  width = 0;
  height = 0;
  /** px per b. */
  unit = 1;

  // Nodes: built position, springy offset and its velocity, and which web each belongs to (−1: none).
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

  /** Each orb web's hub node and reach. */
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

  build(width: number, height: number, unit: number, seed: number, scene: Scene) {
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
    const rand = random(seed ^ 0x5eed);
    const between = (a: number, b: number) => Math.min(a, b) + rand() * Math.abs(b - a);
    const w = den.webs;

    const node = (x: number, y: number, web: number, pinned = false) => {
      this.bx.push(x);
      this.by.push(y);
      this.pinned.push(pinned);
      this.nodeWeb.push(web);
      return this.bx.length - 1;
    };
    const edge = (a: number, b: number, kind: Kind) => {
      if (a === b || a < 0 || b < 0) return;
      this.ea.push(a);
      this.eb.push(b);
      this.kind.push(kind);
    };

    // ── Tying threads to the scenery ──
    const pieces: Piece[] = [];
    scene.supports.forEach((support, s) => {
      const pts = support.closed ? [...support.points, support.points[0]] : support.points;
      let from = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const length = Math.hypot(bx - ax, by - ay);
        if (length > 0.01) pieces.push({ ax, ay, bx, by, length, support: s, from });
        from += length;
      }
    });
    /** Nodes tied to each support, and how far along it: they're joined up at the end. */
    const ties: { along: number; node: number }[][] = scene.supports.map(() => []);

    /**
     * Ties a thread to `piece`, `t` of the way along. The thread ends at `surface` (on the outside of
     * a thick support) and a hidden link runs on to the support's middle line, where spiders walk.
     */
    const tie = (piece: Piece, t: number, surface: Vec) => {
      const cx = piece.ax + (piece.bx - piece.ax) * t;
      const cy = piece.ay + (piece.by - piece.ay) * t;
      const middle = node(cx, cy, -1, true);
      ties[piece.support].push({ along: piece.from + piece.length * t, node: middle });
      if (Math.hypot(surface[0] - cx, surface[1] - cy) < 1.5) return middle;
      const end = node(surface[0], surface[1], -1, true);
      edge(end, middle, Kind.Support);
      return end;
    };

    /** The first support a ray from (x, y) along unit (dx, dy) meets within `reach`. */
    const cast = (x: number, y: number, dx: number, dy: number, reach: number) => {
      let best: { piece: Piece; t: number; surface: number } | null = null;
      for (const piece of pieces) {
        const sx = piece.bx - piece.ax;
        const sy = piece.by - piece.ay;
        const denom = dx * sy - dy * sx;
        if (Math.abs(denom) < 1e-9) continue;
        const d = ((piece.ax - x) * sy - (piece.ay - y) * sx) / denom;
        const t = ((piece.ax - x) * dy - (piece.ay - y) * dx) / denom;
        if (d <= 0 || d > reach || t < 0 || t > 1) continue;
        // Stopping at the outside of it, not its middle.
        const half = scene.supports[piece.support].width / 2;
        const surface = Math.max(0, d - half / Math.max(0.25, Math.abs(denom) / piece.length));
        if (!best || surface < best.surface) best = { piece, t, surface };
      }
      return best;
    };

    /** Does the line from a to b cut through any support? */
    const blocked = (a: Vec, b: Vec) =>
      pieces.some((p) => crosses(a[0], a[1], b[0], b[1], p.ax, p.ay, p.bx, p.by)) || !scene.open((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);

    // ── Orb webs ──
    const orbs: { hub: Vec; reach: number }[] = [];
    const gap = Math.max(3, w.ringGap * unit);
    const cell = Math.max(16, Math.min(w.sizeFrom, w.sizeTo) * unit * 0.8);
    const spots: Vec[] = [];
    for (let y = cell / 2; y < height; y += cell) {
      for (let x = cell / 2; x < width; x += cell) spots.push([x + between(-0.4, 0.4) * cell, y + between(-0.4, 0.4) * cell]);
    }
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const RAYS = 32;
    for (const [hx, hy] of spots) {
      if (rand() > w.fill || !scene.open(hx, hy)) continue;
      const size = between(w.sizeFrom, w.sizeTo) * unit;
      const room = w.spacing * unit;
      if (orbs.some((o) => Math.hypot(o.hub[0] - hx, o.hub[1] - hy) < o.reach + size * 0.6 + room)) continue;

      // Look all round for things to tie to.
      const hits: { angle: number; piece: Piece; t: number; surface: number }[] = [];
      const turn = rand() * Math.PI * 2;
      for (let r = 0; r < RAYS; r++) {
        const angle = turn + (r / RAYS) * Math.PI * 2;
        const hit = cast(hx, hy, Math.cos(angle), Math.sin(angle), size * 3.2);
        if (hit && hit.surface > unit * 0.12) hits.push({ angle, ...hit });
      }
      if (hits.length < 3) continue;

      // A few anchors spread round it, like a spider would pick: the nearest thing first, then each
      // next one as far round from the others as it can get without reaching too far.
      const want = 3 + Math.floor(rand() * 3);
      const anchors = [hits.reduce((a, b) => (b.surface < a.surface ? b : a))];
      while (anchors.length < want) {
        let best: (typeof hits)[number] | null = null;
        let bestScore = -Infinity;
        for (const h of hits) {
          if (anchors.includes(h)) continue;
          const apart = Math.min(...anchors.map((a) => Math.abs(angleBetween(a.angle, h.angle))));
          if (apart < 0.5) continue;
          const score = apart - (h.surface / size) * 0.35;
          if (score > bestScore) {
            best = h;
            bestScore = score;
          }
        }
        if (!best) break;
        anchors.push(best);
      }
      anchors.sort((a, b) => a.angle - b.angle);
      if (anchors.length < 3 || widestGap(anchors.map((a) => a.angle)) > 2.5) continue;

      // Frame corners part way out along each, pulled in if the frame would cut through something.
      let corners: Vec[] = [];
      let fits = false;
      for (let squeeze = 1; squeeze >= 0.55 && !fits; squeeze -= 0.15) {
        corners = anchors.map((a) => {
          const reach = Math.min(a.surface * between(0.55, 0.78), size * between(0.85, 1.1)) * squeeze;
          return [hx + Math.cos(a.angle) * reach, hy + Math.sin(a.angle) * reach];
        });
        fits = corners.every((c, i) => !blocked(c, corners[(i + 1) % corners.length])) && !pieces.some((p) => inside(p.ax, p.ay, corners));
      }
      if (!fits) continue;
      const reach = Math.max(...corners.map((c) => Math.hypot(c[0] - hx, c[1] - hy)));
      if (reach < Math.min(w.sizeFrom, w.sizeTo) * unit * 0.45) continue;
      if (orbs.some((o) => Math.hypot(o.hub[0] - hx, o.hub[1] - hy) < o.reach + reach + room * 0.5)) continue;

      const index = this.hubs.length;
      const hub = node(hx, hy, index);
      this.hubs.push({ node: hub, radius: reach });
      orbs.push({ hub: [hx, hy], reach });
      const cornerNodes = corners.map(([x, y]) => node(x, y, index));

      // Anchor lines out to the scenery, some forking into two as they reach it.
      anchors.forEach((a, i) => {
        const [fx, fy] = corners[i];
        const end: Vec = [hx + Math.cos(a.angle) * a.surface, hy + Math.sin(a.angle) * a.surface];
        if (rand() < w.forks && a.piece.length > unit * 0.3) {
          const split = node(fx + (end[0] - fx) * 0.6, fy + (end[1] - fy) * 0.6, index);
          edge(cornerNodes[i], split, Kind.Anchor);
          const spread = Math.min(a.piece.length * 0.4, Math.hypot(end[0] - fx, end[1] - fy) * 0.35);
          const half = scene.supports[a.piece.support].width / 2;
          for (const side of [-1, 1]) {
            const t = Math.max(0, Math.min(1, a.t + (side * spread) / a.piece.length));
            const mx = a.piece.ax + (a.piece.bx - a.piece.ax) * t;
            const my = a.piece.ay + (a.piece.by - a.piece.ay) * t;
            const toSplit = Math.hypot(this.bx[split] - mx, this.by[split] - my) || 1;
            const surface: Vec = [mx + ((this.bx[split] - mx) / toSplit) * half, my + ((this.by[split] - my) / toSplit) * half];
            edge(split, tie(a.piece, t, surface), Kind.Anchor);
          }
        } else {
          edge(cornerNodes[i], tie(a.piece, a.t, end), Kind.Anchor);
        }
      });

      // Spokes from the hub to the frame.
      const spokes = Math.max(6, Math.round(w.spokes * Math.max(0.65, Math.min(1.25, reach / unit)) + (rand() - 0.5) * 3));
      const spin = rand() * Math.PI * 2;
      const step = (Math.PI * 2) / spokes;
      const radials = Array.from({ length: spokes }, (_, j) => {
        const angle = spin + j * step + (rand() - 0.5) * 0.3 * step;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let best = { d: Infinity, side: 0, s: 0 };
        corners.forEach((c, i) => {
          const n = corners[(i + 1) % corners.length];
          const hit = rayHits(hx, hy, dx, dy, c[0], c[1], n[0], n[1]);
          if (hit && hit.d < best.d) best = { d: hit.d, side: i, s: hit.s };
        });
        const d = Number.isFinite(best.d) ? best.d : reach * 0.5;
        return { dx, dy, length: d, side: best.side, s: best.s, end: node(hx + dx * d, hy + dy * d, index), chain: [hub] as number[] };
      });

      // The frame, through where each spoke meets it.
      corners.forEach((_, i) => {
        const along = radials.filter((r) => r.side === i).sort((a, b) => a.s - b.s);
        const chain = [cornerNodes[i], ...along.map((r) => r.end), cornerNodes[(i + 1) % corners.length]];
        for (let k = 0; k < chain.length - 1; k++) edge(chain[k], chain[k + 1], Kind.Frame);
      });

      // A little mesh round the hub, then the spiral: each spoke's share of it is scaled to that spoke's
      // length, so it follows the frame's shape, and it winds on one ring per time round.
      const meanLength = radials.reduce((sum, r) => sum + r.length, 0) / radials.length;
      for (const f of [0.06, 0.12]) {
        const ring = radials.map((r) => {
          const n = node(hx + r.dx * r.length * f, hy + r.dy * r.length * f, index);
          r.chain.push(n);
          return n;
        });
        ring.forEach((n, j) => edge(n, ring[(j + 1) % ring.length], Kind.Spiral));
      }
      const turnGap = gap / Math.max(1, meanLength);
      const spiral: number[][] = radials.map(() => []);
      for (let k = 0; ; k++) {
        let any = false;
        radials.forEach((r, j) => {
          const f = 0.24 + (k + j / spokes) * turnGap;
          if (f > 0.93) return;
          any = true;
          const n = node(hx + r.dx * r.length * f, hy + r.dy * r.length * f, index);
          spiral[j][k] = n;
          r.chain.push(n);
        });
        if (!any) break;
      }
      spiral.forEach((along, j) => {
        along.forEach((n, k) => {
          const next = j + 1 < spokes ? spiral[j + 1][k] : spiral[0][k + 1];
          if (next !== undefined && rand() >= w.torn) edge(n, next, Kind.Spiral);
        });
      });
      for (const r of radials) {
        r.chain.push(r.end);
        for (let k = 0; k < r.chain.length - 1; k++) edge(r.chain[k], r.chain[k + 1], Kind.Spoke);
      }
    }

    /** Ties to the support nearest (x, y), if one's right there, on its side facing `toward`. */
    const tieNear = (x: number, y: number, toward: Vec) => {
      let best: { piece: Piece; t: number; d: number; at: Vec } | null = null;
      for (const piece of pieces) {
        const dx = piece.bx - piece.ax;
        const dy = piece.by - piece.ay;
        const t = Math.max(0, Math.min(1, ((x - piece.ax) * dx + (y - piece.ay) * dy) / (dx * dx + dy * dy || 1)));
        const at: Vec = [piece.ax + dx * t, piece.ay + dy * t];
        const d = Math.hypot(at[0] - x, at[1] - y) - scene.supports[piece.support].width / 2;
        if (d < 4 && (!best || d < best.d)) best = { piece, t, d, at };
      }
      if (!best) return -1;
      const half = scene.supports[best.piece.support].width / 2;
      const out = Math.hypot(toward[0] - best.at[0], toward[1] - best.at[1]) || 1;
      const surface: Vec = [best.at[0] + ((toward[0] - best.at[0]) / out) * half, best.at[1] + ((toward[1] - best.at[1]) / out) * half];
      return tie(best.piece, best.t, surface);
    };

    // ── Cobwebs, tangled into corners ──
    for (const nook of scene.nooks) {
      if (rand() > w.cobwebs) continue;
      const [cx, cy] = nook.at;
      const size = between(0.35, 0.9) * unit;
      // Somewhere inside the corner, for the threads to face.
      const within: Vec = [cx + (nook.a[0] + nook.b[0]) * size * 0.3, cy + (nook.a[1] + nook.b[1]) * size * 0.3];
      if (!scene.open(...within)) continue;
      const lines = 4 + Math.floor(rand() * 4);
      for (let i = 0; i < lines; i++) {
        const da = size * between(0.15, 1);
        const db = size * between(0.15, 1);
        const a = tieNear(cx + nook.a[0] * da, cy + nook.a[1] * da, within);
        const b = tieNear(cx + nook.b[0] * db, cy + nook.b[1] * db, within);
        edge(a, b, Kind.Cobweb);
      }
    }

    // ── Bridge lines across the gaps ──
    const bridges = Math.round((w.bridges * width * height) / (unit * unit * 3));
    for (let tries = bridges * 6, made = 0; tries > 0 && made < bridges && pieces.length; tries--) {
      const piece = pieces[Math.floor(rand() * pieces.length)];
      const t = rand();
      const half = scene.supports[piece.support].width / 2;
      const mx = piece.ax + (piece.bx - piece.ax) * t;
      const my = piece.ay + (piece.by - piece.ay) * t;
      const across = Math.atan2(piece.bx - piece.ax, -(piece.by - piece.ay)) + (rand() < 0.5 ? 0 : Math.PI) + between(-0.8, 0.8);
      const dx = Math.cos(across);
      const dy = Math.sin(across);
      const from: Vec = [mx + dx * (half + 1), my + dy * (half + 1)];
      if (!scene.open(from[0] + dx * 6, from[1] + dy * 6)) continue;
      const hit = cast(from[0], from[1], dx, dy, unit * 4.5);
      if (!hit || hit.piece.support === piece.support || hit.surface < unit * 0.7) continue;
      const to: Vec = [from[0] + dx * hit.surface, from[1] + dy * hit.surface];
      if (orbs.some((o) => distanceToSegment(o.hub, from, to) < o.reach * 1.05)) continue;
      edge(tie(piece, t, from), tie(hit.piece, hit.t, to), Kind.Bridge);
      made++;
    }

    // ── The scenery itself, for walking along: each support a chain through everything tied to it ──
    scene.supports.forEach((support, s) => {
      const pts = support.points;
      const chain = [...ties[s]];
      let along = 0;
      pts.forEach((p, i) => {
        if (i > 0) along += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
        // Only where it's in the den: nobody walks off along a branch out of sight.
        if (p[0] >= -1 && p[0] <= width + 1 && p[1] >= -1 && p[1] <= height + 1) chain.push({ along, node: node(p[0], p[1], -1, true) });
      });
      chain.sort((a, b) => a.along - b.along);
      for (let i = 0; i < chain.length - 1; i++) edge(chain[i].node, chain[i + 1].node, Kind.Support);
      // A closed shape (a window pane) goes all the way round.
      if (support.closed && chain.length > 2) edge(chain[chain.length - 1].node, chain[0].node, Kind.Support);
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
    this.moving = false;
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

  /** The nearest place on anything within `within` px of (x, y): silk or scenery, or just silk. */
  nearest(x: number, y: number, within: number, silkOnly = false): Hit | null {
    let best: Hit | null = null;
    this.edgesNear(x, y, x, y, within, (e) => {
      if (silkOnly && this.kind[e] === Kind.Support) return;
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

  /** Everything the line from (ax, ay) to (bx, by) crosses (or just the silk), nearest the start first. */
  crossings(ax: number, ay: number, bx: number, by: number, silkOnly = false): Hit[] {
    const hits: Hit[] = [];
    this.edgesNear(ax, ay, bx, by, 1, (e) => {
      if (silkOnly && this.kind[e] === Kind.Support) return;
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

  /**
   * A node between `from` and `to` px from (x, y) that passes `ok`, picked at random, or −1. Only
   * silk, unless `anywhere` (then the scenery too).
   */
  nodeNear(x: number, y: number, from: number, to: number, ok: (n: number) => boolean = () => true, anywhere = false) {
    const found: number[] = [];
    const [x0, y0] = this.cellOf(x - to, y - to);
    const [x1, y1] = this.cellOf(x + to, y + to);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const n of this.nodeCells[cy * this.cols + cx]) {
          const d = Math.hypot(this.bx[n] - x, this.by[n] - y);
          if (d >= from && d <= to && (anywhere || !this.pinned[n]) && this.links[n].length && ok(n)) found.push(n);
        }
      }
    }
    return found.length ? found[Math.floor(Math.random() * found.length)] : -1;
  }

  /** The shortest way along the threads (and scenery) from node `from` to node `to` (not counting `from`), or null. */
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
        if (done[next]) continue;
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

  /** Strokes the silk in `color`: the structural threads a touch stronger than the spiral and cobwebs. */
  draw(ctx: CanvasRenderingContext2D, color: string) {
    const w = den.webs;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = w.thickness;
    ctx.lineCap = "round";
    for (const fine of [false, true]) {
      ctx.globalAlpha = w.opacity * (fine ? 0.72 : 1);
      ctx.beginPath();
      for (let e = 0; e < this.ea.length; e++) {
        const kind = this.kind[e];
        if (kind === Kind.Support || (kind === Kind.Spiral || kind === Kind.Cobweb) !== fine) continue;
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

// ── Geometry ─────────────────────────────────────────────────────────────────

/** Do the segments a–b and c–d cross? */
function crosses(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const rx = bx - ax;
  const ry = by - ay;
  const sx = dx - cx;
  const sy = dy - cy;
  const denom = rx * sy - ry * sx;
  if (denom === 0) return false;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / denom;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / denom;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/** Where a ray from (x, y) along (dx, dy) meets the segment a–b: how far along the ray, and the segment (0–1). */
function rayHits(x: number, y: number, dx: number, dy: number, ax: number, ay: number, bx: number, by: number) {
  const sx = bx - ax;
  const sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const d = ((ax - x) * sy - (ay - y) * sx) / denom;
  const s = ((ax - x) * dy - (ay - y) * dx) / denom;
  return d > 0 && s >= 0 && s <= 1 ? { d, s } : null;
}

/** Is (x, y) inside the polygon? */
function inside(x: number, y: number, polygon: Vec[]) {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within;
  }
  return within;
}

/** The turn from angle `a` to angle `b`, −π to π. */
function angleBetween(a: number, b: number) {
  const tau = Math.PI * 2;
  return ((((b - a) % tau) + tau * 1.5) % tau) - Math.PI;
}

/** The widest gap between angles sorted round the circle. */
function widestGap(sorted: number[]) {
  const tau = Math.PI * 2;
  const round = sorted.map((a) => ((a % tau) + tau) % tau).sort((a, b) => a - b);
  let widest = 0;
  round.forEach((a, i) => {
    const next = i + 1 < round.length ? round[i + 1] : round[0] + tau;
    widest = Math.max(widest, next - a);
  });
  return widest;
}

function distanceToSegment([x, y]: Vec, a: Vec, b: Vec) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
}

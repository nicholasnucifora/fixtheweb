import type { Vec } from "./web";

/**
 * Where the Spider Den's webs are spun: a tree, a window or a garden fence.
 *
 * A scene is simple flat scenery in the site's muted colours, and the things in it that webs can be
 * tied to and spiders can walk along (`supports`: branches, frame edges, posts, stems, a washing
 * line). web.ts spins the webs between them. `nooks` are corners where two supports meet, for
 * cobwebs, and `open` says where there's open air for a web.
 *
 * Everything is laid out from the den's size and the size of a spider (`unit`, px per b), so it
 * fills any window. The same seed lays it out the same way.
 */

export const SCENES = {
  tree: { label: "Tree" },
  window: { label: "Window" },
  fence: { label: "Fence" },
};
export type SceneId = keyof typeof SCENES;

/** Something webs tie to and spiders walk along: a line through its middle, and how thick it is. */
export interface Support {
  points: Vec[];
  width: number;
  closed?: boolean;
}

/** A corner where two supports meet: `a` and `b` point away from it along each. */
export interface Nook {
  at: Vec;
  a: Vec;
  b: Vec;
}

/** The scenery's colours, worked out from the page's (see world.ts). */
export interface Palette {
  bg: string;
  line: string;
  bark: string;
  barkShade: string;
  leaf: string;
  leafLight: string;
  canopy: string;
  wood: string;
  woodShade: string;
  sky: string;
  hill: string;
  hillFar: string;
  cloud: string;
  sun: string;
  glare: string;
  curtain: string;
  curtainShade: string;
  petal: string;
  petalCore: string;
  pot: string;
  sock: string;
}

export interface Scene {
  supports: Support[];
  nooks: Nook[];
  /** Is there open air at (x, y) for a web, clear of anything solid? */
  open(x: number, y: number): boolean;
  /** Draws the scenery, in den px. */
  paint(ctx: CanvasRenderingContext2D, colors: Palette): void;
}

type Rand = () => number;
type Paint = (ctx: CanvasRenderingContext2D, c: Palette) => void;

export function buildScene(id: SceneId, width: number, height: number, unit: number, rand: Rand): Scene {
  const build = id === "window" ? windowScene : id === "fence" ? fenceScene : treeScene;
  return build(width, height, unit, rand);
}

// ── A tree ───────────────────────────────────────────────────────────────────

/** Trunks up the sides, branches reaching across between them, and leaves at the tips. */
function treeScene(w: number, h: number, unit: number, rand: Rand): Scene {
  const between = (a: number, b: number) => a + rand() * (b - a);
  const supports: Support[] = [];
  const nooks: Nook[] = [];
  const paints: Paint[] = [];
  const leaves: [Path2D, Path2D] = [new Path2D(), new Path2D()];
  /** Every branch so far, so a new one stops short of growing through another. */
  const grown: { points: Vec[]; width: number }[] = [];

  // Soft canopy far behind, along the top.
  const canopy = new Path2D();
  for (let x = -unit; x < w + unit; x += unit * between(0.7, 1.1)) {
    const r = unit * between(0.55, 0.95);
    canopy.moveTo(x + r, -r * 0.2);
    canopy.arc(x, -r * 0.2, r, 0, Math.PI * 2);
  }
  paints.push((ctx, c) => {
    ctx.fillStyle = c.canopy;
    ctx.fill(canopy);
  });

  const trunkWidth = clamp(unit * 0.5, 30, 84);
  const sides = w < 560 ? [rand() < 0.5 ? 1 : -1] : [1, -1];
  for (const side of sides) {
    // 1: a trunk on the left, branching to the right; −1 the other way.
    const baseX = side > 0 ? trunkWidth * between(0.15, 0.55) : w - trunkWidth * between(0.15, 0.55);
    const trunk: Vec[] = [];
    const widths: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const y = h + 20 - (i / 12) * (h + 40);
      const up = 1 - y / h;
      trunk.push([baseX + side * Math.sin(up * 1.4) * trunkWidth * 0.35, y]);
      widths.push(trunkWidth * (1.15 - 0.35 * (i / 12)));
    }
    supports.push({ points: trunk, width: trunkWidth });
    grown.push({ points: trunk, width: trunkWidth });
    const body = ribbon(trunk, widths);
    // A few lines of bark down it.
    const bark = new Path2D();
    for (const offset of [-0.22, 0.12, 0.3]) {
      trunk.forEach(([x, y], i) => {
        const at: Vec = [x + offset * widths[i] + Math.sin(i * 1.7 + offset * 9) * 2, y];
        if (i === 0) bark.moveTo(...at);
        else bark.lineTo(...at);
      });
    }
    paints.push((ctx, c) => {
      ctx.fillStyle = c.bark;
      ctx.fill(body);
      ctx.strokeStyle = c.barkShade;
      ctx.lineWidth = 1.5;
      ctx.stroke(bark);
    });

    // Branches, one above another, reaching across the den.
    const count = Math.max(2, Math.round(h / (unit * 1.45)));
    for (let i = 0; i < count; i++) {
      const y = h * (0.1 + (0.78 * (i + between(0.15, 0.85))) / count);
      const onTrunk = trunk.reduce((best, p) => (Math.abs(p[1] - y) < Math.abs(best[1] - y) ? p : best));
      const tilt = between(-0.5, 0.18);
      const angle = side > 0 ? tilt : Math.PI - tilt;
      // With a trunk each side they meet in the middle; with just one, they reach most of the way across.
      const length = Math.max(unit * 1.5, w * (sides.length > 1 ? between(0.3, 0.58) : between(0.6, 0.9)));
      limb([onTrunk[0], y], angle, length, trunkWidth * between(0.36, 0.5), 0);
    }
  }

  function limb(start: Vec, angle: number, length: number, width: number, depth: number) {
    const dir: Vec = [Math.cos(angle), Math.sin(angle)];
    const end: Vec = [start[0] + dir[0] * length, start[1] + dir[1] * length];
    // Branches bow a little, and droop under their own weight.
    const control: Vec = [
      (start[0] + end[0]) / 2 - dir[1] * between(-0.08, 0.08) * length,
      (start[1] + end[1]) / 2 + dir[0] * between(-0.08, 0.08) * length + between(-0.02, 0.1) * length,
    ];
    const at = (t: number): Vec => [
      (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t * t * end[0],
      (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t * t * end[1],
    ];
    const tangent = (t: number): Vec => {
      const dx = 2 * (1 - t) * (control[0] - start[0]) + 2 * t * (end[0] - control[0]);
      const dy = 2 * (1 - t) * (control[1] - start[1]) + 2 * t * (end[1] - control[1]);
      const d = Math.hypot(dx, dy) || 1;
      return [dx / d, dy / d];
    };
    const steps = 12;
    let points = Array.from({ length: steps + 1 }, (_, i) => at(i / steps));
    // Stop short of anything it would grow through (other than what it grows out of).
    for (let i = 2; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      // Through another, or so close alongside it they'd overlap.
      const through = grown.some((other) =>
        other.points.some(
          (p, k) =>
            k > 0 &&
            Math.hypot(p[0] - start[0], p[1] - start[1]) > width * 1.5 &&
            (segmentsCross(ax, ay, bx, by, other.points[k - 1][0], other.points[k - 1][1], p[0], p[1]) ||
              Math.hypot(p[0] - bx, p[1] - by) < (width + other.width) * 0.55),
        ),
      );
      if (through) {
        points = points.slice(0, i - 1);
        break;
      }
    }
    if (points.length < 5) return;
    const kept = (points.length - 1) / steps;
    length *= kept;
    const tip = points[points.length - 1];
    const widths = points.map((_, i) => width * (1 - 0.8 * (i / steps)));
    supports.push({ points, width: width * 0.75 });
    grown.push({ points, width: width * 0.75 });
    const body = ribbon(points, widths);
    paints.push((ctx, c) => {
      ctx.fillStyle = c.bark;
      ctx.fill(body);
    });

    // Twigs off it, and the fork between makes a nook.
    const children = depth === 0 ? 1 + (rand() < 0.6 ? 1 : 0) : depth === 1 && rand() < 0.55 ? 1 : 0;
    for (let k = 0; k < children; k++) {
      const t = between(0.3, 0.72) * kept;
      const base = at(t);
      const along = tangent(t);
      const turn = (rand() < 0.5 ? -1 : 1) * between(0.4, 0.9);
      const childAngle = Math.atan2(along[1], along[0]) + turn;
      nooks.push({ at: base, a: along, b: [Math.cos(childAngle), Math.sin(childAngle)] });
      limb(base, childAngle, length * between(0.3, 0.5), width * (1 - 0.8 * t) * 0.7, depth + 1);
    }

    // Leaves at the tip, and a few along the way.
    const tipAngle = Math.atan2(tangent(kept)[1], tangent(kept)[0]);
    const size = unit * between(0.2, 0.28);
    for (let n = 0, many = 3 + Math.floor(rand() * 3); n < many; n++) {
      const spread = size * 0.9;
      leaf(
        leaves[n % 2],
        tip[0] + between(-spread, spread),
        tip[1] + between(-spread, spread) * 0.8,
        tipAngle + between(-1.5, 1.5),
        size * between(0.8, 1.2),
      );
    }
    for (let n = 0; n < depth + 1; n++) {
      const t = between(0.4, 0.95) * kept;
      const p = at(t);
      const a = Math.atan2(tangent(t)[1], tangent(t)[0]) + (rand() < 0.5 ? -1 : 1) * between(0.6, 1.2);
      leaf(leaves[(n + 1) % 2], p[0], p[1], a, size * 0.85);
    }
  }

  paints.push((ctx, c) => {
    ctx.fillStyle = c.leaf;
    ctx.fill(leaves[0]);
    ctx.fillStyle = c.leafLight;
    ctx.fill(leaves[1]);
  });

  return {
    supports,
    nooks,
    open: (x, y) => x > 2 && x < w - 2 && y > 2 && y < h - 2 && !nearSupport(supports, x, y, 6),
    paint: (ctx, c) => paints.forEach((p) => p(ctx, c)),
  };
}

// ── A window ─────────────────────────────────────────────────────────────────

/**
 * A sash window with the bottom half pushed up and open: panes of glass along the top, the open air
 * below, the hills outside, curtains either side and a plant on the sill.
 */
function windowScene(w: number, h: number, unit: number, rand: Rand): Scene {
  const between = (a: number, b: number) => a + rand() * (b - a);
  const t = clamp(unit * 0.22, 14, 34);
  const left = clamp(w * 0.05, 14, 70);
  const right = w - left;
  const top = clamp(h * 0.06, 12, 48);
  const bottom = h - clamp(h * 0.12, 30, 96);
  // The opening inside the frame, and the rail where the two sashes meet.
  const inner = { l: left + t, t: top + t, r: right - t, b: bottom - t };
  const rail = inner.t + (inner.b - inner.t) * between(0.4, 0.48);
  const railHalf = t * 0.5;
  const cols = w > 1100 ? 3 : 2;
  const mullion = t * 0.55;
  const panes: [number, number, number, number][] = [];
  for (let c = 0; c < cols; c++) {
    const x0 = inner.l + ((inner.r - inner.l) * c) / cols + (c > 0 ? mullion / 2 : 0);
    const x1 = inner.l + ((inner.r - inner.l) * (c + 1)) / cols - (c < cols - 1 ? mullion / 2 : 0);
    panes.push([x0, inner.t, x1, rail - railHalf]);
  }
  const gap: [number, number, number, number] = [inner.l, rail + railHalf, inner.r, inner.b];
  const openings = [...panes, gap];

  const supports: Support[] = [];
  const nooks: Nook[] = [];
  for (const [x0, y0, x1, y1] of openings) {
    supports.push({ points: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], width: 0, closed: true });
    nooks.push(
      { at: [x0, y0], a: [1, 0], b: [0, 1] },
      { at: [x1, y0], a: [-1, 0], b: [0, 1] },
      { at: [x0, y1], a: [1, 0], b: [0, -1] },
      { at: [x1, y1], a: [-1, 0], b: [0, -1] },
    );
  }

  // A plant on the sill, its stems reaching up into the open half.
  const potWidth = clamp(unit * 0.5, 36, 76);
  const potHeight = potWidth * 0.85;
  const potX = w * between(0.62, 0.8);
  const potTop = bottom - potHeight;
  const pot = new Path2D();
  pot.moveTo(potX - potWidth / 2, potTop);
  pot.lineTo(potX + potWidth / 2, potTop);
  pot.lineTo(potX + potWidth * 0.36, bottom);
  pot.lineTo(potX - potWidth * 0.36, bottom);
  pot.closePath();
  const stems = new Path2D();
  const plantLeaves = new Path2D();
  const stemCount = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < stemCount; i++) {
    const from: Vec = [potX + (i - (stemCount - 1) / 2) * potWidth * 0.18, potTop];
    const to: Vec = [from[0] + between(-1, 1) * unit * 0.9, rail + railHalf + (inner.b - rail) * between(0.2, 0.55)];
    const bend: Vec = [(from[0] + to[0]) / 2 + between(-0.4, 0.4) * unit, (from[1] + to[1]) / 2];
    const points = Array.from({ length: 9 }, (_, k) => quad(from, bend, to, k / 8));
    supports.push({ points, width: 4 });
    stems.moveTo(...points[0]);
    points.forEach((p) => stems.lineTo(...p));
    for (let k = 3; k <= 8; k += 2) {
      const p = points[k];
      leaf(plantLeaves, p[0], p[1], -Math.PI / 2 + (k % 4 === 1 ? -1 : 1) * between(0.7, 1.2), unit * between(0.16, 0.24));
    }
  }

  // Outside: sky, a sun, clouds, hills and a couple of trees.
  const hillFar = wavy(inner.l, inner.r, inner.t + (inner.b - inner.t) * 0.62, unit * 0.25, inner.b, rand);
  const hillNear = wavy(inner.l, inner.r, inner.t + (inner.b - inner.t) * 0.78, unit * 0.18, inner.b, rand);
  const trees = new Path2D();
  for (let i = 0; i < 3; i++) {
    const x = between(inner.l, inner.r);
    const y = inner.t + (inner.b - inner.t) * between(0.66, 0.74);
    const r = unit * between(0.14, 0.22);
    trees.rect(x - 2, y, 4, r * 1.2);
    trees.moveTo(x + r, y);
    trees.arc(x, y, r, 0, Math.PI * 2);
  }
  const clouds = new Path2D();
  for (let i = 0; i < 3; i++) {
    const x = between(inner.l, inner.r);
    const y = inner.t + (inner.b - inner.t) * between(0.08, 0.35);
    const r = unit * between(0.12, 0.2);
    for (const [dx, dy, s] of [[0, 0, 1], [r * 1.1, r * 0.2, 0.8], [-r * 1.05, r * 0.25, 0.75]]) {
      clouds.moveTo(x + dx + r * s, y + dy);
      clouds.arc(x + dx, y + dy, r * s, 0, Math.PI * 2);
    }
  }
  const sun: Vec = [inner.l + (inner.r - inner.l) * between(0.6, 0.9), inner.t + (inner.b - inner.t) * between(0.12, 0.25)];

  const frame = new Path2D();
  frame.rect(left, top, right - left, bottom - top);
  for (const [x0, y0, x1, y1] of openings) frame.rect(x0, y0, x1 - x0, y1 - y0);
  const sill = new Path2D();
  sill.rect(left - t * 0.8, bottom - 1, right - left + t * 1.6, t * 0.75);

  // Curtains, gathered back at either side, on a rod across the top.
  const curtainWidth = left + t * 0.6;
  const curtains = new Path2D();
  const folds = new Path2D();
  const rodY = Math.max(4, top - t * 0.45);
  for (const side of [-1, 1]) {
    const edge = side < 0 ? 0 : w;
    const out = (d: number) => edge - side * d;
    const tie = rodY + (bottom - rodY) * 0.62;
    curtains.moveTo(out(-4), rodY);
    curtains.lineTo(out(curtainWidth), rodY);
    curtains.bezierCurveTo(out(curtainWidth * 1.05), tie * 0.7, out(curtainWidth * 0.45), tie * 0.9, out(curtainWidth * 0.5), tie);
    curtains.bezierCurveTo(out(curtainWidth * 0.55), tie + (bottom - tie) * 0.5, out(curtainWidth * 0.9), bottom, out(curtainWidth * 0.85), bottom + t);
    curtains.lineTo(out(-4), bottom + t);
    curtains.closePath();
    for (const f of [0.3, 0.6]) {
      folds.moveTo(out(curtainWidth * f), rodY + 4);
      folds.quadraticCurveTo(out(curtainWidth * f * 0.7), (rodY + tie) / 2, out(curtainWidth * f * 0.45), tie);
    }
  }

  const glare = new Path2D();
  for (const [x0, y0, x1, y1] of panes) {
    const pw = x1 - x0;
    for (const [from, size] of [[0.15, 0.18], [0.42, 0.07]]) {
      glare.moveTo(x0 + pw * from, y1);
      glare.lineTo(x0 + pw * (from + size), y1);
      glare.lineTo(x0 + pw * (from + size) + (y1 - y0) * 0.6, y0);
      glare.lineTo(x0 + pw * from + (y1 - y0) * 0.6, y0);
      glare.closePath();
    }
  }

  return {
    supports,
    nooks,
    open: (x, y) =>
      openings.some(([x0, y0, x1, y1]) => x > x0 + 3 && x < x1 - 3 && y > y0 + 3 && y < y1 - 3) &&
      !(x > potX - potWidth && x < potX + potWidth && y > potTop - 6) &&
      !nearSupport(supports.slice(openings.length), x, y, 6),
    paint(ctx, c) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(inner.l, inner.t, inner.r - inner.l, inner.b - inner.t);
      ctx.clip();
      ctx.fillStyle = c.sky;
      ctx.fillRect(inner.l, inner.t, inner.r - inner.l, inner.b - inner.t);
      ctx.fillStyle = c.sun;
      ctx.beginPath();
      ctx.arc(sun[0], sun[1], unit * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.cloud;
      ctx.fill(clouds);
      ctx.fillStyle = c.hillFar;
      ctx.fill(hillFar);
      ctx.fill(trees);
      ctx.fillStyle = c.hill;
      ctx.fill(hillNear);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of panes) ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.clip();
      ctx.fillStyle = c.glare;
      ctx.fill(glare);
      ctx.restore();

      ctx.fillStyle = c.wood;
      ctx.fill(frame, "evenodd");
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      ctx.stroke(frame);
      ctx.fillStyle = c.woodShade;
      ctx.fill(sill);
      ctx.stroke(sill);

      ctx.strokeStyle = c.leaf;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke(stems);
      ctx.fillStyle = c.leafLight;
      ctx.fill(plantLeaves);
      ctx.fillStyle = c.pot;
      ctx.fill(pot);

      ctx.fillStyle = c.curtain;
      ctx.fill(curtains);
      ctx.strokeStyle = c.curtainShade;
      ctx.lineWidth = 2;
      ctx.stroke(folds);
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, rodY);
      ctx.lineTo(w, rodY);
      ctx.stroke();
    },
  };
}

// ── A garden fence ───────────────────────────────────────────────────────────

/** Fence posts and rails, sunflowers growing up past them, long grass, and a washing line overhead. */
function fenceScene(w: number, h: number, unit: number, rand: Rand): Scene {
  const between = (a: number, b: number) => a + rand() * (b - a);
  const supports: Support[] = [];
  const nooks: Nook[] = [];
  const ground = h - clamp(h * 0.09, 26, 70);
  const postWidth = clamp(unit * 0.26, 18, 36);
  const railWidth = clamp(unit * 0.17, 12, 26);
  const postTop = h * between(0.26, 0.32);
  const rails = [h * between(0.42, 0.46), h * between(0.7, 0.75)];
  const spacing = clamp(unit * 2.6, 170, 380);
  const offset = between(0.2, 0.8) * spacing;

  const posts: number[] = [];
  for (let x = offset - spacing; x < w + spacing; x += spacing * between(0.9, 1.1)) posts.push(x);

  const wood = new Path2D();
  const grain = new Path2D();
  for (const x of posts) {
    const lift = between(-0.02, 0.02) * h;
    const y0 = postTop + lift;
    wood.moveTo(x - postWidth / 2, h + 4);
    wood.lineTo(x - postWidth / 2, y0 + postWidth * 0.4);
    wood.lineTo(x, y0);
    wood.lineTo(x + postWidth / 2, y0 + postWidth * 0.4);
    wood.lineTo(x + postWidth / 2, h + 4);
    wood.closePath();
    supports.push({ points: [[x, y0 + postWidth * 0.2], [x, ground]], width: postWidth });
    for (const y of rails) {
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          nooks.push({ at: [x + (sx * postWidth) / 2, y + (sy * railWidth) / 2], a: [sx, 0], b: [0, sy] });
        }
      }
    }
  }
  const railPaths = new Path2D();
  for (const y of rails) {
    railPaths.rect(-10, y - railWidth / 2, w + 20, railWidth);
    grain.moveTo(0, y + railWidth * 0.1);
    grain.bezierCurveTo(w * 0.3, y - railWidth * 0.15, w * 0.6, y + railWidth * 0.25, w, y);
    supports.push({ points: [[-4, y], [w + 4, y]], width: railWidth });
  }

  // A washing line sagging across the top, with a pair of socks on it.
  const lineY = h * between(0.07, 0.12);
  const sag = h * between(0.04, 0.07);
  const washing = Array.from({ length: 13 }, (_, i) => quad([-6, lineY], [w / 2, lineY + sag * 2], [w + 6, lineY + between(-0.02, 0.02) * h], i / 12));
  supports.push({ points: washing, width: 2 });
  const socks = new Path2D();
  for (let i = 0; i < 2; i++) {
    const at = washing[3 + Math.floor(rand() * 7)];
    const s = unit * 0.14;
    socks.moveTo(at[0] - s * 0.5, at[1]);
    socks.lineTo(at[0] + s * 0.5, at[1]);
    socks.lineTo(at[0] + s * 0.5, at[1] + s * 1.6);
    socks.quadraticCurveTo(at[0] + s * 1.5, at[1] + s * 1.7, at[0] + s * 1.3, at[1] + s * 2.4);
    socks.lineTo(at[0] - s * 0.1, at[1] + s * 2.3);
    socks.quadraticCurveTo(at[0] - s * 0.6, at[1] + s * 2.2, at[0] - s * 0.5, at[1] + s * 1.6);
    socks.closePath();
  }

  // Sunflowers growing up in front of the fence.
  const stems = new Path2D();
  const flowerLeaves = new Path2D();
  const petals = new Path2D();
  const cores = new Path2D();
  const heads: [number, number, number][] = [];
  const flowers = Math.max(2, Math.round(w / (unit * 3.2)));
  for (let i = 0; i < flowers; i++) {
    const x = w * ((i + between(0.2, 0.8)) / flowers);
    const topY = h * between(0.14, 0.36);
    const from: Vec = [x, ground + 6];
    const to: Vec = [x + between(-0.4, 0.4) * unit, topY];
    const bend: Vec = [(from[0] + to[0]) / 2 + between(-0.3, 0.3) * unit, (from[1] + to[1]) / 2];
    const points = Array.from({ length: 11 }, (_, k) => quad(from, bend, to, k / 10));
    const r = unit * between(0.13, 0.19);
    supports.push({ points: points.slice(0, 10), width: 5 });
    stems.moveTo(...points[0]);
    points.forEach((p) => stems.lineTo(...p));
    for (const k of [3, 6]) leaf(flowerLeaves, points[k][0], points[k][1], k === 3 ? -0.5 : Math.PI + 0.5, unit * 0.26);
    heads.push([to[0], to[1], r]);
    for (let p = 0; p < 12; p++) {
      const a = (p / 12) * Math.PI * 2;
      leaf(petals, to[0] + Math.cos(a) * r * 0.55, to[1] + Math.sin(a) * r * 0.55, a, r * 1.05);
    }
    cores.moveTo(to[0] + r * 0.62, to[1]);
    cores.arc(to[0], to[1], r * 0.62, 0, Math.PI * 2);
  }

  // Long grass along the bottom, a few stalks tall enough to tie a web to.
  const grass = new Path2D();
  grass.moveTo(-4, h + 4);
  for (let x = -4; x <= w + 12; x += 9) {
    grass.lineTo(x, ground + between(-0.04, 0.06) * unit);
    grass.lineTo(x + 4.5, ground + unit * between(0.08, 0.16));
  }
  grass.lineTo(w + 12, h + 4);
  grass.closePath();
  const blades = new Path2D();
  for (let i = 0, n = Math.round(w / (unit * 1.4)); i < n; i++) {
    const x = between(0, w);
    const from: Vec = [x, ground + 8];
    const to: Vec = [x + between(-0.35, 0.35) * unit, ground - unit * between(0.5, 1.1)];
    const points = Array.from({ length: 7 }, (_, k) => quad(from, [x, (from[1] + to[1]) / 2], to, k / 6));
    supports.push({ points, width: 3 });
    blades.moveTo(...points[0]);
    points.forEach((p) => blades.lineTo(...p));
  }

  return {
    supports,
    nooks,
    open: (x, y) =>
      x > 2 && x < w - 2 && y > 2 && y < ground - 8 && !nearSupport(supports, x, y, 6) && !heads.some(([hx, hy, r]) => Math.hypot(x - hx, y - hy) < r * 1.9),
    paint(ctx, c) {
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      washing.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
      ctx.stroke();
      ctx.fillStyle = c.sock;
      ctx.fill(socks);

      ctx.fillStyle = c.wood;
      ctx.fill(wood);
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      ctx.stroke(wood);
      ctx.fillStyle = c.woodShade;
      ctx.fill(railPaths);
      ctx.stroke(railPaths);
      ctx.strokeStyle = c.wood;
      ctx.stroke(grain);

      ctx.lineCap = "round";
      ctx.strokeStyle = c.leaf;
      ctx.lineWidth = 4;
      ctx.stroke(stems);
      ctx.fillStyle = c.leaf;
      ctx.fill(flowerLeaves);
      ctx.fillStyle = c.petal;
      ctx.fill(petals);
      ctx.fillStyle = c.petalCore;
      ctx.fill(cores);

      ctx.strokeStyle = c.leafLight;
      ctx.lineWidth = 2.5;
      ctx.stroke(blades);
      ctx.fillStyle = c.leafLight;
      ctx.fill(grass);
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function segmentsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
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

const quad = (a: Vec, b: Vec, c: Vec, t: number): Vec => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1],
];

/** A band along a line of points, `widths[i]` across at each, with a rounded end. */
function ribbon(points: Vec[], widths: number[]) {
  const left: Vec[] = [];
  const right: Vec[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / d;
    const ny = (b[0] - a[0]) / d;
    const half = widths[i] / 2;
    left.push([p[0] + nx * half, p[1] + ny * half]);
    right.push([p[0] - nx * half, p[1] - ny * half]);
  });
  const path = new Path2D();
  path.moveTo(...left[0]);
  for (const p of left) path.lineTo(...p);
  const end = points[points.length - 1];
  const half = widths[widths.length - 1] / 2;
  const heading = Math.atan2(end[1] - points[points.length - 2][1], end[0] - points[points.length - 2][0]);
  path.arc(end[0], end[1], half, heading + Math.PI / 2, heading - Math.PI / 2, true);
  for (const p of right.reverse()) path.lineTo(...p);
  path.closePath();
  return path;
}

/** A leaf from (x, y) pointing along `angle`, `length` long. */
function leaf(path: Path2D, x: number, y: number, angle: number, length: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const width = length * 0.4;
  const at = (u: number, v: number): [number, number] => [x + u * c - v * s, y + u * s + v * c];
  path.moveTo(...at(0, 0));
  path.quadraticCurveTo(...at(length * 0.5, width), ...at(length, 0));
  path.quadraticCurveTo(...at(length * 0.5, -width), ...at(0, 0));
  path.closePath();
}

/** Rolling ground from `x0` to `x1` around height `y`, filled down to `bottom`. */
function wavy(x0: number, x1: number, y: number, rise: number, bottom: number, rand: Rand) {
  const path = new Path2D();
  const phase = rand() * 10;
  path.moveTo(x0, bottom);
  for (let x = x0; x <= x1 + 8; x += 8) {
    path.lineTo(x, y - Math.sin(x * 0.006 + phase) * rise - Math.sin(x * 0.017 + phase * 2) * rise * 0.35);
  }
  path.lineTo(x1, bottom);
  path.closePath();
  return path;
}

/** Is (x, y) within `pad` px of the outside of any support? */
function nearSupport(supports: Support[], x: number, y: number, pad: number) {
  for (const s of supports) {
    const pts = s.closed ? [...s.points, s.points[0]] : s.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const dx = pts[i + 1][0] - ax;
      const dy = pts[i + 1][1] - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < s.width / 2 + pad) return true;
    }
  }
  return false;
}

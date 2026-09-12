/**
 * Verlet rope: a chain of points joined by fixed-length links.
 *
 * Pure physics, no DOM and no config: callers pass in forces and settings,
 * and pin points by setting `w` (inverse mass) to 0. Point 0 is the head
 * (attached to the logo), the last point is the tail (the spider).
 */

export interface RopePoint {
  x: number;
  y: number;
  /** Position last step; velocity is implied by x - px. */
  px: number;
  py: number;
  /** Inverse mass. 0 = pinned: forces and constraints won't move it. */
  w: number;
}

export interface Crossing {
  /** The link crossed runs from points[index] to points[index + 1]. */
  index: number;
  x: number;
  y: number;
}

export class Rope {
  /** The same array for the rope's lifetime, even when resampled. */
  readonly points: RopePoint[] = [];
  /** Rest length of each link, px. */
  private link = 0;

  constructor(segments: number) {
    for (let i = 0; i <= segments; i++) {
      this.points.push({ x: 0, y: 0, px: 0, py: 0, w: 1 });
    }
  }

  get head() {
    return this.points[0];
  }

  get tail() {
    return this.points[this.points.length - 1];
  }

  /** Total rest length in px. */
  get length() {
    return this.link * (this.points.length - 1);
  }

  setLength(total: number) {
    this.link = total / (this.points.length - 1);
  }

  /** Changes the number of links, keeping the current shape and motion. */
  setSegments(segments: number) {
    segments = Math.max(2, Math.round(segments));
    const total = this.length;
    const old = this.points.map((p) => ({ ...p }));
    this.points.length = 0;
    for (let i = 0; i <= segments; i++) {
      const f = (i / segments) * (old.length - 1);
      const a = old[Math.floor(f)];
      const b = old[Math.min(Math.floor(f) + 1, old.length - 1)];
      const t = f - Math.floor(f);
      this.points.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        px: a.px + (b.px - a.px) * t,
        py: a.py + (b.py - a.py) * t,
        w: 1,
      });
    }
    this.setLength(total);
  }

  /** Spreads `stringMass` (relative to the tail, which weighs 1) over the points between, and pins the head. */
  setMass(stringMass: number) {
    const w = (this.points.length - 2) / Math.max(stringMass, 0.001);
    for (const p of this.points) p.w = w;
    this.head.w = 0;
    this.tail.w = 1;
  }

  /** Lays the rope straight down from (x, y), motionless. */
  reset(x: number, y: number) {
    this.points.forEach((p, i) => {
      p.x = p.px = x;
      p.y = p.py = y + i * this.link;
    });
  }

  /**
   * Point `i` blended between the last two physics steps (alpha 0–1). Drawing
   * with this keeps motion even whatever the display's refresh rate, instead
   * of jumping by however many whole steps happened to fit in the frame.
   */
  at(i: number, alpha: number) {
    const p = this.points[i];
    return { x: p.px + (p.x - p.px) * alpha, y: p.py + (p.y - p.py) * alpha };
  }

  /** Shifts the whole rope without changing its motion. */
  translate(dx: number, dy: number) {
    for (const p of this.points) {
      p.x += dx;
      p.px += dx;
      p.y += dy;
      p.py += dy;
    }
  }

  /** Adds velocity (px/s) to one point; `dt` is the step length it'll be integrated over. */
  addVelocity(i: number, vx: number, vy: number, dt: number) {
    const p = this.points[i];
    if (!p || p.w === 0) return;
    p.px -= vx * dt;
    p.py -= vy * dt;
  }

  /**
   * Moves every free point by its velocity plus acceleration.
   * `drag`/`tailDrag` are 1/s damping for the string and the tail end.
   * `sideways(i)` is extra horizontal acceleration per point (px/s²).
   */
  integrate(dt: number, gravity: number, drag: number, tailDrag: number, sideways: (i: number) => number) {
    const keep = Math.exp(-drag * dt);
    const keepTail = Math.exp(-tailDrag * dt);
    const dt2 = dt * dt;
    const last = this.points.length - 1;

    for (let i = 0; i <= last; i++) {
      const p = this.points[i];
      if (p.w === 0) continue;
      const k = i === last ? keepTail : keep;
      const vx = (p.x - p.px) * k;
      const vy = (p.y - p.py) * k;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + sideways(i) * dt2;
      p.y += vy + gravity * dt2;
    }
  }

  /**
   * Pulls links back toward rest length (`stiffness` 0–1 per pass), then
   * tethers every point so the rope never stretches past `1 + maxStretch`.
   */
  solve(iterations: number, stiffness: number, maxStretch: number) {
    const pts = this.points;
    for (let it = 0; it < iterations; it++) {
      // Alternate sweep direction so corrections spread evenly both ways.
      const forward = it % 2 === 0;
      for (let k = 0; k < pts.length - 1; k++) {
        const i = forward ? k : pts.length - 2 - k;
        this.relax(pts[i], pts[i + 1], stiffness);
      }
    }
    this.tether(1 + maxStretch);
  }

  /**
   * Keeps every free point inside a box, bouncing rather than stopping dead:
   * `restitution` is how much speed comes back off an edge, `friction` how
   * much is scrubbed off along it, and `tailRadius` gives the tail some size.
   */
  contain(minX: number, minY: number, maxX: number, maxY: number, restitution: number, friction: number, tailRadius: number) {
    const last = this.points.length - 1;
    for (let i = 0; i <= last; i++) {
      const p = this.points[i];
      if (p.w === 0) continue;
      const r = i === last ? tailRadius : 0;
      let { x, y } = p;
      let vx = p.x - p.px;
      let vy = p.y - p.py;
      if (x < minX + r) {
        x = minX + r;
        vx = -vx * restitution;
        vy *= 1 - friction;
      } else if (x > maxX - r) {
        x = maxX - r;
        vx = -vx * restitution;
        vy *= 1 - friction;
      }
      if (y < minY + r) {
        y = minY + r;
        vy = -vy * restitution;
        vx *= 1 - friction;
      } else if (y > maxY - r) {
        y = maxY - r;
        vy = -vy * restitution;
        vx *= 1 - friction;
      }
      p.x = x;
      p.y = y;
      p.px = x - vx;
      p.py = y - vy;
    }
  }

  /** First link crossed by the line from (ax, ay) to (bx, by), if any. */
  intersect(ax: number, ay: number, bx: number, by: number): Crossing | null {
    const pts = this.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const hit = segmentIntersection(ax, ay, bx, by, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      if (hit) return { index: i, ...hit };
    }
    return null;
  }

  /** Point nearest to (x, y), measured to the links between points. */
  nearest(x: number, y: number) {
    const pts = this.points;
    let index = 0;
    let distance = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y);
      if (d < distance) {
        distance = d;
        index = t < 0.5 ? i : i + 1;
      }
    }
    return { index, distance };
  }

  private relax(a: RopePoint, b: RopePoint, stiffness: number) {
    const w = a.w + b.w;
    if (w === 0) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d === 0) return;
    const f = ((d - this.link) / d / w) * stiffness;
    a.x += dx * f * a.w;
    a.y += dy * f * a.w;
    b.x -= dx * f * b.w;
    b.y -= dy * f * b.w;
  }

  /**
   * Long-range attachment: point i may never be further than i links (times
   * `slack`) from the head. Keeps a light string with a heavy tail from
   * stretching, whatever the iteration count.
   */
  private tether(slack: number) {
    const head = this.head;
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      if (p.w === 0) continue;
      const max = i * this.link * slack;
      const dx = p.x - head.x;
      const dy = p.y - head.y;
      const d = Math.hypot(dx, dy);
      if (d <= max) continue;
      p.x = head.x + (dx / d) * max;
      p.y = head.y + (dy / d) * max;
    }
  }
}

function segmentIntersection(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
) {
  const rx = bx - ax, ry = by - ay;
  const sx = dx - cx, sy = dy - cy;
  const denom = rx * sy - ry * sx;
  if (denom === 0) return null;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / denom;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: ax + t * rx, y: ay + t * ry };
}

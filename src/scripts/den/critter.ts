import { createAnimations } from "../spider-string/animation";
import { config, schema } from "../spider-string/config";
import { easeFace, faceFor } from "../spider-string/face";
import { parseLook, setLook } from "../spider-string/look";
import { createMood, looks } from "../spider-string/mood";
import { Particles } from "../spider-string/particles";
import { drawString, threadStyle } from "../spider-string/render";
import { Rope } from "../spider-string/rope";
import { createSpeedLines } from "../spider-string/speedlines";
import { createSpider } from "../spider-string/spider";
import type { Look } from "../spider-string/wardrobe";
import { createZees } from "../spider-string/zees";
import { type Member, nameOf, sizeOf } from "./colony";
import { den } from "./config";
import type { Spot, Vec, Web } from "./web";

/**
 * One spider living in the Spider Den.
 *
 * It's the site's own spider (spider.ts), with its own mood (mood.ts) and idle life (animation.ts),
 * so everything tuned on the home page applies: how it looks, its faces, its legs, how it's thrown
 * and how its string behaves. What's new is where it lives: out on the webs.
 *
 *   web      on a thread: walking somewhere, sitting, napping, or eating something it caught
 *   dangle   hanging from a thread on a string of its own, which you can pull about and snap
 *   air      flung, fallen or jumping: threads slow it as it crosses them, and catch it once it's slow
 *   held     in your hand
 *   ghost    starved, floating away
 *
 * The den works in CSS px from its top-left corner. The spider's drawing and mood work in document
 * px (they follow the cursor), so its string is shifted by the den's origin while they update.
 */

const DEG = Math.PI / 180;
/** A grown-up is the den's Grown-up spider wide whatever Spider width is tuned to on the home page: it's this many b. */
export const WIDTH = schema.look.params.width.value;
const between = (a: number, b: number) => Math.min(a, b) + Math.random() * Math.abs(b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type Mode = "web" | "dangle" | "air" | "held" | "ghost";
type Task = "rest" | "walk" | "hunt" | "eat" | "nap";

/** Something a spider can catch: a bug stuck on a thread. */
export interface Prey {
  state: string;
  spot: Spot | null;
  x: number;
  y: number;
  claimedBy: Critter | null;
}

/** What a spider knows about the den it lives in. */
export interface DenWorld {
  web: Web;
  /** px per b. */
  unit: number;
  /** The den's top-left corner, document px. */
  origin: Vec;
  /** The cursor, den px, or null when it's elsewhere. */
  pointer: Vec | null;
  /** Dashes flicking off threads, den px. */
  particles: Particles;
  critters: Critter[];
  /** Which spider is picked, and whether it's the one being dressed (so it shows what's tried on). */
  pickedId: string | null;
  trying: Look;
  /** A stuck bug within `range` px of (x, y) that nobody else is after. */
  preyNear(x: number, y: number, range: number, hunter: Critter): Prey | null;
  /** It's eating `prey`: take it off the web and into its mouth. */
  eating(hunter: Critter, prey: Prey): void;
  /** …and it's finished. */
  ate(hunter: Critter, prey: Prey): void;
  /** A string snapped: what's left hangs from `anchor` and fades. */
  strand(points: Rope, anchor: Spot, thread: Look["thread"]): void;
  /** Lets go of the pointer's hold on this spider (it's been taken away, say). */
  drop(critter: Critter): void;
  /** Draws a fly at (x, y), `size` across (document px). */
  drawBug(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, wing: number): void;
}

export type Critter = ReturnType<typeof createCritter>;

export function createCritter(member: Member, world: DenWorld) {
  const shown: Look = parseLook(JSON.stringify(member.look));
  const bob = document.createElement("div");
  const root = document.createElement("div");
  const rope = new Rope(Math.max(3, Math.round(den.dangling.segments)));
  let held = false;
  let mode: Mode = "web";

  const animations = createAnimations(rope, () => held, { listen: false });
  const mood = createMood(root, rope, () => held, () => held, {
    listen: false,
    blink: () => animations.play("blink"),
  });
  const spider = createSpider(bob, rope, animations.state, mood.face, shown);
  const zees = createZees();
  const wind = new Particles();
  const speedLines = createSpeedLines(wind);

  // ── Where it is ───────────────────────────────────────────────────────────
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  /** What its drawing and mood are told its velocity is: smoothed on the web, so landing a jump isn't a jolt. */
  let seenV: Vec = [0, 0];
  let time = Math.random() * 100;

  // ── On the web ────────────────────────────────────────────────────────────
  let spot: Spot = { edge: 0, t: 0 };
  /** The node it's walking toward on this thread (−1: not walking), the nodes after that, and where on the last thread it stops. */
  let toward = -1;
  let route: number[] = [];
  let finish: Spot | null = null;
  let task: Task = "rest";
  let timer = between(0.3, 2.5);
  let huntCheck = 0;
  let prey: Prey | null = null;
  /** What it's eating, and for how much longer. */
  let meal: Prey | null = null;
  let chew = 0;
  let hurry = 1;
  let walkPhase = Math.random() * 10;
  let walking = 0;
  let lean = 0;
  let tumble = 0;

  // ── Dangling ──────────────────────────────────────────────────────────────
  let anchor: Spot = { edge: 0, t: 0 };
  let phase: "down" | "hang" | "up" = "down";
  let length = 0;
  let reelTo = 0;
  let pending = 0;
  let letOut = 0;
  /** How far past its reach it's being pulled (for letting the string out), and 0–1 through the wind-up. */
  let stretch = 0;
  let tension = 0;
  let woundFor = 0;

  // ── In the air ────────────────────────────────────────────────────────────
  let launch: Vec | null = null;
  const recent = new Map<number, number>();
  let airTime = 0;
  let jump: { x0: number; y0: number; vx: number; vy: number; t: number; T: number; to: Spot } | null = null;
  /** The line of silk left by a jump. */
  let silk: { from: Vec; to: Vec; age: number } | null = null;

  // ── In your hand ──────────────────────────────────────────────────────────
  const hand = { x: 0, y: 0, ox: 0, oy: 0 };

  // ── Looks ─────────────────────────────────────────────────────────────────
  /** Where it's held from: 1 round its middle (on a thread, in the air, in your hand), 0 the top of its head (on a string). */
  let attach = 1;
  let nap = 0;
  let ghost = 0;
  let foodNear = 0;
  let bubble = 0;
  let bubbleIn = between(3, 9);

  /** px per b for this spider: the den's, scaled by how big it's grown. */
  const unitNow = () => world.unit * sizeOf(member);
  const radius = () => (WIDTH * unitNow()) / 2;
  const toDoc = (p: Vec): Vec => [p[0] + world.origin[0], p[1] + world.origin[1]];
  const docCenter = () => spider.center();
  /** Middle of its body, den px. */
  const center = (): Vec => {
    const c = docCenter();
    return c ? [c[0] - world.origin[0], c[1] - world.origin[1]] : [x, y];
  };

  const tell = (type: "spider:grab" | "spider:release") => root.dispatchEvent(new CustomEvent(type));

  // ── Getting about on the threads ──────────────────────────────────────────

  const pathLength = (start: number, path: number[]) => {
    let total = 0;
    let at = start;
    for (const next of path) {
      total += Math.hypot(world.web.x(next) - world.web.x(at), world.web.y(next) - world.web.y(at));
      at = next;
    }
    return total;
  };

  /** Sets off to node `node`, or to `goal` part-way along a thread. False if there's no way there. */
  const goTo = ({ node, goal }: { node?: number; goal?: Spot }) => {
    const web = world.web;
    const [a, b] = web.ends(spot.edge);
    if (goal && goal.edge === spot.edge) {
      route = [];
      finish = { ...goal };
      toward = goal.t >= spot.t ? b : a;
      return true;
    }
    let target = node ?? -1;
    if (goal) {
      const [ga, gb] = web.ends(goal.edge);
      target = goal.t < 0.5 ? ga : gb;
    }
    if (target < 0) return false;
    const len = web.length(spot.edge);
    let best: { start: number; path: number[]; cost: number } | null = null;
    for (const start of [a, b]) {
      const path = web.path(start, target);
      if (!path) continue;
      const cost = (start === a ? spot.t : 1 - spot.t) * len + pathLength(start, path);
      if (!best || cost < best.cost) best = { start, path, cost };
    }
    if (!best) return false;
    toward = best.start;
    route = best.path;
    finish = goal ? { ...goal } : null;
    return true;
  };

  /** Walks `distance` px along its way. True once it's there. */
  const walk = (distance: number) => {
    const web = world.web;
    let left = distance;
    for (let guard = 0; left > 0 && toward >= 0 && guard < 64; guard++) {
      const [a, b] = web.ends(spot.edge);
      const len = Math.max(0.001, web.length(spot.edge));
      const last = route.length === 0 && finish !== null && finish.edge === spot.edge;
      const end = last ? finish!.t : toward === b ? 1 : 0;
      const room = Math.abs(end - spot.t) * len;
      if (left < room) {
        spot.t += (Math.sign(end - spot.t) * left) / len;
        return false;
      }
      left -= room;
      spot.t = end;
      if (last) break;
      const at = toward === b ? b : a;
      if (route.length) {
        const next = route.shift()!;
        const e = web.between(at, next);
        if (e < 0) break;
        spot = { edge: e, t: web.ends(e)[0] === at ? 0 : 1 };
        toward = next;
      } else if (finish) {
        const [fa, fb] = web.ends(finish.edge);
        if (fa !== at && fb !== at) break;
        spot = { edge: finish.edge, t: fa === at ? 0 : 1 };
        toward = fa === at ? fb : fa;
      } else break;
    }
    if (left > 0 || toward < 0) {
      toward = -1;
      route = [];
      finish = null;
      return true;
    }
    return false;
  };

  const rest = (seconds: number) => {
    task = "rest";
    timer = seconds;
    toward = -1;
    route = [];
    finish = null;
    hurry = 1;
  };

  const myWeb = () => {
    const [a, b] = world.web.ends(spot.edge);
    return Math.max(world.web.webOf(a), world.web.webOf(b));
  };

  const wander = () => {
    const web = world.web;
    const far = den.habits.wanderFar * world.unit;
    const node = web.nodeNear(x, y, Math.min(far * 0.3, world.unit * 0.3), far);
    if (node < 0 || !goTo({ node })) return false;
    task = "walk";
    return true;
  };

  const goHub = () => {
    const hub = world.web.hubs[myWeb()]?.node ?? -1;
    if (hub < 0 || Math.hypot(world.web.x(hub) - x, world.web.y(hub) - y) < world.unit * 0.2) return false;
    if (!goTo({ node: hub })) return false;
    task = "walk";
    return true;
  };

  const goFamily = () => {
    const parent = world.critters.find((c) => c.member.id === member.parent);
    if (!parent || parent.mode !== "web") return false;
    const [px, py] = parent.position;
    if (Math.hypot(px - x, py - y) < world.unit * 0.8) return false;
    const node = world.web.nodeNear(px, py, 0, world.unit * 0.9);
    if (node < 0 || !goTo({ node })) return false;
    task = "walk";
    return true;
  };

  const tryHunt = () => {
    if (member.fullness >= den.hunger.hunt) return false;
    const found = world.preyNear(x, y, den.hunger.huntRange * world.unit, me);
    if (!found?.spot || !goTo({ goal: found.spot })) return false;
    if (prey && prey !== found && prey.claimedBy === me) prey.claimedBy = null;
    prey = found;
    found.claimedBy = me;
    task = "hunt";
    hurry = den.walking.hungrySpeed;
    return true;
  };

  const startNap = () => {
    task = "nap";
    timer = between(den.habits.napFrom, den.habits.napTo);
    toward = -1;
    return true;
  };

  const startDangle = () => {
    const [ax, ay] = world.web.point(spot);
    const room = world.web.height - ay - radius() * 2.2;
    if (room < world.unit * 0.4) return false;
    anchor = { ...spot };
    mode = "dangle";
    phase = "down";
    reelTo = Math.min(room, between(den.dangling.lengthFrom, den.dangling.lengthTo) * world.unit);
    length = world.unit * 0.04;
    if (rope.points.length - 1 !== Math.round(den.dangling.segments)) rope.setSegments(den.dangling.segments);
    rope.setLength(length);
    rope.reset(ax, ay);
    pending = 0;
    letOut = 0;
    return true;
  };

  const startJump = () => {
    const web = world.web;
    const j = den.jumping;
    const home = myWeb();
    const node = web.nodeNear(
      x,
      y,
      Math.min(j.rangeFrom, j.rangeTo) * world.unit,
      Math.max(j.rangeFrom, j.rangeTo) * world.unit,
      (n) => web.webOf(n) >= 0 && web.webOf(n) !== home && web.linksOf(n).length > 0,
    );
    if (node < 0) return false;
    const e = web.linksOf(node)[0];
    const to: Spot = { edge: e, t: web.ends(e)[0] === node ? 0 : 1 };
    const [tx, ty] = web.point(to);
    const distance = Math.hypot(tx - x, ty - y);
    const T = Math.max(0.33, (distance / world.unit) * j.time);
    const g = config.rope.gravity * world.unit;
    jump = { x0: x, y0: y, vx: (tx - x) / T, vy: (ty - y - 0.5 * g * T * T) / T, t: 0, T, to };
    web.push(x, y, -jump.vx * 0.15, -jump.vy * 0.15);
    mode = "air";
    toward = -1;
    return true;
  };

  /** What next? Hunt if it's hungry and something's stuck nearby, otherwise one of its habits. */
  const decide = () => {
    if (tryHunt()) return;
    const h = den.habits;
    const baby = member.growth < 1 && member.parent;
    const choices: [number, () => boolean][] = [
      [h.wander, wander],
      [h.hub, goHub],
      [h.dangle, startDangle],
      [h.jump, startJump],
      [h.nap, startNap],
      [baby ? h.family : 0, goFamily],
    ];
    let roll = Math.random() * choices.reduce((sum, [w]) => sum + Math.max(0, w), 0);
    for (const [weight, act] of choices) {
      roll -= Math.max(0, weight);
      if (roll > 0) continue;
      if (act()) return;
      break;
    }
    rest(between(h.restFrom, h.restTo));
  };

  const wake = () => {
    if (task !== "nap") return;
    rest(between(0.8, 2));
    mood.feel("wake", config.faceWake.hold);
  };

  /** Puts it on a thread, sitting still. */
  const settle = (at: Spot, restFor = between(0.3, 1.2)) => {
    mode = "web";
    spot = { ...at };
    [x, y] = world.web.point(spot);
    vx = vy = 0;
    launch = null;
    jump = null;
    recent.clear();
    rest(restFor);
  };

  const thinkWeb = (dt: number) => {
    const web = world.web;
    const before: Vec = [x, y];
    const w = den.walking;
    const speed = w.speed * world.unit * (w.babySpeed + (1 - w.babySpeed) * member.growth) * hurry;

    if (task === "walk" || task === "hunt") {
      if (task === "hunt" && (!prey || prey.state !== "stuck")) {
        if (prey?.claimedBy === me) prey.claimedBy = null;
        prey = null;
        rest(between(0.2, 0.8));
      } else if (walk(speed * dt)) {
        const caught = prey;
        prey = null;
        if (task === "hunt" && caught && caught.state === "stuck") {
          task = "eat";
          toward = -1;
          me.eat(caught);
        } else {
          rest(between(den.habits.restFrom, den.habits.restTo));
        }
      }
    } else if (task === "eat") {
      if (!meal) rest(between(1.5, 3));
    } else if (task === "nap") {
      timer -= dt;
      const p = world.pointer;
      const c = center();
      const near = p && Math.hypot(p[0] - c[0], p[1] - c[1]) - radius() < den.habits.wakeRadius * world.unit;
      if (timer <= 0 || near) wake();
    } else {
      timer -= dt;
      huntCheck -= dt;
      if (huntCheck <= 0) {
        huntCheck = 1;
        if (tryHunt()) return;
      }
      if (timer <= 0) decide();
    }

    if (mode !== "web") return;
    [x, y] = web.point(spot);
    const moved = Math.hypot(x - before[0], y - before[1]);
    walkPhase += (moved / Math.max(1, unitNow())) * w.steps * Math.PI * 2;
    const step = dt > 0 ? moved / dt / Math.max(1, speed) : 0;
    walking += ((toward >= 0 ? Math.min(1, step) : 0) - walking) * (1 - Math.exp(-10 * dt));
    const sideways = dt > 0 ? (x - before[0]) / dt / Math.max(1, speed) : 0;
    lean += (clamp(sideways, -1, 1) * w.lean * DEG - lean) * (1 - Math.exp(-6 * dt));
    if (dt > 0) {
      vx = (x - before[0]) / dt;
      vy = (y - before[1]) / dt;
    }
  };

  // ── On a string ───────────────────────────────────────────────────────────

  const breeze = (i: number, strength: number) => {
    const s = (i / (rope.points.length - 1)) * config.sway.ripple;
    const t = time * config.sway.speed * Math.PI * 2;
    return strength * (0.65 * Math.sin(t + s * 2.2) + 0.35 * Math.sin(t * 2.3 + s * 5 + 1.3));
  };

  /** Where the held spider wants to be on its string for where the pointer is: a rubber band past its reach (drag.ts). */
  const pulledTo = () => {
    const pull = config.pull;
    const head = rope.head;
    const span = rope.length;
    const reach = span * config.drag.reach;
    const give = pull.stretch * span;
    const px = hand.x + hand.ox - head.x;
    const py = hand.y + hand.oy - head.y;
    const beyond = (excess: number) =>
      give > 0 && excess > 0 ? give * (1 - Math.exp(-excess / Math.max(1e-6, pull.softness * span))) : 0;
    const d = Math.hypot(px, py) || 1;
    const extra = beyond(d - reach);
    const scale = d > reach ? (reach + extra) / d : 1;
    let point = { x: head.x + px * scale, y: head.y + py * scale };
    tension = give > 0 ? extra / give : 0;
    const out = Math.hypot(point.x - head.x, point.y - head.y);
    stretch = span > 0 ? Math.max(0, (out - span) / span) : 0;
    if (pull.shake > 0 && tension > pull.shakeStart) {
      const over = (tension - pull.shakeStart) / Math.max(1e-6, 1 - pull.shakeStart);
      const t = performance.now() / 1000;
      const wobble = 0.7 * Math.sin(t * pull.shakeSpeed * Math.PI * 2) + 0.3 * Math.sin(t * pull.shakeSpeed * 3.1 * Math.PI * 2 + 1.3);
      const amount = over * pull.shake * world.unit * wobble;
      const len = out || 1;
      point = { x: point.x - ((point.y - head.y) / len) * amount, y: point.y + ((point.x - head.x) / len) * amount };
    }
    return point;
  };

  /** The string gives: the spider goes free (still in your hand, if you've got it), and what's left hangs from the web. */
  const snap = () => {
    const tail = rope.tail;
    const rate = config.sim.rate;
    world.strand(rope, anchor, member.look.thread);
    const boost = den.snapping.boost;
    const [hx, hy] = world.web.point(anchor);
    x = tail.x;
    y = tail.y;
    vx = (tail.x - tail.px) * rate * boost;
    vy = (tail.y - tail.py) * rate * boost;
    world.web.push(hx, hy, -vx * 0.4, -vy * 0.4 - world.unit * 4);
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = world.unit * (1.5 + Math.random() * 2);
      world.particles.spawn({
        x,
        y: y - radius() * 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: world.unit * 0.08,
        width: Math.max(1, world.unit * 0.018),
        life: 0.35,
        drag: 7,
        gravity: 0,
        shrink: 0.6,
      });
    }
    tension = 0;
    stretch = 0;
    woundFor = 0;
    if (held) {
      mode = "held";
      hand.ox = x - hand.x;
      hand.oy = y - hand.y;
    } else {
      mode = "air";
      launch = [x, y];
      airTime = 0;
      recent.clear();
    }
  };

  const thinkDangle = (dt: number) => {
    const web = world.web;
    const d = den.dangling;
    const [hx, hy] = web.point(anchor);
    if (!held) {
      if (phase === "down") {
        length = Math.min(reelTo, length + d.down * world.unit * dt);
        if (length >= reelTo) {
          phase = "hang";
          timer = between(d.forFrom, d.forTo);
        }
      } else if (phase === "hang") {
        timer -= dt;
        if (timer <= 0) phase = "up";
      } else {
        length -= d.up * world.unit * dt;
        if (length <= world.unit * 0.04) {
          settle(anchor, between(0.5, 2));
          return;
        }
      }
    }
    rope.setLength(Math.max(1, length));

    const step = 1 / config.sim.rate;
    const gravity = config.rope.gravity * world.unit;
    const sway = config.sway.strength * world.unit;
    for (pending += dt; pending >= step; pending -= step) {
      rope.setMass(config.rope.mass);
      rope.head.x = rope.head.px = hx;
      rope.head.y = rope.head.py = hy;
      if (held) {
        const p = rope.tail;
        p.w = 0;
        const to = pulledTo();
        const k = 1 - Math.exp(-config.drag.follow * step);
        p.px = p.x;
        p.py = p.y;
        p.x += (to.x - p.x) * k;
        p.y += (to.y - p.y) * k;
      } else {
        stretch = tension = 0;
      }
      rope.integrate(step, gravity, config.rope.drag, config.bob.drag, (i) => breeze(i, sway));
      const want = held ? Math.max(config.rope.maxStretch, stretch) : config.rope.maxStretch;
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
    }
    const tail = rope.tail;
    x = tail.x;
    y = tail.y;
    vx = (tail.x - tail.px) * config.sim.rate;
    vy = (tail.y - tail.py) * config.sim.rate;

    // Holding it right out, the string gives on its own.
    const s = den.snapping;
    woundFor = held && tension > 0.95 ? woundFor + dt : 0;
    if (s.whileHeld && woundFor >= s.holdFor) snap();
  };

  // ── Flying ────────────────────────────────────────────────────────────────

  /** It's crossing a thread: slowed, the thread gives, and if it's slow enough now, caught. True if caught. */
  const crossThread = (hit: { edge: number; t: number; x: number; y: number }) => {
    const c = den.catching;
    const web = world.web;
    const [nx, ny] = web.normal(hit.edge);
    const into = vx * nx + vy * ny;
    const tx = vx - into * nx;
    const ty = vy - into * ny;
    const speed = Math.hypot(vx, vy);
    const left = Math.sign(into) * Math.max(0, Math.abs(into) * c.keep - c.grip * world.unit);
    const glance = 1 - (1 - c.keep) * 0.35;
    const weight = 0.6 + sizeOf(member) * 0.6;
    web.push(hit.x, hit.y, vx * weight, vy * weight);
    vx = tx * glance + left * nx;
    vy = ty * glance + left * ny;
    if (speed > c.catchSpeed * world.unit * 2.5) {
      const side = Math.sign(into) || 1;
      for (let i = 0; i < 2; i++) {
        const spread = (Math.random() - 0.5) * 1.2;
        const kick = world.unit * (1 + Math.random() * 1.5);
        world.particles.spawn({
          x: hit.x,
          y: hit.y,
          vx: (nx * side * Math.cos(spread) - ny * Math.sin(spread)) * kick,
          vy: (ny * side * Math.cos(spread) + nx * Math.sin(spread)) * kick,
          length: world.unit * 0.06,
          width: 1,
          life: 0.25,
          drag: 8,
          gravity: 0,
          shrink: 0.6,
        });
      }
    }
    if (Math.hypot(vx, vy) >= c.catchSpeed * world.unit) return false;
    settle({ edge: hit.edge, t: hit.t }, speed > world.unit * 6 ? between(1.2, 2.2) : between(0.3, 1));
    seenV = [0, 0];
    return true;
  };

  const thinkAir = (dt: number) => {
    const web = world.web;
    const g = config.rope.gravity * world.unit;
    if (jump) {
      jump.t += dt;
      const t = Math.min(jump.t, jump.T);
      x = jump.x0 + jump.vx * t;
      y = jump.y0 + jump.vy * t + 0.5 * g * t * t;
      vx = jump.vx;
      vy = jump.vy + g * t;
      if (jump.t >= jump.T) {
        const to = jump.to;
        if (den.jumping.silk > 0) silk = { from: [jump.x0, jump.y0], to: web.point(to), age: 0 };
        web.push(x, y, vx * 0.5, vy * 0.5);
        const keep = seenV;
        settle(to, between(0.5, 1.5));
        seenV = keep;
      }
      return;
    }

    airTime += dt;
    const speed = Math.hypot(vx, vy);
    const steps = Math.min(24, Math.max(1, Math.ceil((speed * dt) / (world.unit * 0.1))));
    const h = dt / steps;
    const keep = Math.exp(-config.bob.drag * h);
    const grace = den.catching.grace * world.unit;
    for (let i = 0; i < steps; i++) {
      vy += g * h;
      vx *= keep;
      vy *= keep;
      const nx = x + vx * h;
      const ny = y + vy * h;
      for (const hit of web.crossings(x, y, nx, ny)) {
        if ((recent.get(hit.edge) ?? -1) > airTime - 0.15) continue;
        if (launch && Math.hypot(hit.x - launch[0], hit.y - launch[1]) < grace) continue;
        recent.set(hit.edge, airTime);
        if (crossThread(hit)) return;
      }
      x = nx;
      y = ny;
      const m = radius();
      const W = web.width;
      const H = web.height;
      if (den.world.wrap) {
        let wrapped = false;
        if (x < -m) (x += W + 2 * m), (wrapped = true);
        else if (x > W + m) (x -= W + 2 * m), (wrapped = true);
        if (y > H + m) (y -= H + 2 * m), (wrapped = true);
        if (wrapped) {
          launch = null;
          recent.clear();
        }
      } else {
        const bounce = config.edges.bounce;
        if (x < m || x > W - m) (x = clamp(x, m, W - m)), (vx = -vx * bounce);
        if (y < m || y > H - m) (y = clamp(y, m, H - m)), (vy = -vy * bounce), (vx *= 1 - config.edges.friction);
      }
    }
    // Never caught (falling through a gap forever, say): grab the nearest thread.
    if (airTime > 12) {
      const near = web.nearest(x, y, Math.max(web.width, web.height));
      if (near) settle(near);
    }
    // Tumbling as it goes, the faster the more.
    tumble += clamp(vx / (world.unit * 20), -1, 1) * 9 * dt;
  };

  const thinkHeld = (dt: number) => {
    const k = 1 - Math.exp(-config.drag.follow * dt);
    const bx = x;
    const by = y;
    x += (hand.x + hand.ox - x) * k;
    y += (hand.y + hand.oy - y) * k;
    if (dt > 0) {
      vx = (x - bx) / dt;
      vy = (y - by) / dt;
    }
  };

  // ── Keeping its drawing and mood up to date ───────────────────────────────

  /** Lays its string out for the spider and its mood: all of it on the spider, unless it's dangling. */
  const syncRope = () => {
    if (mode === "dangle") return;
    const rate = config.sim.rate;
    for (const p of rope.points) {
      p.x = x;
      p.y = y;
      p.px = x - seenV[0] / rate;
      p.py = y - seenV[1] / rate;
    }
  };

  const napFace = () =>
    faceFor(
      looks.asleep({ time, since: 0, hold: 1, previewing: false, impactAxis: [0, 1], toward: [0, 0], wince: 1 }),
      1,
    );

  const me = {
    member,

    get mode() {
      return mode;
    },
    get held() {
      return held;
    },
    get dangling() {
      return mode === "dangle";
    },
    get napping() {
      return task === "nap" && mode === "web";
    },
    get busy() {
      return meal !== null;
    },
    get gone() {
      return mode === "ghost" && ghost >= 3.5;
    },
    /** Where it is: on the thread, or on the end of its string. Den px. */
    get position(): Vec {
      return [x, y];
    },
    /** Set by the den while you're carrying a bug toward its mouth (0–1). */
    set foodNear(amount: number) {
      if (amount === foodNear) return;
      foodNear = amount;
      if (!meal) animations.mouthOpen(amount);
    },

    center,
    radius,
    unit: unitNow,
    /** Its mouth, den px. */
    mouth(): Vec {
      const [mx, my] = spider.mouth();
      return mx || my ? [mx - world.origin[0], my - world.origin[1]] : center();
    },

    /** How far (x, y) is from being on it, px: 0 or less is on it. */
    distance(px: number, py: number) {
      const [cx, cy] = center();
      return Math.hypot(px - cx, py - cy) - Math.max(radius() * 0.75, 16);
    },

    /** Drops it onto the web near (x, y): on the nearest thread, or falling if there isn't one. */
    placeNear(px: number, py: number) {
      const near = world.web.nearest(px, py, world.unit * 3);
      if (near) settle(near, between(0.2, 2));
      else {
        mode = "air";
        x = px;
        y = py;
        vx = vy = 0;
        launch = null;
      }
    },

    /** Throws it from (px, py) at (pvx, pvy) px/s. */
    toss(px: number, py: number, pvx: number, pvy: number) {
      mode = "air";
      x = px;
      y = py;
      vx = pvx;
      vy = pvy;
      launch = [px, py];
      airTime = 0;
      recent.clear();
      jump = null;
    },

    /** The webs were rebuilt: back onto the nearest thread, or let go. */
    rewoven() {
      prey = null;
      if (mode === "web") me.placeNear(x, y);
      else if (mode === "dangle") {
        mode = "air";
        launch = null;
      } else if (mode === "air" && jump) {
        jump = null;
      }
      silk = null;
    },

    grab(px: number, py: number) {
      held = true;
      hand.x = px;
      hand.y = py;
      if (task === "nap") wake();
      if (prey?.claimedBy === me) prey.claimedBy = null;
      prey = null;
      if (mode === "dangle") {
        const tail = rope.tail;
        hand.ox = tail.x - px;
        hand.oy = tail.y - py;
      } else {
        if (mode === "web") world.web.push(x, y, 0, -world.unit * 3);
        mode = "held";
        jump = null;
        hand.ox = x - px;
        hand.oy = y - py;
      }
      tell("spider:grab");
    },

    moveHand(px: number, py: number) {
      hand.x = px;
      hand.y = py;
    },

    /** Let go, with the pointer moving at `thrown` px/s (or null if it had stopped). */
    release(thrown: Vec | null) {
      if (!held) return;
      held = false;
      const d = config.drag;
      if (mode === "dangle") {
        const p = rope.tail;
        const h = 1 / config.sim.rate;
        let pvx = p.x - p.px;
        let pvy = p.y - p.py;
        if (thrown && d.throwPower > 0) {
          const tx = thrown[0] * d.throwPower * h;
          const ty = thrown[1] * d.throwPower * h;
          if (Math.hypot(tx, ty) > Math.hypot(pvx, pvy)) {
            pvx = tx;
            pvy = ty;
          }
        }
        const max = d.maxThrow * world.unit * h;
        const v = Math.hypot(pvx, pvy);
        const scale = v > max ? max / v : 1;
        p.px = p.x - pvx * scale;
        p.py = p.y - pvy * scale;
        const wound = tension;
        if (wound > 0 && config.pull.fling > 0) {
          const dx = rope.head.x - p.x;
          const dy = rope.head.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const kick = config.pull.fling * world.unit * wound * h;
          p.px -= (dx / dist) * kick;
          p.py -= (dy / dist) * kick;
        }
        p.w = 1;
        tell("spider:release");
        if (wound >= Math.min(den.snapping.breakAt, 0.985)) snap();
        else if (phase === "down") phase = "hang";
        return;
      }
      if (mode !== "held") return;
      let tvx = vx;
      let tvy = vy;
      if (thrown && d.throwPower > 0 && Math.hypot(thrown[0], thrown[1]) * d.throwPower > Math.hypot(tvx, tvy)) {
        tvx = thrown[0] * d.throwPower;
        tvy = thrown[1] * d.throwPower;
      }
      const max = d.maxThrow * world.unit;
      const speed = Math.hypot(tvx, tvy);
      if (speed > max) {
        tvx *= max / speed;
        tvy *= max / speed;
      }
      tell("spider:release");
      const c = den.catching;
      const near = Math.hypot(tvx, tvy) < c.dropSpeed * world.unit ? world.web.nearest(x, y, c.dropCatch * world.unit) : null;
      if (near) {
        settle(near, between(0.6, 1.6));
        world.web.push(near.x, near.y, 0, world.unit * 2);
      } else me.toss(x, y, tvx, tvy);
    },

    /** Eats `food`: into its mouth, a moment's chewing, then it's fed. */
    eat(food: Prey) {
      if (meal) world.ate(me, meal);
      if (task === "nap") wake();
      meal = food;
      chew = 1.1;
      animations.mouthOpen(1);
      world.eating(me, food);
    },

    /** A trick or mood from the wardrobe. Abseiling in is dangling here. */
    play(id: string) {
      if (id === "dropIn") {
        if (mode === "web" && !held) startDangle();
        return;
      }
      animations.play(id);
      mood.play(id);
    },

    /** Lay eggs: a proud moment. */
    proud() {
      mood.feel("excited", 1.5);
    },

    /** Starved: it floats away. */
    die() {
      if (held) world.drop(me);
      held = false;
      if (prey?.claimedBy === me) prey.claimedBy = null;
      if (meal) world.ate(me, meal);
      meal = null;
      mode = "ghost";
      ghost = 0;
    },

    think(dt: number) {
      time += dt;
      if (meal) {
        chew -= dt;
        if (chew < 0.35) animations.mouthOpen(0);
        if (chew <= 0) {
          const food = meal;
          meal = null;
          world.ate(me, food);
          mood.ate();
        }
      }
      if (silk) {
        silk.age += dt;
        if (silk.age > den.jumping.silk) silk = null;
      }
      if (mode === "ghost") {
        ghost += dt;
        y -= world.unit * 0.35 * dt;
        x += Math.sin(ghost * 2.2) * world.unit * 0.12 * dt;
        vx = vy = 0;
      } else if (mode === "web") thinkWeb(dt);
      else if (mode === "dangle") thinkDangle(dt);
      else if (mode === "air") thinkAir(dt);
      else if (mode === "held") thinkHeld(dt);
      if (mode !== "air") tumble += (Math.round(tumble / (Math.PI * 2)) * Math.PI * 2 - tumble) * (1 - Math.exp(-8 * dt));

      // Now and then a hungry spider thinks about flies.
      bubble = Math.max(0, bubble - dt);
      bubbleIn -= dt;
      if (bubbleIn <= 0) {
        bubbleIn = between(7, 13);
        if (member.fullness < den.marks.hungry && mode === "web" && task !== "nap" && task !== "eat") bubble = 2.4;
      }
    },

    /** After thinking: its mood, idle life and pose, ready to draw. `pixelRatio` is the canvas's. */
    animate(dt: number, pixelRatio: number) {
      const [ox, oy] = world.origin;
      const unit = unitNow();
      const smooth = mode === "web" ? 1 - Math.exp(-8 * dt) : 1;
      seenV = [seenV[0] + (vx - seenV[0]) * smooth, seenV[1] + (vy - seenV[1]) * smooth];
      syncRope();

      const want = mode === "dangle" ? 0 : 1;
      attach += (want - attach) * (1 - Math.exp(-7 * dt));
      nap += ((me.napping || mode === "ghost" ? 1 : 0) - nap) * (1 - Math.exp(-3 * dt));
      const source = world.pickedId === member.id ? world.trying : member.look;
      if (JSON.stringify(source) !== JSON.stringify(shown)) setLook(shown, source);

      rope.translate(ox, oy);
      const head = mode === "dangle" ? rope.head : null;
      mood.update(dt, {
        unit,
        anchor: head ? [head.x, head.y] : [x + ox, y + oy - 1e5],
        center: docCenter(),
        radius: spider.radius(),
        foodNear,
        busy: jump !== null || mode === "ghost",
        windUp: mode === "dangle" && held ? tension : 0,
      });
      if (nap > 0.001) easeFace(mood.face, napFace(), nap);

      const frame = { x: x + ox, y: y + oy, unit, maxThread: 1.5 };
      animations.update(frame, dt, Math.abs(seenV[0]) / Math.max(1, unit));
      const state = animations.state;
      state.attachX = 0.5;
      state.attachY = 0.5;
      state.attachBlend = attach;
      state.size = WIDTH / Math.max(0.01, config.look.width);
      state.tilt = mode === "web" ? lean : tumble;
      const wiggle = mode === "web" ? walking : mode === "held" || mode === "air" ? 0.35 : 0;
      state.legSwing = den.walking.legs * DEG * wiggle;
      state.legPhase = mode === "web" ? walkPhase : time * 9;
      const alpha = mode === "dangle" ? pending * config.sim.rate : 1;
      spider.update(frame, dt, dt, Math.min(1, alpha), pixelRatio);
      rope.translate(-ox, -oy);

      const c = docCenter();
      const velocity: Vec = [seenV[0] / Math.max(1, unit), seenV[1] / Math.max(1, unit)];
      speedLines.update(dt, c, jump ? [0, 0] : velocity, unit, spider.radius());
      wind.update(dt);
      zees.update(dt, mode === "ghost" ? 0 : nap > 0.5 ? 1 : mood.asleep, c, spider.radius(), unit);
    },

    /** Behind the spiders: its string, the silk from a jump, and the main spider's glow. Document px. */
    drawBehind(ctx: CanvasRenderingContext2D, ink: string, accent: string) {
      if (mode === "dangle") {
        const alpha = Math.min(1, pending * config.sim.rate);
        const pts = rope.points.map((_, i) => {
          const p = rope.at(i, alpha);
          return { x: p.x + world.origin[0], y: p.y + world.origin[1] };
        });
        ctx.save();
        ctx.strokeStyle = threadStyle(ctx, shown.thread, pts, ink);
        drawString(ctx, pts, 1.25);
        ctx.restore();
      }
      if (silk) {
        const [fx, fy] = toDoc(silk.from);
        const [tx, ty] = toDoc(mode === "web" ? [x, y] : silk.to);
        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - silk.age / Math.max(0.01, den.jumping.silk));
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo((fx + tx) / 2, Math.max(fy, ty) + world.unit * 0.15, tx, ty);
        ctx.stroke();
        ctx.restore();
      }
      const c = docCenter();
      if (member.main && den.marks.mainGlow && c && mode !== "ghost") {
        const r = spider.radius() * 1.25;
        const glow = ctx.createRadialGradient(c[0], c[1], r * 0.2, c[0], c[1], r);
        glow.addColorStop(0, `${accent}55`);
        glow.addColorStop(1, `${accent}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /** The spider itself. Document px. */
    draw(ctx: CanvasRenderingContext2D, ink: string) {
      ctx.save();
      ctx.strokeStyle = ink;
      wind.draw(ctx);
      if (mode === "ghost") ctx.globalAlpha = 0.6 * Math.max(0, 1 - ghost / 3.5);
      spider.draw(ctx);
      ctx.strokeStyle = ink;
      zees.draw(ctx);
      ctx.restore();
    },

    /** On top of everything: which one's picked, the main spider's star, its name, and hungry thoughts. Document px. */
    drawMarks(ctx: CanvasRenderingContext2D, colors: { ink: string; accent: string; surface: string }, picked: boolean, hovered: boolean) {
      const c = docCenter();
      if (!c || mode === "ghost") return;
      const r = spider.radius();
      if (picked) {
        ctx.save();
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -time * 12;
        ctx.beginPath();
        ctx.arc(c[0], c[1], r * 1.08 + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      let top = c[1] - r * 0.95 - 6;
      if (member.main) {
        drawStar(ctx, c[0], top - 4, Math.max(5, r * 0.16), colors.accent, colors.surface);
        top -= Math.max(10, r * 0.34);
      }
      const names = den.marks.names;
      if (names === "always" || (names === "hover" && (picked || hovered))) {
        const label = nameOf(member);
        ctx.save();
        ctx.font = "600 12px system-ui, sans-serif";
        const w = ctx.measureText(label).width + 12;
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = colors.surface;
        ctx.beginPath();
        ctx.roundRect(c[0] - w / 2, top - 18, w, 18, 9);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, c[0], top - 8.5);
        ctx.restore();
        top -= 22;
      }
      if (bubble > 0) {
        const pop = Math.min(1, bubble / 0.25, (2.4 - bubble) / 0.25);
        const size = Math.max(14, r * 0.55) * pop;
        const bx = c[0] + r * 0.75;
        const by = c[1] - r * 1.05 - size * 0.6;
        ctx.save();
        ctx.fillStyle = colors.surface;
        ctx.strokeStyle = colors.ink;
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 1;
        for (const [dx, dy, s] of [[-0.55, 0.95, 0.12], [-0.3, 0.7, 0.18]] as const) {
          ctx.beginPath();
          ctx.arc(bx + dx * size, by + dy * size, s * size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(bx, by, size * 0.62, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        world.drawBug(ctx, bx, by, size * 0.5, time * 80);
      }
    },

    dispose() {
      spider.dispose();
      mood.dispose();
    },
  };
  return me;
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, edge: string) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(angle) * d, y + Math.sin(angle) * d);
  }
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

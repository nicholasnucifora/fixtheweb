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
import { type Member, canLay, elderness, grownUp, lifeDone, nameOf, sizeOf } from "./colony";
import { den } from "./config";
import { type Emote, type EmoteColors, createEmotes } from "./emotes";
import { type Feeling, effect, feel } from "./genes";
import { daylight } from "./daytime";
import { eventRate, settings } from "./settings";
import type { Spot, Vec, Web } from "./web";

/**
 * One spider living in the Spider Den.
 *
 * It's the site's own spider (spider.ts), with its own mood (mood.ts) and idle life (animation.ts),
 * so everything tuned on the home page applies: how it looks, its faces, its legs, how it's thrown
 * and how its string behaves. What's new is where it lives, out on the webs, and that it has a life:
 * genes that make it quick or slow, strong or weak; a personality that decides what it gets up to
 * and how it feels about things (and the emotes it shows); and old age, which slows it down.
 *
 *   web      on a thread: walking, sitting, napping, eating, mending or spinning the web, stalking
 *            another spider, running away, courting, or in a fight
 *   dangle   hanging from a thread on a string of its own, which you can pull about and snap
 *   air      flung, fallen or jumping: threads slow it as it crosses them, and catch it once it's slow
 *   held     in your hand
 *   ghost    starved or died of old age, floating away
 *   eaten    being eaten by another spider
 *   carried  in a bird's feet or on a frog's tongue
 *
 * A pirate spider is one of these too, but not one of yours: it comes in from outside, hunts, and leaves.
 *
 * The den works in CSS px from its top-left corner. The spider's drawing and mood work in document
 * px (they follow the cursor), so its string is shifted by the den's origin while they update.
 */

const DEG = Math.PI / 180;
/** A grown-up is the den's Grown-up spider wide whatever Spider width is tuned to on the home page: it's this many b. */
export const WIDTH = schema.look.params.width.value;
const between = (a: number, b: number) => Math.min(a, b) + Math.random() * Math.abs(b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type Mode = "web" | "dangle" | "air" | "held" | "ghost" | "eaten" | "carried";
export type Task = "rest" | "walk" | "hunt" | "eat" | "nap" | "mend" | "spin" | "stalk" | "flee" | "cower" | "brace" | "court" | "fight" | "leave";

/** Something a spider can catch: a bug stuck on a thread. */
export interface Prey {
  state: string;
  spot: Spot | null;
  x: number;
  y: number;
  claimedBy: Critter | null;
}

/** Two spiders in a fight (world.ts runs it). */
export interface Fight {
  a: Critter;
  b: Critter;
  x: number;
  y: number;
  t: number;
  duration: number;
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
  /** A thread only one spider works on at a time. */
  claim(edge: number, who: Critter): boolean;
  unclaim(edge: number, who: Critter): void;
  /** A spider this hungry one could go after (smaller, not family), or null. */
  quarryFor(hunter: Critter): Critter | null;
  /** A spider nearby to have babies with, or null. */
  mateFor(spider: Critter): Critter | null;
  /** Lay a clutch (with `mate` as the other parent, if any). */
  layEggs(spider: Critter, mate: Critter | null): void;
  /** It landed a pounce on `target` (or near it). */
  pounced(hunter: Critter, target: Critter): void;
  /** A pirate spider has gone. */
  left(spider: Critter): void;
  /** It was picked up mid-fight: the fight's off. */
  breakFight(spider: Critter): void;
}

/** A spider in the den, as the rest of the den sees it. */
export interface Critter {
  readonly member: Member;
  readonly pirate: boolean;
  readonly mode: Mode;
  readonly task: Task;
  readonly held: boolean;
  readonly dangling: boolean;
  readonly napping: boolean;
  readonly busy: boolean;
  readonly fleeing: boolean;
  /** Still in the den and not dying. */
  readonly alive: boolean;
  readonly gone: boolean;
  readonly fighting: boolean;
  /** The spider it's hunting, if it's stalking one. */
  readonly quarry: Critter | null;
  /** Where it is: on the thread, or on the end of its string. Den px. */
  readonly position: Vec;
  /** Set by the den while you're carrying a bug toward its mouth (0–1). */
  foodNear: number;
  center(): Vec;
  radius(): number;
  unit(): number;
  power(): number;
  agility(): number;
  nerve(): number;
  emote(kind: Emote, always?: boolean): void;
  mouth(): Vec;
  nodeNearby(): number;
  distance(px: number, py: number): number;
  placeNear(px: number, py: number): void;
  toss(px: number, py: number, pvx: number, pvy: number): void;
  rewoven(): void;
  grab(px: number, py: number): void;
  moveHand(px: number, py: number): void;
  release(thrown: Vec | null): void;
  eat(food: Prey): void;
  feast(): void;
  play(id: string): void;
  proud(): void;
  alarm(fx: number, fy: number, target: boolean): void;
  stalkedBy(attacker: Critter): void;
  leaveDen(): void;
  stalk(target: Critter): boolean;
  courtedBy(suitor: Critter): void;
  enterFight(fight: Fight): void;
  scrap(px: number, py: number): void;
  won(ate: boolean): void;
  escaped(fx: number, fy: number): void;
  fightOff(): void;
  eatenBy(killer: Critter): void;
  carry(hold: () => Vec): void;
  vanish(): void;
  die(cause?: "starved" | "old"): void;
  think(dt: number): void;
  animate(dt: number, pixelRatio: number): void;
  drawBehind(ctx: CanvasRenderingContext2D, ink: string, accent: string): void;
  draw(ctx: CanvasRenderingContext2D, ink: string): void;
  drawMarks(ctx: CanvasRenderingContext2D, colors: EmoteColors, picked: boolean, hovered: boolean): void;
  dispose(): void;
}

/** A pirate spider's personality: fearless and always hungry for spiders. */
const PIRATE_FEELINGS: Record<Feeling, number> = { temper: 0.8, thrill: 0.5, nerve: 0.95, aggression: 1, energy: 0.9, tidiness: 0 };

export function createCritter(member: Member, world: DenWorld, { pirate = false } = {}): Critter {
  const shown: Look = parseLook(JSON.stringify(member.look));
  const bob = document.createElement("div");
  const root = document.createElement("div");
  const rope = new Rope(Math.max(3, Math.round(den.dangling.segments)));
  let held = false;
  let mode: Mode = "web";

  /** A personality trait, for how much personality matters. */
  const trait = (f: Feeling) => (pirate ? PIRATE_FEELINGS[f] : feel(member.personality, f));

  const animations = createAnimations(rope, () => held, { listen: false });
  const mood = createMood(root, rope, () => held, () => held, {
    listen: false,
    blink: () => animations.play("blink"),
    feelings: () => ({ temper: trait("temper"), thrill: trait("thrill"), nerve: trait("nerve") }),
    cursor: false,
  });
  // In the den, the cursor's just part of the scenery: no flinching legs, no eyes following it about.
  const spider = createSpider(bob, rope, animations.state, mood.face, shown, { cursor: false });
  const zees = createZees();
  const wind = new Particles();
  const speedLines = createSpeedLines(wind);
  const emotes = createEmotes();

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
  /** Where it's got to in a task with steps: walking there, then doing it. */
  let phase: "go" | "do" = "go";
  let timer = between(0.3, 2.5);
  let checkIn = 0;
  let prey: Prey | null = null;
  /** What it's eating, and for how much longer. */
  let meal: Prey | null = null;
  let chew = 0;
  let hurry = 1;
  let walkPhase = Math.random() * 10;
  let walking = 0;
  let lean = 0;
  let tumble = 0;

  // ── Looking after the web ─────────────────────────────────────────────────
  /** The thread it's mending or spinning, the node it spins from, and how far across it is. */
  let work = -1;
  let spinFrom = -1;
  let spinT = 0;
  /** How it's laying the line it's spinning: walking across, dropping down it, or floating it over. */
  let spinHow: "walk" | "drop" | "shoot" = "walk";
  /**
   * The broken line it's laying (a web's lines are chains of short threads): the threads in order
   * from where it starts, the nodes along it, how far along it each node is (px), and its length.
   */
  let line: { edges: number[]; nodes: number[]; at: number[]; length: number } | null = null;
  /** Threads of the line laid so far. */
  let laid = 0;
  /** Broken threads it couldn't find a way to lately (so it doesn't keep trying), and until when (its time). */
  const cantReach = new Map<number, number>();
  /** Getting ready to float a line, seconds so far. */
  let aiming = 0;
  let streak = 0;

  // ── Other spiders, and danger ─────────────────────────────────────────────
  let quarry: Critter | null = null;
  let stalked = 0;
  let noticed = false;
  let partner: Critter | null = null;
  let brawl: Fight | null = null;
  let threat: Vec | null = null;
  let calmIn = 0;
  /** Seconds until it next checks whether it's sitting on top of someone. */
  let spaceIn = Math.random() * 1.5;
  let carriedBy: (() => Vec) | null = null;
  let eater: Critter | null = null;
  let eaten = 0;
  let deathCause: "starved" | "old" | null = null;
  let leaving = false;
  let departed = false;
  let lastFace: string | null = null;

  // ── Dangling ──────────────────────────────────────────────────────────────
  let anchor: Spot = { edge: 0, t: 0 };
  let hang: "down" | "hang" | "up" = "down";
  let length = 0;
  let reelTo = 0;
  let paysOut = 1;
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
  /** Times it's fallen off the bottom and come back in at the top without anything catching it. */
  let wraps = 0;
  let jump: { x0: number; y0: number; vx: number; vy: number; t: number; T: number; to: Spot; then?: () => void } | null = null;
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

  /** How old it's got (0 until it's old, 1 at the very end). Pirates don't. */
  const elder = () => (pirate ? 0 : elderness(member));
  /** How fast it gets about, next to an average spider: its speed gene, and old age. */
  const quickness = () => effect(member.genes, "speed") * (1 - den.aging.slow * elder()) * (pirate ? den.pirate.speed : 1);
  const walkSpeed = () => {
    const w = den.walking;
    return w.speed * world.unit * (w.babySpeed + (1 - w.babySpeed) * member.growth) * quickness();
  };
  const silkStrength = () => effect(member.genes, "silk");
  /** How well it'd do in a fight. */
  const power = () =>
    sizeOf(member) * effect(member.genes, "strength") * (1 - den.aging.weak * elder()) * (0.7 + 0.3 * member.fullness) * (pirate ? den.pirate.strength : 1);
  /** How good it is at getting away. */
  const agility = () => quickness() * (grownUp(member) ? 1 : 0.85) * (1 - den.aging.dodge * elder());

  const tell = (type: "spider:grab" | "spider:release") => root.dispatchEvent(new CustomEvent(type));
  const emote = (kind: Emote, always = false) => emotes.add(kind, always);

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

  /** Walks `distance` px along its way. True once it's stopped (there, or blocked by a broken thread). */
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
        if (!web.isAlive(finish.edge)) break;
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

  /** The node it's standing on, if it's at the end of a thread. */
  const nodeHere = () => {
    const [a, b] = world.web.ends(spot.edge);
    return spot.t <= 0.001 ? a : spot.t >= 0.999 ? b : -1;
  };

  const letGoOfWork = () => {
    if (work >= 0) world.unclaim(work, me);
    if (line) for (const e of line.edges) world.unclaim(e, me);
    line = null;
    work = -1;
    spinFrom = -1;
  };

  const rest = (seconds: number) => {
    task = "rest";
    timer = seconds * (pirate ? 0.4 : 1.6 - 1.2 * trait("energy"));
    toward = -1;
    route = [];
    finish = null;
    hurry = 1;
    phase = "go";
    letGoOfWork();
    partner = null;
    if (quarry) quarry = null;
  };

  const myWeb = () => {
    const [a, b] = world.web.ends(spot.edge);
    return Math.max(world.web.webOf(a), world.web.webOf(b));
  };

  /** Another spider sitting (or standing) at (px, py), too close for comfort, if there is one. */
  const crowdAt = (px: number, py: number) => {
    const space = den.habits.space;
    if (space <= 0) return null;
    for (const c of world.critters) {
      if (c === me || c.mode !== "web" || (!c.alive && !c.pirate)) continue;
      const [cx, cy] = c.position;
      if (Math.hypot(cx - px, cy - py) < (radius() + c.radius()) * space) return c;
    }
    return null;
  };
  const roomy = (n: number) => !crowdAt(world.web.x(n), world.web.y(n));

  /** Someone's right on top of it: it shuffles off a little way, away from them. */
  const budge = (from: Critter) => {
    const web = world.web;
    const [fx, fy] = from.position;
    const d = Math.hypot(x - fx, y - fy);
    // Straight on top: any way will do.
    const [ux, uy] = d > 1 ? [(x - fx) / d, (y - fy) / d] : [Math.cos(time * 7), Math.sin(time * 7)];
    const node = web.nodeNear(
      x + ux * world.unit * 0.6,
      y + uy * world.unit * 0.6,
      0,
      world.unit * 0.9,
      (n) => roomy(n) && (web.x(n) - x) * ux + (web.y(n) - y) * uy > 0,
      true,
    );
    if (node < 0 || !goTo({ node })) return false;
    task = "walk";
    hurry = 0.8;
    return true;
  };

  const wander = () => {
    const web = world.web;
    const far = den.habits.wanderFar * world.unit;
    // Anywhere: along a thread, or off along a branch, that nobody's already sitting on.
    const node = web.nodeNear(x, y, Math.min(far * 0.3, world.unit * 0.3), far, roomy, true);
    if (node < 0 || !goTo({ node })) return false;
    task = "walk";
    return true;
  };

  const goHub = () => {
    const web = world.web;
    // Its own web's middle, or off a branch, the nearest web's.
    const nearest = () =>
      web.hubs.reduce((best, h) => (!best || Math.hypot(web.x(h.node) - x, web.y(h.node) - y) < Math.hypot(web.x(best.node) - x, web.y(best.node) - y) ? h : best), web.hubs[0]);
    let hub = (web.hubs[myWeb()] ?? nearest())?.node ?? -1;
    if (hub < 0 || !web.held(hub) || Math.hypot(web.x(hub) - x, web.y(hub) - y) < world.unit * 0.2) return false;
    // Someone's already sitting in the middle: somewhere just off it.
    if (!roomy(hub)) hub = web.nodeNear(web.x(hub), web.y(hub), world.unit * 0.25, world.unit * 0.8, roomy);
    if (hub < 0 || !goTo({ node: hub })) return false;
    task = "walk";
    return true;
  };

  const goFamily = () => {
    const parent = world.critters.find((c) => c.member.id === member.parent);
    if (!parent || parent.mode !== "web") return false;
    const [px, py] = parent.position;
    if (Math.hypot(px - x, py - y) < world.unit * 0.8) return false;
    const node = world.web.nodeNear(px, py, world.unit * 0.3, world.unit * 0.9, roomy);
    if (node < 0 || !goTo({ node })) return false;
    task = "walk";
    return true;
  };

  const tryHunt = () => {
    if (pirate || member.fullness >= den.hunger.hunt) return false;
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
    // Not in a pile.
    if (crowdAt(x, y)) return false;
    task = "nap";
    const day = daylight();
    timer = between(den.habits.napFrom, den.habits.napTo) * (1 + elder()) * (1 + (den.schedule.dayNapLength - 1) * day);
    toward = -1;
    return true;
  };

  /** Lets itself down on a string from where it is (`quick`: dropping out of harm's way). */
  const startDangle = (quick = false) => {
    const [ax, ay] = world.web.point(spot);
    const room = world.web.height - ay - radius() * 2.2;
    if (room < world.unit * 0.4) return false;
    anchor = { ...spot };
    mode = "dangle";
    hang = "down";
    paysOut = quick ? 4 : 1;
    reelTo = Math.min(room, between(den.dangling.lengthFrom, den.dangling.lengthTo) * world.unit * (quick ? 1.4 : 1));
    length = world.unit * 0.04;
    if (rope.points.length - 1 !== Math.round(den.dangling.segments)) rope.setSegments(den.dangling.segments);
    rope.setLength(length);
    rope.reset(ax, ay);
    pending = 0;
    letOut = 0;
    letGoOfWork();
    return true;
  };

  /** Jumps to `node`, running `then` when it lands. */
  const jumpTo = (node: number, then?: () => void, speedy = false) => {
    const web = world.web;
    const e = web.linksOf(node).find((l) => web.isAlive(l));
    if (e === undefined) return false;
    const to: Spot = { edge: e, t: web.ends(e)[0] === node ? 0 : 1 };
    const [tx, ty] = web.point(to);
    const distance = Math.hypot(tx - x, ty - y);
    const T = Math.max(speedy ? 0.22 : 0.33, (distance / world.unit) * den.jumping.time * (speedy ? 0.6 : 1));
    const g = config.rope.gravity * world.unit;
    jump = { x0: x, y0: y, vx: (tx - x) / T, vy: (ty - y - 0.5 * g * T * T) / T, t: 0, T, to, then };
    web.push(x, y, -jump.vx * 0.15, -jump.vy * 0.15);
    mode = "air";
    toward = -1;
    letGoOfWork();
    return true;
  };

  /** Leaps across to another web or a branch; `away` from somewhere, if given. */
  const startJump = (away?: Vec) => {
    const web = world.web;
    const j = den.jumping;
    const home = myWeb();
    const node = web.nodeNear(
      x,
      y,
      Math.min(j.rangeFrom, j.rangeTo) * world.unit,
      Math.max(j.rangeFrom, j.rangeTo) * world.unit * (away ? 1.3 : 1),
      (n) => (home < 0 || web.webOf(n) !== home) && (!away || (web.x(n) - x) * (x - away[0]) + (web.y(n) - y) * (y - away[1]) > 0),
      true,
    );
    return node >= 0 && jumpTo(node, undefined, !!away);
  };

  /** Runs somewhere away from (fx, fy). */
  const runFrom = (fx: number, fy: number) => {
    const web = world.web;
    const d = Math.hypot(x - fx, y - fy) || 1;
    const far = world.unit * 3;
    const node = web.nodeNear(x + ((x - fx) / d) * far, y + ((y - fy) / d) * far, 0, far, undefined, true);
    if (node < 0 || !goTo({ node })) return false;
    letGoOfWork();
    task = "flee";
    hurry = 1.8;
    mood.feel("scared", 1.5);
    return true;
  };

  // ── Looking after the web ─────────────────────────────────────────────────

  /** Off to mend the most frayed thread nearby. */
  const startMend = () => {
    const r = den.repair;
    if (pirate || !r.enabled || !den.health.enabled) return false;
    const web = world.web;
    const e = web.frayedNear(x, y, r.range * world.unit, r.below, (edge) => world.claim(edge, me) && (world.unclaim(edge, me), true));
    if (e < 0 || !world.claim(e, me)) return false;
    if (!goTo({ goal: { edge: e, t: 0.5 } })) {
      world.unclaim(e, me);
      return false;
    }
    work = e;
    task = "mend";
    phase = "go";
    return true;
  };

  /** Off to spin a broken thread again, starting from whichever end of it is still held. */
  const startSpin = (near?: number) => {
    const r = den.repair;
    if (pirate || !r.enabled || !den.health.enabled) return false;
    const web = world.web;
    const free = (edge: number) => (cantReach.get(edge) ?? 0) < time && world.claim(edge, me) && (world.unclaim(edge, me), true);
    // Nothing broken nearby: a web that's been wrecked, further off, is worth the walk.
    const e = near ?? (() => {
      const close = web.brokenNear(x, y, r.range * world.unit, free);
      if (close >= 0 || r.rebuild <= 0) return close;
      const far = web.brokenNear(x, y, r.rebuildRange * world.unit, free);
      if (far < 0) return -1;
      const [a, b] = web.ends(far);
      return web.brokenShare(Math.max(web.webOf(a), web.webOf(b))) > 0.35 ? far : -1;
    })();
    if (e < 0 || !world.claim(e, me)) return false;
    const [a, b] = web.ends(e);
    const ends = [a, b].filter((n) => web.held(n)).sort((p, q) => Math.hypot(web.x(p) - x, web.y(p) - y) - Math.hypot(web.x(q) - x, web.y(q) - y));
    for (const from of ends) {
      const here = nodeHere() === from;
      if (here || goTo({ node: from })) {
        work = e;
        spinFrom = from;
        task = "spin";
        if (here) startLine();
        else phase = "go";
        return true;
      }
    }
    cantReach.set(e, time + 25);
    world.unclaim(e, me);
    return false;
  };

  /**
   * The broken line that starts with thread `e` from node `from`: on through nodes nothing else holds
   * up, along threads of the same kind going (near enough) the same way, to where it ties on to
   * something, or runs out. It claims the threads as it goes.
   */
  const brokenLine = (from: number, e: number) => {
    const web = world.web;
    const kind = web.kindOf(e);
    const edges = [e];
    const nodes = [from, web.other(e, from)];
    while (edges.length < 32) {
      const here = nodes[nodes.length - 1];
      if (web.held(here)) break;
      const prev = nodes[nodes.length - 2];
      const dx = web.x(here) - web.x(prev);
      const dy = web.y(here) - web.y(prev);
      const dl = Math.hypot(dx, dy) || 1;
      let best = -1;
      let straightest = Math.cos(40 * DEG);
      for (const next of web.linksOf(here)) {
        if (web.isAlive(next) || !web.isSilk(next) || web.kindOf(next) !== kind || edges.includes(next)) continue;
        const other = web.other(next, here);
        const ox = web.x(other) - web.x(here);
        const oy = web.y(other) - web.y(here);
        const dot = (ox * dx + oy * dy) / ((Math.hypot(ox, oy) || 1) * dl);
        if (dot > straightest) {
          best = next;
          straightest = dot;
        }
      }
      if (best < 0 || !world.claim(best, me)) break;
      edges.push(best);
      nodes.push(web.other(best, here));
    }
    const at = [0];
    for (const edge of edges) at.push(at[at.length - 1] + web.length(edge));
    return { edges, nodes, at, length: at[at.length - 1] };
  };

  /** How to lay the line: float it across a long gap to something it'll catch on, drop down it to somewhere below, or walk it across. */
  const howToSpin = (): typeof spinHow => {
    if (!line) return "walk";
    const web = world.web;
    const from = line.nodes[0];
    const end = line.nodes[line.nodes.length - 1];
    if (web.held(end) && line.length >= den.repair.shootFrom * world.unit) return "shoot";
    if (web.y(end) - web.y(from) > line.length * 0.6 && line.length >= world.unit * 0.5) return "drop";
    return "walk";
  };

  /** It's where the broken thread it's re-spinning starts: works out the line to lay, and how. */
  const startLine = () => {
    if (line) for (const e of line.edges) if (e !== work) world.unclaim(e, me);
    line = brokenLine(spinFrom, work);
    laid = 0;
    spinT = 0;
    aiming = 0;
    phase = "do";
    spinHow = howToSpin();
  };

  /** A puff of silk, all at once (a floated line catching). */
  const silkBurst = (at: Vec, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = world.unit * (0.5 + Math.random() * 0.7);
      world.particles.spawn({
        x: at[0],
        y: at[1],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: world.unit * 0.05,
        width: 1.2,
        life: 0.45,
        drag: 5,
        gravity: world.unit * 0.2,
        shrink: 0.5,
      });
    }
  };

  /** Silk dust off its spinnerets while it works. */
  const silkDust = (at: Vec) => {
    if (Math.random() > 0.35) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = world.unit * (0.3 + Math.random() * 0.5);
    world.particles.spawn({
      x: at[0],
      y: at[1],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: world.unit * 0.035,
      width: 1,
      life: 0.4,
      drag: 4,
      gravity: world.unit * 0.3,
      shrink: 0.5,
    });
  };

  // ── Other spiders ─────────────────────────────────────────────────────────

  const startStalk = (target: Critter) => {
    quarry = target;
    stalked = 0;
    noticed = false;
    task = "stalk";
    checkIn = 0;
    hurry = 1.2;
    letGoOfWork();
    mood.feel("suspicious", 2);
    return true;
  };

  /** Hungry enough to eat another spider, and aggressive enough to try? */
  const tryStalk = () => {
    const f = den.fights;
    if (!f.enabled || !settings.fights) return false;
    if (!pirate) {
      if (!grownUp(member) || member.fullness >= f.hunger) return false;
      if (Math.random() > f.chance * trait("aggression")) return false;
    }
    const target = world.quarryFor(me);
    return target ? startStalk(target) : false;
  };

  /** Pounces on whoever it's stalking. */
  const pounce = (target: Critter) => {
    const node = target.nodeNearby();
    if (node < 0) return false;
    return jumpTo(node, () => world.pounced(me, target), true);
  };

  /** Off to court a mate, or to lay alone. */
  const tryNest = () => {
    if (pirate || !canLay(member).ok) return false;
    const mate = world.mateFor(me);
    if (mate) {
      const node = mate.nodeNearby();
      if (node < 0 || !goTo({ node })) return false;
      partner = mate;
      mate.courtedBy(me);
      task = "court";
      phase = "go";
      timer = 12;
      return true;
    }
    if (Math.random() > den.babies.solo) return false;
    world.layEggs(me, null);
    mood.feel("content", 2);
    return true;
  };

  /** How wrecked its own web (or the nearest one) is, 0 to 1: the more it is, the keener it is to rebuild. */
  const wreckNear = () => {
    const web = world.web;
    let w = myWeb();
    if (w < 0) {
      const hub = web.hubs.reduce<{ node: number; d: number } | null>((best, h, i) => {
        const d = Math.hypot(web.x(h.node) - x, web.y(h.node) - y);
        return !best || d < best.d ? { node: i, d } : best;
      }, null);
      w = hub?.node ?? -1;
    }
    return w >= 0 ? web.brokenShare(w) : 0;
  };

  /** What next? Hunt if it's hungry and something's stuck nearby, otherwise one of its habits. */
  const decide = () => {
    if (pirate) {
      if (tryStalk()) return;
      if (!wander()) rest(1);
      return;
    }
    if (tryHunt()) return;
    const h = den.habits;
    const r = den.repair;
    const energy = trait("energy");
    const tidy = trait("tidiness");
    const baby = member.growth < 1 && member.parent;
    // Orb weavers are night owls: resting by day, building and getting about after dark.
    const day = daylight();
    const s = den.schedule;
    const byDay = (atNight: number, atDay: number) => atNight + (atDay - atNight) * day;
    const naps = byDay(s.nightNaps, s.dayNaps);
    const building = byDay(s.nightWork, s.dayWork);
    const roam = byDay(s.nightRoam, s.dayRoam);
    // With time sped up, eggs come round sooner too.
    const often = Math.sqrt(Math.max(1, eventRate()));
    const choices: [number, () => boolean][] = [
      [h.wander * (0.4 + 1.2 * energy) * roam, wander],
      [h.hub, goHub],
      [h.dangle * roam, startDangle],
      [h.jump * (0.6 + 0.8 * energy) * roam, startJump],
      [h.nap * (1.6 - 1.2 * energy) * (1 + elder()) * naps, startNap],
      [baby ? h.family : 0, goFamily],
      [grownUp(member) ? r.mend * (0.2 + 1.6 * tidy) * building : 0, startMend],
      [grownUp(member) ? r.spin * (0.2 + 1.6 * tidy) * (1 + r.rebuild * wreckNear()) * building : 0, startSpin],
      [grownUp(member) ? den.babies.nest * effect(member.genes, "fertility") * (0.5 + energy) * often : 0, tryNest],
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
    const then = jump?.then;
    jump = null;
    recent.clear();
    rest(restFor);
    then?.();
  };

  /** The thread under it has gone: it drops. */
  const fall = () => {
    letGoOfWork();
    mode = "air";
    launch = null;
    airTime = 0;
    wraps = 0;
    vy = Math.max(vy, world.unit * 0.5);
    recent.clear();
    emote("alarm");
  };

  const thinkWeb = (dt: number) => {
    const web = world.web;
    if (!web.isAlive(spot.edge) && !(task === "spin" && phase === "do")) return fall();
    const before: Vec = [x, y];
    const w = den.walking;
    const speed = walkSpeed() * hurry;

    switch (task) {
      case "walk":
      case "flee":
        if (walk(speed * dt)) {
          if (task === "flee" && threat && Math.hypot(x - threat[0], y - threat[1]) < den.predators.panic * world.unit * 0.7 && runFrom(...threat)) break;
          rest(between(den.habits.restFrom, den.habits.restTo) * (task === "flee" ? 0.4 : 1));
        }
        break;
      case "hunt":
        if (!prey || prey.state !== "stuck") {
          if (prey?.claimedBy === me) prey.claimedBy = null;
          prey = null;
          rest(between(0.2, 0.8));
        } else if (walk(speed * dt)) {
          const caught = prey;
          prey = null;
          if (caught.state === "stuck") {
            task = "eat";
            toward = -1;
            me.eat(caught);
          } else rest(between(den.habits.restFrom, den.habits.restTo));
        }
        break;
      case "eat":
        if (!meal) {
          if (pirate) leave();
          else rest(between(1.5, 3));
        }
        break;
      case "nap":
        timer -= dt;
        if (timer <= 0) wake();
        break;
      case "mend":
        if (!web.isAlive(work)) {
          rest(0.5);
          break;
        }
        if (phase === "go") {
          if (walk(speed * dt)) {
            if (spot.edge === work) {
              phase = "do";
              timer = 0;
            } else rest(0.5);
          }
          break;
        }
        {
          // Working silk into it, shuffling back and forth along it.
          timer += dt;
          const len = Math.max(1, web.length(work));
          spot.t = clamp(0.5 + (Math.sin(timer * 2.4) * world.unit * 0.08) / len, 0.02, 0.98);
          web.mend(work, den.repair.rate * silkStrength() * quickness() * dt * eventRate(), silkStrength());
          silkDust(web.point(spot));
          if (web.healthOf(work) >= 0.99) {
            const next = web.frayedNear(x, y, world.unit * 1.2, den.repair.below, (e) => e !== work && world.claim(e, me) && (world.unclaim(e, me), true));
            if (next >= 0 && ++streak < den.repair.streak) {
              letGoOfWork();
              if (world.claim(next, me) && goTo({ goal: { edge: next, t: 0.5 } })) {
                work = next;
                phase = "go";
              } else rest(1);
            } else {
              streak = 0;
              rest(between(1, 2.5));
            }
          }
        }
        break;
      case "spin":
        if (web.isAlive(work) && (phase === "go" || laid === 0)) {
          // Someone else got there first.
          if (phase === "do") settle({ edge: work, t: web.ends(work)[0] === spinFrom ? 1 : 0 });
          else rest(0.5);
          break;
        }
        if (phase === "go") {
          if (walk(speed * dt)) {
            if (nodeHere() === spinFrom) startLine();
            else rest(0.5);
          }
          break;
        }
        {
          if (!web.held(spinFrom) || !line) return fall();
          const r = den.repair;
          const last = line.nodes[line.nodes.length - 1];
          const total = Math.max(1, line.length);
          const [fx, fy] = [web.x(spinFrom), web.y(spinFrom)];
          const [ex, ey] = [web.x(last), web.y(last)];
          if (spinHow === "shoot") {
            // It stays put, rears up, and lets a line drift across on the breeze until it snags.
            x = fx;
            y = fy;
            walking = 0;
            vx = vy = 0;
            if (!web.held(last)) {
              // Nothing to catch on over there any more.
              lean = 0;
              rest(0.5);
              break;
            }
            const side = ex >= fx ? 1 : -1;
            if (aiming < r.aim) {
              aiming += dt;
              lean = -side * 14 * DEG * Math.min(1, aiming / 0.25);
              if (Math.random() < dt * 10) silkDust([fx, fy]);
              return;
            }
            // It slows as it drifts, like something carried on the air.
            spinT = Math.min(1, spinT + ((r.shootSpeed * world.unit * dt) / total) * (0.45 + 1.1 * (1 - spinT)));
            lean += (side * 6 * DEG - lean) * Math.min(1, dt * 10);
            if (spinT < 1) return;
            // Caught: a twang, and it's a line (a thin one). Now to walk out along it and make it strong.
            const first = line.edges[0];
            for (const e of line.edges) {
              web.restore(e, r.shootHealth, silkStrength());
              world.unclaim(e, me);
            }
            const [nx, ny] = [-(ey - fy) / total, (ex - fx) / total];
            web.push(ex, ey, nx * world.unit * 3, ny * world.unit * 3);
            web.push((fx + ex) / 2, (fy + ey) / 2, -nx * world.unit * 4, -ny * world.unit * 4, total * 0.6);
            silkBurst([ex, ey]);
            lean = 0;
            line = null;
            work = -1;
            spot = { edge: first, t: web.ends(first)[0] === spinFrom ? 0 : 1 };
            if (world.claim(first, me) && goTo({ goal: { edge: first, t: 0.5 } })) {
              work = first;
              task = "mend";
              phase = "go";
            } else rest(between(0.5, 1));
            return;
          }
          // Walking it across, or dropping down it, laying the line as it goes.
          const dropping = spinHow === "drop";
          spinT = Math.min(1, spinT + ((dropping ? r.dropSpeed : r.spinSpeed) * world.unit * quickness() * dt) / total);
          // Dropping, it eases off and brakes at the bottom.
          const along = (dropping ? spinT * spinT * (3 - 2 * spinT) : spinT) * total;
          let i = 0;
          while (i < line.edges.length - 1 && line.at[i + 1] <= along) i++;
          // Each thread behind it is laid as it passes the end of it.
          for (; laid < i; laid++) {
            web.restore(line.edges[laid], r.spinHealth, silkStrength());
            world.unclaim(line.edges[laid], me);
          }
          const [a, b] = [line.nodes[i], line.nodes[i + 1]];
          const k = clamp((along - line.at[i]) / Math.max(1e-6, line.at[i + 1] - line.at[i]), 0, 1);
          // Crossing in the air, it sags a little on its own line.
          const sag = dropping ? 0 : Math.sin(Math.PI * spinT) * Math.min(total * 0.12, world.unit * 0.3);
          x = web.x(a) + (web.x(b) - web.x(a)) * k;
          y = web.y(a) + (web.y(b) - web.y(a)) * k + sag;
          silkDust([x, y]);
          if (spinT >= 1) {
            for (; laid < line.edges.length; laid++) {
              web.restore(line.edges[laid], r.spinHealth, silkStrength());
              world.unclaim(line.edges[laid], me);
            }
            const done = line.edges[line.edges.length - 1];
            line = null;
            work = -1;
            spot = { edge: done, t: web.ends(done)[0] === last ? 0 : 1 };
            web.push(x, y, 0, world.unit * 1.5);
            // Carry on with the next broken thread from about here, if there is one.
            const next = web.brokenNear(x, y, world.unit * 1.5, (e) => world.claim(e, me) && (world.unclaim(e, me), true));
            // Rebuilding a wreck, it keeps going for longer.
            const wrecked = web.brokenShare(Math.max(web.webOf(spinFrom), web.webOf(last)));
            const most = den.repair.streak * (1 + den.repair.rebuild * wrecked);
            if (next >= 0 && ++streak < most && startSpin(next)) break;
            streak = 0;
            rest(between(0.6, 1.6));
          }
          walkPhase += dropping ? 0 : dt * 12;
          walking = dropping ? 0 : 1;
          if (dt > 0) {
            vx = 0;
            vy = 0;
          }
          return;
        }
      case "stalk": {
        if (!quarry || !quarry.alive || quarry.held) {
          emote("question");
          if (pirate) leave();
          else rest(1);
          break;
        }
        stalked += dt;
        const limit = pirate ? den.pirate.patience : den.fights.stalk;
        if (stalked > limit) {
          emote("dots");
          if (pirate) leave();
          else rest(2);
          break;
        }
        const [qx, qy] = quarry.center();
        const [cx, cy] = center();
        const d = Math.hypot(qx - cx, qy - cy);
        if (!noticed && d < den.fights.notice * world.unit * (0.7 + 0.6 * (1 - quarry.nerve()))) {
          noticed = true;
          quarry.stalkedBy(me);
        }
        if (d < den.fights.pounce * world.unit && quarry.mode === "web" && pounce(quarry)) {
          mood.feel("angry", 1.5);
          break;
        }
        checkIn -= dt;
        if (checkIn <= 0) {
          checkIn = 0.7;
          const node = quarry.nodeNearby();
          hurry = quarry.fleeing ? 1.6 : 1.2;
          if (node < 0 || !goTo({ node })) walk(0);
        }
        walk(speed * dt);
        break;
      }
      case "cower":
      case "brace":
        timer -= dt;
        if (task === "cower") mood.feel("scared", 0.3);
        else mood.feel("angry", 0.3);
        if (timer <= 0) rest(between(0.5, 1.5));
        break;
      case "court":
        if (!partner || !partner.alive || partner.held) {
          rest(1);
          break;
        }
        timer -= dt;
        if (timer <= 0) {
          rest(1);
          break;
        }
        if (phase === "go") {
          walk(speed * dt);
          const [px, py] = partner.center();
          if (Math.hypot(px - x, py - y) < world.unit * 0.9) {
            phase = "do";
            timer = den.babies.court;
            toward = -1;
          } else if (toward < 0) {
            const node = partner.nodeNearby();
            if (node < 0 || !goTo({ node })) rest(1);
          }
          break;
        }
        // A little dance.
        walkPhase += dt * 10;
        walking = 0.8;
        lean = Math.sin(time * 5) * 10 * DEG;
        if (timer <= 0.05) {
          world.layEggs(me, partner);
          rest(between(2, 4));
        }
        break;
      case "fight":
        return;
      case "leave":
        return;
      default: {
        timer -= dt;
        checkIn -= dt;
        if (checkIn <= 0) {
          checkIn = 1.2;
          if (tryHunt()) return;
          if (tryStalk()) return;
        }
        // Sitting right on top of someone? After a moment, it shuffles along.
        spaceIn -= dt;
        if (spaceIn <= 0 && task === "rest") {
          spaceIn = between(0.8, 1.8);
          const other = crowdAt(x, y);
          if (other && other.task !== "court" && !other.fighting && budge(other)) break;
        }
        if (timer <= 0) decide();
      }
    }

    if (mode !== "web") return;
    [x, y] = web.point(spot);
    const moved = Math.hypot(x - before[0], y - before[1]);
    walkPhase += (moved / Math.max(1, unitNow())) * w.steps * Math.PI * 2;
    const step = dt > 0 ? moved / dt / Math.max(1, speed) : 0;
    const busyLegs = task === "mend" && phase === "do" ? 1 : 0;
    walking += (Math.max(busyLegs, toward >= 0 ? Math.min(1, step) : 0) - walking) * (1 - Math.exp(-10 * dt));
    if (busyLegs) walkPhase += dt * 14;
    const sideways = dt > 0 ? (x - before[0]) / dt / Math.max(1, speed) : 0;
    if (task !== "court") lean += (clamp(sideways, -1, 1) * w.lean * DEG - lean) * (1 - Math.exp(-6 * dt));
    if (dt > 0) {
      vx = (x - before[0]) / dt;
      vy = (y - before[1]) / dt;
    }
    // Walking wears the thread a little.
    if (moved > 0 && !busyLegs) web.wear(spot.edge, den.health.walkWear * dt * sizeOf(member), spot.t);
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

  /** How wound up a string has to be to snap: stronger silk takes more (and the strongest never snaps). */
  const snapsAt = () => den.snapping.breakAt * Math.sqrt(silkStrength());

  const thinkDangle = (dt: number) => {
    const web = world.web;
    if (!web.isAlive(anchor.edge)) {
      mode = "air";
      launch = null;
      airTime = 0;
      if (held) mode = "held";
      return;
    }
    const d = den.dangling;
    const [hx, hy] = web.point(anchor);
    if (!held) {
      if (hang === "down") {
        length = Math.min(reelTo, length + d.down * paysOut * world.unit * dt);
        if (length >= reelTo) {
          hang = "hang";
          timer = between(d.forFrom, d.forTo) * (paysOut > 1 ? 0.6 : 1);
        }
      } else if (hang === "hang") {
        timer -= dt;
        // Somewhere safe to wait until the danger's gone.
        if (timer <= 0 && !(threat && calmIn > 0)) hang = "up";
      } else {
        length -= d.up * world.unit * dt * quickness();
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
    if (s.whileHeld && snapsAt() < 0.985 && woundFor >= s.holdFor) snap();
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
    web.wear(hit.edge, den.health.impactWear * (speed / world.unit) * weight, hit.t);
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
    if (!web.isAlive(hit.edge)) return false;
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
        if (web.isAlive(to.edge)) {
          settle(to, between(0.5, 1.5));
          seenV = keep;
        } else {
          jump = null;
          launch = null;
          airTime = 0;
        }
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
      // Only silk slows it: branches, frames and posts aren't sticky, so it passes through them.
      // Leaving, a pirate spider isn't stopping for anything.
      if (!leaving) {
        for (const hit of web.crossings(x, y, nx, ny, true)) {
          if ((recent.get(hit.edge) ?? -1) > airTime - 0.15) continue;
          if (launch && Math.hypot(hit.x - launch[0], hit.y - launch[1]) < grace) continue;
          recent.set(hit.edge, airTime);
          if (crossThread(hit)) return;
        }
      }
      x = nx;
      y = ny;
      const m = radius();
      const W = web.width;
      const H = web.height;
      if (pirate) {
        // A pirate spider comes in from outside and goes back out: it never wraps round.
        const out = x < -m * 3 || x > W + m * 3 || y > H + m * 2;
        if (out && (leaving || airTime > 1.5)) {
          departed = true;
          world.left(me);
          return;
        }
      } else if (den.world.wrap) {
        let wrapped = false;
        if (x < -m) (x += W + 2 * m), (wrapped = true);
        else if (x > W + m) (x -= W + 2 * m), (wrapped = true);
        if (y > H + m) {
          y -= H + 2 * m;
          wrapped = true;
          // Falling down the same gap again and again: come back in above a web instead. It's out of
          // sight above the top as it moves, so nobody sees it jump.
          if (++wraps >= 2 && web.hubs.length) {
            const hubs = web.hubs.map((hub) => web.x(hub.node));
            const nearest = hubs.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
            x = Math.abs(nearest - x) > world.unit * 0.3 ? nearest : hubs[Math.floor(Math.random() * hubs.length)];
            vx *= 0.2;
          }
        }
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
    // Without wrapping, it can come to rest on the bottom with nothing to catch it: then it climbs
    // onto the nearest thread.
    if (!den.world.wrap && airTime > 12) {
      const near = web.nearest(x, y, Math.max(web.width, web.height), true);
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

  /** A pirate spider done here: off out of the den. */
  const leave = () => {
    if (mode === "held" || leaving) return;
    leaving = true;
    letGoOfWork();
    task = "leave";
    const out = x < world.web.width / 2 ? -1 : 1;
    me.toss(x, y, out * world.unit * 5, -world.unit * 5);
    launch = null;
    emote("skull", true);
  };

  // ── Feelings ──────────────────────────────────────────────────────────────

  /** Shows an emote when its face changes to something worth one, in keeping with its personality. */
  const feelingsShow = () => {
    const now = mood.current;
    if (now === lastFace) return;
    lastFace = now;
    const temper = trait("temper");
    switch (now) {
      case "angry":
        emote("anger");
        break;
      case "annoyed":
      case "tired":
        emote(temper > 0.6 ? "anger" : "dots");
        break;
      case "panicked":
      case "scared":
        emote(Math.random() < 0.5 ? "sweat" : "alarm");
        break;
      case "thrown":
        if (temper > 0.65) emote("anger");
        else emote("sweat");
        break;
      case "dizzy":
        emote("question");
        break;
      case "surprised":
        emote("alarm");
        break;
      case "poked":
        emote(temper > 0.6 ? "anger" : "question");
        break;
      case "sleepy":
        if (Math.random() < 0.4) emote("dots");
        break;
    }
  };

  /**
   * A line it's floating across a gap, drifting out from it to where it'll catch: bowed up on the
   * breeze, fluttering most at its loose end, with a little tuft of silk on the end.
   */
  const drawFloatingLine = (ctx: CanvasRenderingContext2D, ink: string) => {
    const web = world.web;
    if (!line) return;
    const to = line.nodes[line.nodes.length - 1];
    const [fx, fy] = toDoc([web.x(spinFrom), web.y(spinFrom)]);
    const [tx, ty] = toDoc([web.x(to), web.y(to)]);
    const dx = tx - fx;
    const dy = ty - fy;
    const len = Math.hypot(dx, dy) || 1;
    // The side of the line that's up (or, for a line straight down, one side).
    let [nx, ny] = [-dy / len, dx / len];
    if (ny > 0 || (Math.abs(ny) < 0.2 && nx < 0)) [nx, ny] = [-nx, -ny];
    const bow = Math.min(len * 0.2, world.unit * 0.9);
    const flutter = world.unit * 0.05;
    const pts: { x: number; y: number }[] = [];
    const steps = Math.max(6, Math.round(len / 10));
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * spinT;
      const lift = Math.sin(Math.PI * u) * bow + Math.sin(time * 15 - u * 22) * flutter * (u / Math.max(0.05, spinT));
      pts.push({ x: fx + dx * u + nx * lift, y: fy + dy * u + ny * lift });
    }
    ctx.save();
    ctx.strokeStyle = threadStyle(ctx, shown.thread, pts, ink);
    ctx.globalAlpha = Math.min(1, den.webs.opacity * 1.6);
    ctx.lineWidth = den.webs.thickness;
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    const tip = pts[pts.length - 1];
    ctx.fillStyle = ink;
    ctx.globalAlpha *= 0.7;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(tip.x + Math.cos(time * 9 + i * 2.1) * world.unit * 0.02, tip.y + Math.sin(time * 9 + i * 2.1) * world.unit * 0.02, world.unit * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
  const oldFace = faceFor({ eyes: { lid: 0.55, lookY: 0.2, lookHold: 0.25 } }, 1);

  const me: Critter = {
    member,
    pirate,

    get mode() {
      return mode;
    },
    get task() {
      return task;
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
    get fleeing() {
      return task === "flee" || mode === "dangle" || (mode === "air" && jump !== null);
    },
    /** Still in the den and not dying. */
    get alive() {
      return mode !== "ghost" && mode !== "eaten" && mode !== "carried" && !leaving && !departed;
    },
    get gone() {
      return departed || (mode === "ghost" && ghost >= 3.5) || (mode === "eaten" && eaten >= 1);
    },
    get fighting() {
      return brawl !== null;
    },
    /** The spider it's hunting, if it's stalking one. */
    get quarry() {
      return task === "stalk" ? quarry : null;
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
    power,
    agility,
    emote,
    nerve: () => trait("nerve"),
    /** Its mouth, den px. */
    mouth(): Vec {
      const [mx, my] = spider.mouth();
      return mx || my ? [mx - world.origin[0], my - world.origin[1]] : center();
    },

    /** A node on the web right by it, for others to walk or jump to. −1 if it isn't on the web. */
    nodeNearby() {
      if (mode !== "web") return -1;
      const [a, b] = world.web.ends(spot.edge);
      return spot.t < 0.5 ? a : b;
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
      wraps = 0;
      recent.clear();
      jump = null;
    },

    /** The webs were rebuilt: back onto the nearest thread, or let go. */
    rewoven() {
      prey = null;
      work = -1;
      spinFrom = -1;
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
      if (mode === "carried") {
        // Snatched back from a bird or a frog: saved!
        carriedBy = null;
        mood.feel("excited", 1.5);
        emote("heart", true);
      }
      hand.x = px;
      hand.y = py;
      if (task === "nap") wake();
      if (prey?.claimedBy === me) prey.claimedBy = null;
      prey = null;
      letGoOfWork();
      if (brawl) world.breakFight(me);
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
        const at = snapsAt();
        if (at < 0.985 && wound >= at) snap();
        else if (hang === "down") hang = "hang";
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
      // A pirate spider that's been manhandled might just give up and go.
      if (pirate && Math.random() < 0.35) {
        me.toss(x, y, tvx, tvy);
        leaving = true;
        task = "leave";
        return;
      }
      const c = den.catching;
      const gentle = Math.hypot(tvx, tvy) < c.dropSpeed * world.unit;
      // Put down, it's let go right where the pointer has it, not wherever it had caught up to.
      if (gentle) {
        x = hand.x + hand.ox;
        y = hand.y + hand.oy;
      }
      // Right on a thread, it holds on there. Anywhere else it drops from where it is, until a web
      // catches it; put down gently, with no free zone, so the first thread below will do.
      const on = gentle ? world.web.nearest(x, y, c.dropCatch * world.unit, true) : null;
      if (on) {
        settle(on, between(0.6, 1.6));
        world.web.push(on.x, on.y, 0, world.unit * 2);
        return;
      }
      me.toss(x, y, tvx, tvy);
      if (gentle) launch = null;
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

    /** It's eaten a spider: a big meal. */
    feast() {
      task = "eat";
      meal = { state: "gone", spot: null, x, y, claimedBy: null };
      chew = 1.6;
      animations.mouthOpen(1);
      mood.feel("content", 3);
      if (pirate) emote("skull");
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

    // ── Other spiders and danger (called by world.ts) ──

    /** Something's coming for it (`target`), or for someone near it: it may run, jump, drop, freeze or stand its ground. */
    alarm(fx: number, fy: number, target: boolean) {
      if (!me.alive || held || brawl || mode === "air" || calmIn > 0) return;
      calmIn = target ? 1.5 : 3;
      threat = [fx, fy];
      const nerve = trait("nerve");
      if (target) {
        const p = den.predators;
        const odds = clamp(p.dodge * (0.8 + 0.5 * (1 - nerve)) * agility() * (grownUp(member) ? 1 : 0.85), 0.02, 0.95);
        mood.feel("scared", 1.5);
        if (Math.random() < odds) {
          emote("alarm", true);
          const ways: [number, () => boolean][] = [
            [1.2 * agility(), () => mode === "web" && startJump([fx, fy])],
            [0.9, () => mode === "web" && startDangle(true)],
            [0.8 * agility(), () => mode === "web" && runFrom(fx, fy)],
          ];
          let roll = Math.random() * ways.reduce((s, [w]) => s + w, 0);
          for (const [w, act] of ways) {
            roll -= w;
            if (roll <= 0 && act()) return;
          }
          if (mode === "web" && (startJump([fx, fy]) || runFrom(fx, fy))) return;
        } else {
          emote(nerve > 0.6 ? "anger" : "sweat", true);
          if (mode === "web") {
            task = "cower";
            timer = 1.5;
            toward = -1;
            letGoOfWork();
          }
        }
        return;
      }
      // Someone else's in trouble nearby: timid spiders scatter; brave ones mostly stay put.
      if (Math.random() > 0.35 + 0.6 * (1 - nerve)) {
        emote(nerve > 0.7 ? "question" : "alarm");
        return;
      }
      emote(Math.random() < 0.5 ? "alarm" : "sweat");
      mood.feel("scared", 1.2);
      if (mode !== "web") return;
      const ways: [number, () => boolean][] = [
        [1.5, () => runFrom(fx, fy)],
        [0.7 * agility(), () => startJump([fx, fy])],
        [0.5, () => startDangle(true)],
        [(1 - nerve) * 0.8, () => ((task = "cower"), (timer = between(1, 2.5)), (toward = -1), true)],
      ];
      let roll = Math.random() * ways.reduce((s, [w]) => s + w, 0);
      for (const [w, act] of ways) {
        roll -= w;
        if (roll <= 0 && act()) return;
      }
    },

    /** It's noticed `attacker` stalking it. */
    stalkedBy(attacker: Critter) {
      if (!me.alive || held || brawl || mode !== "web") return;
      const nerve = trait("nerve");
      const odds = power() / Math.max(0.05, attacker.power());
      const [ax, ay] = attacker.position;
      emote(nerve > 0.6 && odds > 0.8 ? "anger" : "alarm", true);
      const ways: [number, () => boolean][] = [
        [agility() * (1.3 - nerve), () => runFrom(ax, ay)],
        [agility() * 0.8 * (1 - nerve * 0.5), () => startJump([ax, ay])],
        [0.5, () => startDangle(true)],
        [nerve * odds * 1.2, () => ((task = "brace"), (timer = 4), (toward = -1), letGoOfWork(), true)],
        [(1 - nerve) * 0.4, () => ((task = "cower"), (timer = 3), (toward = -1), letGoOfWork(), true)],
      ];
      let roll = Math.random() * ways.reduce((s, [w]) => s + w, 0);
      for (const [w, act] of ways) {
        roll -= w;
        if (roll <= 0 && act()) return;
      }
    },

    /** A pirate spider off out of the den. */
    leaveDen() {
      if (pirate) leave();
    },

    /** Go after `target` (tuning: start a fight). */
    stalk(target: Critter) {
      if (mode !== "web" || held) return false;
      return startStalk(target);
    },

    /** A mate's coming over: wait for it. */
    courtedBy(suitor: Critter) {
      if (mode !== "web" || held || task === "fight") return;
      task = "court";
      phase = "do";
      partner = suitor;
      toward = -1;
      timer = den.babies.court + 8;
    },

    /** It's in a fight: world.ts moves it about until it's over. */
    enterFight(fight: Fight) {
      brawl = fight;
      letGoOfWork();
      task = "fight";
      toward = -1;
      jump = null;
      if (mode !== "web") mode = "web";
      mood.feel("angry", fight.duration);
      emote("anger", true);
    },

    /** Where it is in the scrap, this frame. */
    scrap(px: number, py: number) {
      vx = (px - x) * 20;
      vy = (py - y) * 20;
      x = px;
      y = py;
      walkPhase += 0.9;
      walking = 1;
      lean = Math.sin(time * 30) * 18 * DEG;
      if (Math.random() < 0.02) emote("anger");
    },

    /** The fight's over and it won (and ate the other, if `ate`). */
    won(ate: boolean) {
      brawl = null;
      lean = 0;
      const near = world.web.nearest(x, y, world.unit * 1.5, true);
      if (near) settle(near, 1);
      else me.toss(x, y, 0, 0);
      if (ate) me.feast();
      else {
        emote("dots");
        mood.feel("annoyed", 2);
        if (pirate) leave();
      }
    },

    /** The fight's over, and it lost but got away (knocked flying from (fx, fy)). */
    escaped(fx: number, fy: number) {
      brawl = null;
      const d = Math.hypot(x - fx, y - fy) || 1;
      me.toss(x, y, ((x - fx) / d) * world.unit * 7, -world.unit * 5);
      mood.feel("panicked", 2);
      emote("sweat", true);
    },

    /** The fight fizzled (someone was picked up). */
    fightOff() {
      brawl = null;
      emote("question");
      if (mode === "web") {
        const near = world.web.nearest(x, y, world.unit * 1.5, true);
        if (near) settle(near, 1);
        else me.toss(x, y, 0, 0);
      }
    },

    /** Lost a fight: it's being eaten by `killer`. */
    eatenBy(killer: Critter) {
      if (held) world.drop(me);
      held = false;
      brawl = null;
      letGoOfWork();
      if (prey?.claimedBy === me) prey.claimedBy = null;
      mode = "eaten";
      eater = killer;
      eaten = 0;
      emotes.clear();
      mood.feel("panicked", 2);
    },

    /** Caught by a bird or a frog: held at `hold()` until it's gone. */
    carry(hold: () => Vec) {
      if (held) world.drop(me);
      held = false;
      letGoOfWork();
      if (prey?.claimedBy === me) prey.claimedBy = null;
      mode = "carried";
      carriedBy = hold;
      emotes.clear();
      mood.feel("panicked", 5);
    },

    /** Gone for good (it's been carried off). */
    vanish() {
      departed = true;
    },

    /** Starved or died of old age: it floats away. */
    die(cause: "starved" | "old" = "starved") {
      if (held) world.drop(me);
      held = false;
      if (prey?.claimedBy === me) prey.claimedBy = null;
      if (meal) world.ate(me, meal);
      meal = null;
      letGoOfWork();
      deathCause = cause;
      mode = "ghost";
      ghost = 0;
      emotes.clear();
    },

    think(dt: number) {
      time += dt;
      emotes.update(dt);
      calmIn = Math.max(0, calmIn - dt);
      if (calmIn <= 0) threat = null;
      if (meal) {
        chew -= dt;
        if (chew < 0.35) animations.mouthOpen(0);
        if (chew <= 0) {
          const food = meal;
          meal = null;
          if (food.state !== "gone" || food.spot) world.ate(me, food);
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
      } else if (mode === "eaten") {
        if (eater) {
          const [mx, my] = eater.mouth();
          const k = 1 - Math.exp(-6 * dt);
          x += (mx - x) * k;
          y += (my - y) * k;
        }
        eaten = Math.min(1, eaten + dt / 1.1);
        tumble += dt * 6;
      } else if (mode === "carried") {
        if (carriedBy) [x, y] = carriedBy();
        tumble += dt * 3;
        vx = vy = 0;
      } else if (brawl) {
        // world.ts moves it.
      } else if (mode === "web") thinkWeb(dt);
      else if (mode === "dangle") thinkDangle(dt);
      else if (mode === "air") thinkAir(dt);
      else if (mode === "held") thinkHeld(dt);
      if (mode !== "air" && mode !== "eaten" && mode !== "carried") {
        tumble += (Math.round(tumble / (Math.PI * 2)) * Math.PI * 2 - tumble) * (1 - Math.exp(-8 * dt));
      }
      feelingsShow();

      // Now and then a hungry spider thinks about flies.
      bubble = Math.max(0, bubble - dt);
      bubbleIn -= dt;
      if (bubbleIn <= 0) {
        bubbleIn = between(7, 13);
        if (!pirate && member.fullness < den.marks.hungry && mode === "web" && task !== "nap" && task !== "eat") bubble = 2.4;
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
      const old = elder() * den.aging.droop;
      if (old > 0.001 && mode !== "ghost") easeFace(mood.face, oldFace, old);
      if (nap > 0.001) easeFace(mood.face, napFace(), nap);

      const frame = { x: x + ox, y: y + oy, unit, maxThread: 1.5 };
      animations.update(frame, dt, Math.abs(seenV[0]) / Math.max(1, unit));
      const state = animations.state;
      state.attachX = 0.5;
      state.attachY = 0.5;
      state.attachBlend = attach;
      state.size = WIDTH / Math.max(0.01, config.look.width);
      state.tilt = mode === "web" ? lean : tumble;
      const flailing = mode === "held" || mode === "air" || mode === "carried" || mode === "eaten";
      const wiggle = mode === "web" ? walking : flailing ? (mode === "carried" ? 1 : 0.35) : 0;
      state.legSwing = den.walking.legs * DEG * wiggle;
      state.legPhase = mode === "web" ? walkPhase : time * (mode === "carried" ? 16 : 9);
      const alpha = mode === "dangle" ? pending * config.sim.rate : 1;
      spider.update(frame, dt, dt, Math.min(1, alpha), pixelRatio);
      rope.translate(-ox, -oy);

      const c = docCenter();
      const velocity: Vec = [seenV[0] / Math.max(1, unit), seenV[1] / Math.max(1, unit)];
      speedLines.update(dt, c, jump || mode === "carried" ? [0, 0] : velocity, unit, spider.radius());
      wind.update(dt);
      zees.update(dt, mode === "ghost" ? 0 : nap > 0.5 ? 1 : mood.asleep, c, spider.radius(), unit);
    },

    /** Behind the spiders: its string, the silk from a jump or being spun, and the main spider's glow. Document px. */
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
      if (task === "spin" && phase === "do" && line && spinHow === "shoot") {
        if (aiming >= den.repair.aim) drawFloatingLine(ctx, ink);
      } else if (task === "spin" && phase === "do" && line) {
        const web = world.web;
        const from = line.nodes[Math.min(laid, line.nodes.length - 1)];
        const [fx, fy] = toDoc([web.x(from), web.y(from)]);
        const [tx, ty] = toDoc([x, y]);
        ctx.save();
        const pts = [
          { x: fx, y: fy },
          { x: tx, y: ty },
        ];
        ctx.strokeStyle = threadStyle(ctx, shown.thread, pts, ink);
        ctx.globalAlpha = Math.min(1, den.webs.opacity * 1.8);
        ctx.lineWidth = den.webs.thickness * 1.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
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
      if (member.main && den.marks.mainGlow && c && me.alive) {
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
      const c = docCenter();
      if (mode === "eaten" && c) {
        const s = Math.max(0.05, 1 - eaten * 0.95);
        ctx.translate(c[0], c[1]);
        ctx.scale(s, s);
        ctx.translate(-c[0], -c[1]);
      }
      spider.draw(ctx);
      ctx.strokeStyle = ink;
      zees.draw(ctx);
      // Died of old age: a little halo as it goes.
      if (mode === "ghost" && deathCause === "old" && c) {
        ctx.strokeStyle = "#f0b43c";
        ctx.lineWidth = Math.max(1.5, spider.radius() * 0.08);
        ctx.beginPath();
        ctx.ellipse(c[0], c[1] - spider.radius() * 1.05, spider.radius() * 0.45, spider.radius() * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },

    /** On top of everything: which one's picked, the main spider's star, its name, emotes and hungry thoughts. Document px. */
    drawMarks(ctx: CanvasRenderingContext2D, colors: EmoteColors, picked: boolean, hovered: boolean) {
      const c = docCenter();
      if (!c || mode === "ghost" || mode === "eaten") return;
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
      if (names === "always" || (names === "hover" && (picked || hovered)) || pirate) {
        const label = nameOf(member);
        ctx.save();
        ctx.font = "600 12px system-ui, sans-serif";
        const w = ctx.measureText(label).width + 12;
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = pirate ? "#8b3a3a" : colors.surface;
        ctx.beginPath();
        ctx.roundRect(c[0] - w / 2, top - 18, w, 18, 9);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = pirate ? "#fff" : colors.ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, c[0], top - 8.5);
        ctx.restore();
        top -= 22;
      }
      if (den.tools.stats && !pirate) {
        const g = member.genes;
        const lines = [
          `${task}${task === "spin" ? ` (${spinHow})` : ""}${phase === "do" ? "·" : ""} food ${Math.round(member.fullness * 100)}% life ${Math.round(lifeDone(member) * 100)}%`,
          `spd ${g.speed.toFixed(2)} eat ${g.appetite.toFixed(2)} silk ${g.silk.toFixed(2)} str ${g.strength.toFixed(2)}`,
          `tmp ${member.personality.temper.toFixed(2)} thr ${member.personality.thrill.toFixed(2)} nrv ${member.personality.nerve.toFixed(2)} agg ${member.personality.aggression.toFixed(2)}`,
        ];
        ctx.save();
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = colors.surface;
        ctx.fillStyle = colors.ink;
        lines.forEach((line, i) => {
          const ly = c[1] + r + 12 + i * 11;
          ctx.strokeText(line, c[0], ly);
          ctx.fillText(line, c[0], ly);
        });
        ctx.restore();
      }
      emotes.draw(ctx, c[0], top, r, unitNow(), colors);
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
      letGoOfWork();
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

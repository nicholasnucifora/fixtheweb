import { config } from "../spider-string/config";
import { drawSnack, type Snack } from "../spider-string/food";
import { ateSnack, trying } from "../spider-string/look";
import { Particles } from "../spider-string/particles";
import { drawString, threadStyle } from "../spider-string/render";
import { Rope } from "../spider-string/rope";
import type { Look } from "../spider-string/wardrobe";
import { type Bug, createBugs } from "./bugs";
import {
  COLONY_EVENT,
  type Egg,
  byId,
  eggs,
  feed,
  growEveryoneUp,
  hatch,
  hatchAllNow,
  hurry,
  layEggs,
  mainSpider,
  members,
  nameOf,
  picked,
  setFullness,
  startOver,
  tick,
  wear,
} from "./colony";
import { den } from "./config";
import { type Critter, type DenWorld, WIDTH, createCritter } from "./critter";
import { SCENES, type Palette, type Scene, type SceneId, buildScene } from "./scenes";
import { type Spot, type Vec, Web, random } from "./web";

/**
 * The Spider Den's ecosystem (the den view of src/pages/den.astro): the webs, every spider you have
 * living on them, egg sacs, and flies. Drawn on one canvas filling `root`.
 *
 * Press a spider to pick it up (and pick it, for the wardrobe): drag it about and fling it. Press a
 * fly to carry it to a spider's mouth, and an egg sac to hurry it along.
 *
 * It only runs while it's showing (`setActive`). Hunger and growing up carry on regardless: they're
 * worked out from the clock (colony.ts).
 */

export interface WorldHooks {
  /** A spider was pressed, or (`null`) somewhere with nothing in it. */
  pick(id: string | null): void;
  /** Something worth telling the person (HTML). */
  say(html: string): void;
}

const SEED_KEY = "den:web-seed";
const SCENE_KEY = "den:scene";

/** The scenery's colours, on a light page and a dark one: flat and quiet, so the spiders stand out. */
const PALETTES: Record<"light" | "dark", Palette> = {
  light: {
    bg: "#fafaf7",
    line: "rgba(27, 30, 41, 0.22)",
    bark: "#d8ccbb",
    barkShade: "#c7b8a3",
    leaf: "#b5cfa9",
    leafLight: "#cadfbd",
    canopy: "#e9efe0",
    wood: "#efe7da",
    woodShade: "#e2d6c2",
    sky: "#dcebf1",
    hill: "#c3dbbd",
    hillFar: "#d4e5cf",
    cloud: "#f6fafb",
    sun: "#f4e2a6",
    glare: "rgba(255, 255, 255, 0.45)",
    curtain: "#ecc9b7",
    curtainShade: "#ddb29e",
    petal: "#f1cd6c",
    petalCore: "#b98b52",
    pot: "#dca386",
    sock: "#eaa090",
  },
  dark: {
    bg: "#1b1e29",
    line: "rgba(242, 242, 238, 0.14)",
    bark: "#353544",
    barkShade: "#2b2b38",
    leaf: "#2d4841",
    leafLight: "#35544b",
    canopy: "#21272f",
    wood: "#2f3344",
    woodShade: "#282c3b",
    sky: "#24304a",
    hill: "#283b3a",
    hillFar: "#2c3d44",
    cloud: "#344059",
    sun: "#e6e1c6",
    glare: "rgba(255, 255, 255, 0.05)",
    curtain: "#4a3945",
    curtainShade: "#3d2f39",
    petal: "#b39545",
    petalCore: "#6a5236",
    pot: "#6c4b3f",
    sock: "#8a5b51",
  },
};

function readScene(): SceneId {
  try {
    const saved = localStorage.getItem(SCENE_KEY);
    if (saved && saved in SCENES) return saved as SceneId;
  } catch {
    // ignore
  }
  return "tree";
}
const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const between = (a: number, b: number) => Math.min(a, b) + Math.random() * Math.abs(b - a);

function readSeed() {
  try {
    const saved = Number(localStorage.getItem(SEED_KEY));
    if (saved) return saved;
    const seed = Math.floor(Math.random() * 2 ** 31) + 1;
    localStorage.setItem(SEED_KEY, String(seed));
    return seed;
  } catch {
    return 1234567;
  }
}

interface Sac {
  egg: Egg;
  spot: Spot | null;
  angle: number;
  swing: number;
  wiggle: number;
  shown: number;
}

interface Strand {
  rope: Rope;
  anchor: Spot;
  thread: Look["thread"];
  age: number;
}

export function createWorld(root: HTMLElement, hooks: WorldHooks) {
  const canvas = root.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const html = document.documentElement;
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const web = new Web();
  const particles = new Particles();
  const fluff = new Particles();
  const bugs = createBugs({
    web,
    get unit() {
      return world.unit;
    },
  });
  const sacs = new Map<string, Sac>();
  let strands: Strand[] = [];
  let seed = readSeed();
  let sceneId = readScene();
  let scene: Scene | null = null;
  /** The scenery, painted once per build (and theme) rather than every frame. */
  const scenery = document.createElement("canvas");
  let paintedKey = "";
  let builtKey = "";
  let dpr = 1;
  let active = false;
  let raf = 0;
  let last = 0;
  let lifeIn = 0;
  let dirty = true;
  let highlighted: string | null = null;
  const colors = { ink: "#1b1e29", accent: "#2b8666", surface: "#ffffff" };

  const world: DenWorld = {
    web,
    unit: 100,
    origin: [0, 0],
    pointer: null,
    particles,
    critters: [],
    pickedId: null,
    trying,
    preyNear: (x, y, range, hunter) => bugs.preyNear(x, y, range, hunter),
    eating(_hunter, prey) {
      const bug = prey as Bug;
      bug.state = "eaten";
      bug.eatenBy = _hunter;
      bug.claimedBy = null;
      bug.eaten = 0;
      bug.spot = null;
    },
    ate(hunter, prey) {
      const bug = prey as Bug;
      bug.state = "gone";
      if (!byId(hunter.member.id)) return;
      feed(hunter.member.id);
      if (bug.handFed) {
        // Given to it by you: counts toward what snacks unlock.
        const unlocked = ateSnack(wear);
        if (unlocked.length) {
          const names = unlocked.map(({ item }) => `the ${escape(item.label.toLowerCase())}`).join(" and ");
          hooks.say(`<strong>Yum! You unlocked ${names}.</strong> It's in the wardrobe now.`);
        } else hooks.say(`${escape(nameOf(hunter.member))} ate the ${bug.kind}.`);
      }
    },
    strand(from, anchor, thread) {
      const rope = new Rope(from.points.length - 1);
      rope.setLength(from.length);
      from.points.forEach((p, i) => Object.assign(rope.points[i], p));
      strands.push({ rope, anchor: { ...anchor }, thread, age: 0 });
    },
    drop(critter) {
      if (holding?.critter === critter) holding = null;
    },
    drawBug: (c, x, y, size, wing) => drawSnack(c, "fly", x, y, size, wing),
  };

  // ── Size, colours, webs ───────────────────────────────────────────────────

  const readColors = () => {
    const style = getComputedStyle(root);
    const hex = (name: string, fallback: string) => {
      const v = style.getPropertyValue(name).trim();
      return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
    };
    colors.ink = hex("--ink", dark.matches ? "#f2f2ee" : "#1b1e29");
    colors.accent = hex("--accent", dark.matches ? "#6ac7a7" : "#2b8666");
    colors.surface = hex("--surface", dark.matches ? "#222633" : "#ffffff");
  };
  dark.addEventListener("change", readColors);

  const fit = () => {
    const w = root.clientWidth;
    const h = root.clientHeight;
    dpr = window.devicePixelRatio || 1;
    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const spiderWidth = w < 700 ? den.world.spiderWidthSmall : den.world.spiderWidth;
    world.unit = spiderWidth / WIDTH;
    const r = root.getBoundingClientRect();
    world.origin = [r.left + window.scrollX, r.top + window.scrollY];
    const key = JSON.stringify([w, h, world.unit, den.webs, seed, sceneId]);
    if (key !== builtKey && w > 0 && h > 0) {
      const first = builtKey === "";
      const sx = web.width ? w / web.width : 1;
      const sy = web.height ? h / web.height : 1;
      builtKey = key;
      scene = buildScene(sceneId, w, h, world.unit, random(seed));
      web.build(w, h, world.unit, seed, scene);
      paintedKey = "";
      for (const sac of sacs.values()) sac.spot = null;
      strands = [];
      if (!first) {
        // Everyone keeps their place, stretched with the den.
        for (const c of world.critters) {
          const [x, y] = c.position;
          c.rewoven();
          if (c.mode === "web") c.placeNear(x * sx, y * sy);
        }
        bugs.rewoven();
      }
    }
  };

  // ── Spiders ───────────────────────────────────────────────────────────────

  /** Somewhere on the web to put a spider that's just turned up. */
  const placeNew = (critter: Critter) => {
    const m = critter.member;
    const parent = m.parent ? world.critters.find((c) => c.member.id === m.parent && c !== critter) : null;
    let node = -1;
    if (m.main) {
      const middle = web.hubs.reduce(
        (best, hub) =>
          Math.hypot(web.x(hub.node) - web.width / 2, web.y(hub.node) - web.height * 0.45) <
          Math.hypot(web.x(best.node) - web.width / 2, web.y(best.node) - web.height * 0.45)
            ? hub
            : best,
        web.hubs[0],
      );
      node = middle?.node ?? -1;
    } else if (parent) {
      const [px, py] = parent.position;
      node = web.nodeNear(px, py, world.unit * 0.5, world.unit * 1.6);
    }
    if (node < 0 && web.hubs.length) {
      // Somewhere on a web, not on top of anyone.
      for (let tries = 0; tries < 12; tries++) {
        const hub = web.hubs[Math.floor(Math.random() * web.hubs.length)];
        node = web.nodeNear(web.x(hub.node), web.y(hub.node), hub.radius * 0.2, hub.radius);
        const clear = node >= 0 && world.critters.every((c) => c === critter || Math.hypot(c.position[0] - web.x(node), c.position[1] - web.y(node)) > world.unit * 0.6);
        if (clear) break;
      }
    }
    critter.placeNear(node >= 0 ? web.x(node) : web.width / 2, node >= 0 ? web.y(node) : web.height / 3);
  };

  /** Matches the spiders on the web to the ones in the colony. */
  const sync = () => {
    dirty = false;
    const list = members();
    const byMember = new Map(list.map((m) => [m.id, m]));
    world.critters = world.critters.filter((c) => {
      if (c.mode === "ghost") return true;
      const m = byMember.get(c.member.id);
      if (m === c.member) return true;
      // Gone, or reloaded from another tab (a new object): start it over where it was.
      c.dispose();
      if (holding?.critter === c) holding = null;
      if (m) {
        const fresh = createCritter(m, world);
        fresh.placeNear(...c.position);
        replacements.push(fresh);
      }
      return false;
    });
    world.critters.push(...replacements.splice(0));
    for (const m of list) {
      if (world.critters.some((c) => c.member === m)) continue;
      const critter = createCritter(m, world);
      world.critters.push(critter);
      placeNew(critter);
    }
    world.pickedId = picked()?.id ?? null;
  };
  const replacements: Critter[] = [];
  document.addEventListener(COLONY_EVENT, () => (dirty = true));

  // ── Egg sacs ──────────────────────────────────────────────────────────────

  const sacPoint = (sac: Sac): { anchor: Vec; ball: Vec; r: number } => {
    const anchor: Vec = sac.spot ? web.point(sac.spot) : [sac.egg.x * web.width, sac.egg.y * web.height];
    const hang = world.unit * 0.3;
    const r = world.unit * 0.12;
    return { anchor, ball: [anchor[0] + Math.sin(sac.angle) * hang, anchor[1] + Math.cos(sac.angle) * hang], r };
  };

  const updateSacs = (dt: number) => {
    const now = Date.now();
    const current = eggs();
    for (const id of sacs.keys()) if (!current.some((e) => e.id === id)) sacs.delete(id);
    for (const egg of current) {
      let sac = sacs.get(egg.id);
      if (!sac) {
        sac = { egg, spot: null, angle: 0, swing: 0, wiggle: 0, shown: 0 };
        sacs.set(egg.id, sac);
      }
      sac.egg = egg;
      if (!sac.spot) {
        const near = web.nearest(egg.x * web.width, egg.y * web.height, Math.max(web.width, web.height), true);
        sac.spot = near ? { edge: near.edge, t: near.t } : null;
      }
      sac.shown += dt;
      const hang = world.unit * 0.3;
      const g = config.rope.gravity * world.unit;
      sac.swing += (-(g / hang) * Math.sin(sac.angle) - 1.5 * sac.swing) * dt;
      sac.angle += sac.swing * dt;
      sac.wiggle = Math.max(0, sac.wiggle - dt * 2);
      const left = egg.hatch - now;
      if (left < 4000 && Math.random() < dt * 3) sac.swing += (Math.random() - 0.5) * 3;
      if (left <= 0 && sac.shown > 2.5) hatchSac(sac);
    }
  };

  const hatchSac = (sac: Sac) => {
    const { ball, r } = sacPoint(sac);
    const babies = hatch(sac.egg.id);
    sacs.delete(sac.egg.id);
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = world.unit * between(0.8, 2.4);
      fluff.spawn({
        x: ball[0],
        y: ball[1],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: r * 0.5,
        width: Math.max(1.5, r * 0.3),
        life: 0.6,
        drag: 5,
        gravity: world.unit * 1.5,
        shrink: 0.8,
      });
    }
    web.push(ball[0], ball[1], 0, world.unit * 6, world.unit);
    for (const m of babies) {
      const critter = createCritter(m, world);
      world.critters.push(critter);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = world.unit * between(2, 4.5);
      critter.toss(ball[0], ball[1], Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
    if (babies.length) {
      const parent = byId(sac.egg.parent);
      hooks.say(
        `<strong>${babies.length === 1 ? "A baby" : `${babies.length} babies`} hatched!</strong> ` +
          `${parent ? `${escape(nameOf(parent))}'s` : "The"} little ${babies.map((b) => escape(nameOf(b))).join(", ")}.`,
      );
    }
  };

  const drawSacs = () => {
    const now = Date.now();
    for (const sac of sacs.values()) {
      const { anchor, ball, r } = sacPoint(sac);
      const left = (sac.egg.hatch - now) / 1000;
      const pulse = left < 5 ? 1 + Math.sin(performance.now() / 60) * 0.04 : 1;
      const size = r * pulse * (1 + sac.wiggle * 0.12);
      ctx.save();
      ctx.strokeStyle = colors.ink;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(anchor[0], anchor[1]);
      ctx.lineTo(ball[0], ball[1] - size * 0.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // A fluffy ball of silk: little puffs round a middle, with the eggs showing through.
      const puffs = new Path2D();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + sac.egg.id.charCodeAt(i % sac.egg.id.length) * 0.1;
        puffs.moveTo(ball[0] + Math.cos(a) * size * 0.55 + size * 0.42, ball[1] + Math.sin(a) * size * 0.62);
        puffs.arc(ball[0] + Math.cos(a) * size * 0.55, ball[1] + Math.sin(a) * size * 0.62, size * 0.42, 0, Math.PI * 2);
      }
      puffs.moveTo(ball[0] + size * 0.7, ball[1]);
      puffs.arc(ball[0], ball[1], size * 0.7, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = colors.ink;
      ctx.globalAlpha = 0.45;
      ctx.stroke(puffs);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#f4efe1";
      ctx.fill(puffs, "nonzero");
      ctx.fillStyle = "#d8c9a6";
      for (let i = 0; i < sac.egg.count; i++) {
        const a = (i / sac.egg.count) * Math.PI * 2 + 0.6;
        ctx.beginPath();
        ctx.arc(ball[0] + Math.cos(a) * size * 0.35, ball[1] + Math.sin(a) * size * 0.3, size * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // ── Snapped strings ───────────────────────────────────────────────────────

  const updateStrands = (dt: number) => {
    const step = 1 / 120;
    const steps = Math.min(8, Math.ceil(dt / step));
    const g = config.rope.gravity * world.unit;
    for (const s of strands) {
      s.age += dt;
      const fade = Math.max(0.1, den.snapping.fade);
      // It curls up as it goes.
      s.rope.setLength(Math.max(1, s.rope.length * (1 - dt / fade)));
      const [hx, hy] = web.point(s.anchor);
      for (let i = 0; i < steps; i++) {
        s.rope.setMass(config.rope.mass);
        s.rope.tail.w = s.rope.points[1]?.w ?? 1;
        s.rope.head.x = s.rope.head.px = hx;
        s.rope.head.y = s.rope.head.py = hy;
        s.rope.integrate(dt / steps, g, 3, 3, () => 0);
        s.rope.solve(4, 1, 0.05);
      }
    }
    strands = strands.filter((s) => s.age < den.snapping.fade);
  };

  const drawStrands = () => {
    for (const s of strands) {
      const pts = s.rope.points.map((p) => ({ x: p.x, y: p.y }));
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - s.age / Math.max(0.1, den.snapping.fade));
      ctx.strokeStyle = threadStyle(ctx, s.thread, pts, colors.ink);
      drawString(ctx, pts, 1.25);
      ctx.restore();
    }
  };

  // ── Holding things ────────────────────────────────────────────────────────

  let holding: { critter?: Critter; bug?: Bug; pointerId: number; offset: Vec } | null = null;
  let hovered: Critter | null = null;
  const trail: { x: number; y: number; t: number }[] = [];

  const local = (e: { clientX: number; clientY: number }): Vec => {
    const r = root.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  /** The spider under (x, y), den px: the nearest one it's over, the picked one winning ties. */
  const critterAt = (x: number, y: number) => {
    let best: Critter | null = null;
    let bestD = 0;
    for (const c of world.critters) {
      if (c.mode === "ghost") continue;
      const d = c.distance(x, y) - (c.member.id === world.pickedId ? 4 : 0);
      if (d <= 0 && (!best || d < bestD)) {
        best = c;
        bestD = d;
      }
    }
    return best;
  };

  /** How fast the pointer was going as it let go (drag.ts's throw, px/s). */
  const throwSpeed = (now: number): Vec | null => {
    const lastPoint = trail[trail.length - 1];
    const span = Math.max(0.001, config.drag.throwWindow) * 1000;
    if (!lastPoint) return null;
    const rested = Math.max(0, 1 - Math.max(0, now - lastPoint.t) / span);
    if (rested <= 0) return null;
    let first = lastPoint;
    for (let i = trail.length - 1; i >= 0; i--) {
      first = trail[i];
      if (lastPoint.t - first.t >= span) break;
    }
    const over = (lastPoint.t - first.t) / 1000;
    if (over <= 0) return null;
    return [((lastPoint.x - first.x) / over) * rested, ((lastPoint.y - first.y) / over) * rested];
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || holding || !active) return;
    const [x, y] = local(e);
    world.pointer = [x, y];
    const bug = bugs.at(x, y);
    const critter = bug ? null : critterAt(x, y);
    if (!bug && !critter) {
      for (const sac of sacs.values()) {
        const { ball, r } = sacPoint(sac);
        if (Math.hypot(ball[0] - x, ball[1] - y) > Math.max(18, r * 1.6)) continue;
        sac.swing += (Math.random() < 0.5 ? -1 : 1) * between(3, 5);
        sac.wiggle = 1;
        hurry(sac.egg.id, 3);
        hooks.say("The egg sac wriggles. Not long now…");
        return;
      }
      // Nothing there: let go of whoever was picked.
      hooks.pick(null);
      return;
    }
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // window listeners still see the moves
    }
    trail.length = 0;
    trail.push({ x, y, t: e.timeStamp });
    html.classList.add("spider-held");
    if (bug) {
      bugs.grab(bug);
      holding = { bug, pointerId: e.pointerId, offset: [bug.x - x, bug.y - y] };
    } else if (critter) {
      holding = { critter, pointerId: e.pointerId, offset: [0, 0] };
      critter.grab(x, y);
      hooks.pick(critter.member.id);
    }
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      if (!active) return;
      const [x, y] = local(e);
      const inside = x >= 0 && y >= 0 && x <= web.width && y <= web.height;
      if (holding && e.pointerId === holding.pointerId) {
        world.pointer = [x, y];
        trail.push({ x, y, t: e.timeStamp });
        const keep = e.timeStamp - Math.max(0.001, config.drag.throwWindow) * 2000;
        while (trail.length > 2 && trail[0].t < keep) trail.shift();
        if (holding.critter) holding.critter.moveHand(x, y);
        if (holding.bug) {
          holding.bug.x = x + holding.offset[0];
          holding.bug.y = y + holding.offset[1];
        }
      } else if (!holding) {
        world.pointer = inside && e.target === canvas ? [x, y] : null;
      }
    },
    { passive: true },
  );

  const letGo = (e: PointerEvent) => {
    if (!holding || e.pointerId !== holding.pointerId) return;
    const was = holding;
    holding = null;
    html.classList.remove("spider-held");
    const thrown = throwSpeed(e.timeStamp);
    trail.length = 0;
    if (was.critter) was.critter.release(thrown);
    if (was.bug) {
      const bug = was.bug;
      // Close enough to a spider's mouth, and it's eaten.
      let eater: Critter | null = null;
      let best = Infinity;
      for (const c of world.critters) {
        if (c.mode === "ghost") continue;
        const [mx, my] = c.mouth();
        const d = Math.hypot(bug.x - mx, bug.y - my);
        if (d <= Math.max(config.feed.eatDistance * c.unit(), world.unit * 0.18) && d < best) {
          eater = c;
          best = d;
        }
      }
      if (eater) {
        bug.handFed = true;
        eater.eat(bug);
        hooks.pick(eater.member.id);
      } else bugs.letGo(bug);
    }
  };
  window.addEventListener("pointerup", letGo);
  window.addEventListener("pointercancel", letGo);
  canvas.addEventListener("lostpointercapture", letGo);
  canvas.addEventListener("pointerleave", () => {
    if (!holding) world.pointer = null;
  });

  // ── Tuning buttons (Life → Pace, in /den?tune) ───────────────────────────

  const pressed: Record<string, number> = {};
  const actions: Record<string, () => void> = {
    spawnFly: () => bugs.flyIn(),
    feedAll: () => setFullness(1),
    starveAll: () => setFullness(0),
    layEggs: () => layFor((picked() ?? mainSpider()).id, true),
    hatchNow: () => hatchAllNow(),
    growUp: () => growEveryoneUp(),
    rebuild: () => {
      seed = Math.floor(Math.random() * 2 ** 31) + 1;
      try {
        localStorage.setItem(SEED_KEY, String(seed));
      } catch {
        // ignore
      }
    },
    resetDen: () => {
      for (const c of world.critters) c.dispose();
      world.critters = [];
      holding = null;
      bugs.clear();
      startOver();
    },
  };
  const pace = den.pace as unknown as Record<string, number>;
  for (const key of Object.keys(actions)) pressed[key] = pace[key];
  const checkActions = () => {
    for (const [key, run] of Object.entries(actions)) {
      if (pace[key] === pressed[key]) continue;
      pressed[key] = pace[key];
      run();
    }
  };

  /** Lays eggs for spider `id` somewhere near it on the web. Returns why not, or null. */
  const layFor = (id: string, force = false) => {
    const critter = world.critters.find((c) => c.member.id === id && c.mode !== "ghost");
    const [cx, cy] = critter?.position ?? [web.width / 2, web.height / 3];
    const below = web.nearest(cx + (Math.random() - 0.5) * world.unit * 0.8, cy + world.unit * 0.35, world.unit * 1.2, true);
    const [x, y] = below ? [below.x, below.y] : [cx, cy];
    const result = layEggs(id, x / Math.max(1, web.width), y / Math.max(1, web.height), force);
    if (typeof result === "string") return result;
    critter?.proud();
    return null;
  };

  // ── The loop ──────────────────────────────────────────────────────────────

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    frame(now);
  };

  const frame = (now: number) => {
    const real = Math.max(0, Math.min((now - last) / 1000, config.sim.maxFrame));
    last = now;
    const dt = real * config.sim.timeScale;
    fit();
    if (!web.width) return;
    checkActions();
    if (dirty) sync();
    world.pickedId = picked()?.id ?? null;

    lifeIn -= real;
    if (lifeIn <= 0) {
      lifeIn = 1;
      const starved = tick();
      for (const m of starved) world.critters.find((c) => c.member.id === m.id)?.die();
      if (starved.length) {
        const names = starved.map((m) => escape(nameOf(m)));
        const who = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
        hooks.say(`<strong>${who} starved</strong> and floated away. Keep your spiders fed.`);
      }
    }

    updateSacs(dt);
    web.step(dt);
    bugs.update(dt, true);
    for (const c of world.critters) c.think(dt);

    // A bug being carried opens the mouth of whoever it's coming near.
    const carried = holding?.bug;
    for (const c of world.critters) {
      if (!carried || c.mode === "ghost") {
        c.foodNear = 0;
        continue;
      }
      const [mx, my] = c.mouth();
      const d = Math.hypot(carried.x - mx, carried.y - my) / Math.max(1, c.unit());
      const feed = config.feed;
      c.foodNear = Math.max(0, Math.min(1, (feed.openDistance - d) / Math.max(0.001, feed.openDistance - feed.eatDistance)));
    }

    for (const c of world.critters) c.animate(dt, dpr);
    for (const c of world.critters) {
      if (c.gone) c.dispose();
    }
    world.critters = world.critters.filter((c) => !c.gone);
    particles.update(dt);
    fluff.update(dt);
    updateStrands(dt);

    hovered = holding?.critter ?? (world.pointer ? critterAt(...world.pointer) : null);
    canvas.style.cursor = holding
      ? "grabbing"
      : hovered || (world.pointer && bugs.at(...world.pointer))
        ? "grab"
        : "";

    draw();
  };

  const paintScenery = () => {
    const key = JSON.stringify([builtKey, dark.matches, dpr, den.webs.scenery]);
    if (key === paintedKey || !scene) return;
    paintedKey = key;
    scenery.width = canvas.width;
    scenery.height = canvas.height;
    const sctx = scenery.getContext("2d")!;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, web.width, web.height);
    scene.paint(sctx, PALETTES[dark.matches ? "dark" : "light"]);
  };

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintScenery();
    if (den.webs.scenery > 0) {
      ctx.globalAlpha = den.webs.scenery;
      ctx.drawImage(scenery, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    web.draw(ctx, colors.ink);
    drawStrands();
    drawSacs();
    bugs.draw(ctx, false);
    ctx.strokeStyle = colors.ink;
    particles.draw(ctx);
    // Silk fluff from a hatching egg sac: cream, dark enough to show on a light page.
    ctx.strokeStyle = "#d8c9a6";
    fluff.draw(ctx);

    const [ox, oy] = world.origin;
    ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    // The picked one and anything in your hand go in front.
    const order = [...world.critters].sort((a, b) => rank(a) - rank(b));
    for (const c of order) c.drawBehind(ctx, colors.ink, colors.accent);
    for (const c of order) c.draw(ctx, colors.ink);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bugs.draw(ctx, true);
    ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    for (const c of order) {
      const id = c.member.id;
      c.drawMarks(ctx, colors, id === world.pickedId || id === highlighted, c === hovered || id === highlighted);
    }
  };
  const rank = (c: Critter) => (c.held ? 3 : c.member.id === world.pickedId ? 2 : c.member.main ? 1 : 0);

  readColors();

  return {
    get scene() {
      return sceneId;
    },

    /** Moves the den to another scene: new webs, and everyone finds their feet on them. */
    setScene(id: SceneId) {
      if (id === sceneId) return;
      sceneId = id;
      try {
        localStorage.setItem(SCENE_KEY, id);
      } catch {
        // ignore
      }
    },

    /** Runs the den while it's showing, and stops when it isn't. */
    setActive(on: boolean) {
      if (on === active) return;
      active = on;
      if (on) {
        readColors();
        last = performance.now();
        dirty = true;
        raf = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        if (holding?.critter) holding.critter.release(null);
        holding = null;
        html.classList.remove("spider-held");
      }
    },

    /** The spider at a point on the page (client px), for dropping clothes on. */
    spiderAt(clientX: number, clientY: number) {
      const [x, y] = local({ clientX, clientY });
      return critterAt(x, y)?.member.id ?? null;
    },

    /** Rings a spider, while something's dragged over it. */
    highlight(id: string | null) {
      highlighted = id;
    },

    /** Lays eggs for this spider if it can. Returns why not, or null. */
    layEggs: (id: string) => layFor(id),

    /** A snack from the wardrobe, hovering next to spider `id` (or in the middle of the den). */
    offer(kind: Snack, id: string | null) {
      const critter = world.critters.find((c) => c.member.id === id && c.mode !== "ghost");
      const [cx, cy] = critter?.center() ?? [web.width / 2, web.height / 2];
      const side = cx > web.width - world.unit * 1.2 ? -1 : 1;
      bugs.offer(kind, cx + side * world.unit * 0.9, Math.max(world.unit * 0.3, cy - world.unit * 0.3));
    },

    /** A trick or mood from the wardrobe, for spider `id`. */
    play(id: string, what: string) {
      world.critters.find((c) => c.member.id === id && c.mode !== "ghost")?.play(what);
    },

  };
}

export type World = ReturnType<typeof createWorld>;

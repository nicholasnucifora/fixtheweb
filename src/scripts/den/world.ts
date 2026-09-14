import { config } from "../spider-string/config";
import { drawSnack, type Snack } from "../spider-string/food";
import { ateSnack, trying } from "../spider-string/look";
import { Particles } from "../spider-string/particles";
import { drawString, threadStyle } from "../spider-string/render";
import { Rope } from "../spider-string/rope";
import { blankLook, type Look } from "../spider-string/wardrobe";
import { type Bug, createBugs } from "./bugs";
import { createReplays } from "./replays";
import {
  COLONY_EVENT,
  DIED_EVENT,
  type Egg,
  type Member,
  byId,
  canLay,
  countKill,
  eggs,
  family,
  feed,
  growEveryoneUp,
  hatch,
  hatchAllNow,
  hurry,
  kill,
  layEggs,
  lifespan,
  mainSpider,
  makeOld,
  members,
  mortal,
  nameOf,
  picked,
  reroll,
  setFullness,
  sizeOf,
  starve,
  startOver,
  watch,
  wear,
  elderness,
} from "./colony";
import { den } from "./config";
import { type Critter, type DenWorld, type Fight, WIDTH, createCritter } from "./critter";
import { clearLog } from "./deaths";
import { createDebris } from "./debris";
import { effect, randomGenes } from "./genes";
import { type Hunter, type HuntWorld, createBird, createFrog } from "./predators";
import { SCENES, type Palette, type Scene, type SceneId, buildScene } from "./scenes";
import { clockText, lightAt, setTimeOfDay, timeOfDay } from "./daytime";
import { eventRate, fliesAmount, motion, predatorsAmount, settings } from "./settings";
import { createSky, tintOf, tinted } from "./sky";
import { type Spot, type Vec, Web, random } from "./web";

/**
 * The Spider Den's ecosystem (the den view of src/pages/den.astro): the scenery and its webs, every
 * spider you have living on them, egg sacs, flies, predators, and pirate spiders. Drawn on one
 * canvas filling `root`.
 *
 * Press a spider to pick it up (and pick it, for the wardrobe): drag it about and fling it. Press a
 * fly to carry it to a spider's mouth, an egg sac to hurry it along, and a predator to shoo it.
 *
 * It runs while it's showing (`setActive`), at the den's time speed. The spiders' lives (hunger,
 * growing up, old age) carry on regardless: colony.ts keeps its own clock. The webs fray as time
 * passes here, and remember how frayed they are between visits.
 */

export interface WorldHooks {
  /** A spider was pressed, or (`null`) somewhere with nothing in it. */
  pick(id: string | null): void;
  /** Something worth telling the person (HTML). */
  say(html: string): void;
}

const SEED_KEY = "den:web-seed";
const SCENE_KEY = "den:scene";
const WEB_KEY = "den:web-state";

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

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function readScene(): SceneId {
  const saved = read(SCENE_KEY);
  return saved && saved in SCENES ? (saved as SceneId) : "tree";
}
const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const between = (a: number, b: number) => Math.min(a, b) + Math.random() * Math.abs(b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function readSeed() {
  const saved = Number(read(SEED_KEY));
  if (saved) return saved;
  const seed = Math.floor(Math.random() * 2 ** 31) + 1;
  store(SEED_KEY, String(seed));
  return seed;
}

interface Sac {
  egg: Egg;
  spot: Spot | null;
  /** Falling, once what it hung from broke: where it is, and how fast. */
  fall: Vec | null;
  fallV: number;
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
  const tuning = new URLSearchParams(location.search).has("tune");
  const web = new Web();
  const particles = new Particles();
  const fluff = new Particles();
  const dust = new Particles();
  const debris = createDebris();
  const bugs = createBugs({
    web,
    get unit() {
      return world.unit;
    },
  });
  const sacs = new Map<string, Sac>();
  let strands: Strand[] = [];
  let hunters: Hunter[] = [];
  const carried = new Map<Critter, Hunter>();
  let fights: Fight[] = [];
  const claims = new Map<number, Critter>();
  let huntIn = between(den.predators.everyFrom, den.predators.everyTo);
  let greetIn = 2;
  let seed = readSeed();
  let sceneId = readScene();
  let scene: Scene | null = null;
  let builtKey = "";
  let dpr = 1;
  let active = false;
  let raf = 0;
  let last = 0;
  let frames = 0;
  let frameMs = 0;
  let dirty = true;
  let highlighted: string | null = null;
  let webSavedAt = 0;
  let cutting = false;
  const skipped = new Map<Critter, number>();
  const colors = { ink: "#1b1e29", accent: "#2b8666", surface: "#ffffff", bg: "#f7f5ef" };
  /** Spiders, bugs and predators, drawn on their own at dusk and by night so the light can tint just them. */
  const sprites = document.createElement("canvas");
  /** Films of spiders in danger, kept if they die (for the deaths log). */
  const replays = createReplays();
  const sky = createSky();
  /** Seconds of movement last frame, for the sky's twinkling and drifting. */
  let moved = 0;

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
    eating(hunter, prey) {
      const bug = prey as Bug;
      bug.state = "eaten";
      bug.eatenBy = hunter;
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
      if (holding?.critter === critter) {
        holding = null;
        html.classList.remove("spider-held");
      }
    },
    drawBug: (c, x, y, size, wing) => drawSnack(c, "fly", x, y, size, wing),

    claim(edge, who) {
      const owner = claims.get(edge);
      if (owner && owner !== who && owner.alive) return false;
      claims.set(edge, who);
      return true;
    },
    unclaim(edge, who) {
      if (claims.get(edge) === who) claims.delete(edge);
    },

    quarryFor(hunter) {
      const range = den.hunger.huntRange * world.unit * 1.5;
      const [hx, hy] = hunter.center();
      const mine = sizeOf(hunter.member);
      let best: Critter | null = null;
      let bestScore = Infinity;
      for (const c of world.critters) {
        if (c === hunter || c.pirate || !c.alive || c.held || c.fighting || c.mode !== "web" || !mortal(c.member)) continue;
        if (!hunter.pirate) {
          if (sizeOf(c.member) > mine * den.fights.smaller) continue;
          if (den.fights.family && family(hunter.member, c.member)) continue;
        }
        const [cx, cy] = c.center();
        const d = Math.hypot(cx - hx, cy - hy);
        if (d > range) continue;
        // The nearest, most so if it's weak.
        const score = d / (1 + (1 / Math.max(0.2, c.power())) * 0.5);
        if (score < bestScore) {
          best = c;
          bestScore = score;
        }
      }
      return best;
    },

    mateFor(spider) {
      const range = den.babies.mateRange * world.unit;
      const [sx, sy] = spider.center();
      let best: Critter | null = null;
      let bestD = range;
      for (const c of world.critters) {
        if (c === spider || c.pirate || !c.alive || c.held || c.fighting || c.mode !== "web") continue;
        if (c.task === "court" || !canLay(c.member).ok || family(spider.member, c.member)) continue;
        const [cx, cy] = c.center();
        const d = Math.hypot(cx - sx, cy - sy);
        if (d < bestD) {
          best = c;
          bestD = d;
        }
      }
      return best;
    },

    layEggs(spider, mate) {
      const why = layFor(spider.member.id, false, mate?.member.id);
      if (why) return;
      const names = mate ? `${escape(nameOf(spider.member))} and ${escape(nameOf(mate.member))}` : escape(nameOf(spider.member));
      hooks.say(`<strong>${names} ${mate ? "have" : "has"} eggs on the way!</strong>`);
    },

    pounced(hunter, target) {
      if (!hunter.alive || !target.alive || target.held || hunter.fighting || target.fighting || target.mode !== "web" || hunter.mode !== "web") return;
      const [hx, hy] = hunter.center();
      const [tx, ty] = target.center();
      if (Math.hypot(tx - hx, ty - hy) > (hunter.radius() + target.radius()) * 1.5) {
        hunter.emote("question");
        return;
      }
      const fight: Fight = { a: hunter, b: target, x: (hx + tx) / 2, y: (hy + ty) / 2, t: 0, duration: den.fights.duration * between(0.8, 1.25) };
      fights.push(fight);
      hunter.enterFight(fight);
      target.enterFight(fight);
    },

    breakFight(spider) {
      const fight = fights.find((f) => f.a === spider || f.b === spider);
      if (!fight) return;
      fights = fights.filter((f) => f !== fight);
      const other = fight.a === spider ? fight.b : fight.a;
      other.fightOff();
      spider.fightOff();
    },

    left(spider) {
      if (holding?.critter === spider) world.drop(spider);
      spider.vanish();
    },
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
    colors.bg = hex("--bg", dark.matches ? "#1b1e29" : "#f7f5ef");
  };
  dark.addEventListener("change", readColors);

  /** Remembers how frayed and broken this scene's web is. */
  const saveWeb = () => {
    if (!builtKey || !web.edgeCount) return;
    webSavedAt = Date.now();
    store(`${WEB_KEY}:${sceneId}`, JSON.stringify({ key: builtKey, packed: web.save(), at: webSavedAt }));
  };

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
      if (!first) saveWeb();
      builtKey = key;
      scene = buildScene(sceneId, w, h, world.unit, random(seed));
      web.build(w, h, world.unit, seed, scene);
      // The same web as last time? Pick up where it left off, frayed by the time away.
      try {
        const saved = JSON.parse(read(`${WEB_KEY}:${sceneId}`) ?? "null");
        if (saved?.key === key && web.load(saved.packed)) {
          const hours = Math.min(den.health.awayHours, (Math.max(0, Date.now() - saved.at) / 3600_000) * den.pace.speed);
          web.decay(hours);
        }
      } catch {
        // a fresh web, then
      }
      web.takeBreaks();
      claims.clear();
      debris.clear();
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
      const middle = web.hubs
        .filter((hub) => web.held(hub.node))
        .reduce<{ node: number; radius: number } | null>(
          (best, hub) =>
            !best ||
            Math.hypot(web.x(hub.node) - web.width / 2, web.y(hub.node) - web.height * 0.45) <
              Math.hypot(web.x(best.node) - web.width / 2, web.y(best.node) - web.height * 0.45)
              ? hub
              : best,
          null,
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
    const replacements: Critter[] = [];
    world.critters = world.critters.filter((c) => {
      // Pirates aren't yours; the dying are on their way out.
      if (c.pirate || !c.alive) return true;
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
    world.critters.push(...replacements);
    for (const m of list) {
      if (world.critters.some((c) => c.member === m)) continue;
      const critter = createCritter(m, world);
      world.critters.push(critter);
      placeNew(critter);
    }
    world.pickedId = picked()?.id ?? null;
  };
  document.addEventListener(COLONY_EVENT, () => (dirty = true));

  // Starved or died of old age, while you're watching: it floats away.
  document.addEventListener(DIED_EVENT, (e) => {
    const { id, cause } = (e as CustomEvent).detail as { id: string; cause: "starved" | "old" };
    const critter = world.critters.find((c) => c.member.id === id && c.alive);
    if (critter && active) critter.die(cause);
    replays.died(id, den.replays.after + 1);
    const m = critter?.member ?? byId(id);
    if (!m) return;
    const name = escape(nameOf(m));
    hooks.say(cause === "old" ? `<strong>${name} died of old age.</strong> A good long life.` : `<strong>${name} starved</strong> and floated away. Keep your spiders fed.`);
  });

  /** A spider killed by something in the den (a predator, another spider): it's gone from your colony. */
  const died = (victim: Critter, cause: "eaten" | "bird" | "frog" | "pirate", killer?: string) => {
    if (victim.pirate) return;
    const name = escape(nameOf(victim.member));
    // Carried off, the bird's already off the edge: no need to film the empty sky for long.
    replays.died(victim.member.id, cause === "bird" ? 0.3 : cause === "frog" ? 1 : den.replays.after);
    kill(victim.member.id, cause, { killer });
    const how = {
      eaten: `was eaten by ${escape(killer ?? "another spider")}`,
      bird: "was taken by a bird",
      frog: "was eaten by a frog",
      pirate: "was eaten by a pirate spider",
    }[cause];
    hooks.say(`<strong>${name} ${how}.</strong>`);
  };

  // ── Egg sacs ──────────────────────────────────────────────────────────────

  const sacPoint = (sac: Sac): { anchor: Vec; ball: Vec; r: number } => {
    const hang = world.unit * 0.3;
    const r = world.unit * 0.12;
    if (sac.fall) return { anchor: [sac.fall[0], sac.fall[1] - hang], ball: sac.fall, r };
    const anchor: Vec = sac.spot ? web.point(sac.spot) : [sac.egg.x * web.width, sac.egg.y * web.height];
    return { anchor, ball: [anchor[0] + Math.sin(sac.angle) * hang, anchor[1] + Math.cos(sac.angle) * hang], r };
  };

  const updateSacs = (dt: number) => {
    const current = eggs();
    for (const id of sacs.keys()) if (!current.some((e) => e.id === id)) sacs.delete(id);
    for (const egg of current) {
      let sac = sacs.get(egg.id);
      if (!sac) {
        sac = { egg, spot: null, fall: null, fallV: 0, angle: 0, swing: 0, wiggle: 0, shown: 0 };
        sacs.set(egg.id, sac);
      }
      sac.egg = egg;
      if (sac.fall) {
        // Falling until a thread catches it.
        const g = config.rope.gravity * world.unit;
        sac.fallV = Math.min(sac.fallV + g * dt, world.unit * 12);
        const next: Vec = [sac.fall[0], sac.fall[1] + sac.fallV * dt];
        const hit = web.crossings(sac.fall[0], sac.fall[1] - world.unit * 0.3, next[0], next[1] - world.unit * 0.3, true)[0];
        if (hit) {
          sac.spot = { edge: hit.edge, t: hit.t };
          sac.fall = null;
          sac.swing = 3;
          web.push(hit.x, hit.y, 0, world.unit * 3);
        } else {
          sac.fall = next[1] > web.height + world.unit ? [next[0], -world.unit] : next;
        }
      } else {
        if (sac.spot && !web.isAlive(sac.spot.edge)) {
          sac.fall = sacPoint(sac).ball;
          sac.fallV = 0;
          sac.spot = null;
        } else if (!sac.spot) {
          const near = web.nearest(egg.x * web.width, egg.y * web.height, Math.max(web.width, web.height), true);
          sac.spot = near ? { edge: near.edge, t: near.t } : null;
        }
        const hang = world.unit * 0.3;
        const g = config.rope.gravity * world.unit;
        sac.swing += (-(g / hang) * Math.sin(sac.angle) - 1.5 * sac.swing) * dt;
        sac.angle += sac.swing * dt;
      }
      sac.shown += dt;
      sac.wiggle = Math.max(0, sac.wiggle - dt * 2);
      if (egg.hatchIn < 4 && Math.random() < dt * 3) sac.swing += (Math.random() - 0.5) * 3;
      if (egg.hatchIn <= 0 && sac.shown > 2.5) hatchSac(sac);
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

  const drawSacs = (ink = colors.ink, g: CanvasRenderingContext2D = ctx) => {
    for (const sac of sacs.values()) {
      const { anchor, ball, r } = sacPoint(sac);
      const left = sac.egg.hatchIn;
      const pulse = left < 5 ? 1 + Math.sin(performance.now() / 60) * 0.04 : 1;
      const size = r * pulse * (1 + sac.wiggle * 0.12);
      g.save();
      if (!sac.fall) {
        g.strokeStyle = ink;
        g.globalAlpha = 0.55;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(anchor[0], anchor[1]);
        g.lineTo(ball[0], ball[1] - size * 0.8);
        g.stroke();
      }
      g.globalAlpha = 1;
      // A fluffy ball of silk: little puffs round a middle, with the eggs showing through.
      const puffs = new Path2D();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + sac.egg.id.charCodeAt(i % sac.egg.id.length) * 0.1;
        puffs.moveTo(ball[0] + Math.cos(a) * size * 0.55 + size * 0.42, ball[1] + Math.sin(a) * size * 0.62);
        puffs.arc(ball[0] + Math.cos(a) * size * 0.55, ball[1] + Math.sin(a) * size * 0.62, size * 0.42, 0, Math.PI * 2);
      }
      puffs.moveTo(ball[0] + size * 0.7, ball[1]);
      puffs.arc(ball[0], ball[1], size * 0.7, 0, Math.PI * 2);
      g.lineWidth = 1.5;
      g.strokeStyle = ink;
      g.globalAlpha = 0.45;
      g.stroke(puffs);
      g.globalAlpha = 1;
      g.fillStyle = "#f4efe1";
      g.fill(puffs, "nonzero");
      g.fillStyle = "#d8c9a6";
      for (let i = 0; i < sac.egg.count; i++) {
        const a = (i / sac.egg.count) * Math.PI * 2 + 0.6;
        g.beginPath();
        g.arc(ball[0] + Math.cos(a) * size * 0.35, ball[1] + Math.sin(a) * size * 0.3, size * 0.14, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
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

  const drawStrands = (ink = colors.ink) => {
    for (const s of strands) {
      const pts = s.rope.points.map((p) => ({ x: p.x, y: p.y }));
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - s.age / Math.max(0.1, den.snapping.fade));
      ctx.strokeStyle = threadStyle(ctx, s.thread, pts, ink);
      drawString(ctx, pts, 1.25);
      ctx.restore();
    }
  };

  // ── Predators ─────────────────────────────────────────────────────────────

  const huntWorld: HuntWorld = {
    web,
    get unit() {
      return world.unit;
    },
    get critters() {
      return world.critters;
    },
    choose(x, y, range) {
      let total = 0;
      const options: [Critter, number][] = [];
      for (const c of world.critters) {
        if (c.pirate || !c.alive || c.held || c.fighting || !mortal(c.member) || (c.mode !== "web" && c.mode !== "dangle")) continue;
        const [cx, cy] = c.center();
        const d = Math.hypot(cx - x, cy - y);
        if (d > range) continue;
        // The small, slow and old are easiest pickings.
        const weight =
          (1.4 - Math.min(1.1, sizeOf(c.member))) * (2.2 - Math.min(1.8, effect(c.member.genes, "speed"))) * (1 + 1.5 * elderness(c.member)) / (1 + d / world.unit / 6);
        options.push([c, weight]);
        total += weight;
      }
      let roll = Math.random() * total;
      for (const [c, w] of options) if ((roll -= w) <= 0) return c;
      return options[0]?.[0] ?? null;
    },
    threaten(target, x, y) {
      target.alarm(x, y, true);
      const radius = den.predators.panic * world.unit;
      const [tx, ty] = target.center();
      for (const c of world.critters) {
        if (c === target || c.pirate) continue;
        const [cx, cy] = c.center();
        if (Math.hypot(cx - tx, cy - ty) < radius) c.alarm(x, y, false);
      }
    },
    caught(target, kind, hold) {
      const hunter = hunters.find((h) => h.target === target) ?? hunters[hunters.length - 1];
      target.carry(hold);
      if (!hunter) return died(target, kind);
      // It's not gone until it's carried off (or swallowed): there's a moment to grab it back.
      carried.set(target, hunter);
      const name = escape(nameOf(target.member));
      hooks.say(kind === "bird" ? `<strong>A bird's got ${name}!</strong> Grab it back!` : `<strong>The frog's got ${name}!</strong> Quick, grab it!`);
    },
  };

  /** Keeps a camera on every spider in danger, so if it dies there's a replay. */
  const filmDanger = () => {
    if (!den.replays.enabled) return;
    const film = (c: Critter | null | undefined) => {
      if (c && !c.pirate && mortal(c.member)) replays.watch(c.member.id);
    };
    for (const h of hunters) {
      // Only once it's close to going for someone: a bird circling, a frog with someone in reach.
      if (h.hunting || h.holding) film(h.holding ?? h.target);
    }
    for (const c of carried.keys()) {
      film(c);
      replays.hold(c.member.id);
    }
    for (const f of fights) {
      film(f.a);
      film(f.b);
    }
    const lifeRate = Math.max(1e-6, den.pace.speed * settings.speed);
    for (const c of world.critters) {
      if (c.quarry) {
        film(c.quarry);
        film(c);
      }
      if (!c.alive || c.pirate || !mortal(c.member)) continue;
      // About to starve, or die of old age.
      const m = c.member;
      const hours = Math.min(den.dying.enabled && m.fullness <= 0 ? den.dying.after - m.starving : Infinity, den.aging.enabled ? lifespan(m) - m.age : Infinity);
      if ((hours * 3600) / lifeRate < den.replays.before + 1) film(c);
    }
  };
  /** Where a filmed spider is, den px (or null, once it's gone). */
  const filmSubject = (id: string): Vec | null => {
    const c = world.critters.find((k) => k.member.id === id);
    return c ? c.center() : null;
  };

  /** A bird flew off with it, or a frog swallowed it: it's gone. */
  const carriedOff = (c: Critter, h: Hunter) => {
    carried.delete(c);
    died(c, h.kind);
    c.vanish();
  };

  const spawnHunter = (kind: "bird" | "frog" | "pirate") => {
    if (!web.width) return;
    if (kind === "pirate") return spawnPirate();
    const hunter = kind === "bird" ? createBird(huntWorld) : createFrog(huntWorld);
    hunters.push(hunter);
    hooks.say(kind === "bird" ? "<strong>A bird!</strong> Keep an eye on the little ones." : "<strong>A frog!</strong> Watch out for its tongue.");
  };

  const spawnPirate = () => {
    const look = blankLook();
    look.name = "Pirate spider";
    look.skin = "ember";
    look.pattern = "stripes";
    look.items.eyes = "patch";
    look.tints.eyes = "ink";
    look.items.outfit = "bandana";
    look.tints.outfit = "ink";
    const genes = { ...randomGenes(look), speed: 1, strength: 1, size: den.pirate.size };
    const member: Member = {
      id: `pirate-${Math.random().toString(36).slice(2, 8)}`,
      look,
      genes,
      personality: { temper: 0.8, thrill: 0.5, nerve: 0.95, aggression: 1, energy: 0.9, tidiness: 0 },
      born: Date.now(),
      age: 0,
      lifeRoll: 0.5,
      growth: 1,
      fullness: 0.2,
      plump: 0,
      starving: 0,
      cooldown: 999,
      main: false,
      generation: 0,
      meals: 0,
      kills: 0,
    };
    const pirate = createCritter(member, world, { pirate: true });
    world.critters.push(pirate);
    const side = Math.random() < 0.5 ? -1 : 1;
    const r = (WIDTH * world.unit * den.pirate.size) / 2;
    pirate.toss(side < 0 ? -r * 1.5 : web.width + r * 1.5, web.height * between(0.15, 0.55), -side * world.unit * between(4, 6), -world.unit * between(2, 4));
    pirates.set(pirate, 0);
    hooks.say("<strong>A pirate spider!</strong> It eats other spiders. Grab it and fling it out.");
  };
  const pirates = new Map<Critter, number>();

  const updateDanger = (dt: number) => {
    const p = den.predators;
    const amount = predatorsAmount();
    huntIn -= dt * amount * eventRate();
    if (huntIn <= 0) {
      huntIn = between(p.everyFrom, p.everyTo);
      const busy = hunters.length > 0 || pirates.size > 0;
      if (p.enabled && amount > 0 && !busy && members().length >= p.atLeast) {
        // Birds hunt by day; frogs and pirate spiders mostly after dark.
        const day = lightAt().day;
        const s = den.schedule;
        const byDay = (atNight: number, atDay: number) => atNight + (atDay - atNight) * day;
        const kinds: ["bird" | "frog" | "pirate", number][] = [
          ["bird", p.bird * byDay(s.nightBirds, 1)],
          ["frog", p.frog * byDay(s.nightFrogs, s.dayFrogs)],
          ["pirate", p.pirate * byDay(s.nightPirates, s.dayPirates)],
        ];
        let roll = Math.random() * kinds.reduce((s, [, w]) => s + w, 0);
        const kind = kinds.find(([, w]) => (roll -= w) <= 0)?.[0];
        if (kind) spawnHunter(kind);
      }
    }
    for (const h of hunters) {
      h.update(dt);
      // Spiders near a hunting predator scatter.
      if (h.hunting) {
        const radius = p.panic * world.unit;
        for (const c of world.critters) {
          if (c.pirate || c === h.target) continue;
          const [cx, cy] = c.center();
          if (Math.hypot(cx - h.x, cy - h.y) < radius * 0.6) c.alarm(h.x, h.y, false);
        }
      }
    }
    for (const [c, h] of carried) {
      // Gone once it's out of sight, or swallowed.
      const [cx, cy] = c.center();
      const away = cy < -world.unit * 0.3 || cx < -world.unit * 0.5 || cx > web.width + world.unit * 0.5;
      if (h.done || h.holding !== c || away) carriedOff(c, h);
    }
    hunters = hunters.filter((h) => !h.done);

    for (const [pirate, age] of pirates) {
      const now = age + dt;
      pirates.set(pirate, now);
      if (!pirate.alive && pirate.gone) pirates.delete(pirate);
      else if (now > den.pirate.patience * 2.5) pirate.leaveDen();
      // Spiders right by a stalking pirate get nervous.
      if (pirate.quarry) {
        const [px, py] = pirate.center();
        for (const c of world.critters) {
          if (c === pirate || c === pirate.quarry || c.pirate) continue;
          const [cx, cy] = c.center();
          if (Math.hypot(cx - px, cy - py) < world.unit * 1.3) c.alarm(px, py, false);
        }
      }
    }
    for (const pirate of [...pirates.keys()]) if (pirate.gone) pirates.delete(pirate);
  };

  // ── Fights ────────────────────────────────────────────────────────────────

  const updateFights = (dt: number) => {
    for (const f of fights) {
      f.t += dt;
      const shake = world.unit * 0.12;
      const t = f.t * 25;
      const apart = (f.a.radius() + f.b.radius()) * 0.45;
      f.a.scrap(f.x - apart + Math.sin(t) * shake, f.y + Math.cos(t * 1.3) * shake);
      f.b.scrap(f.x + apart + Math.sin(t + 2) * shake, f.y + Math.cos(t * 1.1 + 1) * shake);
      // A cloud of dust, and the web takes a beating.
      if (Math.random() < dt * 25) {
        const angle = Math.random() * Math.PI * 2;
        const speed = world.unit * between(0.8, 2);
        dust.spawn({
          x: f.x + Math.cos(angle) * apart,
          y: f.y + Math.sin(angle) * apart * 0.6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          length: world.unit * 0.1,
          width: Math.max(2, world.unit * 0.05),
          life: 0.35,
          drag: 6,
          gravity: 0,
          shrink: 0.4,
        });
      }
      if (Math.random() < dt * 8) web.push(f.x, f.y, (Math.random() - 0.5) * world.unit * 6, (Math.random() - 0.5) * world.unit * 6, world.unit * 0.6);
      const under = web.nearest(f.x, f.y, world.unit * 0.5, true);
      if (under) web.wear(under.edge, 0.12 * dt, under.t);
    }
    const over = fights.filter((f) => f.t >= f.duration);
    fights = fights.filter((f) => f.t < f.duration);
    for (const f of over) resolve(f);
  };

  const resolve = (f: Fight) => {
    const luck = den.fights.luck;
    const roll = (c: Critter) => c.power() * Math.max(0.05, 1 + luck * (Math.random() * 2 - 1));
    const [winner, loser] = roll(f.a) >= roll(f.b) ? [f.a, f.b] : [f.b, f.a];
    if (!winner.alive || !loser.alive) {
      winner.fightOff();
      loser.fightOff();
      return;
    }
    const canDie = !loser.pirate && mortal(loser.member);
    const odds = clamp(den.fights.escape * loser.agility() * (0.7 + 0.6 * loser.nerve()), 0, 0.95);
    const [wx, wy] = winner.position;
    if (!canDie || Math.random() < odds) {
      winner.won(false);
      loser.escaped(wx, wy);
      if (loser.pirate) loser.leaveDen();
      hooks.say(
        loser.pirate
          ? `<strong>${escape(nameOf(winner.member))} fought off the pirate spider!</strong>`
          : `<strong>${escape(nameOf(loser.member))} got away</strong> from ${winner.pirate ? "the pirate spider" : escape(nameOf(winner.member))}.`,
      );
      return;
    }
    loser.eatenBy(winner);
    winner.won(true);
    if (!winner.pirate) {
      feed(winner.member.id, den.fights.meals);
      countKill(winner.member.id);
    }
    died(loser, winner.pirate ? "pirate" : "eaten", winner.pirate ? undefined : nameOf(winner.member));
  };

  // ── Holding things ────────────────────────────────────────────────────────

  let holding: { critter?: Critter; bug?: Bug; pointerId: number; offset: Vec } | null = null;
  let hovered: Critter | null = null;
  const trail: { x: number; y: number; t: number }[] = [];
  let cutFrom: Vec | null = null;
  let cutPointer = -1;
  let cutMarks: { from: Vec; to: Vec; age: number }[] = [];

  const local = (e: { clientX: number; clientY: number }): Vec => {
    const r = root.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  /** The spider under (x, y), den px: the nearest one it's over, the picked one winning ties. */
  const critterAt = (x: number, y: number) => {
    let best: Critter | null = null;
    let bestD = 0;
    for (const c of world.critters) {
      if (!c.alive && !c.pirate) continue;
      if (c.mode === "ghost" || c.mode === "eaten" || c.mode === "carried") continue;
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

  const cutMode = () => cutting || den.tools.cut;

  /** A carried spider at (x, y), with a little leeway: it's on the move. */
  const snatchable = (x: number, y: number) => {
    for (const c of carried.keys()) if (c.distance(x, y) <= world.unit * 0.15) return c;
    return null;
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || holding || !active) return;
    const [x, y] = local(e);
    world.pointer = [x, y];
    if (cutMode()) {
      e.preventDefault();
      cutFrom = [x, y];
      cutPointer = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // window listeners still see the moves
      }
      return;
    }
    // A spider in a bird's feet or a frog's mouth can be snatched back.
    const snatched = snatchable(x, y);
    if (snatched) {
      carried.get(snatched)?.drop();
      carried.delete(snatched);
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // window listeners still see the moves
      }
      trail.length = 0;
      trail.push({ x, y, t: e.timeStamp });
      html.classList.add("spider-held");
      holding = { critter: snatched, pointerId: e.pointerId, offset: [0, 0] };
      snatched.grab(x, y);
      hooks.pick(snatched.member.id);
      hooks.say(`<strong>Saved!</strong> You got ${escape(nameOf(snatched.member))} back.`);
      return;
    }
    const hunter = hunters.find((h) => h.hit(x, y));
    if (hunter) {
      hooks.say(hunter.shoo() ? `<strong>Shoo!</strong> The ${hunter.kind} is off.` : `The ${hunter.kind} isn't going anywhere.`);
      return;
    }
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
      if (!critter.pirate) hooks.pick(critter.member.id);
    }
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      if (!active) return;
      const [x, y] = local(e);
      const inside = x >= 0 && y >= 0 && x <= web.width && y <= web.height;
      if (cutFrom && e.pointerId === cutPointer) {
        for (const hit of web.crossings(cutFrom[0], cutFrom[1], x, y, true)) web.cut(hit.edge, hit.t);
        cutMarks.push({ from: cutFrom, to: [x, y], age: 0 });
        cutFrom = [x, y];
        return;
      }
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
    if (cutFrom && e.pointerId === cutPointer) {
      cutFrom = null;
      cutPointer = -1;
      return;
    }
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
        if (!c.alive || c.pirate) continue;
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

  // ── Tuning buttons (in /den?tune) ─────────────────────────────────────────

  const target = () => (picked() && world.critters.find((c) => c.member.id === picked()!.id && c.alive)) || null;
  const actions: Record<string, () => void> = {
    "pace.feedAll": () => setFullness(1),
    "pace.starveAll": () => setFullness(0),
    "pace.layEggs": () => layFor((picked() ?? mainSpider()).id, true),
    "pace.hatchNow": () => hatchAllNow(),
    "pace.growUp": () => growEveryoneUp(),
    "pace.rebuild": () => {
      seed = Math.floor(Math.random() * 2 ** 31) + 1;
      store(SEED_KEY, String(seed));
    },
    "pace.resetDen": () => {
      for (const c of world.critters) c.dispose();
      world.critters = [];
      holding = null;
      bugs.clear();
      fights = [];
      hunters = [];
      pirates.clear();
      carried.clear();
      startOver();
    },
    "genetics.randomise": () => {
      const m = picked();
      if (m) reroll(m.id);
    },
    "genetics.rerollColours": () => {
      const m = picked();
      if (m) reroll(m.id, true);
    },
    "day.dawn": () => setTimeOfDay(0.25),
    "day.noon": () => setTimeOfDay(0.5),
    "day.dusk": () => setTimeOfDay(0.75),
    "day.midnight": () => setTimeOfDay(0),
    "tools.spawnFly": () => bugs.flyIn(),
    "tools.bird": () => spawnHunter("bird"),
    "tools.frog": () => spawnHunter("frog"),
    "tools.pirate": () => spawnHunter("pirate"),
    "tools.fight": () => {
      const onWeb = world.critters.filter((c) => c.alive && !c.pirate && c.mode === "web");
      const attacker = target() ?? onWeb[Math.floor(Math.random() * onWeb.length)] ?? null;
      if (!attacker) return;
      const [ax, ay] = attacker.center();
      const victim = world.critters
        .filter((c) => c !== attacker && c.alive && !c.pirate && c.mode === "web")
        .sort((p, q) => Math.hypot(p.center()[0] - ax, p.center()[1] - ay) - Math.hypot(q.center()[0] - ax, q.center()[1] - ay))[0];
      if (victim && attacker.stalk(victim)) hooks.say(`<strong>${escape(nameOf(attacker.member))}</strong> is going after ${escape(nameOf(victim.member))}.`);
    },
    "tools.collapse": () => {
      const hubs = web.hubs.filter((h) => web.held(h.node));
      const hub = hubs[Math.floor(Math.random() * hubs.length)];
      if (!hub) return;
      // Cut every thread crossing a ring round it, just outside the web: its anchors.
      const r = hub.radius * 1.08;
      const hx = web.x(hub.node);
      const hy = web.y(hub.node);
      for (let i = 0; i < 48; i++) {
        const a0 = (i / 48) * Math.PI * 2;
        const a1 = ((i + 1) / 48) * Math.PI * 2;
        for (const hit of web.crossings(hx + Math.cos(a0) * r, hy + Math.sin(a0) * r, hx + Math.cos(a1) * r, hy + Math.sin(a1) * r, true)) web.cut(hit.edge, hit.t);
      }
    },
    "tools.fray": () => web.setHealth(0.33),
    "tools.mendAll": () => web.setHealth(1, true),
    "tools.old": () => {
      const m = picked();
      if (m) makeOld(m.id);
    },
    "tools.starve": () => {
      const m = picked();
      if (m) starve(m.id);
    },
    "tools.clearLog": () => clearLog(),
  };
  const actionValue = (path: string) => {
    const [section, key] = path.split(".");
    return (den as unknown as Record<string, Record<string, number>>)[section][key];
  };
  const pressed = new Map(Object.keys(actions).map((path) => [path, actionValue(path)]));
  const checkActions = () => {
    for (const [path, run] of Object.entries(actions)) {
      const now = actionValue(path);
      if (now === pressed.get(path)) continue;
      pressed.set(path, now);
      run();
    }
  };

  /** Lays eggs for spider `id` somewhere near it on the web (with `mateId` as the other parent). Returns why not, or null. */
  const layFor = (id: string, force = false, mateId?: string) => {
    const critter = world.critters.find((c) => c.member.id === id && c.alive);
    const [cx, cy] = critter?.position ?? [web.width / 2, web.height / 3];
    const below = web.nearest(cx + (Math.random() - 0.5) * world.unit * 0.8, cy + world.unit * 0.35, world.unit * 1.2, true);
    const [x, y] = below ? [below.x, below.y] : [cx, cy];
    const result = layEggs(id, x / Math.max(1, web.width), y / Math.max(1, web.height), force, mateId);
    if (typeof result === "string") return result;
    critter?.proud();
    return null;
  };

  // ── The loop ──────────────────────────────────────────────────────────────

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    frame(now);
  };

  /** Spiders passing each other say hello, in their own way. */
  const greet = () => {
    const near = world.unit * 0.8;
    const idle = world.critters.filter((c) => c.alive && !c.pirate && c.mode === "web" && (c.task === "walk" || c.task === "rest"));
    for (let i = 0; i < idle.length; i++) {
      for (let j = i + 1; j < idle.length; j++) {
        const [ax, ay] = idle[i].position;
        const [bx, by] = idle[j].position;
        if (Math.hypot(ax - bx, ay - by) > near || Math.random() > 0.25) continue;
        // Family don't mind. Grumpy ones would rather you didn't.
        if (family(idle[i].member, idle[j].member)) return;
        for (const c of [idle[i], idle[j]]) if (c.member.personality.temper > 0.7) c.emote("dots");
        return;
      }
    }
  };

  const frame = (now: number) => {
    const began = performance.now();
    const real = Math.max(0, Math.min((now - last) / 1000, config.sim.maxFrame));
    last = now;
    // Everyone moves at nearly their usual pace; it's the den's day and life that speed up.
    const dt = real * config.sim.timeScale * motion();
    moved = dt;
    fit();
    if (!web.width) return;
    frames++;
    checkActions();
    if (dirty) sync();
    world.pickedId = picked()?.id ?? null;

    web.decay((real * den.pace.speed * settings.speed) / 3600);
    updateSacs(dt);
    web.step(dt);
    const day = lightAt().day;
    bugs.update(dt, fliesAmount() * (den.schedule.nightFlies + (1 - den.schedule.nightFlies) * day), eventRate());
    for (const c of world.critters) c.think(dt);
    updateFights(dt);
    updateDanger(dt);
    filmDanger();
    greetIn -= dt;
    if (greetIn <= 0) {
      greetIn = 1.5;
      greet();
    }

    // A bug being carried opens the mouth of whoever it's coming near.
    const carriedBug = holding?.bug;
    for (const c of world.critters) {
      if (!carriedBug || !c.alive || c.pirate) {
        c.foodNear = 0;
        continue;
      }
      const [mx, my] = c.mouth();
      const d = Math.hypot(carriedBug.x - mx, carriedBug.y - my) / Math.max(1, c.unit());
      const feedConfig = config.feed;
      c.foodNear = Math.max(0, Math.min(1, (feedConfig.openDistance - d) / Math.max(0.001, feedConfig.openDistance - feedConfig.eatDistance)));
    }

    // With lots of spiders, the ones just sitting about are posed every other frame.
    const saving = world.critters.length > den.detail.above;
    world.critters.forEach((c, i) => {
      const idle = saving && c.mode === "web" && (c.task === "rest" || c.task === "nap") && !c.held && c !== hovered && c.member.id !== world.pickedId;
      const owed = (skipped.get(c) ?? 0) + dt;
      if (idle && (frames + i) % 2) {
        skipped.set(c, owed);
        return;
      }
      skipped.delete(c);
      c.animate(owed, dpr);
    });
    for (const c of world.critters) {
      if (!c.gone) continue;
      c.dispose();
      skipped.delete(c);
      pirates.delete(c);
      carried.delete(c);
    }
    world.critters = world.critters.filter((c) => !c.gone);
    particles.update(dt);
    fluff.update(dt);
    dust.update(dt);
    updateStrands(dt);

    web.stepBreaks(dt);
    for (const b of web.takeBreaks()) {
      debris.add(b);
      claims.delete(b.edge);
    }
    debris.update(dt, web, config.rope.gravity * world.unit);
    cutMarks = cutMarks.filter((m) => (m.age += dt) < 0.4);

    hovered = holding?.critter ?? (world.pointer ? critterAt(...world.pointer) : null);
    canvas.style.cursor = cutMode()
      ? "crosshair"
      : holding
        ? "grabbing"
        : hovered || (world.pointer && (bugs.at(...world.pointer) || snatchable(...world.pointer) || hunters.some((h) => h.hit(...world.pointer!))))
          ? "grab"
          : "";

    if (Date.now() - webSavedAt > 15_000) saveWeb();
    draw();
    replays.capture(canvas, dpr, world.unit, filmSubject, colors.bg);
    frameMs += (performance.now() - began - frameMs) * 0.05;
  };

  const draw = () => {
    // The background (it covers the whole canvas): the sky and the scenery, in the light of the time of day.
    const t = timeOfDay();
    const light = lightAt(t);
    const scape = {
      canvas,
      dpr,
      unit: world.unit,
      scene,
      sceneKey: builtKey,
      palette: PALETTES[dark.matches ? "dark" : "light"],
      room: colors.bg,
      t,
      light,
      dark: dark.matches,
    };
    sky.draw(ctx, scape);
    const tint = tintOf(light, dark.matches);
    // Most of the day there's hardly any tint: everything's drawn as it always was.
    const tinting = tint.alpha > 0.1;
    const shade = (color: string) => (tinting ? tinted(color, tint) : color);
    const ink = shade(colors.ink);
    const [ox, oy] = world.origin;
    // The picked one and anything in your hand go in front.
    const order = [...world.critters].sort((a, b) => rank(a) - rank(b));

    // Threads, strings and specks of silk and dust take the light by their colour.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    web.draw(ctx, ink);
    debris.draw(ctx, ink);
    drawStrands(ink);
    ctx.strokeStyle = ink;
    particles.draw(ctx);
    // Silk fluff from a hatching egg sac: cream, dark enough to show on a light page.
    ctx.strokeStyle = shade("#d8c9a6");
    fluff.draw(ctx);
    ctx.strokeStyle = shade(dark.matches ? "rgba(242, 242, 238, 0.5)" : "rgba(27, 30, 41, 0.35)");
    dust.draw(ctx);
    ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    for (const c of order) c.drawBehind(ctx, ink, colors.accent);

    // Egg sacs, bugs, predators and spiders. When there's a tint, they're drawn on a layer of their own
    // and tinted in the boxes round them, rather than laying colour over the whole den.
    let g = ctx;
    if (tinting) {
      if (sprites.width !== canvas.width || sprites.height !== canvas.height) {
        sprites.width = canvas.width;
        sprites.height = canvas.height;
      }
      g = sprites.getContext("2d")!;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, sprites.width, sprites.height);
    }
    const huntColors = { ink, surface: colors.surface, outline: dark.matches };
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSacs(ink, g);
    bugs.draw(g, false);
    for (const h of hunters) if (h.kind === "frog") h.draw(g, huntColors);
    g.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    for (const c of order) c.draw(g, ink);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const h of hunters) if (h.kind === "bird") h.draw(g, huntColors);
    bugs.draw(g, true);
    if (tinting) {
      // The boxes round everything on the layer (den px).
      const boxes: [number, number, number, number][] = [];
      for (const c of order) {
        const [cx, cy] = c.center();
        const r = c.radius();
        boxes.push([cx - r * 3, cy - r * 4, r * 6, r * 7]);
      }
      for (const sac of sacs.values()) {
        const { anchor, ball, r } = sacPoint(sac);
        boxes.push([Math.min(anchor[0], ball[0]) - r * 2, Math.min(anchor[1], ball[1]) - r * 2, Math.abs(ball[0] - anchor[0]) + r * 4, Math.abs(ball[1] - anchor[1]) + r * 4]);
      }
      boxes.push(...bugs.boxes());
      for (const h of hunters) boxes.push(h.bounds());
      g.save();
      g.beginPath();
      for (const [x, y, w, h] of boxes) g.rect(x, y, w, h);
      g.clip();
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = tint.css;
      g.fillRect(0, 0, web.width, web.height);
      g.restore();
      // Onto the den: just the tiles with something in them, not the whole (mostly empty) layer.
      const tile = 192;
      const cols = Math.ceil(canvas.width / tile);
      const rows = Math.ceil(canvas.height / tile);
      const used = new Set<number>();
      for (const [x, y, w, h] of boxes) {
        const x0 = Math.max(0, Math.floor((x * dpr) / tile));
        const x1 = Math.min(cols - 1, Math.floor(((x + w) * dpr) / tile));
        const y0 = Math.max(0, Math.floor((y * dpr) / tile));
        const y1 = Math.min(rows - 1, Math.floor(((y + h) * dpr) / tile));
        for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) used.add(ty * cols + tx);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const i of used) {
        const sx = (i % cols) * tile;
        const sy = Math.floor(i / cols) * tile;
        const w = Math.min(tile, canvas.width - sx);
        const h = Math.min(tile, canvas.height - sy);
        ctx.drawImage(sprites, sx, sy, w, h, sx, sy, w, h);
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sky.fireflies(ctx, scape, moved);
    if (cutMarks.length) {
      ctx.save();
      ctx.strokeStyle = colors.accent;
      ctx.lineCap = "round";
      for (const m of cutMarks) {
        ctx.globalAlpha = 1 - m.age / 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(...m.from);
        ctx.lineTo(...m.to);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    for (const c of order) {
      const id = c.member.id;
      c.drawMarks(ctx, colors, id === world.pickedId || id === highlighted, c === hovered || id === highlighted);
    }
    if (den.tools.stats) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const health = web.condition();
      const lines = [
        `${world.critters.filter((c) => !c.pirate).length} spiders · ${pirates.size} pirates · ${hunters.length} predators · ${fights.length} fights`,
        `web ${Math.round((1 - health.dead / Math.max(1, health.silk)) * 100)}% whole · health ${Math.round(health.health * 100)}% · ${debris.count} pieces`,
        `${frameMs.toFixed(1)} ms a frame · time ${settings.speed}× (moving ${motion().toFixed(2)}×) · life ${den.pace.speed}× · ${clockText()}`,
      ];
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.surface;
      ctx.fillStyle = colors.ink;
      lines.forEach((line, i) => {
        const ly = web.height - 12 - (lines.length - 1 - i) * 14;
        ctx.strokeText(line, web.width - 12, ly);
        ctx.fillText(line, web.width - 12, ly);
      });
    }
  };
  const rank = (c: Critter) => (c.held ? 3 : c.member.id === world.pickedId ? 2 : c.member.main ? 1 : 0);

  readColors();
  const showing = () => active && document.visibilityState === "visible";
  document.addEventListener("visibilitychange", () => {
    watch(showing());
    if (document.visibilityState === "hidden") saveWeb();
  });
  window.addEventListener("pagehide", saveWeb);

  return {
    get scene() {
      return sceneId;
    },

    /** Moves the den to another scene: new webs, and everyone finds their feet on them. */
    setScene(id: SceneId) {
      if (id === sceneId) return;
      saveWeb();
      sceneId = id;
      store(SCENE_KEY, id);
    },

    /** Runs the den while it's showing, and stops when it isn't. */
    setActive(on: boolean) {
      if (on === active) return;
      active = on;
      watch(showing());
      if (on) {
        readColors();
        last = performance.now();
        dirty = true;
        raf = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        for (const [c, h] of carried) carriedOff(c, h);
        replays.stop();
        if (holding?.critter) holding.critter.release(null);
        holding = null;
        html.classList.remove("spider-held");
        saveWeb();
      }
    },

    /** The cut tool: dragging across the den cuts threads. */
    get cutting() {
      return cutMode();
    },
    setCutting(on: boolean) {
      cutting = on;
    },
    /** Whether this is a tuning session (tools show). */
    tuning,

    /** The spider at a point on the page (client px), for dropping clothes on. */
    spiderAt(clientX: number, clientY: number) {
      const [x, y] = local({ clientX, clientY });
      const c = critterAt(x, y);
      return c && !c.pirate ? c.member.id : null;
    },

    /** Rings a spider, while something's dragged over it. */
    highlight(id: string | null) {
      highlighted = id;
    },

    /** Lays eggs for this spider if it can. Returns why not, or null. */
    layEggs: (id: string) => layFor(id),

    /** A snack from the wardrobe, hovering next to spider `id` (or in the middle of the den). */
    offer(kind: Snack, id: string | null) {
      const critter = world.critters.find((c) => c.member.id === id && c.alive);
      const [cx, cy] = critter?.center() ?? [web.width / 2, web.height / 2];
      const side = cx > web.width - world.unit * 1.2 ? -1 : 1;
      bugs.offer(kind, cx + side * world.unit * 0.9, Math.max(world.unit * 0.3, cy - world.unit * 0.3));
    },

    /** A trick or mood from the wardrobe, for spider `id`. */
    play(id: string, what: string) {
      world.critters.find((c) => c.member.id === id && c.alive)?.play(what);
    },
  };
}

export type World = ReturnType<typeof createWorld>;

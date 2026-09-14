import { LOOK_EVENT, keepUnlocked, parseLook, putOn, setLook, trying, worn } from "../spider-string/look";
import { blankLook, type Look } from "../spider-string/wardrobe";
import { den } from "./config";
import { type Cause, type Death, remember } from "./deaths";
import {
  type Genes,
  type Personality,
  effect,
  hungerRate,
  inherit,
  parseGenes,
  parsePersonality,
  randomGenes,
  randomPersonality,
} from "./genes";
import { predatorsAmount, settings } from "./settings";

/**
 * The Spider Den's spiders: every one you have, saved in this browser.
 *
 * One of them is the main spider: the one worn all over the site. Its look is look.ts's `worn`, so
 * the logo's spider, the header's and the den's all stay the same spider. The rest live only in the
 * den. Each has its own look, genes and personality (genes.ts), how old it is, how full, how grown
 * up, and how plump from eating.
 *
 * Time in the den runs on its own clock: real time, sped up by the den's life speed (tuning) and
 * time speed (its settings). It keeps going while the page is open, and when you come back after
 * being away, the time you missed is caught up on at ordinary speed (up to a limit): spiders get
 * hungry, grow up, grow old, starve or die of old age, eggs hatch, and now and then a predator
 * has been. Deaths go in the log (deaths.ts).
 *
 * Also here: egg sacs waiting to hatch, and which spider is picked, if any. The wardrobe dresses the
 * picked spider. With none picked, the Dress up view dresses the main spider (`dressMain`), and the
 * den's wardrobe dresses nobody: clothes are dragged onto whoever should wear them (`dressSpider`).
 */

const COLONY_KEY = "spider:colony";
/** Announced on the document when spiders arrive, leave, change or are picked (here or in another tab). */
export const COLONY_EVENT = "den:colony";
/** Announced when a spider dies of hunger or old age (detail: { id, cause }), before it's gone. */
export const DIED_EVENT = "den:died";

const HOUR = 3600;

export interface Member {
  id: string;
  look: Look;
  genes: Genes;
  personality: Personality;
  /** When it hatched (real time, ms), for showing. */
  born: number;
  /** How long it's lived, den hours. */
  age: number;
  /** Where in the lifespan range it falls, 0–1, fixed for life. */
  lifeRoll: number;
  /** 0 newborn → 1 grown up. */
  growth: number;
  /** 0 empty → 1 full. */
  fullness: number;
  /** Extra size from eating, as a fraction (grown-ups only). */
  plump: number;
  /** How long it's been empty, den hours. */
  starving: number;
  /** Den hours before it can lay eggs again. */
  cooldown: number;
  main: boolean;
  /** Whoever laid it, and the other parent. */
  parent?: string;
  mate?: string;
  generation: number;
  meals: number;
  /** Spiders it's eaten. */
  kills: number;
}

export interface Egg {
  id: string;
  parent: string;
  mate?: string;
  /** What the parents were like when it was laid, so the babies take after them even if they've gone. */
  parents: { genes: Genes; personality: Personality; generation: number; look: Look }[];
  /** Where it hangs, as fractions of the den's width and height, so it survives a resize. */
  x: number;
  y: number;
  /** Den seconds until it hatches, and how many are in it. */
  hatchIn: number;
  count: number;
}

interface Saved {
  members: Member[];
  eggs: Egg[];
  picked: string | null;
  /** Real time the den was last brought up to date, ms. */
  savedAt: number;
}

const NAMES = [
  "Itsy", "Bitsy", "Pip", "Dot", "Nibbles", "Twig", "Fuzz", "Silky", "Loop", "Knot", "Bean", "Pebble",
  "Wisp", "Noodle", "Crumb", "Button", "Sprout", "Tangle", "Doodle", "Mote", "Sesame", "Jitter",
  "Scoot", "Tuft", "Biscuit", "Hopper", "Lint", "Pickle", "Waffle", "Zigzag", "Poppy", "Speck",
  "Clover", "Marble", "Juniper", "Fig", "Olive", "Pepper", "Nutmeg", "Bramble", "Thistle", "Moss",
  "Ember", "Quill", "Rune", "Sable", "Tansy", "Wren", "Acorn", "Basil", "Cinder", "Dusk", "Echo",
  "Fennel", "Gizmo", "Hazel", "Inky", "Jinx", "Kiwi", "Lolly", "Mochi", "Nimbus", "Orbit", "Pixel",
];

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

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const newId = () => Math.random().toString(36).slice(2, 10);
const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** A spider from the save, with anything missing filled in (older saves had timestamps, not den hours). */
function parseMember(raw: Record<string, unknown>, now: number): Member | null {
  if (!raw || typeof raw.id !== "string") return null;
  const look = parseLook(JSON.stringify(raw.look ?? {}));
  const at = num(raw.at, now);
  const born = num(raw.born, now);
  const emptySince = num(raw.emptySince, 0);
  return {
    id: raw.id,
    look,
    genes: parseGenes(raw.genes, look),
    personality: parsePersonality(raw.personality),
    born,
    age: num(raw.age, Math.max(0, (at - born) / 3600_000)),
    lifeRoll: clamp01(num(raw.lifeRoll, Math.random())),
    growth: clamp01(num(raw.growth, 1)),
    fullness: clamp01(num(raw.fullness, 0.7)),
    plump: Math.max(0, num(raw.plump, 0)),
    starving: Math.max(0, num(raw.starving, emptySince ? (at - emptySince) / 3600_000 : 0)),
    cooldown: Math.max(0, num(raw.cooldown, 0)),
    main: raw.main === true,
    parent: typeof raw.parent === "string" ? raw.parent : undefined,
    mate: typeof raw.mate === "string" ? raw.mate : undefined,
    generation: Math.max(0, Math.round(num(raw.generation, raw.parent ? 1 : 0))),
    meals: Math.max(0, Math.round(num(raw.meals, 0))),
    kills: Math.max(0, Math.round(num(raw.kills, 0))),
  };
}

function snapshot(m: Member) {
  return { genes: { ...m.genes }, personality: { ...m.personality }, generation: m.generation, look: parseLook(JSON.stringify(m.look)) };
}

function parseEgg(raw: Record<string, unknown>, now: number, members: Member[]): Egg | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.parent !== "string") return null;
  const parentsRaw = Array.isArray(raw.parents) ? raw.parents : [];
  const parents = parentsRaw
    .filter((p) => p && typeof p === "object")
    .map((p) => {
      const look = parseLook(JSON.stringify(p.look ?? {}));
      return { genes: parseGenes(p.genes, look), personality: parsePersonality(p.personality), generation: num(p.generation, 0), look };
    });
  if (!parents.length) {
    const parent = members.find((m) => m.id === raw.parent) ?? members[0];
    if (parent) parents.push(snapshot(parent));
  }
  return {
    id: raw.id,
    parent: raw.parent,
    mate: typeof raw.mate === "string" ? raw.mate : undefined,
    parents,
    x: clamp01(num(raw.x, 0.5)),
    y: clamp01(num(raw.y, 0.4)),
    hatchIn: Math.max(0, num(raw.hatchIn, (num(raw.hatch, now) - now) / 1000)),
    count: Math.max(1, Math.min(12, Math.round(num(raw.count, 3)))),
  };
}

function newMember(look: Look, main: boolean): Member {
  const genes = randomGenes(look);
  return {
    id: newId(),
    look,
    genes,
    personality: randomPersonality(),
    born: Date.now(),
    age: 0,
    lifeRoll: Math.random(),
    growth: 1,
    fullness: 0.9,
    plump: 0,
    starving: 0,
    cooldown: 0.15,
    main,
    generation: 0,
    meals: 0,
    kills: 0,
  };
}

/** A den with just the main spider (wearing what it wears everywhere) and a clutch of eggs about to hatch, so there's life from the start. */
function fresh(now: number): Saved {
  const main = newMember(parseLook(JSON.stringify(worn)), true);
  return {
    members: [main],
    // Off to one side of the middle, where the main spider starts.
    eggs: [{ id: newId(), parent: main.id, parents: [snapshot(main)], x: 0.36, y: 0.3, hatchIn: 6, count: 3 }],
    picked: null,
    savedAt: now,
  };
}

function load(now = Date.now()): Saved {
  let raw: Record<string, unknown> | null = null;
  try {
    raw = JSON.parse(read(COLONY_KEY) ?? "null");
  } catch {
    raw = null;
  }
  const rawMembers = Array.isArray(raw?.members) ? (raw!.members as Record<string, unknown>[]) : [];
  const members = rawMembers.map((m) => parseMember(m, now)).filter((m): m is Member => m !== null);
  if (!members.length) return fresh(now);
  // Exactly one main spider, and it's the one worn everywhere (another page may have changed it).
  const main = members.find((m) => m.main) ?? members[0];
  for (const m of members) m.main = m === main;
  setLook(main.look, worn);
  const rawEggs = Array.isArray(raw?.eggs) ? (raw!.eggs as Record<string, unknown>[]) : [];
  const eggs = rawEggs.map((e) => parseEgg(e, now, members)).filter((e): e is Egg => e !== null);
  // Older saves brought each spider up to date separately: the oldest of those is when it was last seen.
  const savedAt = num(raw?.savedAt, Math.min(now, ...rawMembers.map((m) => num(m.at, now))));
  // Nobody's picked when the page opens: picking is just for this visit.
  return { members, eggs, picked: null, savedAt };
}

const state = load();
/** Whether the wardrobe dresses the main spider when nobody's picked (the Dress up view). */
let dressesMain = true;
/** Whether the den is on screen (world.ts shows hatching and deaths itself then). */
let watching = false;

/** Tells the page the spiders have changed: once, however many changes there were just now. */
let announcing = false;
const announce = () => {
  if (announcing) return;
  announcing = true;
  queueMicrotask(() => {
    announcing = false;
    document.dispatchEvent(new CustomEvent(COLONY_EVENT));
  });
};

let savedAt = 0;
let saveLater = 0;
/**
 * Saves the colony in this browser. It changes all the time (every fly eaten), so it's written at
 * most every couple of seconds, and straight away (`now`) when the page is going.
 */
function save(now = false) {
  const since = Date.now() - savedAt;
  if (!now && since < 2000) {
    if (!saveLater) {
      saveLater = window.setTimeout(() => {
        saveLater = 0;
        save(true);
      }, 2000 - since);
    }
    return;
  }
  window.clearTimeout(saveLater);
  saveLater = 0;
  savedAt = Date.now();
  store(COLONY_KEY, JSON.stringify(state));
}

// ── Reading ──────────────────────────────────────────────────────────────────

export const members = () => state.members;
export const eggs = () => state.eggs;
export const byId = (id: string | null | undefined) => state.members.find((m) => m.id === id) ?? null;
export const mainSpider = () => state.members.find((m) => m.main) ?? state.members[0];
export const picked = () => byId(state.picked);
/** The spider the wardrobe is dressing: the picked one, or in Dress up with nobody picked, the main one. */
export const dressing = () => picked() ?? (dressesMain ? mainSpider() : null);

/** What the wardrobe shows: the look of the spider it's dressing, or a plain spider. */
function showDressing() {
  setLook(trying, dressing()?.look ?? blankLook());
}
showDressing();

export const nameOf = (m: Member) => m.look.name.trim() || blankLook().name;
export const grownUp = (m: Member) => m.growth >= 1;

/** How long it'll live, den hours. */
export function lifespan(m: Member) {
  const a = den.aging;
  const days = Math.min(a.lifespanFrom, a.lifespanTo) + Math.abs(a.lifespanTo - a.lifespanFrom) * m.lifeRoll;
  return days * 24 * effect(m.genes, "lifespan");
}
/** How far through its life it is, 0–1. */
export const lifeDone = (m: Member) => Math.min(1, m.age / Math.max(0.01, lifespan(m)));
/** How old it's got: 0 until it's old (Growing old → Old from), then up to 1 at the end. */
export function elderness(m: Member) {
  if (!den.aging.enabled) return 0;
  const from = den.aging.elderAt;
  return clamp01((lifeDone(m) - from) / Math.max(0.01, 1 - from));
}

/** How big it's drawn, next to an average grown-up. */
export function sizeOf(m: Member) {
  const small = den.growing.babySize;
  const grown = 1 - (1 - m.growth) ** 2;
  return (small + (1 - small) * grown) * (1 + m.plump) * effect(m.genes, "size");
}

/** Can it die (the main spider only can if that's switched on)? */
export const mortal = (m: Member) => !m.main || den.dying.main;

/** Whether it can lay eggs right now, or why not. */
export function canLay(m: Member): { ok: true } | { ok: false; why: string } {
  const b = den.babies;
  if (!grownUp(m)) return { ok: false, why: `${nameOf(m)} is too young` };
  if (elderness(m) > 0.6) return { ok: false, why: `${nameOf(m)} is too old` };
  const coming = state.eggs.reduce((sum, e) => sum + e.count, 0);
  if (state.members.length + coming >= b.max) return { ok: false, why: "The den is full" };
  if (m.fullness < b.fullEnough) return { ok: false, why: `${nameOf(m)} is too hungry` };
  if (m.cooldown > 0) {
    const minutes = Math.ceil((m.cooldown * 60) / Math.max(0.01, den.pace.speed * settings.speed));
    return { ok: false, why: minutes > 1 ? `Ready again in ${minutes} minutes` : "Ready again in a minute" };
  }
  return { ok: true };
}

// ── Dying ────────────────────────────────────────────────────────────────────

/**
 * A spider dies: it leaves the den and goes in the log. If it was the main spider, that passes to
 * its oldest child, or the oldest spider left (or, with nobody left, a new spider).
 */
export function kill(id: string, cause: Cause, { killer, away = false }: { killer?: string; away?: boolean } = {}): Death | null {
  const m = byId(id);
  if (!m) return null;
  if (cause === "starved" || cause === "old") document.dispatchEvent(new CustomEvent(DIED_EVENT, { detail: { id, cause } }));
  const death: Death = {
    id: m.id,
    name: nameOf(m),
    look: parseLook(JSON.stringify(m.look)),
    cause,
    killer,
    at: Date.now(),
    age: m.age,
    life: lifeDone(m),
    fullness: m.fullness,
    starving: m.starving,
    main: m.main,
    away,
  };
  state.members = state.members.filter((other) => other !== m);
  if (state.picked === m.id) pickSpider(null, false);
  if (m.main) {
    const heir =
      state.members.filter((o) => o.parent === m.id).sort((a, b) => b.age - a.age)[0] ??
      [...state.members].sort((a, b) => b.age - a.age)[0] ??
      null;
    if (heir) {
      heir.main = true;
      putOn(heir.look);
    } else {
      const next = newMember(parseLook(JSON.stringify(worn)), true);
      state.members.push(next);
    }
  }
  remember(death);
  save();
  announce();
  return death;
}

// ── Time passing ─────────────────────────────────────────────────────────────

let clock = state.savedAt;

/**
 * Moves the den's time on by `seconds` of den time. Babies grow while they're fed; everyone gets
 * hungry, older, and (if it's been empty or old too long) dies. Eggs count down, and hatch here too
 * unless the den is on screen to show it (`away` hatches them regardless).
 */
function pass(seconds: number, away: boolean) {
  const hours = seconds / HOUR;
  if (hours <= 0) return;
  const h = den.hunger;
  const dead: [Member, Cause][] = [];
  for (const m of state.members) {
    const rate = hungerRate(m.genes) / Math.max(0.01, h.emptyAfter);
    const fedHours = Math.min(hours, m.fullness / Math.max(1e-9, rate));
    m.fullness = clamp01(m.fullness - hours * rate);
    if (m.growth < 1) m.growth = clamp01(m.growth + fedHours / Math.max(0.01, den.growing.growUpAfter));
    m.plump = Math.max(0, m.plump - (hours / Math.max(0.01, h.slimAfter)) * h.plumpMax);
    m.starving = m.fullness <= 0 ? m.starving + (hours - fedHours) : 0;
    m.cooldown = Math.max(0, m.cooldown - hours);
    m.age += hours;
    if (!mortal(m)) {
      m.age = Math.min(m.age, lifespan(m) * 0.995);
      continue;
    }
    if (den.dying.enabled && m.fullness <= 0 && m.starving >= den.dying.after) dead.push([m, "starved"]);
    else if (den.aging.enabled && m.age >= lifespan(m)) dead.push([m, "old"]);
  }
  for (const egg of state.eggs) egg.hatchIn -= seconds;
  if (away || !watching) for (const egg of state.eggs.filter((e) => e.hatchIn <= 0)) hatch(egg.id);
  for (const [m, cause] of dead) kill(m.id, cause, { away });
  if (away) awayHunts(hours);
  // On screen, spiders court and lay by themselves (critter.ts); otherwise it happens here.
  if (away || !watching) layUnseen(hours);
}

/** Grown-ups that are able to lay eggs, now and then, while nobody's watching the den. */
function layUnseen(hours: number) {
  const rate = den.babies.awayLay;
  if (rate <= 0) return;
  const able = state.members.filter((m) => canLay(m).ok);
  for (const m of able) {
    if (!canLay(m).ok || Math.random() >= 1 - Math.exp(-rate * effect(m.genes, "fertility") * hours)) continue;
    // Usually with a mate, if there's another grown-up that could.
    const mates = able.filter((o) => o !== m && canLay(o).ok && !(den.fights.family && family(m, o)));
    const mate = mates.length && Math.random() > den.babies.solo * 0.5 ? pick(mates) : undefined;
    layEggs(m.id, 0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.5, false, mate?.id);
  }
}

/** While you were away, predators may have been: each hour, a chance one took a spider. */
function awayHunts(hours: number) {
  const p = den.predators;
  if (!p.enabled) return;
  const chance = den.time.awayHunt * predatorsAmount();
  for (let i = 0; i < Math.floor(hours); i++) {
    if (Math.random() >= chance) continue;
    const prey = state.members.filter(mortal);
    if (state.members.length < p.atLeast || !prey.length) return;
    // The small, slow and old are easiest.
    const weight = (m: Member) => (1.4 - Math.min(1, sizeOf(m))) * (2 - Math.min(1.6, effect(m.genes, "speed"))) * (1 + elderness(m));
    let roll = Math.random() * prey.reduce((sum, m) => sum + weight(m), 0);
    const victim = prey.find((m) => (roll -= weight(m)) <= 0) ?? prey[0];
    const kinds: [Cause, number][] = [["bird", p.bird], ["frog", p.frog], ["pirate", p.pirate]];
    let k = Math.random() * kinds.reduce((sum, [, w]) => sum + w, 0);
    const cause = kinds.find(([, w]) => (k -= w) <= 0)?.[0] ?? "bird";
    kill(victim.id, cause, { away: true });
  }
}

/**
 * Brings the den up to now: called every second or so. The time since last time runs at the den's
 * speed; a long gap (the page was closed, or in the background) counts as time away, at ordinary
 * speed and up to a limit.
 */
export function catchUp(now = Date.now()) {
  const gap = Math.max(0, (now - clock) / 1000);
  clock = now;
  if (gap <= 0) return;
  const rate = Math.max(0, den.pace.speed);
  if (gap > 20) pass(Math.min(gap, den.time.awayMost * HOUR) * rate, true);
  else pass(gap * rate * settings.speed, false);
  state.savedAt = now;
  if (now - savedAt > 10_000) save();
}

/** The den is (or isn't) on screen, showing hatching and deaths as they happen. */
export function watch(on: boolean) {
  watching = on;
}

catchUp();
save();
window.setInterval(() => catchUp(), 1000);
window.addEventListener("pagehide", () => {
  state.savedAt = Date.now();
  save(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save(true);
});

// ── Changing things ──────────────────────────────────────────────────────────

const tellLook = () => document.dispatchEvent(new CustomEvent(LOOK_EVENT));

/** Picks a spider to dress (the wardrobe shows its look), or with `null`, nobody. */
export function pickSpider(id: string | null, tell = true) {
  const m = byId(id);
  state.picked = m?.id ?? null;
  showDressing();
  if (tell) {
    announce();
    tellLook();
  }
}

/** In Dress up (`true`), the wardrobe dresses the main spider when nobody's picked. */
export function dressMain(on: boolean) {
  if (on === dressesMain) return;
  dressesMain = on;
  showDressing();
  tellLook();
}

/** A look change that touches colours changes the genes to match (for testing: the wardrobe only allows it with ?tune). */
function colourGenes(m: Member) {
  m.genes.skin = m.look.skin;
  m.genes.pattern = m.look.pattern;
  m.genes.thread = m.look.thread;
}

/**
 * Saves what's being tried on as the look of the spider being dressed (anything still locked stays
 * as it was). For the main spider, that's the look worn everywhere too. False if nobody's being dressed.
 */
export function wear() {
  const m = dressing();
  if (!m) return false;
  const next = keepUnlocked(trying, m.look);
  setLook(m.look, next);
  colourGenes(m);
  save();
  if (m.main) putOn(next);
  else tellLook();
  return true;
}

/**
 * Changes one spider's look, picked or not (clothes dragged onto it). Something still locked can't
 * be put on this way: returns false, and nothing changes.
 */
export function dressSpider(id: string, change: (look: Look) => void) {
  const m = byId(id);
  if (!m) return false;
  const next = parseLook(JSON.stringify(m.look));
  change(next);
  if (JSON.stringify(keepUnlocked(next, m.look)) !== JSON.stringify(next)) return false;
  setLook(m.look, next);
  colourGenes(m);
  if (m.id === dressing()?.id) setLook(trying, next);
  save();
  if (m.main) putOn(next);
  else tellLook();
  return true;
}

/** Changes a spider's genes or personality (the tuning card). Colour genes show straight away. */
export function setGenes(id: string, genes: Partial<Genes>, personality: Partial<Personality> = {}) {
  const m = byId(id);
  if (!m) return;
  Object.assign(m.genes, genes);
  Object.assign(m.personality, personality);
  m.look.skin = m.genes.skin;
  m.look.pattern = m.genes.pattern;
  m.look.thread = m.genes.thread;
  if (m.id === dressing()?.id) setLook(trying, m.look);
  save();
  if (m.main) putOn(m.look);
  else tellLook();
  announce();
}

/** New genes (and colours), for tuning. */
export function reroll(id: string, coloursOnly = false) {
  const m = byId(id);
  if (!m) return;
  const genes = randomGenes();
  setGenes(id, coloursOnly ? { skin: genes.skin, pattern: genes.pattern, thread: genes.thread } : genes, coloursOnly ? {} : randomPersonality());
}

/** Makes this the main spider, worn all over the site. */
export function makeMain(id: string) {
  const m = byId(id);
  if (!m || m.main) return;
  for (const other of state.members) other.main = other === m;
  save();
  putOn(m.look);
  announce();
}

/** It ate something (`amount` meals): fuller, and a baby grows or a grown-up plumps up a little. */
export function feed(id: string, amount = 1) {
  const m = byId(id);
  if (!m) return;
  m.fullness = clamp01(m.fullness + den.hunger.meal * amount);
  m.starving = 0;
  m.meals++;
  if (m.growth < 1) m.growth = clamp01(m.growth + den.growing.mealGrowth * amount);
  else m.plump = Math.min(den.hunger.plumpMax, m.plump + den.hunger.plump * amount);
  save();
  announce();
}

/** Counts a spider it's eaten. */
export function countKill(id: string) {
  const m = byId(id);
  if (!m) return;
  m.kills++;
  save();
}

/** Fills everyone up (`to` 1) or empties them (`to` 0), for tuning. */
export function setFullness(to: number) {
  for (const m of state.members) {
    m.fullness = clamp01(to);
    m.starving = 0;
  }
  save();
  announce();
}

/** For tuning: empties a spider, as if it's been empty long enough to starve (it dies at the next tick). */
export function starve(id: string) {
  const m = byId(id);
  if (!m) return;
  m.fullness = 0;
  m.starving = den.dying.after;
  save();
  announce();
}

/** For tuning: a spider gets old (just past Old from). */
export function makeOld(id: string) {
  const m = byId(id);
  if (!m) return;
  m.growth = 1;
  const a = den.aging;
  m.age = lifespan(m) * Math.min(0.99, a.elderAt + (1 - a.elderAt) * 0.6);
  save();
  announce();
}

/** Grows every baby up, for tuning. */
export function growEveryoneUp() {
  for (const m of state.members) m.growth = 1;
  save();
  announce();
}

/** Lays a clutch of eggs at (x, y), fractions of the den, with `mateId` as the other parent if given. Returns the egg sac, or why not. */
export function layEggs(id: string, x: number, y: number, force = false, mateId?: string): Egg | string {
  const m = byId(id);
  if (!m) return "No spider";
  const can = canLay(m);
  if (!can.ok && !force) return can.why;
  const mate = byId(mateId);
  const b = den.babies;
  const fertility = mate ? (effect(m.genes, "fertility") + effect(mate.genes, "fertility")) / 2 : effect(m.genes, "fertility");
  const from = Math.min(b.clutchFrom, b.clutchTo);
  const to = Math.max(b.clutchFrom, b.clutchTo);
  const room = Math.max(1, b.max - state.members.length - state.eggs.reduce((sum, e) => sum + e.count, 0));
  const count = Math.round((from + Math.random() * (to - from)) * fertility);
  const egg: Egg = {
    id: newId(),
    parent: m.id,
    mate: mate?.id,
    parents: mate ? [snapshot(m), snapshot(mate)] : [snapshot(m)],
    x: clamp01(x),
    y: clamp01(y),
    hatchIn: b.hatch,
    count: Math.max(1, Math.min(room, count)),
  };
  state.eggs.push(egg);
  const wait = b.cooldown / 60 / Math.max(0.1, effect(m.genes, "fertility"));
  m.cooldown = wait;
  m.fullness = clamp01(m.fullness - b.layCost);
  if (mate) mate.cooldown = Math.max(mate.cooldown, wait * 0.5);
  save();
  announce();
  return egg;
}

/** Hurries an egg sac along by `seconds`. */
export function hurry(eggId: string, seconds: number) {
  const egg = state.eggs.find((e) => e.id === eggId);
  if (!egg) return;
  egg.hatchIn -= seconds;
  save();
}

export function hatchAllNow() {
  for (const egg of state.eggs) egg.hatchIn = Math.min(egg.hatchIn, 0);
  save();
}

/** Hatches an egg sac: its babies join the den, taking after their parents. Returns them. */
export function hatch(eggId: string): Member[] {
  const egg = state.eggs.find((e) => e.id === eggId);
  if (!egg) return [];
  state.eggs = state.eggs.filter((e) => e !== egg);
  const taken = new Set(state.members.map(nameOf));
  const babies: Member[] = [];
  const room = Math.max(0, den.babies.max - state.members.length);
  for (let i = 0; i < Math.min(egg.count, room); i++) {
    const look = blankLook();
    const free = NAMES.filter((n) => !taken.has(n));
    look.name = free.length ? pick(free) : `${pick(NAMES)} ${state.members.length + babies.length + 1}`;
    taken.add(look.name);
    const { genes, personality } = inherit(egg.parents);
    if (den.genetics.enabled) {
      look.skin = genes.skin;
      look.pattern = genes.pattern;
      look.thread = genes.thread;
    } else {
      // Colours aren't genetic: they wear whatever a parent wore.
      const parent = pick(egg.parents).look;
      look.skin = parent.skin;
      look.pattern = parent.pattern;
      look.thread = parent.thread;
      Object.assign(genes, { skin: look.skin, pattern: look.pattern, thread: look.thread });
    }
    babies.push({
      id: newId(),
      look,
      genes,
      personality,
      born: Date.now(),
      age: 0,
      lifeRoll: Math.random(),
      growth: 0,
      fullness: 0.6,
      plump: 0,
      starving: 0,
      cooldown: 0,
      main: false,
      parent: egg.parent,
      mate: egg.mate,
      generation: Math.max(...egg.parents.map((p) => p.generation)) + 1,
      meals: 0,
      kills: 0,
    });
  }
  state.members.push(...babies);
  save();
  announce();
  return babies;
}

/** Just the main spider again, and fresh eggs (for tuning). */
export function startOver() {
  const main = mainSpider();
  const now = Date.now();
  const next = fresh(now);
  next.members = [{ ...main, fullness: 0.9, starving: 0, cooldown: 0.15 }];
  next.eggs[0].parent = main.id;
  next.eggs[0].parents = [snapshot(main)];
  Object.assign(state, next);
  clock = now;
  showDressing();
  save();
  announce();
  document.dispatchEvent(new CustomEvent(LOOK_EVENT));
}

// Another tab changed the den: follow along.
window.addEventListener("storage", (e) => {
  if (e.key !== COLONY_KEY) return;
  const next = load();
  const was = state.picked;
  Object.assign(state, next);
  state.picked = byId(was)?.id ?? null;
  showDressing();
  announce();
  document.dispatchEvent(new CustomEvent(LOOK_EVENT));
});

// The main spider's look changed somewhere else (another tab): it's the same spider.
document.addEventListener(LOOK_EVENT, () => {
  const main = mainSpider();
  if (main && JSON.stringify(main.look) !== JSON.stringify(worn)) setLook(main.look, worn);
});

export { family };

/** Are these two spiders family: parent and child, or born of the same parent? */
function family(a: Member, b: Member) {
  if (a.parent && (a.parent === b.id || a.mate === b.id)) return true;
  if (b.parent && (b.parent === a.id || b.mate === a.id)) return true;
  return Boolean(a.parent && a.parent === b.parent);
}

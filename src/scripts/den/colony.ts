import { LOOK_EVENT, keepUnlocked, parseLook, putOn, setLook, trying, worn } from "../spider-string/look";
import { PATTERNS, SKINS, blankLook, type Look } from "../spider-string/wardrobe";
import { den } from "./config";

/**
 * The Spider Den's spiders: every one you have, saved in this browser.
 *
 * One of them is the main spider: the one worn all over the site. Its look is look.ts's `worn`, so
 * the logo's spider, the header's and the den's all stay the same spider. The rest live only in the
 * den. Each has its own look, how old it is, how full, how grown up, and how plump from eating.
 *
 * Hunger, growing up and slimming down are worked out from timestamps, so they carry on while
 * you're away. Also here: egg sacs waiting to hatch, and which spider is picked, if any.
 *
 * The wardrobe dresses the picked spider. With none picked, the Dress up view dresses the main
 * spider (`dressMain`), and the den's wardrobe dresses nobody: its pictures show a plain spider, and
 * clothes are dragged onto whoever should wear them (`dressSpider`).
 */

const COLONY_KEY = "spider:colony";
/** Announced on the document when spiders arrive, leave, change or are picked (here or in another tab). */
export const COLONY_EVENT = "den:colony";

const HOUR = 3600_000;

export interface Member {
  id: string;
  look: Look;
  /** When it hatched, ms. */
  born: number;
  /** 0 newborn → 1 grown up. */
  growth: number;
  /** 0 empty → 1 full. */
  fullness: number;
  /** Extra size from eating, as a fraction (grown-ups only). */
  plump: number;
  /** When it last ran out of food, ms, or 0 while it has some. */
  emptySince: number;
  /** When the numbers above were last brought up to date, ms. */
  at: number;
  main: boolean;
  /** Whoever laid it. */
  parent?: string;
  /** When it last laid eggs, ms. */
  laid: number;
  meals: number;
}

export interface Egg {
  id: string;
  parent: string;
  /** Where it hangs, as fractions of the den's width and height, so it survives a resize. */
  x: number;
  y: number;
  /** When it hatches, ms (life speed already counted), and how many are in it. */
  hatch: number;
  count: number;
}

interface Saved {
  members: Member[];
  eggs: Egg[];
  picked: string | null;
}

const NAMES = [
  "Itsy", "Bitsy", "Pip", "Dot", "Nibbles", "Twig", "Fuzz", "Silky", "Loop", "Knot", "Bean", "Pebble",
  "Wisp", "Noodle", "Crumb", "Button", "Sprout", "Tangle", "Doodle", "Mote", "Sesame", "Jitter",
  "Scoot", "Tuft", "Biscuit", "Hopper", "Lint", "Pickle", "Waffle", "Zigzag", "Poppy", "Speck",
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

function parseMember(raw: Partial<Member>, now: number): Member | null {
  if (!raw || typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    look: parseLook(JSON.stringify(raw.look ?? {})),
    born: num(raw.born, now),
    growth: clamp01(num(raw.growth, 1)),
    fullness: clamp01(num(raw.fullness, 0.7)),
    plump: Math.max(0, num(raw.plump, 0)),
    emptySince: num(raw.emptySince, 0),
    at: num(raw.at, now),
    main: raw.main === true,
    parent: typeof raw.parent === "string" ? raw.parent : undefined,
    laid: num(raw.laid, 0),
    meals: Math.max(0, Math.round(num(raw.meals, 0))),
  };
}

function parseEgg(raw: Partial<Egg>, now: number): Egg | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.parent !== "string") return null;
  return {
    id: raw.id,
    parent: raw.parent,
    x: clamp01(num(raw.x, 0.5)),
    y: clamp01(num(raw.y, 0.4)),
    hatch: num(raw.hatch, now),
    count: Math.max(1, Math.min(12, Math.round(num(raw.count, 3)))),
  };
}

/** A den with just the main spider (wearing what it wears everywhere) and a clutch of eggs about to hatch, so there's life from the start. */
function fresh(now: number): Saved {
  const main: Member = {
    id: newId(),
    look: parseLook(JSON.stringify(worn)),
    born: now,
    growth: 1,
    fullness: 0.9,
    plump: 0,
    emptySince: 0,
    at: now,
    main: true,
    laid: now,
    meals: 0,
  };
  return {
    members: [main],
    // Off to one side of the middle, where the main spider starts.
    eggs: [{ id: newId(), parent: main.id, x: 0.36, y: 0.3, hatch: now + 6000, count: 3 }],
    picked: null,
  };
}

function load(now = Date.now()): Saved {
  let raw: Partial<Saved> | null = null;
  try {
    raw = JSON.parse(read(COLONY_KEY) ?? "null");
  } catch {
    raw = null;
  }
  const members = (Array.isArray(raw?.members) ? raw.members : [])
    .map((m) => parseMember(m, now))
    .filter((m): m is Member => m !== null);
  if (!members.length) return fresh(now);
  // Exactly one main spider, and it's the one worn everywhere (another page may have changed it).
  const main = members.find((m) => m.main) ?? members[0];
  for (const m of members) m.main = m === main;
  setLook(main.look, worn);
  const eggs = (Array.isArray(raw?.eggs) ? raw.eggs : []).map((e) => parseEgg(e, now)).filter((e): e is Egg => e !== null);
  // Nobody's picked when the page opens: picking is just for this visit.
  return { members, eggs, picked: null };
}

const state = load();
/** Whether the wardrobe dresses the main spider when nobody's picked (the Dress up view). */
let dressesMain = true;

const announce = () => document.dispatchEvent(new CustomEvent(COLONY_EVENT));
let savedAt = 0;
function save() {
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

/** How big it's drawn, next to a grown-up. */
export function sizeOf(m: Member) {
  const small = den.growing.babySize;
  const grown = 1 - (1 - m.growth) ** 2;
  return (small + (1 - small) * grown) * (1 + m.plump);
}

/** Whether it can lay eggs right now, or why not. */
export function canLay(m: Member, now = Date.now()): { ok: true } | { ok: false; why: string } {
  const b = den.babies;
  if (!grownUp(m)) return { ok: false, why: `${nameOf(m)} is too young` };
  const coming = state.eggs.reduce((sum, e) => sum + e.count, 0);
  if (state.members.length + coming >= b.max) return { ok: false, why: "The den is full" };
  if (m.fullness < b.fullEnough) return { ok: false, why: `${nameOf(m)} is too hungry` };
  const wait = m.laid + (b.cooldown * 60_000) / Math.max(1, den.pace.speed) - now;
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60_000);
    return { ok: false, why: minutes > 1 ? `Ready again in ${minutes} minutes` : "Ready again in a minute" };
  }
  return { ok: true };
}

// ── Time passing ─────────────────────────────────────────────────────────────

/**
 * Brings a spider's hunger, growth and plumpness up to `now`. Returns true if it's starved.
 * Growing only happens while it has food in it.
 */
function age(m: Member, now: number) {
  const hours = (Math.max(0, now - m.at) / HOUR) * Math.max(1, den.pace.speed);
  m.at = now;
  if (hours <= 0) return false;
  const h = den.hunger;
  const fedHours = Math.min(hours, m.fullness * h.emptyAfter);
  const was = m.fullness;
  m.fullness = clamp01(m.fullness - hours / Math.max(0.01, h.emptyAfter));
  if (m.growth < 1) m.growth = clamp01(m.growth + fedHours / Math.max(0.01, den.growing.growUpAfter));
  m.plump = Math.max(0, m.plump - (hours / Math.max(0.01, h.slimAfter)) * h.plumpMax);
  if (m.fullness <= 0) {
    if (was > 0 || !m.emptySince) m.emptySince = now - ((hours - fedHours) * HOUR) / Math.max(1, den.pace.speed);
  } else m.emptySince = 0;
  const starvedFor = m.emptySince ? ((now - m.emptySince) / HOUR) * Math.max(1, den.pace.speed) : 0;
  return den.dying.enabled && !m.main && m.fullness <= 0 && starvedFor >= den.dying.after;
}

/** Brings everyone up to date. Returns the spiders that have starved (already gone from the den). */
export function tick(now = Date.now()) {
  const starved = state.members.filter((m) => age(m, now));
  if (starved.length) {
    state.members = state.members.filter((m) => !starved.includes(m));
    if (state.picked && !byId(state.picked)) pickSpider(null, false);
    save();
    announce();
  } else if (now - savedAt > 15_000) save();
  return starved;
}

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

/**
 * Saves what's being tried on as the look of the spider being dressed (anything still locked stays
 * as it was). For the main spider, that's the look worn everywhere too. False if nobody's being dressed.
 */
export function wear() {
  const m = dressing();
  if (!m) return false;
  const next = keepUnlocked(trying, m.look);
  setLook(m.look, next);
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
  if (m.id === dressing()?.id) setLook(trying, next);
  save();
  if (m.main) putOn(next);
  else tellLook();
  return true;
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

/** It ate something: fuller, and a baby grows or a grown-up plumps up a little. */
export function feed(id: string, amount = 1) {
  const m = byId(id);
  if (!m) return;
  const now = Date.now();
  age(m, now);
  m.fullness = clamp01(m.fullness + den.hunger.meal * amount);
  m.emptySince = 0;
  m.meals++;
  if (m.growth < 1) m.growth = clamp01(m.growth + den.growing.mealGrowth * amount);
  else m.plump = Math.min(den.hunger.plumpMax, m.plump + den.hunger.plump * amount);
  save();
  announce();
}

/** Fills everyone up (`to` 1) or empties them (`to` 0), for tuning. */
export function setFullness(to: number) {
  const now = Date.now();
  for (const m of state.members) {
    age(m, now);
    m.fullness = clamp01(to);
    m.emptySince = to <= 0 ? now : 0;
  }
  save();
  announce();
}

/** Grows every baby up, for tuning. */
export function growEveryoneUp() {
  for (const m of state.members) m.growth = 1;
  save();
  announce();
}

/** Lays a clutch of eggs at (x, y), fractions of the den. Returns the egg sac, or why not. */
export function layEggs(id: string, x: number, y: number, force = false): Egg | string {
  const m = byId(id);
  if (!m) return "No spider";
  const now = Date.now();
  age(m, now);
  const can = canLay(m, now);
  if (!can.ok && !force) return can.why;
  const b = den.babies;
  const from = Math.min(b.clutchFrom, b.clutchTo);
  const to = Math.max(b.clutchFrom, b.clutchTo);
  const room = Math.max(1, b.max - state.members.length - state.eggs.reduce((sum, e) => sum + e.count, 0));
  const egg: Egg = {
    id: newId(),
    parent: m.id,
    x: clamp01(x),
    y: clamp01(y),
    hatch: now + (b.hatch * 1000) / Math.max(1, den.pace.speed),
    count: Math.min(room, from + Math.floor(Math.random() * (to - from + 1))),
  };
  state.eggs.push(egg);
  m.laid = now;
  m.fullness = clamp01(m.fullness - b.layCost);
  save();
  announce();
  return egg;
}

/** Hurries an egg sac along by `seconds`. */
export function hurry(eggId: string, seconds: number) {
  const egg = state.eggs.find((e) => e.id === eggId);
  if (!egg) return;
  egg.hatch -= seconds * 1000;
  save();
}

export function hatchAllNow() {
  const now = Date.now();
  for (const egg of state.eggs) egg.hatch = Math.min(egg.hatch, now);
  save();
}

/** Hatches an egg sac: its babies join the den. Returns them. */
export function hatch(eggId: string): Member[] {
  const egg = state.eggs.find((e) => e.id === eggId);
  if (!egg) return [];
  state.eggs = state.eggs.filter((e) => e !== egg);
  const parent = byId(egg.parent) ?? mainSpider();
  const now = Date.now();
  const taken = new Set(state.members.map(nameOf));
  const babies: Member[] = [];
  for (let i = 0; i < egg.count; i++) {
    const look = blankLook();
    const free = NAMES.filter((n) => !taken.has(n));
    look.name = free.length ? pick(free) : `${pick(NAMES)} ${state.members.length + babies.length + 1}`;
    taken.add(look.name);
    const takesAfter = Math.random() < den.babies.inherit;
    look.skin = takesAfter ? parent.look.skin : pick(Object.keys(SKINS) as Look["skin"][]);
    look.pattern = takesAfter ? parent.look.pattern : Math.random() < 0.6 ? "none" : pick(Object.keys(PATTERNS) as Look["pattern"][]);
    look.thread = parent.look.thread;
    babies.push({
      id: newId(),
      look,
      born: now,
      growth: 0,
      fullness: 0.6,
      plump: 0,
      emptySince: 0,
      at: now,
      main: false,
      parent: parent.id,
      laid: now,
      meals: 0,
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
  next.members = [{ ...main, fullness: 0.9, emptySince: 0, at: now, laid: now }];
  next.eggs[0].parent = main.id;
  Object.assign(state, next);
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
  if (JSON.stringify(main.look) !== JSON.stringify(worn)) setLook(main.look, worn);
});

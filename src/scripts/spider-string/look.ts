import { PALETTE, PATTERNS, SKINS, SLOTS, THREADS, blankLook, itemOf, type Look, type Slot, type Tint } from "./wardrobe";

/**
 * What the spider's wearing, saved in this browser so it looks the same on every page: the one
 * hanging off the logo, the one in the header and the one in the Spider Den.
 *
 * `worn` is that saved look. The den also has `trying`: the same look plus anything locked that's
 * being tried on, which only the den's own spider shows (a rig with data-look="try"). Both are the
 * same objects for the page's lifetime, changed in place, since rigs read them every frame.
 *
 * Also here: snacks eaten, and what's been unlocked.
 */

const LOOK_KEY = "spider:look";
const SNACKS_KEY = "spider:snacks";
const UNLOCKS_KEY = "spider:unlocks";
/** Announced on the document when the saved look, snacks or unlocks change (here or in another tab). */
export const LOOK_EVENT = "spider:look";

/** localStorage can be unavailable (private mode, blocked site data): then nothing persists. */
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
function readList(raw: string | null) {
  try {
    const list = JSON.parse(raw ?? "[]");
    return new Set<string>(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

/** A saved look, with anything unknown (a renamed item, a colour that's gone) put back to its default. */
export function parseLook(raw: string | null): Look {
  const look = blankLook();
  let saved: Partial<Look> = {};
  try {
    saved = JSON.parse(raw ?? "{}") ?? {};
  } catch {
    return look;
  }
  for (const slot of Object.keys(SLOTS) as Slot[]) {
    const id = saved.items?.[slot];
    if (typeof id === "string" && itemOf(slot, id)) look.items[slot] = id;
    const tint = saved.tints?.[slot];
    if (typeof tint === "string" && tint in PALETTE) look.tints[slot] = tint as Tint;
  }
  if (typeof saved.skin === "string" && saved.skin in SKINS) look.skin = saved.skin as Look["skin"];
  if (typeof saved.pattern === "string" && saved.pattern in PATTERNS) look.pattern = saved.pattern as Look["pattern"];
  if (typeof saved.thread === "string" && saved.thread in THREADS) look.thread = saved.thread as Look["thread"];
  if (typeof saved.name === "string") look.name = saved.name.slice(0, 24);
  return look;
}

/** Copies `from` into `into`, keeping `into` the same object. */
export function setLook(into: Look, from: Look) {
  Object.assign(into, from, { items: { ...from.items }, tints: { ...from.tints } });
}

/** What the spider wears on every page. */
export const worn: Look = parseLook(read(LOOK_KEY));
/** What the den's spider shows: `worn`, plus anything locked being tried on. */
export const trying: Look = parseLook(read(LOOK_KEY));

let unlocked = readList(read(UNLOCKS_KEY));

/** Snacks it's eaten, ever (in this browser). */
export const snacks = () => Number(read(SNACKS_KEY)) || 0;

export function isUnlocked(slot: Slot, id: string) {
  const need = itemOf(slot, id)?.unlock;
  if (!need || unlocked.has("all")) return true;
  if (need.kind === "snacks") return snacks() >= need.count;
  return unlocked.has(need.kind);
}

const announce = () => document.dispatchEvent(new CustomEvent(LOOK_EVENT));

/** A copy of `look` that keeps what `before` had in any slot whose item is still locked. */
export function keepUnlocked(look: Look, before: Look) {
  const next = parseLook(JSON.stringify(look));
  for (const slot of Object.keys(SLOTS) as Slot[]) {
    if (!isUnlocked(slot, look.items[slot])) {
      next.items[slot] = before.items[slot];
      next.tints[slot] = before.tints[slot];
    }
  }
  return next;
}

/** Makes `look` the one worn everywhere, and saves it. */
export function putOn(look: Look) {
  setLook(worn, look);
  store(LOOK_KEY, JSON.stringify(worn));
  announce();
}

/** Saves `trying` as the look worn everywhere, keeping whatever was worn before in any slot whose item is still locked. */
export function wear() {
  putOn(keepUnlocked(trying, worn));
}

/**
 * Counts a snack, then `save`s, so anything being tried on that it's just unlocked is kept. Returns
 * what it unlocked. (The Spider Den saves to whichever of its spiders is being dressed.)
 */
export function ateSnack(save = wear) {
  const locked = lockedItems();
  store(SNACKS_KEY, String(snacks() + 1));
  const now = locked.filter(({ slot, item }) => isUnlocked(slot, item.id));
  save();
  return now;
}

const lockedItems = () =>
  (Object.keys(SLOTS) as Slot[]).flatMap((slot) =>
    SLOTS[slot].items.filter((item) => !isUnlocked(slot, item.id)).map((item) => ({ slot, item })),
  );

// Another tab changed something: follow along.
window.addEventListener("storage", (e) => {
  if (e.key === LOOK_KEY) {
    setLook(worn, parseLook(e.newValue));
    setLook(trying, worn);
  } else if (e.key === UNLOCKS_KEY) {
    unlocked = readList(e.newValue);
  } else if (e.key !== SNACKS_KEY) return;
  announce();
});

// For trying out locked items before there's a real way to earn them: ?unlock-all on any page
// unlocks everything in this browser, and ?lock-all locks it all again.
{
  const params = new URLSearchParams(location.search);
  if (params.has("unlock-all")) unlocked.add("all");
  if (params.has("lock-all")) unlocked.clear();
  if (params.has("unlock-all") || params.has("lock-all")) store(UNLOCKS_KEY, JSON.stringify([...unlocked]));
}

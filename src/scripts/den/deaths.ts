import { parseLook } from "../spider-string/look";
import type { Look } from "../spider-string/wardrobe";
import { den } from "./config";

/**
 * The Spider Den's log of spiders that have died, newest first, saved in this browser so that if the
 * den was running in the background (or you were away), you can see what happened.
 *
 * Each entry keeps enough to remember the spider by: its look (for a little picture), its name, how
 * old it was, how hungry, and what got it.
 */

export type Cause = "starved" | "old" | "eaten" | "bird" | "frog" | "pirate";

export interface Death {
  id: string;
  name: string;
  look: Look;
  cause: Cause;
  /** Whoever ate it, if a spider did. */
  killer?: string;
  /** Real time it died, ms. */
  at: number;
  /** How old it was (den hours), how far through its life (0–1), and how full (0–1). */
  age: number;
  life: number;
  fullness: number;
  /** How long it had been empty, den hours. */
  starving: number;
  main: boolean;
  /** It happened while you were away. */
  away: boolean;
}

const KEY = "den:deaths";
const SEEN_KEY = "den:deaths-seen";
/** Announced on the document when the log changes. */
export const DEATHS_EVENT = "den:deaths";

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

const CAUSES: Cause[] = ["starved", "old", "eaten", "bird", "frog", "pirate"];

function load(): Death[] {
  try {
    const raw = JSON.parse(read(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((d) => d && typeof d.name === "string" && CAUSES.includes(d.cause))
      .map((d) => ({ ...d, look: parseLook(JSON.stringify(d.look ?? {})) })) as Death[];
  } catch {
    return [];
  }
}

let log = load();
let seen = Number(read(SEEN_KEY)) || 0;

export const deaths = () => log;
/** Deaths since the log was last opened. */
export const unseen = () => log.filter((d) => d.at > seen).length;

export function remember(death: Death) {
  log = [death, ...log].slice(0, Math.max(1, Math.round(den.dying.logMost)));
  store(KEY, JSON.stringify(log));
  document.dispatchEvent(new CustomEvent(DEATHS_EVENT));
}

export function markSeen() {
  seen = Date.now();
  store(SEEN_KEY, String(seen));
  document.dispatchEvent(new CustomEvent(DEATHS_EVENT));
}

export function clearLog() {
  log = [];
  store(KEY, "[]");
  document.dispatchEvent(new CustomEvent(DEATHS_EVENT));
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) log = load();
  else if (e.key === SEEN_KEY) seen = Number(e.newValue) || 0;
  else return;
  document.dispatchEvent(new CustomEvent(DEATHS_EVENT));
});

/** What happened to it, in words. */
export function causeText(d: Death) {
  switch (d.cause) {
    case "starved":
      return "Starved";
    case "old":
      return "Died of old age";
    case "eaten":
      return d.killer ? `Eaten by ${d.killer}` : "Eaten by another spider";
    case "bird":
      return "Taken by a bird";
    case "frog":
      return "Eaten by a frog";
    case "pirate":
      return "Eaten by a pirate spider";
  }
}

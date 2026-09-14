import { PATTERNS, SKINS, THREADS, type Look } from "../spider-string/wardrobe";
import { den } from "./config";

/**
 * What a Spider Den spider is born with: its genes and its personality.
 *
 * Genes are multipliers around 1 (an average spider): how quick it is, how quickly it gets hungry,
 * how strong its silk is, how strong it is in a fight, how big it grows, how long it lives and how
 * many babies it has. Its body colour, pattern and thread colour are genes too. Personality traits
 * run from 0 to 1, with 0.5 in the middle.
 *
 * Babies take after their parents: each trait is near their average, with a little wobble, and now
 * and then a colour turns up that neither parent has. Rarer colours turn up less often.
 *
 * How much each gene actually does is tuned in Genes (den/config.ts); the helpers at the bottom turn
 * genes into what they mean.
 */

export interface Genes {
  speed: number;
  appetite: number;
  silk: number;
  strength: number;
  size: number;
  lifespan: number;
  fertility: number;
  skin: Look["skin"];
  pattern: Look["pattern"];
  thread: Look["thread"];
}

export interface Personality {
  /** 0 patient … 1 easily annoyed. */
  temper: number;
  /** 0 hates being flung about … 1 loves it. */
  thrill: number;
  /** 0 timid … 1 brave. */
  nerve: number;
  /** 0 gentle … 1 would eat another spider. */
  aggression: number;
  /** 0 lazy … 1 always busy. */
  energy: number;
  /** 0 messy … 1 always mending the web. */
  tidiness: number;
}

export const TRAITS = ["speed", "appetite", "silk", "strength", "size", "lifespan", "fertility"] as const;
export type Trait = (typeof TRAITS)[number];
export const FEELINGS = ["temper", "thrill", "nerve", "aggression", "energy", "tidiness"] as const;
export type Feeling = (typeof FEELINGS)[number];

/** How far each trait can go, so nothing gets silly. */
export const LIMITS: Record<Trait, [number, number]> = {
  speed: [0.45, 1.8],
  appetite: [0.45, 1.9],
  silk: [0.3, 2.2],
  strength: [0.4, 1.9],
  size: [0.75, 1.3],
  lifespan: [0.4, 1.8],
  fertility: [0.3, 1.8],
};
/** How much each trait spreads next to the others (size varies least). */
const SPREAD: Record<Trait, number> = { speed: 1, appetite: 1, silk: 1.2, strength: 1, size: 0.45, lifespan: 0.9, fertility: 1 };

/** How common each colour is when one turns up out of nowhere: the plain ones most. */
const SKIN_ODDS: Record<Look["skin"], number> = { ink: 10, slate: 6, cocoa: 6, moss: 4, ocean: 3, plum: 2, berry: 1.5, ember: 1 };
const PATTERN_ODDS: Record<Look["pattern"], number> = { none: 12, spots: 4, stripes: 4, fuzzy: 2, stars: 1 };
const THREAD_ODDS: Record<Look["thread"], number> = { silk: 12, teal: 3, gold: 1.5, rainbow: 0.6 };

/** How rare a colour is, 0 (common) to 1 (rarest), for the card. */
export const rarity = (odds: Record<string, number>, key: string) => {
  const max = Math.max(...Object.values(odds));
  const min = Math.min(...Object.values(odds));
  return max === min ? 0 : 1 - ((odds[key] ?? max) - min) / (max - min);
};
export const skinRarity = (skin: string) => rarity(SKIN_ODDS, skin);
export const patternRarity = (pattern: string) => rarity(PATTERN_ODDS, pattern);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
/** A normally distributed number (mean 0, deviation 1). */
function gauss() {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function weighted<T extends string>(odds: Record<T, number>): T {
  const entries = Object.entries(odds) as [T, number][];
  let roll = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}
const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

const trait = (t: Trait, value: number) => clamp(value, ...LIMITS[t]);

/** Genes for a spider with no parents to take after. Its colours are `look`'s, if given. */
export function randomGenes(look?: Pick<Look, "skin" | "pattern" | "thread">): Genes {
  const g = den.genetics;
  const genes = Object.fromEntries(TRAITS.map((t) => [t, trait(t, 1 + gauss() * g.spread * SPREAD[t])])) as Record<Trait, number>;
  return {
    ...genes,
    skin: look?.skin ?? weighted(SKIN_ODDS),
    pattern: look?.pattern ?? weighted(PATTERN_ODDS),
    thread: look?.thread ?? weighted(THREAD_ODDS),
  };
}

export function randomPersonality(): Personality {
  const spread = den.personality.spread;
  return Object.fromEntries(FEELINGS.map((f) => [f, clamp01(0.5 + gauss() * spread)])) as unknown as Personality;
}

/** A baby's genes and personality, from one or two parents. */
export function inherit(parents: { genes: Genes; personality: Personality }[]) {
  const g = den.genetics;
  const p = den.personality;
  const fresh = randomGenes();
  const genes = { ...fresh } as Genes;
  for (const t of TRAITS) {
    const mean = parents.reduce((sum, parent) => sum + parent.genes[t], 0) / parents.length;
    const blended = mean * g.inherit + fresh[t] * (1 - g.inherit);
    genes[t] = trait(t, blended + gauss() * g.wobble * SPREAD[t]);
  }
  // Colours come from one parent or the other, now and then something new.
  const from = () => pick(parents).genes;
  genes.skin = Math.random() < g.colour ? weighted(SKIN_ODDS) : from().skin;
  genes.pattern = Math.random() < g.pattern ? weighted(PATTERN_ODDS) : from().pattern;
  genes.thread = Math.random() < g.thread ? weighted(THREAD_ODDS) : from().thread;

  const own = randomPersonality();
  const personality = { ...own };
  for (const f of FEELINGS) {
    const mean = parents.reduce((sum, parent) => sum + parent.personality[f], 0) / parents.length;
    personality[f] = clamp01(mean * p.inherit + own[f] * (1 - p.inherit));
  }
  return { genes, personality };
}

export function parseGenes(raw: unknown, look: Pick<Look, "skin" | "pattern" | "thread">): Genes {
  const base = randomGenes(look);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  for (const t of TRAITS) if (typeof r[t] === "number" && Number.isFinite(r[t])) base[t] = trait(t, r[t] as number);
  if (typeof r.skin === "string" && r.skin in SKINS) base.skin = r.skin as Genes["skin"];
  if (typeof r.pattern === "string" && r.pattern in PATTERNS) base.pattern = r.pattern as Genes["pattern"];
  if (typeof r.thread === "string" && r.thread in THREADS) base.thread = r.thread as Genes["thread"];
  return base;
}

export function parsePersonality(raw: unknown): Personality {
  const base = randomPersonality();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  for (const f of FEELINGS) if (typeof r[f] === "number" && Number.isFinite(r[f])) base[f] = clamp01(r[f] as number);
  return base;
}

// ── What they mean ───────────────────────────────────────────────────────────

/** A trait with its effect scaled by how much it matters (Genes → … matters). */
export const effect = (genes: Genes, t: Trait) => Math.max(0.05, 1 + (genes[t] - 1) * den.genetics[t]);

/** A personality trait pulled toward the middle when personality matters less. 0.5 is neutral. */
export const feel = (personality: Personality, f: Feeling) => clamp01(0.5 + (personality[f] - 0.5) * den.personality.strength);

/** How hungry it gets, next to an average spider: appetite, and being quick. */
export const hungerRate = (genes: Genes) => effect(genes, "appetite") * Math.max(0.2, 1 + (effect(genes, "speed") - 1) * den.genetics.speedHunger);

/** What a trait value means, in a word or two, or nothing if it's ordinary. */
export function traitWords(genes: Genes, personality: Personality) {
  const words: string[] = [];
  const high = (v: number, at: number) => v >= at;
  const low = (v: number, at: number) => v <= at;
  if (high(genes.speed, 1.2)) words.push("Quick");
  else if (low(genes.speed, 0.82)) words.push("Slow");
  if (high(genes.appetite, 1.25)) words.push("Always hungry");
  else if (low(genes.appetite, 0.8)) words.push("Light eater");
  if (high(genes.silk, 1.3)) words.push("Strong silk");
  else if (low(genes.silk, 0.72)) words.push("Flimsy silk");
  if (high(genes.strength, 1.25)) words.push("Tough");
  else if (low(genes.strength, 0.78)) words.push("Delicate");
  if (high(genes.lifespan, 1.25)) words.push("Long-lived");
  else if (low(genes.lifespan, 0.78)) words.push("Short-lived");
  if (high(genes.fertility, 1.3)) words.push("Big families");
  if (high(genes.size, 1.12)) words.push("Big");
  else if (low(genes.size, 0.9)) words.push("Little");
  const p = personality;
  if (high(p.temper, 0.68)) words.push("Grumpy");
  else if (low(p.temper, 0.3)) words.push("Patient");
  if (high(p.thrill, 0.68)) words.push("Loves being flung");
  else if (low(p.thrill, 0.3)) words.push("Hates being flung");
  if (high(p.nerve, 0.7)) words.push("Brave");
  else if (low(p.nerve, 0.3)) words.push("Timid");
  if (high(p.aggression, 0.72)) words.push("Fierce");
  else if (low(p.aggression, 0.25)) words.push("Gentle");
  if (high(p.energy, 0.7)) words.push("Busy");
  else if (low(p.energy, 0.3)) words.push("Lazy");
  if (high(p.tidiness, 0.7)) words.push("Tidy");
  else if (low(p.tidiness, 0.28)) words.push("Messy");
  return words;
}

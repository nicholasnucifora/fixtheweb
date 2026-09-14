/**
 * The den's settings you choose in the den itself (the ⚙ in its bar): how fast time runs, how many
 * flies and predators come, and whether spiders fight. Saved in this browser. These go on top of
 * what's tuned in den/config.ts.
 */

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
export const AMOUNTS = {
  none: { label: "None", value: 0 },
  few: { label: "Few", value: 0.4 },
  normal: { label: "Normal", value: 1 },
  lots: { label: "Lots", value: 2.5 },
};
export type Amount = keyof typeof AMOUNTS;

export interface DenSettings {
  speed: (typeof SPEEDS)[number];
  flies: Amount;
  predators: Amount;
  fights: boolean;
}

const KEY = "den:settings";
export const SETTINGS_EVENT = "den:settings";

const defaults = (): DenSettings => ({ speed: 1, flies: "normal", predators: "normal", fights: true });

function load(): DenSettings {
  const s = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (SPEEDS.includes(raw.speed)) s.speed = raw.speed;
    if (raw.flies in AMOUNTS) s.flies = raw.flies;
    if (raw.predators in AMOUNTS) s.predators = raw.predators;
    if (typeof raw.fights === "boolean") s.fights = raw.fights;
  } catch {
    // ignore
  }
  return s;
}

export const settings = load();

export function change(patch: Partial<DenSettings>) {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
  document.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
}

export const fliesAmount = () => AMOUNTS[settings.flies].value;
export const predatorsAmount = () => AMOUNTS[settings.predators].value;

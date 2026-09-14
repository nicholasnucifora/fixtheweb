import { den } from "./config";
import { SETTINGS_EVENT, settings } from "./settings";

/**
 * The Spider Den's time of day. A den day is Day & night → Day lasts long at ordinary speed, and goes
 * by faster or slower with the den's time speed (the ⚙ in its bar). It carries on while you're away,
 * at ordinary speed, so you come back to a different time of day.
 *
 * Times of day run 0 to 1: 0 is midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset.
 */

const KEY = "den:daytime";

/** Where the day had got to (`day`) at real time `at` (ms), and how fast it's going (days a second). */
let clock = { day: 0.3, at: Date.now() };
let rate = 0;

const daySeconds = () => Math.max(5, den.day.minutes * 60);
const rateNow = () => (den.day.enabled && !den.day.freeze ? settings.speed : 0) / daySeconds();
const wrap = (t: number) => ((t % 1) + 1) % 1;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: timeOfDay(), at: Date.now() }));
  } catch {
    // ignore
  }
}

/** Brings the clock's starting point up to now, before how fast it runs changes. */
function rebase() {
  const now = Date.now();
  clock = { day: wrap(clock.day + ((now - clock.at) / 1000) * rate), at: now };
  rate = rateNow();
}

{
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && Number.isFinite(saved.day) && Number.isFinite(saved.at)) {
      // Time away goes by at ordinary speed.
      const away = Math.max(0, Date.now() - saved.at) / 1000;
      clock = { day: wrap(saved.day + (den.day.enabled && !den.day.freeze ? away / daySeconds() : 0)), at: Date.now() };
    }
  } catch {
    // a fresh morning, then
  }
  rate = rateNow();
}

document.addEventListener(SETTINGS_EVENT, () => {
  rebase();
  save();
});
window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save();
});
window.setInterval(save, 20_000);

/** The time of day now, 0 to 1. */
export function timeOfDay() {
  // Tuning may have changed how long a day is.
  if (rateNow() !== rate) rebase();
  return wrap(clock.day + ((Date.now() - clock.at) / 1000) * rate);
}

/** Sets the time of day (for tuning). */
export function setTimeOfDay(day: number) {
  clock = { day: wrap(day), at: Date.now() };
  rate = rateNow();
  save();
}

export interface Light {
  /** How high the sun is: 1 at noon, 0 on the horizon, −1 at midnight. */
  sun: number;
  /** How much it's day, 0 (night) to 1, easing through dawn and dusk. */
  day: number;
  night: number;
  /** How golden the light is: most around sunrise and sunset. */
  golden: number;
}

const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

/** How the light is at time of day `t`. */
export function lightAt(t = timeOfDay()): Light {
  if (!den.day.enabled) return { sun: 1, day: 1, night: 0, golden: 0 };
  const sun = Math.sin((t - 0.25) * Math.PI * 2);
  const day = smooth((sun + 0.16) / 0.42);
  const golden = smooth(1 - Math.abs(sun - 0.04) / 0.32);
  return { sun, day, night: 1 - day, golden };
}

/** How much it's day right now, 0 to 1 (what spiders, flies and predators go by). */
export const daylight = () => lightAt().day;

/** The den's time, in words: "7:15 in the morning". */
export function clockText(t = timeOfDay()) {
  const minutes = Math.floor(t * 24 * 60);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 || 12;
  const part = h24 < 5 || h24 >= 21 ? "at night" : h24 < 12 ? "in the morning" : h24 < 17 ? "in the afternoon" : "in the evening";
  return `${h12}:${String(m).padStart(2, "0")} ${part}`;
}

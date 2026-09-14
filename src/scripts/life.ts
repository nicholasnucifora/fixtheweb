import { COUNTRIES, type CountryId } from "./life/data";
import { createGrid, type Stage } from "./life/grid";
import { AGE_MAX, AGE_MIN, PARTS, formatHours, formatYears, lifeOf, type Inputs, type Sex } from "./life/model";

/**
 * Your Life on Screens (src/pages/life.astro): the inputs (age, country, whose life table, screen time),
 * and everything on the page that follows them: the weeks grid (life/grid.ts), the warning pack, a day's
 * split, other ages, and the phone report mockup. The inputs are remembered in this browser.
 */

const STORE = "ftw-life";
/** The ages compared further down (the page has a row for each). */
export const AGES = [15, 25, 45, 65];
/** The screen time slider's top end, in hours a day. */
export const SCREENS_MAX = 16;

const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector)!;
const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [...root.querySelectorAll<T>(selector)];
const one = (years: number) => years.toFixed(1);
/** Less than would show as 0.1 years. */
const none = (years: number) => years < 0.05;
const clampAge = (age: number) => Math.min(AGE_MAX, Math.max(AGE_MIN, Math.round(age)));

/** First visit: guess the country from the browser's language (nothing leaves the browser), else Australia. */
function firstInputs(): Inputs {
  const region = navigator.language.split("-")[1]?.toUpperCase();
  const country: CountryId = region === "US" ? "us" : region === "GB" ? "uk" : "au";
  return { age: 25, country, sex: "everyone", screens: null };
}

function load(): Inputs {
  const fallback = firstInputs();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (!saved) return fallback;
    return {
      age: clampAge(Number(saved.age) || fallback.age),
      country: saved.country in COUNTRIES ? saved.country : fallback.country,
      sex: ["female", "male", "everyone"].includes(saved.sex) ? saved.sex : fallback.sex,
      screens: typeof saved.screens === "number" ? Math.min(SCREENS_MAX, Math.max(0, saved.screens)) : null,
    };
  } catch {
    return fallback;
  }
}

function save(inputs: Inputs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(inputs));
  } catch {
    // Not remembered, then.
  }
}

export function mountLife() {
  const root = $(".life");
  const ageInput = $<HTMLInputElement>("[data-life-age]");
  const screensInput = $<HTMLInputElement>("[data-life-screens]");
  const counter = $("[data-life-counter]");
  const narration = $("[data-life-narration]");
  const canvas = $<HTMLCanvasElement>("[data-life-grid]");
  let inputs = load();
  let life = lifeOf(inputs);
  /** Whether the grid's been played yet: until then it shows the rest of life whole, waiting to be carved up. */
  let played = false;

  const text = (selector: string, value: string) => $$(selector).forEach((el) => (el.textContent = value));
  const pressed = (selector: string, attribute: string, value: string) =>
    $$(selector).forEach((button) => button.setAttribute("aria-pressed", String(button.getAttribute(attribute) === value)));

  /** The big number and the line under it, as far as the grid has carved the rest of life up. */
  const narrate = (stage: Stage, progress: number) => {
    const { years, left } = life;
    let remaining = left;
    if (stage === "done") remaining = years.free;
    else if (stage !== "start") {
      for (const part of PARTS) {
        if (part === stage) {
          remaining -= years[part] * progress;
          break;
        }
        remaining -= years[part];
      }
    }
    counter.textContent = one(remaining);
    root.dataset.stage = stage;
    const lines: Record<Stage, string> = {
      start: `This is the rest of your life: ${formatYears(left)}.`,
      sleep: `Sleep takes ${formatYears(years.sleep)}.`,
      work: `Work and study take ${formatYears(years.work)}.`,
      upkeep: `Eating, chores, errands and looking after people take ${formatYears(years.upkeep)}.`,
      screens: `Screens take ${formatYears(years.screens)}.`,
      done: none(years.free)
        ? "That leaves no free time away from a screen at all."
        : `That leaves ${formatYears(years.free)} of free time away from a screen.`,
    };
    if (narration.textContent !== lines[stage]) narration.textContent = lines[stage];
  };

  const grid = createGrid(canvas, { onFrame: narrate });

  const render = () => {
    life = lifeOf(inputs);
    const { age, country, sex, screens } = inputs;
    const { years, left, end, today } = life;
    const daily = screens ?? today.averageScreens;
    root.dataset.mode = screens === null ? "average" : "own";

    // The inputs.
    ageInput.value = String(age);
    text("[data-life-age-out]", String(age));
    pressed("[data-life-country]", "data-life-country", country);
    pressed("[data-life-sex]", "data-life-sex", sex);
    pressed("[data-life-mode]", "data-life-mode", screens === null ? "average" : "own");
    screensInput.value = String(daily);
    screensInput.setAttribute("aria-valuetext", `${formatHours(daily)} a day`);
    text("[data-life-screens-out]", formatHours(daily));
    text("[data-life-average]", formatHours(today.averageScreens));

    // The label: years left, what takes them, and the grid.
    text("[data-life-left]", one(left));
    text("[data-life-end]", one(end));
    text("[data-life-country-name]", COUNTRIES[country].name);
    text("[data-life-who]", sex === "female" ? "a woman" : sex === "male" ? "a man" : "someone");
    for (const part of PARTS) text(`[data-life-years="${part}"]`, one(years[part]));
    canvas.setAttribute(
      "aria-label",
      `Your life in weeks: ${age} years already lived, then ${one(left)} left. Sleep takes ${one(years.sleep)} years, ` +
        `work and study ${one(years.work)}, upkeep ${one(years.upkeep)}, screens ${one(years.screens)}, ` +
        `leaving ${one(years.free)} years of free time off screens.`,
    );
    grid.show(life, played ? "done" : "start");
    narrate(played ? "done" : "start", played ? 1 : 0);

    // A day, now.
    text("[data-life-day-title]", screens === null ? `An average day at ${age}` : `A day at ${age}, with your screen time`);
    for (const part of PARTS) {
      $(`[data-life-bar="${part}"]`).style.flexGrow = String(today.hours[part]);
      text(`[data-life-hours="${part}"]`, formatHours(today.hours[part]));
    }
    const overflow = $("[data-life-overflow]");
    overflow.hidden = today.overflow < 1 / 60;
    if (!overflow.hidden) {
      overflow.textContent =
        `${formatHours(daily)} a day is more than the ${formatHours(today.freeTime)} of free time people your age have. ` +
        `The other ${formatHours(today.overflow)} has to come out of meals, chores, work or sleep.`;
    }

    // The warning, and the phone's weekly report.
    text("[data-life-screen-years]", one(years.screens));
    text("[data-life-free-years]", none(years.free) ? "none" : `${one(years.free)} years`);
    text("[data-life-week-hours]", formatHours(daily * 7));
    text("[data-life-day-screens]", formatHours(daily));

    // Other ages, living the same way: the average for each age, or with your screen time.
    const lives = AGES.map((at) => lifeOf({ ...inputs, age: at }));
    const longest = Math.max(...lives.map((other) => other.left));
    $$("[data-life-age-row]").forEach((row, i) => {
      const other = lives[i];
      row.toggleAttribute("data-current", other.inputs.age === age);
      $(".ages-bar", row).style.width = `${(other.left / longest) * 100}%`;
      for (const part of PARTS) $(`[data-part="${part}"]`, row).style.flexGrow = String(other.years[part]);
      $("[data-left]", row).textContent = one(other.left);
      $("[data-screens]", row).textContent = one(other.years.screens);
      $("[data-free]", row).textContent = one(other.years.free);
    });
    text(
      "[data-life-ages-how]",
      screens === null ? "living like the average person at each age" : `spending ${formatHours(screens)} a day on screens`,
    );
  };

  const change = (next: Partial<Inputs>) => {
    inputs = { ...inputs, ...next };
    save(inputs);
    render();
  };

  ageInput.addEventListener("input", () => change({ age: clampAge(Number(ageInput.value)) }));
  $("[data-life-age-down]").addEventListener("click", () => change({ age: clampAge(inputs.age - 1) }));
  $("[data-life-age-up]").addEventListener("click", () => change({ age: clampAge(inputs.age + 1) }));
  for (const button of $$("[data-life-country]")) {
    button.addEventListener("click", () => change({ country: button.dataset.lifeCountry as CountryId }));
  }
  for (const button of $$("[data-life-sex]")) {
    button.addEventListener("click", () => change({ sex: button.dataset.lifeSex as Sex }));
  }
  for (const button of $$("[data-life-mode]")) {
    button.addEventListener("click", () =>
      change({ screens: button.dataset.lifeMode === "own" ? Number(screensInput.value) : null }),
    );
  }
  // Moving the slider is putting in your own.
  screensInput.addEventListener("input", () => change({ screens: Number(screensInput.value) }));
  for (const link of $$("[data-life-use-own]")) {
    link.addEventListener("click", () => {
      if (inputs.screens === null) change({ screens: Number(screensInput.value) });
      requestAnimationFrame(() => screensInput.focus({ preventScroll: true }));
    });
  }
  const play = () => {
    played = true;
    grid.play();
  };
  $("[data-life-replay]").addEventListener("click", play);

  render();
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      if (!played) play();
    },
    { threshold: 0.35 },
  ).observe(canvas);
}

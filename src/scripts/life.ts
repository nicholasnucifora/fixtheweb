import { COUNTRIES, type CountryId } from "./life/data";
import { createGrid, type Stage } from "./life/grid";
import {
  AGE_MAX,
  AGE_MIN,
  PARTS,
  WORTH_DEFAULT,
  formatHours,
  formatYears,
  isNone,
  lifeOf,
  type Inputs,
  type Life,
  type Sex,
} from "./life/model";

/**
 * Your Life on Screens (src/pages/life.astro): the inputs (age, country, whose life table, screen time and
 * how much of it is worth it), and everything on the page that follows them: the weeks grid (life/grid.ts),
 * the warning pack, a day's split, whole lives at other ages, and the phone report mockup. The inputs are
 * remembered in this browser.
 */

const STORE = "ftw-life";
/** The ages whose whole lives are compared further down (the page has a row for each). */
export const AGES = [15, 25, 45, 70];
/** The screen time slider's top end, in hours a day. */
export const SCREENS_MAX = 16;

const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector)!;
const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [...root.querySelectorAll<T>(selector)];
const one = (years: number) => years.toFixed(1);
const clampAge = (age: number) => Math.min(AGE_MAX, Math.max(AGE_MIN, Math.round(age)));

/** Where smartphones came into someone's life: "You were 18 when the first iPhone went on sale, …". */
export function eraText({ inputs: { age }, withSmartphones }: Life) {
  if (withSmartphones >= age) return "The first iPhone went on sale before you were born: you've never lived without smartphones.";
  // Rounded the same way as the whole lives further down, so the two add up to your age.
  const before = Math.round(age - withSmartphones);
  return `You were ${before} when the first iPhone went on sale, so ${age - before} of your ${age} years have had smartphones in them.`;
}

/** A whole life as a bar: lived before and with smartphones, then the rest of it off and on screens. */
export function lifeline(life: Life) {
  const { inputs, end, left, years, withSmartphones } = life;
  const born = new Date().getFullYear() - inputs.age;
  const before = inputs.age - withSmartphones;
  return {
    age: inputs.age,
    end,
    segments: [
      { id: "before", years: before },
      { id: "since", years: withSmartphones },
      { id: "rest", years: left - years.screens },
      { id: "screens", years: years.screens },
    ],
    stats:
      `Born ${born}. ` +
      (isNone(before) ? "Never without smartphones. " : `${Math.round(before)} years before smartphones. `) +
      `Screens will take ${one(years.screens)} of the ${one(left)} years left.`,
  };
}

/** First visit: guess the country from the browser's language (nothing leaves the browser), else Australia. */
function firstInputs(): Inputs {
  const region = navigator.language.split("-")[1]?.toUpperCase();
  const country: CountryId = region === "US" ? "us" : region === "GB" ? "uk" : "au";
  return { age: 25, country, sex: "everyone", screens: null, worth: WORTH_DEFAULT };
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
      worth: typeof saved.worth === "number" ? Math.min(1, Math.max(0, saved.worth)) : fallback.worth,
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
  const worthInput = $<HTMLInputElement>("[data-life-worth]");
  const counter = $("[data-life-counter]");
  const narration = $("[data-life-narration]");
  const canvas = $<HTMLCanvasElement>("[data-life-grid]");
  let inputs = load();
  let life = lifeOf(inputs);
  /** Whether the grid's been played yet: until then it shows the rest of life whole, waiting to be carved up. */
  let played = false;

  const text = (selector: string, value: string, within: ParentNode = document) =>
    $$(selector, within).forEach((el) => (el.textContent = value));
  const pressed = (selector: string, attribute: string, value: string) =>
    $$(selector).forEach((button) => button.setAttribute("aria-pressed", String(button.getAttribute(attribute) === value)));

  /** The big number and the line under it, as far as the grid has carved the rest of life up. */
  const narrate = (stage: Stage, progress: number) => {
    const { years, left, spill, worth } = life;
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
      screens:
        `Screens take ${formatYears(years.screens)}` +
        (isNone(spill) ? "" : `, ${one(spill)} of them out of meals and chores`) +
        `. ${one(worth)} of them worth it.`,
      done: isNone(years.free)
        ? "That leaves no free time away from a screen at all."
        : `That leaves ${formatYears(years.free)} of free time away from a screen.`,
    };
    if (narration.textContent !== lines[stage]) narration.textContent = lines[stage];
  };

  const grid = createGrid(canvas, { onFrame: narrate });

  const render = () => {
    life = lifeOf(inputs);
    const { age, country, sex, screens, worth } = inputs;
    const { years, left, end, spill, today } = life;
    const { average } = today;
    const daily = screens ?? average.hours;
    root.dataset.mode = screens === null ? "average" : "own";
    root.dataset.average = average.teen ? "teen" : "adult";
    root.toggleAttribute("data-none", isNone(years.free));

    // The inputs.
    ageInput.value = String(age);
    text("[data-life-age-out]", String(age));
    pressed("[data-life-country]", "data-life-country", country);
    pressed("[data-life-sex]", "data-life-sex", sex);
    screensInput.value = String(daily);
    screensInput.setAttribute("aria-valuetext", `${formatHours(daily)} a day`);
    text("[data-life-screens-out]", formatHours(daily));
    text("[data-life-devices]", formatHours(average.devices));
    text("[data-life-tv]", formatHours(average.tv));
    worthInput.value = String(Math.round(worth * 100));
    text("[data-life-worth-out]", `${Math.round(worth * 100)}%`);

    // The label: years left, what takes them, and the grid.
    text("[data-life-left]", one(left));
    text("[data-life-end]", one(end));
    text("[data-life-country-name]", COUNTRIES[country].name);
    text("[data-life-who]", sex === "female" ? "a woman" : sex === "male" ? "a man" : "someone");
    text("[data-life-era]", eraText(life));
    for (const part of PARTS) text(`[data-life-years="${part}"]`, one(years[part]));
    text("[data-life-worth-years]", one(life.worth));
    const spillNote = $("[data-life-spill]");
    spillNote.hidden = isNone(spill);
    spillNote.textContent = `There isn't enough free time for all that screen time, so ${formatYears(spill)} of it comes out of meals, chores and errands.`;
    canvas.setAttribute(
      "aria-label",
      `Your life in weeks: ${age} years already lived, ${Math.round(life.withSmartphones)} of them since the first iPhone, ` +
        `then ${one(left)} left. Sleep takes ${one(years.sleep)} years, work and study ${one(years.work)}, ` +
        `upkeep ${one(years.upkeep)}, screens ${one(years.screens)} (${one(life.worth)} of them worth it), ` +
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
    // Screen time that doesn't fit in free time, and (with a big enough number) not even in upkeep.
    const overflow = $("[data-life-overflow]");
    overflow.hidden = today.spill < 1 / 60;
    overflow.textContent =
      `${formatHours(daily)} on screens is more than the ${formatHours(today.freeTime)} of free time people your age have, ` +
      `so ${formatHours(today.spill)} of it comes out of meals, chores and errands.` +
      (today.overflow >= 1 / 60
        ? ` The other ${formatHours(today.overflow)} would have to come out of sleep, work or school, which we don't count.`
        : "");

    // The warning, and the phone's report.
    text("[data-life-screen-years]", one(years.screens));
    text("[data-life-free-years]", isNone(years.free) ? "none" : `${one(years.free)} years`);
    text("[data-life-day-screens]", formatHours(daily));

    // Whole lives at other ages, living the same way: the average for each age, or with your screen time.
    const lines = AGES.map((at) => lifeline(lifeOf({ ...inputs, age: at })));
    const oldest = Math.max(...lines.map((line) => line.end));
    $$("[data-life-age-row]").forEach((row, i) => {
      const line = lines[i];
      row.toggleAttribute("data-current", line.age === age);
      $(".ages-bar", row).style.width = `${(line.end / oldest) * 100}%`;
      for (const segment of line.segments) $(`[data-seg="${segment.id}"]`, row).style.flexGrow = String(segment.years);
      text("[data-life-age-stats]", line.stats, row);
    });
    text(
      "[data-life-ages-how]",
      screens === null ? "at the average for each age" : `with ${formatHours(screens)} a day on screens`,
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
  // Moving the slider is putting in your own; the button goes back to following the average.
  screensInput.addEventListener("input", () => change({ screens: Number(screensInput.value) }));
  $("[data-life-use-average]").addEventListener("click", () => {
    change({ screens: null });
    screensInput.focus();
  });
  worthInput.addEventListener("input", () => change({ worth: Number(worthInput.value) / 100 }));
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

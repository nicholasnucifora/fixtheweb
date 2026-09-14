import { BANDS, COUNTRIES, GETTING_READY, SCREENS, SMARTPHONES, WORTH_IT, type CountryId } from "./data";

/**
 * What's left of a life: the years someone has left (their country's life table), split up by how people
 * spend an average day at each age from here on (the time use survey), with screen time carved out of it.
 * Used by the page (src/scripts/life.ts) and, for its figures, the home page.
 *
 * Screen time counts phones whether or not they were the main thing going on, so it comes out of free time
 * first, and whatever doesn't fit comes out of upkeep (a phone out at dinner still takes you out of dinner).
 * It never comes out of sleep, work or school.
 */

export type Sex = "female" | "male" | "everyone";

/** The parts a day (and so a life) is split into, in the order they're taken out of it. */
export const PARTS = ["sleep", "work", "upkeep", "screens", "free"] as const;
export type Part = (typeof PARTS)[number];
export type Split = Record<Part, number>;

export interface Inputs {
  age: number;
  country: CountryId;
  sex: Sex;
  /** Hours a day on screens outside work and school, kept for life; null follows the average for each age. */
  screens: number | null;
  /** The share of that screen time that's worth it (0 to 1): calls with people, learning, making things. */
  worth: number;
}

/** Where the worth-it share starts: teenagers' measured share (data.ts). */
export const WORTH_DEFAULT = WORTH_IT.minutes / WORTH_IT.of;

export const AGE_MIN = 13;
export const AGE_MAX = 90;

/** The average screen time at an age, and what it's made of. */
export interface AverageScreens {
  hours: number;
  /** Teenagers' figure covers every screen; adults' is devices plus TV. */
  teen: boolean;
  devices: number;
  tv: number;
}

export interface Day {
  /** Hours of each part: they add up to 24. Upkeep and free time are the parts of them away from screens. */
  hours: Split;
  /** Free time before screens take their share: leisure, sport, volunteering and religion. */
  freeTime: number;
  /** Screen time that didn't fit in free time, so came out of upkeep. */
  spill: number;
  /** Screen time that wouldn't even fit in free time and upkeep, so isn't counted. */
  overflow: number;
  average: AverageScreens;
}

export interface Life {
  inputs: Inputs;
  /** Years left, and the age that makes it to. */
  left: number;
  end: number;
  /** Years of the rest of it each part takes: they add up to `left`. */
  years: Split;
  /** Years of screen time that came out of upkeep. */
  spill: number;
  /** Years of the screen time that are worth it (part of `years.screens`). */
  worth: number;
  /** Years already lived since the first iPhone went on sale (the rest of `age` was before it). */
  withSmartphones: number;
  /** A day now. */
  today: Day;
}

const bandAt = (age: number) => BANDS.findLast((band) => age >= band.from) ?? BANDS[0];

/** The average screen time at `age`: teenagers' all-screens figure, or tracked devices plus TV. */
export function averageScreensAt(age: number): AverageScreens {
  if (age <= SCREENS.teens.to) return { hours: SCREENS.teens.hours, teen: true, devices: 0, tv: 0 };
  const devices = (SCREENS.devices.findLast((band) => age >= band.from) ?? SCREENS.devices[0]).hours;
  const { tv } = bandAt(age);
  return { hours: devices + tv, teen: false, devices, tv };
}

/** An average day at `age`, with `screens` hours on screens (or that age's average). */
export function dayAt(age: number, screens: number | null): Day {
  const band = bandAt(age);
  const sleep = band.personalCare - GETTING_READY;
  const work = band.working + band.education;
  const upkeep =
    GETTING_READY +
    band.eating +
    band.household +
    band.purchasing +
    band.caringHousehold +
    band.caringOthers +
    band.phoneMail +
    band.other;
  const freeTime = band.leisure + band.civic;
  const average = averageScreensAt(age);
  const wanted = screens ?? average.hours;
  const fromFree = Math.min(wanted, freeTime);
  const spill = Math.min(wanted - fromFree, upkeep);
  return {
    hours: { sleep, work, upkeep: upkeep - spill, screens: fromFree + spill, free: freeTime - fromFree },
    freeTime,
    spill,
    overflow: wanted - fromFree - spill,
    average,
  };
}

/** Years of someone's life so far that came after the first iPhone, as of `now`. */
export function yearsWithSmartphones(age: number, now = new Date()) {
  const year = now.getFullYear() + (now.getMonth() * 30.44 + now.getDate()) / 365.25;
  return Math.min(age, Math.max(0, year - SMARTPHONES.year));
}

/** Average years left for someone who's just turned `age`. "Everyone" is women's and men's averaged. */
export function yearsLeft(country: CountryId, sex: Sex, age: number) {
  const table = COUNTRIES[country];
  const at = Math.min(Math.max(Math.round(age), 0), table.male.length - 1);
  return sex === "everyone" ? (table.female[at] + table.male[at]) / 2 : table[sex][at];
}

/** The rest of a life, year by year to the average age someone like this reaches. */
export function lifeOf(inputs: Inputs): Life {
  const { age, country, sex, screens, worth } = inputs;
  const left = yearsLeft(country, sex, age);
  const end = age + left;
  const years: Split = { sleep: 0, work: 0, upkeep: 0, screens: 0, free: 0 };
  let spill = 0;
  for (let year = age; year < end; year++) {
    // The last year only counts for as much of it as there is.
    const share = Math.min(1, end - year) / 24;
    const day = dayAt(year, screens);
    for (const part of PARTS) years[part] += day.hours[part] * share;
    spill += day.spill * share;
  }
  return {
    inputs,
    left,
    end,
    years,
    spill,
    worth: years.screens * worth,
    withSmartphones: yearsWithSmartphones(age),
    today: dayAt(age, screens),
  };
}

/** Less than would show as 0.1 years. */
export const isNone = (years: number) => years < 0.05;

/** "7.8 years", "1 year". */
export const formatYears = (years: number, digits = 1) => {
  const text = years.toFixed(digits);
  return `${text} ${text === (1).toFixed(digits) ? "year" : "years"}`;
};

/** "3h 15m", "45m", "8h". */
export const formatHours = (hours: number) => {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
};

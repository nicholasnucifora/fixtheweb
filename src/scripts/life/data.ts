/**
 * The numbers behind Your Life on Screens (src/pages/life.astro), each tied to where it came from.
 * Everything the page shows is worked out from these (model.ts); SOURCES is the reference list it prints,
 * numbered in this order.
 */

export interface Source {
  /** What it's called, as its publisher titles it. */
  title: string;
  publisher: string;
  year: string;
  url: string;
  /** What we took from it. */
  used: string;
}

export const SOURCES = {
  abs: {
    title: "Life expectancy, 2022–2024 (life tables, Australia, Table 9)",
    publisher: "Australian Bureau of Statistics",
    year: "2025",
    url: "https://www.abs.gov.au/statistics/people/population/life-expectancy/2022-2024",
    used: "Years left at each age, for women and men in Australia.",
  },
  cdc: {
    title: "United States Life Tables, 2023 (National Vital Statistics Reports 74:6, Tables 2 and 3)",
    publisher: "CDC National Center for Health Statistics",
    year: "2025",
    url: "https://www.cdc.gov/nchs/data/nvsr/nvsr74/nvsr74-06.pdf",
    used: "Years left at each age, for women and men in the United States.",
  },
  ons: {
    title: "National life tables: United Kingdom, 2022–2024",
    publisher: "Office for National Statistics",
    year: "2025",
    url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/lifeexpectancies/datasets/nationallifetablesunitedkingdomreferencetables",
    used: "Years left at each age, for women and men in the United Kingdom.",
  },
  atus: {
    title: "American Time Use Survey, 2025 results: Table 3 (primary activities by age) and Table 11A (leisure and sports by age)",
    publisher: "US Bureau of Labor Statistics",
    year: "2026",
    url: "https://www.bls.gov/news.release/atus.toc.htm",
    used: "How people of each age spend an average day: sleep, work, school, chores, free time, and how much of it is TV.",
  },
  atusDetail: {
    title: "American Time Use Survey, 2025: Table A-1 (detailed primary activities)",
    publisher: "US Bureau of Labor Statistics",
    year: "2026",
    url: "https://www.bls.gov/tus/tables/a1-2025.pdf",
    used: "Time spent sleeping versus getting ready, and the share of free time spent on TV, games and computers.",
  },
  ofcom: {
    title: "Online Nation 2025",
    publisher: "Ofcom",
    year: "2025",
    url: "https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/online-research/online-nation/2025/online-nations-report-2025.pdf",
    used: "Time adults spend on phones, tablets and computers outside work, tracked on their own devices rather than guessed (Ipsos iris panel, May 2025), and the share of it on a smartphone.",
  },
  commonSense: {
    title: "The Common Sense Census: Media Use by Tweens and Teens, 2021",
    publisher: "Common Sense Media",
    year: "2022",
    url: "https://www.commonsensemedia.org/sites/default/files/research/report/8-18-census-integrated-report-final-web_0.pdf",
    used: "Teenagers' daily time on every kind of screen outside school and homework, and how much of it goes on making things.",
  },
  pir: {
    title: "Post-Implementation Review: Tobacco Plain Packaging",
    publisher: "Australian Government Department of Health",
    year: "2016",
    url: "https://oia.pmc.gov.au/sites/default/files/posts/2016/02/Tobacco-Plain-Packaging-PIR.pdf",
    used: "How much plain packs and bigger graphic warnings cut smoking in Australia.",
  },
  gfk: {
    title: "Market Research to Determine Effective Plain Packaging of Tobacco Products",
    publisher: "GfK Bluemoon, for the Australian Government",
    year: "2011",
    url: "https://www.health.gov.au/resources/collections/market-research-reports-on-tobacco-plain-packaging-and-graphic-health-warnings",
    used: "Why plain packs are Pantone 448 C.",
  },
  parry: {
    title: "A systematic review and meta-analysis of discrepancies between logged and self-reported digital media use (Nature Human Behaviour 5, 1535–1547)",
    publisher: "Parry, Davidson, Sewall, Fisher, Mieczkowski and Quintana",
    year: "2021",
    url: "https://www.nature.com/articles/s41562-021-01117-5",
    used: "How rarely people's own estimates of their screen time match what their devices logged.",
  },
  apple: {
    title: "iPhone Premieres This Friday Night at Apple Retail Stores",
    publisher: "Apple",
    year: "2007",
    url: "https://www.apple.com/newsroom/2007/06/28iPhone-Premieres-This-Friday-Night-at-Apple-Retail-Stores/",
    used: "When the first iPhone went on sale: 29 June 2007.",
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** Footnote number for a source: its place in SOURCES. */
export const sourceNumber = (id: SourceId) => Object.keys(SOURCES).indexOf(id) + 1;

/**
 * Remaining life expectancy (ex): the average years left for someone who's just turned each age, from
 * 0 to 100, in each country's latest period life table.
 */
export const COUNTRIES = {
  au: {
    label: "Australia",
    short: "Australia",
    name: "Australia",
    source: "abs",
    female: [
      85.1, 84.36, 83.38, 82.39, 81.4, 80.41, 79.41, 78.42, 77.42, 76.43, 75.43, 74.44, 73.44, 72.45, 71.45,
      70.46, 69.47, 68.48, 67.49, 66.5, 65.52, 64.53, 63.55, 62.56, 61.58, 60.59, 59.61, 58.63, 57.64, 56.66,
      55.68, 54.7, 53.72, 52.74, 51.76, 50.78, 49.8, 48.83, 47.85, 46.88, 45.91, 44.94, 43.98, 43.01, 42.05,
      41.1, 40.14, 39.19, 38.24, 37.3, 36.36, 35.42, 34.48, 33.55, 32.63, 31.71, 30.79, 29.87, 28.96, 28.06,
      27.15, 26.26, 25.36, 24.47, 23.59, 22.72, 21.85, 20.99, 20.13, 19.28, 18.44, 17.6, 16.78, 15.96, 15.15,
      14.36, 13.58, 12.82, 12.07, 11.34, 10.64, 9.95, 9.28, 8.64, 8.03, 7.43, 6.87, 6.34, 5.83, 5.36, 4.92,
      4.52, 4.15, 3.82, 3.54, 3.3, 3.08, 2.89, 2.72, 2.56, 2.43,
    ],
    male: [
      81.06, 80.35, 79.37, 78.38, 77.39, 76.4, 75.41, 74.41, 73.42, 72.42, 71.43, 70.44, 69.44, 68.45, 67.45,
      66.47, 65.48, 64.5, 63.52, 62.55, 61.58, 60.61, 59.65, 58.68, 57.71, 56.75, 55.78, 54.82, 53.85, 52.89,
      51.93, 50.96, 50, 49.04, 48.08, 47.12, 46.16, 45.21, 44.25, 43.3, 42.35, 41.41, 40.47, 39.53, 38.59,
      37.66, 36.74, 35.81, 34.89, 33.97, 33.06, 32.15, 31.25, 30.36, 29.46, 28.58, 27.7, 26.83, 25.96, 25.1,
      24.25, 23.4, 22.57, 21.74, 20.92, 20.1, 19.3, 18.5, 17.72, 16.94, 16.17, 15.41, 14.66, 13.93, 13.2,
      12.49, 11.79, 11.11, 10.45, 9.81, 9.19, 8.59, 8.01, 7.45, 6.92, 6.41, 5.93, 5.48, 5.06, 4.66, 4.3,
      3.97, 3.68, 3.42, 3.18, 2.99, 2.81, 2.65, 2.51, 2.38, 2.26,
    ],
  },
  us: {
    label: "United States",
    short: "US",
    name: "the United States",
    source: "cdc",
    female: [
      81.08, 80.5, 79.53, 78.55, 77.56, 76.57, 75.58, 74.59, 73.6, 72.61, 71.61, 70.62, 69.63, 68.64, 67.65,
      66.66, 65.68, 64.7, 63.72, 62.74, 61.77, 60.79, 59.82, 58.85, 57.89, 56.92, 55.95, 54.99, 54.03, 53.07,
      52.11, 51.16, 50.2, 49.26, 48.31, 47.36, 46.42, 45.48, 44.54, 43.6, 42.67, 41.74, 40.81, 39.89, 38.97,
      38.05, 37.13, 36.21, 35.3, 34.39, 33.49, 32.59, 31.69, 30.81, 29.92, 29.05, 28.18, 27.31, 26.46, 25.61,
      24.77, 23.95, 23.13, 22.31, 21.51, 20.71, 19.91, 19.13, 18.35, 17.58, 16.82, 16.06, 15.32, 14.58,
      13.86, 13.15, 12.46, 11.78, 11.12, 10.47, 9.85, 9.25, 8.66, 8.1, 7.56, 7.04, 6.54, 6.07, 5.63, 5.21,
      4.82, 4.46, 4.12, 3.81, 3.52, 3.26, 3.02, 2.8, 2.6, 2.42, 2.26,
    ],
    male: [
      75.82, 75.28, 74.31, 73.34, 72.35, 71.37, 70.38, 69.39, 68.4, 67.41, 66.41, 65.42, 64.43, 63.44, 62.45,
      61.48, 60.51, 59.55, 58.6, 57.66, 56.72, 55.78, 54.86, 53.93, 53.01, 52.09, 51.18, 50.26, 49.35, 48.44,
      47.54, 46.64, 45.74, 44.85, 43.96, 43.07, 42.18, 41.29, 40.4, 39.52, 38.64, 37.76, 36.88, 36.01, 35.14,
      34.27, 33.4, 32.53, 31.67, 30.81, 29.96, 29.11, 28.27, 27.44, 26.61, 25.8, 24.99, 24.19, 23.4, 22.63,
      21.87, 21.11, 20.37, 19.64, 18.91, 18.19, 17.49, 16.79, 16.1, 15.42, 14.74, 14.07, 13.41, 12.76, 12.11,
      11.48, 10.86, 10.25, 9.66, 9.09, 8.53, 7.99, 7.48, 6.99, 6.52, 6.06, 5.62, 5.21, 4.83, 4.47, 4.14,
      3.83, 3.54, 3.28, 3.05, 2.83, 2.63, 2.45, 2.29, 2.14, 2.01,
    ],
  },
  uk: {
    label: "United Kingdom",
    short: "UK",
    name: "the United Kingdom",
    source: "ons",
    female: [
      83.02, 82.32, 81.34, 80.35, 79.36, 78.36, 77.37, 76.37, 75.38, 74.38, 73.39, 72.39, 71.4, 70.4, 69.41,
      68.42, 67.42, 66.43, 65.44, 64.46, 63.47, 62.48, 61.5, 60.51, 59.52, 58.54, 57.55, 56.57, 55.58, 54.6,
      53.62, 52.64, 51.66, 50.68, 49.71, 48.73, 47.76, 46.79, 45.83, 44.86, 43.9, 42.94, 41.99, 41.04, 40.09,
      39.14, 38.19, 37.25, 36.32, 35.39, 34.46, 33.54, 32.62, 31.71, 30.8, 29.89, 28.99, 28.1, 27.21, 26.33,
      25.45, 24.57, 23.7, 22.85, 22, 21.16, 20.32, 19.5, 18.69, 17.89, 17.09, 16.31, 15.53, 14.76, 14.01,
      13.27, 12.54, 11.83, 11.14, 10.46, 9.81, 9.18, 8.57, 7.99, 7.43, 6.9, 6.39, 5.9, 5.45, 5.02, 4.61,
      4.25, 3.92, 3.63, 3.35, 3.1, 2.86, 2.65, 2.45, 2.28, 2.11,
    ],
    male: [
      79.12, 78.49, 77.51, 76.52, 75.53, 74.54, 73.54, 72.55, 71.56, 70.56, 69.57, 68.57, 67.58, 66.58,
      65.59, 64.6, 63.61, 62.63, 61.65, 60.67, 59.7, 58.73, 57.76, 56.79, 55.82, 54.85, 53.88, 52.91, 51.95,
      50.98, 50.02, 49.06, 48.1, 47.14, 46.18, 45.23, 44.28, 43.33, 42.39, 41.45, 40.51, 39.58, 38.65, 37.72,
      36.8, 35.88, 34.96, 34.05, 33.15, 32.25, 31.36, 30.47, 29.59, 28.72, 27.85, 26.98, 26.12, 25.27, 24.43,
      23.59, 22.76, 21.93, 21.12, 20.31, 19.51, 18.73, 17.95, 17.18, 16.43, 15.7, 14.97, 14.26, 13.56, 12.88,
      12.2, 11.53, 10.88, 10.24, 9.62, 9.02, 8.44, 7.88, 7.35, 6.85, 6.37, 5.9, 5.46, 5.05, 4.66, 4.3, 3.96,
      3.66, 3.37, 3.11, 2.87, 2.66, 2.46, 2.27, 2.12, 1.95, 1.79,
    ],
  },
} satisfies Record<
  string,
  {
    label: string;
    /** On its button. */
    short: string;
    /** In a sentence: "someone your age in the United States". */
    name: string;
    source: SourceId;
    female: number[];
    male: number[];
  }
>;

export type CountryId = keyof typeof COUNTRIES;

/**
 * An average day at each age, in hours: everyone that age, over every day of the year (weekends,
 * holidays, working or not, in school or not), so a lifetime is just these added up year by year.
 * American Time Use Survey 2025, Table 3 (and Table 11A for TV). It only surveys
 * people 15 and over; the first band stands in for younger ages. Each band's activities add up to 24.
 */
export interface Band {
  /** First age in the band. */
  from: number;
  /** Sleeping, grooming and health self-care. */
  personalCare: number;
  eating: number;
  household: number;
  purchasing: number;
  caringHousehold: number;
  caringOthers: number;
  /** Working and work-related, including getting there. */
  working: number;
  education: number;
  /** Volunteering, religious and civic activities. */
  civic: number;
  /** Leisure and sports, including the TV and games below. */
  leisure: number;
  phoneMail: number;
  other: number;
  /** Watching TV, as a main activity (part of leisure). */
  tv: number;
}

// prettier-ignore
export const BANDS: Band[] = [
  { from: 15, personalCare: 10.93, eating: 1.18, household: 0.71, purchasing: 0.38, caringHousehold: 0.07, caringOthers: 0.06, working: 0.71, education: 3.45, civic: 0.51, leisure: 5.66, phoneMail: 0.18, other: 0.16, tv: 1.48 },
  { from: 20, personalCare: 10.44, eating: 1.13, household: 1.37, purchasing: 0.62, caringHousehold: 0.41, caringOthers: 0.07, working: 3.85, education: 0.88, civic: 0.19, leisure: 4.67, phoneMail: 0.17, other: 0.21, tv: 2.07 },
  { from: 25, personalCare: 9.82, eating: 1.13, household: 1.58, purchasing: 0.59, caringHousehold: 0.79, caringOthers: 0.04, working: 4.58, education: 0.42, civic: 0.13, leisure: 4.5, phoneMail: 0.11, other: 0.29, tv: 1.89 },
  { from: 35, personalCare: 9.4, eating: 1.16, household: 1.98, purchasing: 0.72, caringHousehold: 1.23, caringOthers: 0.09, working: 4.83, education: 0.09, civic: 0.17, leisure: 3.89, phoneMail: 0.12, other: 0.32, tv: 1.76 },
  { from: 45, personalCare: 9.49, eating: 1.22, household: 2.18, purchasing: 0.66, caringHousehold: 0.51, caringOthers: 0.27, working: 4.7, education: 0.03, civic: 0.25, leisure: 4.3, phoneMail: 0.17, other: 0.23, tv: 2.26 },
  { from: 55, personalCare: 9.67, eating: 1.19, household: 2.18, purchasing: 0.75, caringHousehold: 0.16, caringOthers: 0.24, working: 3.83, education: 0.04, civic: 0.28, leisure: 5.21, phoneMail: 0.19, other: 0.26, tv: 3.06 },
  { from: 65, personalCare: 9.63, eating: 1.27, household: 2.74, purchasing: 0.88, caringHousehold: 0.13, caringOthers: 0.25, working: 1.14, education: 0.03, civic: 0.46, leisure: 6.9, phoneMail: 0.31, other: 0.28, tv: 4.2 },
  { from: 75, personalCare: 9.87, eating: 1.49, household: 2.73, purchasing: 0.82, caringHousehold: 0.09, caringOthers: 0.14, working: 0.26, education: 0, civic: 0.42, leisure: 7.39, phoneMail: 0.41, other: 0.37, tv: 4.43 },
];

/**
 * The part of personal care that isn't sleep (grooming, health self-care): 9.80 hours of personal care
 * less 9.03 of sleeping, across everyone 15 and over (Table A-1). The survey doesn't split sleep out by
 * age, so each age's sleep is its personal care less this.
 */
export const GETTING_READY = 0.77;

/**
 * Screen time, counted the way it's lived: phones included, whether or not they were the main thing
 * someone was doing. Time use surveys only record the main activity, so a phone out at dinner, on the
 * couch or in bed goes missing; these are tracked on people's own devices instead. Hours a day.
 */
export const SCREENS = {
  /**
   * 13 to 17: every screen (TV, video, gaming, social media, browsing, video calls) outside school and
   * homework, 8h 39m for 13 to 18 year olds. Already includes TV.
   */
  teens: { to: 17, hours: 519 / 60, source: "commonSense" },
  /**
   * Adults: online on phones, tablets and computers outside work, tracked (not counting TV sets or
   * consoles). Ofcom publishes 6h 20m at 18 to 24, 3h 20m at 65 and over, and 4h 30m for adults overall,
   * which stands in from 25 to 64. TV is added on top, from the time use band for that age.
   */
  devices: [
    { from: 18, hours: 380 / 60 },
    { from: 25, hours: 270 / 60 },
    { from: 65, hours: 200 / 60 },
  ],
  devicesSource: "ofcom",
} as const satisfies {
  teens: { to: number; hours: number; source: SourceId };
  devices: readonly { from: number; hours: number }[];
  devicesSource: SourceId;
};

/**
 * The share of screen time that's worth it, to start from: US teenagers' video calls (20 minutes a day),
 * e-reading (15) and making things (14), out of their 8h 39m (Common Sense, Table 2). Nobody has measured
 * the same for adults, so it's the starting point for everyone, and people can move it.
 */
export const WORTH_IT = { minutes: 49, of: 519, source: "commonSense" } as const satisfies {
  minutes: number;
  of: number;
  source: SourceId;
};

/** When the first iPhone went on sale (29 June 2007), as a year with a fraction: where smartphones start in a life. */
export const SMARTPHONES = { year: 2007 + 179 / 365, source: "apple" } as const satisfies { year: number; source: SourceId };

/** How far off people's own screen time estimates are, for the page's note about judging it honestly. */
export const SELF_REPORT = { source: "parry" } as const satisfies { source: SourceId };

/** Other figures the page quotes. */
export const MEASURED = {
  /**
   * Even counting only main activities, TV (2.61 hours) and games and computers (0.40 + 0.22) are
   * 3.23 of everyone's 5.16 hours of leisure a day. Table A-1.
   */
  freeTimeOnScreens: { screens: 3.23, leisure: 5.16, source: "atusDetail" },
  /** UK adults online outside work, tracked on their own devices, May 2025, and the share of it on a smartphone. */
  ukAdults: { minutes: 270, smartphone: 77, source: "ofcom" },
  /** US 13 to 18 year olds' screens outside school and homework, 2021. */
  usTeens: { minutes: 519, source: "commonSense" },
} as const;

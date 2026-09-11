/**
 * Every tunable for the hanging string + spider, with the range and
 * explanation the tuning panel shows for it (open the page with ?tune).
 *
 * `value` is the default. Units: b = the rendered height of the letter the
 * string hangs from, so everything scales with the logo; s = seconds.
 *
 * Code reads the plain `config` object at the bottom, live, every frame;
 * the panel edits it in place. A param added here shows up in the panel
 * automatically.
 */

export interface NumberParam {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  label: string;
  info: string;
}
export interface ToggleParam {
  value: boolean;
  label: string;
  info: string;
}
export interface ChoiceParam {
  value: string;
  /** value → label */
  options: Record<string, string>;
  label: string;
  info: string;
}
export type Param = NumberParam | ToggleParam | ChoiceParam;
export interface Section {
  label: string;
  info: string;
  params: Record<string, Param>;
}

export const schema = {
  anchor: {
    label: "Attach point",
    info: "Where the string meets the b.",
    params: {
      offsetX: {
        value: 0, min: -0.5, max: 0.5, step: 0.005, unit: "b",
        label: "Sideways nudge",
        info: "Shifts the attach point left (−) or right (+) of the b's lowest point.",
      },
      offsetY: {
        value: -0.03, min: -0.3, max: 0.2, step: 0.005, unit: "b",
        label: "Vertical nudge",
        info: "Negative tucks the string up inside the letter so there's no visible seam; positive leaves a gap.",
      },
      snapDistance: {
        value: 0.4, min: 0.05, max: 3, step: 0.05, unit: "b",
        label: "Snap distance",
        info: "If the logo jumps further than this in one frame (page load, resize), the string is carried along instead of being flung.",
      },
    },
  },

  rope: {
    label: "String",
    info: "How the string itself looks and moves.",
    params: {
      length: {
        value: 1.8, min: 0.3, max: 5, step: 0.05, unit: "b",
        label: "Length",
        info: "How far the spider hangs below the b. Longer also means slower swings.",
      },
      segments: {
        value: 24, min: 3, max: 80, step: 1,
        label: "Segments",
        info: "Links in the string. More = smoother, bendier curves; fewer = stiff, visibly straight pieces.",
      },
      thickness: {
        value: 0.016, min: 0.004, max: 0.08, step: 0.001, unit: "b",
        label: "Thickness",
        info: "Line width of the string (never thinner than 1px).",
      },
      mass: {
        value: 0.2, min: 0.01, max: 3, step: 0.01, unit: "×",
        label: "Weight",
        info: "Weight of the whole string relative to the spider (1). Light = the spider leads and the string follows; heavy = moves more like a chain.",
      },
      gravity: {
        value: 28, min: 2, max: 120, step: 1, unit: "b/s²",
        label: "Gravity",
        info: "Downward pull. Higher = faster, snappier swings; lower = floaty, moon-like.",
      },
      drag: {
        value: 2.5, min: 0, max: 20, step: 0.1, unit: "/s",
        label: "Air drag",
        info: "Damping on the string. Higher = the string lags behind the spider and bows into curves; 0 = whippy.",
      },
      stiffness: {
        value: 1, min: 0.05, max: 1, step: 0.01,
        label: "Stiffness",
        info: "How firmly each link holds its length. Lower = springy, elastic, wobbly string.",
      },
      maxStretch: {
        value: 0, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Max stretch",
        info: "How far the string may stretch past its length (0.2 = 20% longer). 0 = it never stretches. Pair with low stiffness for a bungee feel.",
      },
      iterations: {
        value: 10, min: 1, max: 40, step: 1,
        label: "Solver passes",
        info: "Constraint passes per physics step. Higher = holds its shape more precisely; lower = saggier and cheaper.",
      },
    },
  },

  bob: {
    label: "Spider",
    info: "The weight on the end (a placeholder circle for now).",
    params: {
      radius: {
        value: 0.1, min: 0.02, max: 0.4, step: 0.005, unit: "b",
        label: "Size",
        info: "Radius of the spider.",
      },
      drag: {
        value: 0.7, min: 0, max: 5, step: 0.05, unit: "/s",
        label: "Air drag",
        info: "Damping on the spider. Lower = swings for longer before settling; higher = settles quickly.",
      },
      hitArea: {
        value: 0.35, min: 0, max: 1.5, step: 0.05, unit: "×",
        label: "Grab area",
        info: "Extra invisible area around the spider that still grabs it, as a fraction of its size.",
      },
    },
  },

  sway: {
    label: "Breeze",
    info: "Idle movement so the string never looks frozen. Off for people who ask for reduced motion.",
    params: {
      strength: {
        value: 0.7, min: 0, max: 8, step: 0.05, unit: "b/s²",
        label: "Strength",
        info: "Sideways push of the breeze. 0 = perfectly still at rest.",
      },
      speed: {
        value: 0.22, min: 0, max: 2, step: 0.01, unit: "/s",
        label: "Gust speed",
        info: "Roughly how many gusts per second.",
      },
      ripple: {
        value: 1, min: 0, max: 4, step: 0.05,
        label: "Ripple",
        info: "How much the breeze varies along the string. 0 = pushes it evenly; higher = S-curves travel down it.",
      },
    },
  },

  drag: {
    label: "Grabbing & dragging",
    info: "Holding the spider (or the string) and letting go.",
    params: {
      axis: {
        value: "x" as "x" | "free",
        options: { x: "Left/right (rides the pendulum arc)", free: "Free (follows the pointer)" },
        label: "Drag mode",
        info: "Left/right: the pointer only steers sideways and the spider rises along its swing. Free: it follows the pointer anywhere within reach, and the string goes slack if you push it up.",
      },
      maxAngle: {
        value: 70, min: 10, max: 90, step: 1, unit: "°",
        label: "Max swing angle",
        info: "Left/right mode only: furthest it can be pulled out from hanging straight down.",
      },
      reach: {
        value: 0.97, min: 0.5, max: 1, step: 0.01, unit: "×",
        label: "Reach",
        info: "How far out it can be pulled, as a fraction of string length. Below 1 leaves slack so the string sags while held.",
      },
      follow: {
        value: 22, min: 1, max: 80, step: 1, unit: "/s",
        label: "Follow tightness",
        info: "How tightly the held point tracks the pointer. Lower = floaty and laggy; higher = glued to the cursor.",
      },
      maxThrow: {
        value: 9, min: 0, max: 40, step: 0.5, unit: "b/s",
        label: "Max fling speed",
        info: "Cap on the speed it keeps when you let go mid-swipe. 0 = drops dead where you release it.",
      },
      grabString: {
        value: true,
        label: "Grab the string",
        info: "Press on the string itself to grab it at that point; the spider dangles below.",
      },
      stringHitWidth: {
        value: 0.06, min: 0.01, max: 0.3, step: 0.005, unit: "b",
        label: "String grab width",
        info: "How close to the string a press (or the grab cursor) counts as touching it.",
      },
    },
  },

  pluck: {
    label: "Pluck",
    info: "What happens when the pointer brushes across the string.",
    params: {
      enabled: {
        value: true,
        label: "Pluck on hover",
        info: "Crossing the string with the pointer plucks it.",
      },
      impulse: {
        value: 0.9, min: 0, max: 6, step: 0.05, unit: "b/s",
        label: "Kick",
        info: "How hard the string is nudged where you cross it. 0 = it doesn't move, only the dashes appear.",
      },
      radius: {
        value: 3, min: 0, max: 12, step: 1,
        label: "Kick spread",
        info: "String points either side of the crossing that feel the kick (fading out).",
      },
      speedInfluence: {
        value: 0, min: 0, max: 1, step: 0.05,
        label: "Swipe speed influence",
        info: "0 = every pluck is the same. 1 = fast swipes kick harder and throw dashes further, slow ones barely register.",
      },
      minSpeed: {
        value: 0, min: 0, max: 20, step: 0.25, unit: "b/s",
        label: "Min swipe speed",
        info: "Pointer movement slower than this won't pluck, so drifting across the string does nothing.",
      },
      cooldown: {
        value: 0.12, min: 0, max: 1, step: 0.01, unit: "s",
        label: "Cooldown",
        info: "Time before the same stretch of string can pluck again.",
      },
    },
  },

  particles: {
    label: "Pluck dashes",
    info: "The little lines that flick off the string on a pluck.",
    params: {
      count: {
        value: 4, min: 0, max: 20, step: 1,
        label: "Count",
        info: "Dashes per pluck.",
      },
      sides: {
        value: "both" as "both" | "swipe",
        options: { both: "Both sides of the string", swipe: "Only the side you swiped toward" },
        label: "Direction",
        info: "Which way the dashes fly off.",
      },
      spread: {
        value: 35, min: 0, max: 180, step: 1, unit: "°",
        label: "Spread",
        info: "Random angle either side of straight out from the string. 0 = all perfectly perpendicular.",
      },
      speedMin: {
        value: 1.4, min: 0, max: 10, step: 0.1, unit: "b/s",
        label: "Speed (min)",
        info: "Slowest launch speed; each dash picks a random speed between min and max.",
      },
      speedMax: {
        value: 2.6, min: 0, max: 10, step: 0.1, unit: "b/s",
        label: "Speed (max)",
        info: "Fastest launch speed.",
      },
      length: {
        value: 0.09, min: 0.01, max: 0.4, step: 0.005, unit: "b",
        label: "Length",
        info: "Length of each dash at launch.",
      },
      thickness: {
        value: 0.022, min: 0.004, max: 0.08, step: 0.001, unit: "b",
        label: "Thickness",
        info: "Line width of each dash (never thinner than 1px).",
      },
      life: {
        value: 0.32, min: 0.05, max: 2, step: 0.01, unit: "s",
        label: "Lifetime",
        info: "How long each dash lasts before it has fully faded.",
      },
      drag: {
        value: 7, min: 0, max: 30, step: 0.5, unit: "/s",
        label: "Slowdown",
        info: "How quickly dashes lose speed. High = they pop out and stop; 0 = they keep flying.",
      },
      gravity: {
        value: 0, min: -20, max: 40, step: 0.5, unit: "b/s²",
        label: "Gravity",
        info: "Pulls dashes down as they fly (negative floats them up).",
      },
      shrink: {
        value: 0.6, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Shrink",
        info: "How much each dash shortens as it fades. 0 = stays full length.",
      },
      gap: {
        value: 0.03, min: 0, max: 0.3, step: 0.005, unit: "b",
        label: "Start gap",
        info: "How far from the string the dashes start, so they read as flicking off it.",
      },
    },
  },

  sim: {
    label: "Simulation",
    info: "Engine settings. Mostly leave these alone.",
    params: {
      timeScale: {
        value: 1, min: 0.05, max: 2, step: 0.05, unit: "×",
        label: "Time scale",
        info: "Slow motion for tuning. 1 = real time.",
      },
      rate: {
        value: 240, min: 60, max: 960, step: 30, unit: "Hz",
        label: "Physics rate",
        info: "Physics steps per second. Higher = more stable and precise, more CPU.",
      },
      maxFrame: {
        value: 0.05, min: 0.016, max: 0.25, step: 0.002, unit: "s",
        label: "Max frame",
        info: "Longest gap simulated in one go, so a stutter or background tab doesn't jolt the string.",
      },
    },
  },

  debug: {
    label: "Debug",
    info: "Visual aids for tuning.",
    params: {
      showPoints: {
        value: false,
        label: "Show points",
        info: "Draws the string's points and the attach point.",
      },
    },
  },
} satisfies Record<string, Section>;

type Schema = typeof schema;
export type Config = {
  [S in keyof Schema]: { [K in keyof Schema[S]["params"]]: Schema[S]["params"][K]["value"] };
};

/** The live values the simulation reads. Starts at the defaults above. */
export const config = Object.fromEntries(
  Object.entries(schema).map(([section, { params }]) => [
    section,
    Object.fromEntries(Object.entries(params).map(([key, param]) => [key, param.value])),
  ]),
) as Config;

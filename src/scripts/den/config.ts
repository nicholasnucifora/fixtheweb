import type { Param } from "../spider-string/config";

/**
 * Every tunable that only the Spider Den has: its webs, how threads catch a flung spider, strings
 * snapping, what the spiders get up to, flies, and their lives (hunger, growing up, babies).
 *
 * How the spiders themselves move, look and feel (string physics, throwing, faces, legs, blinking…)
 * is shared with every other page and tuned there: config.ts, or the home page with ?tune. This
 * file's panel is the Spider Den with ?tune (/den?tune).
 *
 * Units: b is the den's own letter b, sized so a grown-up spider is as many of them wide as the home
 * page's spider is by default (Spidey → Spider width, 0.48 b), so the shared settings, which are all
 * in b, feel the same here. Tuning Spider width on the home page doesn't resize the den's spiders.
 * s = seconds, h = hours.
 */

export const groups = {
  web: {
    label: "Webs",
    info: "The webs filling the den, how they wobble, and how threads catch a spider you fling.",
  },
  spiders: {
    label: "Spiders",
    info: "What the spiders get up to on their own, and their strings: dangling, and snapping when you pull too hard.",
  },
  life: {
    label: "Life",
    info: "Hunger, growing up, babies and dying. Times are real time; speed life up to watch it happen.",
  },
  flies: {
    label: "Flies",
    info: "Flies that wander into the den and get stuck in the webs.",
  },
};

export interface Section {
  group: keyof typeof groups;
  label: string;
  info: string;
  params: Record<string, Param>;
}

export const schema = {
  // ── Webs ──────────────────────────────────────────────────────────────────

  world: {
    group: "web",
    label: "Size",
    info: "How big everything in the den is.",
    params: {
      spiderWidth: {
        value: 64, min: 24, max: 180, step: 1, unit: "px",
        label: "Grown-up spider",
        info: "How wide a grown-up spider is, legs and all. Everything else in the den (b) is measured from this.",
      },
      spiderWidthSmall: {
        value: 46, min: 20, max: 140, step: 1, unit: "px",
        label: "…on a phone",
        info: "The same, when the den is narrower than 700px.",
      },
      wrap: {
        value: true,
        label: "Wrap around the edges",
        info: "Off the bottom and it drops back in at the top; off one side and it comes back on the other. Off: it bounces off them.",
      },
    },
  },

  webs: {
    group: "web",
    label: "Layout",
    info: "Orb webs spread across the den, joined by bridge threads. Changing these rebuilds them.",
    params: {
      spacing: {
        value: 2.8, min: 1.2, max: 8, step: 0.1, unit: "b",
        label: "Space between webs",
        info: "Roughly how far apart the middles of neighbouring webs are.",
      },
      radius: {
        value: 0.46, min: 0.2, max: 0.8, step: 0.01, unit: "×",
        label: "Web size",
        info: "How far a web reaches, as a fraction of the space between webs.",
      },
      ringGap: {
        value: 0.12, min: 0.05, max: 0.5, step: 0.005, unit: "b",
        label: "Ring spacing",
        info: "The gap between the rings of the spiral. Closer rings catch things sooner.",
      },
      spokes: {
        value: 15, min: 6, max: 30, step: 1,
        label: "Spokes",
        info: "Threads running out from each web's middle (give or take a few).",
      },
      bridges: {
        value: 0.75, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Bridges",
        info: "How many neighbouring webs are joined by a thread, so spiders can walk between them.",
      },
      torn: {
        value: 0.04, min: 0, max: 0.5, step: 0.01, unit: "×",
        label: "Torn",
        info: "Share of ring threads that are missing, so the webs look lived in.",
      },
      thickness: {
        value: 1, min: 0.5, max: 3, step: 0.1, unit: "px",
        label: "Thread thickness",
        info: "",
      },
      opacity: {
        value: 0.3, min: 0.05, max: 1, step: 0.01,
        label: "Thread strength",
        info: "How strongly the threads show against the page.",
      },
    },
  },

  wobble: {
    group: "web",
    label: "Wobble",
    info: "Threads give when something lands on them, pulls off them or struggles in them, and the web ripples back.",
    params: {
      enabled: { value: true, label: "Webs wobble", info: "" },
      spring: {
        value: 2.6, min: 0.3, max: 10, step: 0.1, unit: "Hz",
        label: "Springiness",
        info: "How quickly a pushed thread springs back.",
      },
      damping: {
        value: 0.16, min: 0.01, max: 1, step: 0.01,
        label: "Settling",
        info: "How quickly the wobbling dies away. Low keeps it shivering.",
      },
      carry: {
        value: 0.6, min: 0, max: 2, step: 0.05, unit: "×",
        label: "Ripple",
        info: "How much a push spreads along the threads to the rest of the web.",
      },
      push: {
        value: 0.035, min: 0, max: 0.3, step: 0.005, unit: "×",
        label: "Push",
        info: "How far threads give when something hits them, for how fast it was going.",
      },
      reach: {
        value: 0.5, min: 0.05, max: 2, step: 0.05, unit: "b",
        label: "Push reach",
        info: "How far around a hit the threads are pushed.",
      },
    },
  },

  catching: {
    group: "web",
    label: "Catching a flung spider",
    info: "A spider you let go of flies until the threads stop it. Each thread it crosses slows it down, and once it's slow enough the next one catches it.",
    params: {
      grace: {
        value: 0.9, min: 0, max: 5, step: 0.05, unit: "b",
        label: "Free zone",
        info: "Threads this close to where you let it go don't touch it at all, so it can leave the web it was on. Past this, threads start to slow it.",
      },
      keep: {
        value: 0.78, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Speed kept per thread",
        info: "How much of its speed straight into a thread it keeps crossing it. Glancing along a thread slows it less.",
      },
      grip: {
        value: 0.35, min: 0, max: 5, step: 0.05, unit: "b/s",
        label: "Thread grip",
        info: "Speed every thread takes off on top, however fast it's going, so slow spiders stop quickly.",
      },
      catchSpeed: {
        value: 4, min: 0, max: 30, step: 0.1, unit: "b/s",
        label: "Caught below",
        info: "Crossing a thread slower than this, it grabs on.",
      },
      dropCatch: {
        value: 0.35, min: 0, max: 2, step: 0.05, unit: "b",
        label: "Put down within",
        info: "Let go gently this close to a thread and it takes hold of it, rather than dropping.",
      },
      dropSpeed: {
        value: 1.5, min: 0, max: 10, step: 0.1, unit: "b/s",
        label: "Gently is below",
        info: "How slowly it has to be moving when let go to count as putting it down.",
      },
    },
  },

  // ── Spiders ───────────────────────────────────────────────────────────────

  walking: {
    group: "spiders",
    label: "Walking",
    info: "Getting about on the threads.",
    params: {
      speed: {
        value: 0.75, min: 0.05, max: 4, step: 0.05, unit: "b/s",
        label: "Walking speed",
        info: "A grown-up's.",
      },
      babySpeed: {
        value: 1.3, min: 0.2, max: 3, step: 0.05, unit: "×",
        label: "Babies scurry",
        info: "A newborn's walking speed next to a grown-up's; they slow to a walk as they grow.",
      },
      steps: {
        value: 3.2, min: 0.5, max: 10, step: 0.1, unit: "/b",
        label: "Steps",
        info: "How many times the legs cycle for every b it walks.",
      },
      legs: {
        value: 16, min: 0, max: 45, step: 1, unit: "°",
        label: "Leg swing",
        info: "How far the legs swing as it walks.",
      },
      lean: {
        value: 16, min: 0, max: 60, step: 1, unit: "°",
        label: "Lean",
        info: "How far it leans the way it's walking.",
      },
      hungrySpeed: {
        value: 1.5, min: 1, max: 3, step: 0.05, unit: "×",
        label: "Hurrying to a fly",
        info: "Walking speed when it's off to eat something.",
      },
    },
  },

  habits: {
    group: "spiders",
    label: "Habits",
    info: "Every so often a spider decides what to do next. These are how likely each thing is, next to each other.",
    params: {
      restFrom: { value: 2, min: 0, max: 30, step: 0.5, unit: "s", label: "Sits for, from", info: "" },
      restTo: { value: 7, min: 0, max: 60, step: 0.5, unit: "s", label: "…to", info: "" },
      wander: { value: 5, min: 0, max: 10, step: 0.5, label: "Wander", info: "Walk somewhere nearby." },
      hub: { value: 1.5, min: 0, max: 10, step: 0.5, label: "Sit in the middle", info: "Walk to the middle of its web and sit." },
      dangle: { value: 1.5, min: 0, max: 10, step: 0.5, label: "Dangle", info: "Let itself down on a string for a while." },
      jump: { value: 1.2, min: 0, max: 10, step: 0.5, label: "Jump", info: "Leap across to another web." },
      nap: { value: 0.6, min: 0, max: 10, step: 0.5, label: "Nap", info: "Nod off where it is." },
      family: {
        value: 3, min: 0, max: 10, step: 0.5,
        label: "Babies stay close",
        info: "For babies, instead of wandering: head back toward whoever laid them.",
      },
      wanderFar: {
        value: 2.5, min: 0.3, max: 10, step: 0.1, unit: "b",
        label: "Wanders up to",
        info: "How far away somewhere to wander to can be.",
      },
      napFrom: { value: 8, min: 1, max: 120, step: 1, unit: "s", label: "Naps for, from", info: "" },
      napTo: { value: 25, min: 1, max: 300, step: 1, unit: "s", label: "…to", info: "" },
      wakeRadius: {
        value: 0.6, min: 0, max: 5, step: 0.05, unit: "b",
        label: "Woken by the cursor within",
        info: "A napping spider wakes when the cursor comes this close.",
      },
    },
  },

  dangling: {
    group: "spiders",
    label: "Dangling",
    info: "A spider lets itself down from where it is on a thread of its own, hangs about, then climbs back up. Hanging, it's on a string like the one on the home page (so those settings apply), and you can pull it about.",
    params: {
      lengthFrom: { value: 0.6, min: 0.1, max: 5, step: 0.05, unit: "b", label: "String length, from", info: "" },
      lengthTo: { value: 1.8, min: 0.1, max: 8, step: 0.05, unit: "b", label: "…to", info: "" },
      forFrom: { value: 6, min: 0.5, max: 60, step: 0.5, unit: "s", label: "Hangs for, from", info: "" },
      forTo: { value: 16, min: 0.5, max: 120, step: 0.5, unit: "s", label: "…to", info: "" },
      down: {
        value: 0.8, min: 0.05, max: 5, step: 0.05, unit: "b/s",
        label: "Letting itself down",
        info: "How quickly it pays out the string.",
      },
      up: {
        value: 0.5, min: 0.05, max: 5, step: 0.05, unit: "b/s",
        label: "Climbing back up",
        info: "",
      },
      segments: {
        value: 12, min: 3, max: 30, step: 1,
        label: "String points",
        info: "Points along a dangling spider's string. More bends more smoothly.",
      },
    },
  },

  snapping: {
    group: "spiders",
    label: "Snapping strings",
    info: "Pull a dangling spider far enough past its string's reach and let go, and the string snaps: it goes flying, and the rest of the string drops away.",
    params: {
      breakAt: {
        value: 0.7, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Snaps when let go past",
        info: "How far through the string's wind-up (Wind-up → Give, on the home page) you have to have pulled it. 1 = only right at the end.",
      },
      whileHeld: {
        value: false,
        label: "Snaps while you're still holding it",
        info: "Keep it pulled right out for a moment and the string gives, leaving the spider in your hand.",
      },
      holdFor: {
        value: 0.8, min: 0.05, max: 5, step: 0.05, unit: "s",
        label: "…after holding it out for",
        info: "How long it has to be wound right up (past 95%).",
      },
      boost: {
        value: 1.35, min: 0.2, max: 3, step: 0.05, unit: "×",
        label: "Launch",
        info: "Its speed when the string snaps, next to what the wound-up string was already giving it.",
      },
      fade: {
        value: 1.2, min: 0.1, max: 5, step: 0.1, unit: "s",
        label: "Broken end fades over",
        info: "How long the snapped-off string hangs from the web before it's gone.",
      },
    },
  },

  jumping: {
    group: "spiders",
    label: "Jumping",
    info: "Leaping to a thread on another web, trailing a line of silk. Jumps sail through anything in the way.",
    params: {
      rangeFrom: { value: 1, min: 0.2, max: 8, step: 0.1, unit: "b", label: "Distance, from", info: "" },
      rangeTo: { value: 3.2, min: 0.2, max: 12, step: 0.1, unit: "b", label: "…to", info: "" },
      time: {
        value: 0.3, min: 0.05, max: 2, step: 0.01, unit: "s/b",
        label: "Air time",
        info: "Seconds in the air for every b it covers (at least a third of a second).",
      },
      silk: {
        value: 1, min: 0, max: 5, step: 0.1, unit: "s",
        label: "Silk line fades over",
        info: "0 = no line.",
      },
    },
  },

  marks: {
    group: "spiders",
    label: "Marks",
    info: "How the den shows which spider is which.",
    params: {
      mainGlow: { value: true, label: "Glow around the main spider", info: "The one worn all over the site." },
      names: {
        value: "hover",
        options: { always: "Always", hover: "On hover and when picked", never: "Never" },
        label: "Name tags",
        info: "",
      },
      hungry: {
        value: 0.25, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Thinks about flies below",
        info: "A thought bubble with a fly in it pops up now and then when a spider is this empty.",
      },
    },
  },

  // ── Life ──────────────────────────────────────────────────────────────────

  pace: {
    group: "life",
    label: "Pace",
    info: "",
    params: {
      speed: {
        value: 1, min: 1, max: 10000, step: 1, unit: "×",
        label: "Life speed",
        info: "Speeds up hunger, growing up and hatching, for watching them happen. 3600 = an hour a second.",
      },
      spawnFly: { value: 0, kind: "action", label: "Send in a fly", info: "" },
      feedAll: { value: 0, kind: "action", label: "Feed everyone", info: "Fills every spider right up." },
      starveAll: { value: 0, kind: "action", label: "Make everyone hungry", info: "Empties every spider." },
      layEggs: { value: 0, kind: "action", label: "Lay eggs now", info: "The picked spider (or the main one) lays a clutch, whatever it's allowed to do." },
      hatchNow: { value: 0, kind: "action", label: "Hatch the eggs now", info: "" },
      growUp: { value: 0, kind: "action", label: "Grow the babies up", info: "" },
      rebuild: { value: 0, kind: "action", label: "Rebuild the webs", info: "A fresh layout." },
      resetDen: {
        value: 0, kind: "action",
        label: "Start the den over",
        info: "Just the main spider again (still dressed), and a fresh clutch of eggs. Everyone else is gone.",
      },
    },
  },

  hunger: {
    group: "life",
    label: "Hunger",
    info: "Spiders get hungrier over time, even while you're away, and fill up by eating. Hungry spiders hunt down stuck flies.",
    params: {
      emptyAfter: {
        value: 30, min: 0.1, max: 240, step: 0.5, unit: "h",
        label: "Full to empty",
        info: "How long a full spider takes to get completely hungry.",
      },
      meal: {
        value: 0.3, min: 0.01, max: 1, step: 0.01, unit: "×",
        label: "A meal fills",
        info: "How much of its tummy one fly (or snack) fills.",
      },
      hunt: {
        value: 0.9, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Hunts below",
        info: "Spiders emptier than this go after stuck flies.",
      },
      huntRange: {
        value: 5, min: 0.5, max: 30, step: 0.5, unit: "b",
        label: "Notices flies within",
        info: "",
      },
      plump: {
        value: 0.05, min: 0, max: 0.3, step: 0.005, unit: "×",
        label: "Bigger per meal",
        info: "A grown-up gets this much bigger from each meal…",
      },
      plumpMax: {
        value: 0.3, min: 0, max: 1, step: 0.01, unit: "×",
        label: "…up to",
        info: "",
      },
      slimAfter: {
        value: 12, min: 0.1, max: 240, step: 0.5, unit: "h",
        label: "…and slims back down over",
        info: "How long it takes to lose all of that again.",
      },
    },
  },

  growing: {
    group: "life",
    label: "Growing up",
    info: "Babies hatch small and grow while they're fed.",
    params: {
      babySize: {
        value: 0.38, min: 0.1, max: 1, step: 0.01, unit: "×",
        label: "Newborn size",
        info: "Next to a grown-up.",
      },
      growUpAfter: {
        value: 20, min: 0.1, max: 480, step: 0.5, unit: "h",
        label: "Grows up over",
        info: "Time spent not hungry that it takes a newborn to grow up.",
      },
      mealGrowth: {
        value: 0.08, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Growing per meal",
        info: "Each meal also gets a baby this much of the way to grown up.",
      },
    },
  },

  babies: {
    group: "life",
    label: "Babies",
    info: "A grown-up spider that's well fed can lay a clutch of eggs in an egg sac. It hangs on the web and hatches into babies.",
    params: {
      clutchFrom: { value: 2, min: 1, max: 8, step: 1, label: "Babies per clutch, from", info: "" },
      clutchTo: { value: 4, min: 1, max: 12, step: 1, label: "…to", info: "" },
      hatch: {
        value: 40, min: 1, max: 3600, step: 1, unit: "s",
        label: "Hatching takes",
        info: "Tap the egg sac to hurry it along.",
      },
      fullEnough: {
        value: 0.5, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Has to be at least this full",
        info: "",
      },
      cooldown: {
        value: 10, min: 0, max: 1440, step: 1, unit: "min",
        label: "Between clutches",
        info: "How long a spider waits before it can lay again.",
      },
      layCost: {
        value: 0.25, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Laying uses up",
        info: "How much of its tummy laying a clutch takes.",
      },
      max: {
        value: 16, min: 1, max: 40, step: 1,
        label: "Most spiders",
        info: "No more eggs once the den (counting eggs still to hatch) has this many.",
      },
      inherit: {
        value: 0.7, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Take after their parent",
        info: "Chance a baby gets its parent's colour and pattern rather than its own.",
      },
    },
  },

  dying: {
    group: "life",
    label: "Dying",
    info: "A spider left empty for too long dies, and floats away. The main spider never does: it just gets very grumpy.",
    params: {
      enabled: { value: true, label: "Spiders can starve", info: "" },
      after: {
        value: 48, min: 0.1, max: 720, step: 0.5, unit: "h",
        label: "After being empty for",
        info: "",
      },
    },
  },

  // ── Flies ─────────────────────────────────────────────────────────────────

  flies: {
    group: "flies",
    label: "Flies",
    info: "",
    params: {
      enabled: { value: true, label: "Flies come in", info: "" },
      everyFrom: { value: 7, min: 0.5, max: 120, step: 0.5, unit: "s", label: "One every, from", info: "" },
      everyTo: { value: 18, min: 0.5, max: 300, step: 0.5, unit: "s", label: "…to", info: "" },
      most: {
        value: 6, min: 0, max: 30, step: 1,
        label: "Most at once",
        info: "No more come in while there are this many about.",
      },
      speed: { value: 1.4, min: 0.1, max: 8, step: 0.1, unit: "b/s", label: "Flying speed", info: "" },
      size: { value: 0.16, min: 0.03, max: 0.6, step: 0.01, unit: "b", label: "Size", info: "" },
      stick: {
        value: 0.8, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Sticks to a thread",
        info: "Chance a fly crossing a thread gets caught in it.",
      },
      escape: {
        value: 0.2, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Struggles free",
        info: "Chance a stuck fly gets away after struggling.",
      },
      struggle: { value: 3, min: 0, max: 20, step: 0.5, unit: "s", label: "Struggles for", info: "" },
      moths: { value: 0.15, min: 0, max: 1, step: 0.01, unit: "×", label: "Moths", info: "Share of them that are moths." },
      ladybirds: { value: 0.08, min: 0, max: 1, step: 0.01, unit: "×", label: "Ladybirds", info: "" },
      gone: {
        value: 150, min: 5, max: 1200, step: 5, unit: "s",
        label: "Stuck ones rot after",
        info: "A stuck fly nobody eats fades away.",
      },
    },
  },
} satisfies Record<string, Section>;

type Schema = typeof schema;
export type DenConfig = {
  [S in keyof Schema]: { [K in keyof Schema[S]["params"]]: Schema[S]["params"][K]["value"] };
};

/** The live values the den reads. Starts at the defaults above. */
export const den = Object.fromEntries(
  Object.entries(schema).map(([section, { params }]) => [
    section,
    Object.fromEntries(Object.entries(params).map(([key, param]) => [key, param.value])),
  ]),
) as DenConfig;

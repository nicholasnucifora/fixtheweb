import type { Param } from "../spider-string/config";

/**
 * Every tunable that only the Spider Den has: its webs (and how they fray, break and get mended), how
 * threads catch a flung spider, strings snapping, what the spiders get up to, their lives (hunger,
 * growing up, babies, growing old), their genes and personalities, danger (predators and fights),
 * flies, and tools for testing it all.
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
    info: "The webs, spun between the things in the scene, how they wobble, and how threads catch a spider you fling. Pick the scene itself (tree, window, fence) in the den.",
  },
  spiders: {
    label: "Spiders",
    info: "What the spiders get up to on their own, and their strings: dangling, and snapping when you pull too hard.",
  },
  life: {
    label: "Life",
    info: "Hunger, growing up, babies and dying. Times are real time; speed life up to watch it happen.",
  },
  genes: {
    label: "Genes",
    info: "What spiders are born with: how quick, hungry, strong and long-lived they are, their silk, colours and personality, and how much they take after their parents. Pick a spider in the den to see (and, with ?tune, change) its genes on its card.",
  },
  danger: {
    label: "Danger",
    info: "Birds, frogs and pirate spiders that come hunting, hungry spiders that turn on each other, and how everyone gets away.",
  },
  flies: {
    label: "Flies",
    info: "Flies that wander into the den and get stuck in the webs.",
  },
  tools: {
    label: "Tools",
    info: "For testing: cut threads by hand, bring in predators, start fights, and fast-forward life.",
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
    label: "Spinning",
    info: "Webs are spun between the things in the scene: anchor lines out to branches, frames or posts, a frame between those, spokes, and a spiral. Changing these rebuilds them.",
    params: {
      sizeFrom: {
        value: 0.75, min: 0.3, max: 3, step: 0.05, unit: "b",
        label: "Web size, from",
        info: "How far out from its middle a web tries to reach. It's smaller where things are close together.",
      },
      sizeTo: { value: 1.5, min: 0.3, max: 4, step: 0.05, unit: "b", label: "…to", info: "" },
      fill: {
        value: 0.85, min: 0, max: 1, step: 0.05, unit: "×",
        label: "How many",
        info: "Chance each open spot with things around it to tie to gets a web.",
      },
      spacing: {
        value: 0.3, min: 0, max: 3, step: 0.05, unit: "b",
        label: "Space between webs",
        info: "The least room left between one web and the next.",
      },
      ringGap: {
        value: 0.085, min: 0.03, max: 0.4, step: 0.005, unit: "b",
        label: "Spiral spacing",
        info: "The gap between one turn of the spiral and the next. Closer turns catch things sooner.",
      },
      spokes: {
        value: 16, min: 6, max: 32, step: 1,
        label: "Spokes",
        info: "Threads out from a web's middle, for a web 1 b across (bigger webs have more).",
      },
      forks: {
        value: 0.4, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Forked anchors",
        info: "Share of anchor lines that split in two as they reach what they're tied to.",
      },
      cobwebs: {
        value: 0.35, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Cobwebs",
        info: "Share of corners (where a branch forks, or a frame turns) with a tangle of cobweb in them.",
      },
      bridges: {
        value: 0.6, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Bridge lines",
        info: "Long single threads strung across the gaps between things, for spiders to walk along.",
      },
      torn: {
        value: 0.03, min: 0, max: 0.5, step: 0.01, unit: "×",
        label: "Torn",
        info: "Share of the spiral that's missing, so the webs look lived in.",
      },
      thickness: {
        value: 1, min: 0.5, max: 3, step: 0.1, unit: "px",
        label: "Thread thickness",
        info: "",
      },
      opacity: {
        value: 0.42, min: 0.05, max: 1, step: 0.01,
        label: "Thread strength",
        info: "How strongly the threads show against the scene.",
      },
      scenery: {
        value: 1, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Scenery strength",
        info: "How strongly the scene (the tree, window or fence) shows. 0 hides it, leaving just the webs.",
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

  health: {
    group: "web",
    label: "Fraying",
    info: "Every thread has health. It frays over time, and faster when spiders walk on it, flies hit it or flung spiders crash through it. Frayed threads fade, and at nothing left they break. The spider that spun or mended a thread gives it its silk's strength.",
    params: {
      enabled: { value: true, label: "Threads fray", info: "" },
      decay: {
        value: 14, min: 0.1, max: 240, step: 0.5, unit: "h",
        label: "Frays away over",
        info: "How long an untouched thread of ordinary silk lasts from full health (life speed counts).",
      },
      variety: {
        value: 0.35, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Some threads last longer",
        info: "How much strength varies from thread to thread, so they don't all go at once.",
      },
      fadeMin: {
        value: 0.2, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Faintest",
        info: "How strongly a thread about to break still shows, next to a healthy one.",
      },
      walkWear: {
        value: 0.012, min: 0, max: 0.3, step: 0.001, unit: "/s",
        label: "Wear from walking",
        info: "Health a grown-up takes off a thread each second it walks on it.",
      },
      flyHit: {
        value: 0.08, min: 0, max: 1, step: 0.01, unit: "×",
        label: "A fly hitting it",
        info: "",
      },
      flyWear: {
        value: 0.05, min: 0, max: 1, step: 0.01, unit: "/s",
        label: "A fly struggling in it",
        info: "",
      },
      impactWear: {
        value: 0.02, min: 0, max: 0.5, step: 0.005, unit: "per b/s",
        label: "A flung spider crashing through",
        info: "For every b/s it's going.",
      },
      startFrom: { value: 0.55, min: 0, max: 1, step: 0.01, unit: "×", label: "New webs start at, from", info: "" },
      startTo: { value: 1, min: 0, max: 1, step: 0.01, unit: "×", label: "…to", info: "" },
      awayHours: {
        value: 8, min: 0, max: 240, step: 0.5, unit: "h",
        label: "Fraying while you're away, at most",
        info: "Webs are remembered between visits. This caps how much time away counts, so you don't come back to nothing.",
      },
    },
  },

  breaking: {
    group: "web",
    label: "Breaking",
    info: "A thread that breaks splits in two, and each half dangles from where it was tied before fading away. A piece of web cut loose from everything it hangs from falls.",
    params: {
      collapse: { value: true, label: "Pieces cut loose fall", info: "" },
      fade: {
        value: 3.5, min: 0.2, max: 20, step: 0.1, unit: "s",
        label: "Broken ends fade over",
        info: "",
      },
      gravity: {
        value: 0.6, min: 0, max: 3, step: 0.05, unit: "×",
        label: "How heavily they fall",
        info: "Next to the spiders' own gravity.",
      },
      most: {
        value: 400, min: 20, max: 2000, step: 10,
        label: "Most pieces at once",
        info: "The oldest go first past this.",
      },
    },
  },

  repair: {
    group: "web",
    label: "Mending",
    info: "Spiders look after their webs: they mend frayed threads (working silk into them, and the thread shows stronger again), and re-spin broken ones, trailing a new thread from one end to the other. Tidy spiders do it more.",
    params: {
      enabled: { value: true, label: "Spiders mend webs", info: "" },
      mend: {
        value: 2.5, min: 0, max: 10, step: 0.5,
        label: "Mending, how often",
        info: "Next to the other habits (Spiders → Habits).",
      },
      spin: {
        value: 2, min: 0, max: 10, step: 0.5,
        label: "Re-spinning, how often",
        info: "",
      },
      below: {
        value: 0.6, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Mends threads below",
        info: "Health a thread has to be under before a spider bothers.",
      },
      range: {
        value: 4, min: 0.5, max: 20, step: 0.5, unit: "b",
        label: "Looks for work within",
        info: "",
      },
      rate: {
        value: 0.4, min: 0.01, max: 5, step: 0.01, unit: "/s",
        label: "Mending speed",
        info: "Health a thread gets back each second, for ordinary silk.",
      },
      spinSpeed: {
        value: 1.1, min: 0.1, max: 6, step: 0.1, unit: "b/s",
        label: "Spinning speed",
        info: "How fast it lays a new thread across a gap.",
      },
      spinHealth: {
        value: 0.85, min: 0.1, max: 1, step: 0.01, unit: "×",
        label: "A new thread starts at",
        info: "",
      },
      streak: {
        value: 10, min: 1, max: 60, step: 1,
        label: "Threads in a row",
        info: "After spinning one, it carries on with the next broken thread along, up to this many.",
      },
    },
  },

  catching: {
    group: "web",
    label: "Catching a flung spider",
    info: "A spider you let go of flies (or drops) until the threads stop it. Each thread it crosses slows it down, and once it's slow enough the next one catches it. Branches, frames and posts aren't sticky: it passes straight through them.",
    params: {
      grace: {
        value: 0.9, min: 0, max: 5, step: 0.05, unit: "b",
        label: "Free zone",
        info: "Threads this close to where you threw it from don't touch it at all, so it can get away. Past this, threads start to slow it. Put down gently, there's no free zone: it drops onto the first thread below.",
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
        value: 0.04, min: 0, max: 0.5, step: 0.01, unit: "b",
        label: "Put down on a thread within",
        info: "Let go gently this close to a thread and it holds on right there. Anywhere else it drops from where you let go.",
      },
      dropSpeed: {
        value: 1.5, min: 0, max: 10, step: 0.1, unit: "b/s",
        label: "Gently is below",
        info: "How slowly it has to be moving when let go to count as putting it down, rather than throwing it.",
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

  emotes: {
    group: "spiders",
    label: "Emotes",
    info: "Little symbols that pop up over a spider as it feels things: a heart, an angry mark, a !, a sweat drop. What sets them off depends on its personality.",
    params: {
      enabled: { value: true, label: "Show emotes", info: "" },
      size: { value: 0.2, min: 0.05, max: 0.6, step: 0.01, unit: "b", label: "Size", info: "" },
      chance: {
        value: 0.85, min: 0, max: 1, step: 0.05, unit: "×",
        label: "How chatty",
        info: "Chance a feeling shows as an emote.",
      },
      life: { value: 1.4, min: 0.3, max: 5, step: 0.1, unit: "s", label: "Lasts", info: "" },
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
        value: 40, min: 1, max: 150, step: 1,
        label: "Most spiders",
        info: "No more eggs once the den (counting eggs still to hatch) has this many. Every spider is a whole animated spider, so a lot of them takes a lot of work: see Tools → Detail.",
      },
      nest: {
        value: 0.8, min: 0, max: 10, step: 0.1,
        label: "Lays eggs by itself, how often",
        info: "Next to its other habits, for a grown-up that's able to. Fertile spiders more.",
      },
      mateRange: {
        value: 5, min: 0, max: 30, step: 0.5, unit: "b",
        label: "Looks for a mate within",
        info: "A grown-up nearby that could lay too becomes the other parent: they court, and the babies get genes from both.",
      },
      solo: {
        value: 0.35, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Lays alone, if there's nobody",
        info: "Chance it lays anyway without a mate.",
      },
      court: { value: 2.4, min: 0, max: 10, step: 0.1, unit: "s", label: "Courting takes", info: "" },
    },
  },

  aging: {
    group: "life",
    label: "Growing old",
    info: "Spiders get old, slow down, get weaker in a fight and worse at getting away, and at the end of their life die of old age. How long they live is in their genes.",
    params: {
      enabled: { value: true, label: "Spiders grow old", info: "" },
      lifespanFrom: { value: 2, min: 0.01, max: 60, step: 0.01, unit: "days", label: "Lives for, from", info: "For an average lifespan gene." },
      lifespanTo: { value: 5, min: 0.01, max: 90, step: 0.01, unit: "days", label: "…to", info: "" },
      elderAt: {
        value: 0.7, min: 0.1, max: 1, step: 0.01, unit: "×",
        label: "Old from",
        info: "How far through its life it starts getting old.",
      },
      slow: { value: 0.45, min: 0, max: 1, step: 0.01, unit: "×", label: "Slows down by", info: "At the very end." },
      weak: { value: 0.5, min: 0, max: 1, step: 0.01, unit: "×", label: "Weaker in a fight by", info: "" },
      dodge: { value: 0.5, min: 0, max: 1, step: 0.01, unit: "×", label: "Worse at getting away by", info: "" },
      droop: { value: 0.5, min: 0, max: 1, step: 0.01, unit: "×", label: "Droopy eyes", info: "How sleepy an old spider's eyes look." },
    },
  },

  dying: {
    group: "life",
    label: "Dying",
    info: "A spider left empty for too long starves and floats away. Every death goes in the den's log (top right in the den). The main spider is the site's own spider, so by default it never dies: it just gets very grumpy (or gets away).",
    params: {
      enabled: { value: true, label: "Spiders can starve", info: "" },
      after: {
        value: 24, min: 0.1, max: 720, step: 0.5, unit: "h",
        label: "After being empty for",
        info: "",
      },
      main: {
        value: false,
        label: "The main spider can die too",
        info: "Then the main spider passes to its oldest child (or the oldest spider left).",
      },
      logMost: { value: 40, min: 5, max: 200, step: 5, label: "Deaths remembered", info: "" },
    },
  },

  time: {
    group: "life",
    label: "Time",
    info: "The den's time speed (in the den's settings) speeds up or slows down everything: the spiders, flies, predators and life itself. Time away from the page runs at ordinary speed.",
    params: {
      awayMost: {
        value: 72, min: 0, max: 720, step: 1, unit: "h",
        label: "Time away counts, at most",
        info: "Hunger, growing up, getting old and hatching carry on while you're away, up to this long.",
      },
      awayHunt: {
        value: 0.06, min: 0, max: 1, step: 0.01, unit: "/h",
        label: "Predators while you're away",
        info: "Chance each hour away that a predator takes a spider (shown in the log).",
      },
    },
  },

  // ── Genes ─────────────────────────────────────────────────────────────────

  genetics: {
    group: "genes",
    label: "Genes",
    info: "Every spider has genes. Each trait is a multiplier around 1 (average), passed down from its parents with a little wobble. How much each trait matters is set here.",
    params: {
      enabled: { value: true, label: "Colours are in the genes", info: "Body colour, pattern and thread are inherited: spiders born in the den can't change them in the wardrobe (the first spider can, and anyone can with ?tune). Off: change them freely." },
      spread: {
        value: 0.18, min: 0, max: 0.6, step: 0.01, unit: "×",
        label: "How different spiders are",
        info: "How far traits spread from average, in spiders with no parents to take after.",
      },
      inherit: {
        value: 0.8, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Take after their parents",
        info: "1 = just like their parents (with a little wobble), 0 = nothing like them.",
      },
      wobble: {
        value: 0.07, min: 0, max: 0.5, step: 0.01, unit: "×",
        label: "Wobble",
        info: "Random change from the parents' average.",
      },
      colour: {
        value: 0.15, min: 0, max: 1, step: 0.01, unit: "×",
        label: "A new body colour",
        info: "Chance a baby is born a colour neither parent has.",
      },
      pattern: { value: 0.2, min: 0, max: 1, step: 0.01, unit: "×", label: "A new pattern", info: "" },
      thread: { value: 0.1, min: 0, max: 1, step: 0.01, unit: "×", label: "A new thread colour", info: "" },
      speed: { value: 1, min: 0, max: 3, step: 0.05, unit: "×", label: "Speed matters", info: "How much the speed gene changes how fast it walks, runs and jumps." },
      appetite: { value: 1, min: 0, max: 3, step: 0.05, unit: "×", label: "Appetite matters", info: "How much it changes how quickly it gets hungry." },
      speedHunger: {
        value: 0.6, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Quick ones get hungry quicker",
        info: "On top of appetite: how much being quick burns food.",
      },
      silk: { value: 1, min: 0, max: 3, step: 0.05, unit: "×", label: "Silk matters", info: "How much the silk gene changes how long its threads last, and how hard its string is to snap." },
      strength: { value: 1, min: 0, max: 3, step: 0.05, unit: "×", label: "Strength matters", info: "In a fight." },
      size: { value: 1, min: 0, max: 3, step: 0.05, unit: "×", label: "Size matters", info: "How big a grown-up gets." },
      lifespan: { value: 1, min: 0, max: 3, step: 0.05, unit: "×", label: "Lifespan matters", info: "" },
      fertility: { value: 1, min: 0, max: 3, step: 0.05, unit: "×", label: "Fertility matters", info: "How many babies, and how soon it can lay again." },
      randomise: { value: 0, kind: "action", label: "Re-roll the picked spider's genes", info: "" },
      rerollColours: { value: 0, kind: "action", label: "Re-roll the picked spider's colours", info: "" },
    },
  },

  personality: {
    group: "genes",
    label: "Personality",
    info: "Every spider has a personality, part inherited: temper (how easily annoyed), thrill (whether it loves or hates being flung about), nerve (brave or timid), aggression (whether it'd eat another spider), energy (busy or lazy) and tidiness (how much it looks after webs). It changes the faces it pulls and the emotes it shows.",
    params: {
      strength: {
        value: 1, min: 0, max: 2, step: 0.05, unit: "×",
        label: "How much personality shows",
        info: "0 = every spider acts the same.",
      },
      spread: { value: 0.22, min: 0, max: 0.5, step: 0.01, label: "How different they are", info: "" },
      inherit: { value: 0.5, min: 0, max: 1, step: 0.05, unit: "×", label: "Take after their parents", info: "" },
    },
  },

  // ── Danger ────────────────────────────────────────────────────────────────

  predators: {
    group: "danger",
    label: "Predators",
    info: "Now and then a bird, a frog or a pirate spider turns up and goes for a spider, usually a small, slow or old one. Spiders nearby panic, and the one it's after might get away. Grab a spider to save it, or press a predator to shoo it.",
    params: {
      enabled: { value: true, label: "Predators come", info: "" },
      everyFrom: { value: 100, min: 5, max: 1800, step: 5, unit: "s", label: "One every, from", info: "" },
      everyTo: { value: 260, min: 5, max: 3600, step: 5, unit: "s", label: "…to", info: "" },
      atLeast: {
        value: 3, min: 1, max: 30, step: 1,
        label: "Only once there are",
        info: "Spiders in the den before predators start coming.",
      },
      bird: { value: 1, min: 0, max: 5, step: 0.1, label: "Birds", info: "How likely each kind is, next to each other." },
      frog: { value: 1, min: 0, max: 5, step: 0.1, label: "Frogs", info: "" },
      pirate: { value: 0.6, min: 0, max: 5, step: 0.1, label: "Pirate spiders", info: "" },
      dodge: {
        value: 0.4, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Getting away",
        info: "Chance an average grown-up gets away. Nerve, speed, age and size change it.",
      },
      panic: {
        value: 3, min: 0, max: 15, step: 0.25, unit: "b",
        label: "Spiders panic within",
        info: "How close a hunting predator has to be for spiders to scatter.",
      },
      shoo: {
        value: 0.8, min: 0, max: 1, step: 0.05, unit: "×",
        label: "Shooing works",
        info: "Chance pressing a predator scares it off.",
      },
    },
  },

  bird: {
    group: "danger",
    label: "Birds",
    info: "Flies in, circles, and swoops.",
    params: {
      size: { value: 0.85, min: 0.3, max: 4, step: 0.05, unit: "b", label: "Size", info: "A grown-up spider is 0.48 b wide." },
      speed: { value: 3.5, min: 1, max: 20, step: 0.25, unit: "b/s", label: "Flying speed", info: "" },
      dive: { value: 6.5, min: 2, max: 30, step: 0.25, unit: "b/s", label: "Swooping speed", info: "" },
      circle: { value: 1.6, min: 0, max: 8, step: 0.1, unit: "s", label: "Circles for", info: "Before it swoops: time for spiders to notice." },
      tries: { value: 2, min: 1, max: 6, step: 1, label: "Tries", info: "Swoops before it gives up." },
    },
  },

  frog: {
    group: "danger",
    label: "Frogs",
    info: "Hops in at the bottom and shoots its tongue at spiders in reach.",
    params: {
      size: { value: 0.8, min: 0.3, max: 4, step: 0.05, unit: "b", label: "Size", info: "" },
      tongue: { value: 2.4, min: 0.5, max: 12, step: 0.1, unit: "b", label: "Tongue reaches", info: "" },
      aim: { value: 0.9, min: 0, max: 5, step: 0.05, unit: "s", label: "Takes aim for", info: "" },
      wait: { value: 3, min: 0, max: 20, step: 0.5, unit: "s", label: "Waits between tries", info: "" },
      tries: { value: 3, min: 1, max: 10, step: 1, label: "Tries", info: "" },
      full: { value: 0.75, min: 0, max: 1, step: 0.05, unit: "×", label: "Leaves once it has eaten", info: "Chance it hops off after catching one." },
      stay: { value: 25, min: 3, max: 180, step: 1, unit: "s", label: "Stays for", info: "If nothing comes in reach." },
    },
  },

  pirate: {
    group: "danger",
    label: "Pirate spiders",
    info: "A spider that eats other spiders. It sneaks in along the webs, stalks one, and pounces.",
    params: {
      speed: { value: 1.3, min: 0.3, max: 4, step: 0.05, unit: "×", label: "Speed", info: "Next to an ordinary spider." },
      strength: { value: 1.6, min: 0.3, max: 5, step: 0.05, unit: "×", label: "Strength", info: "" },
      size: { value: 1.05, min: 0.5, max: 2, step: 0.05, unit: "×", label: "Size", info: "" },
      patience: { value: 45, min: 5, max: 300, step: 5, unit: "s", label: "Gives up after", info: "" },
    },
  },

  fights: {
    group: "danger",
    label: "Fights",
    info: "A starving, aggressive spider may go after a smaller one to eat it. It stalks, and pounces. The other might run, jump away, drop on a string, fight back or freeze. In a fight, the bigger, stronger, better-fed spider usually wins, but not always, and the loser sometimes escapes.",
    params: {
      enabled: { value: true, label: "Spiders fight", info: "" },
      hunger: {
        value: 0.25, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Hungry enough below",
        info: "How empty it has to be to think about eating another spider.",
      },
      chance: {
        value: 0.35, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Goes for it",
        info: "Chance each time it thinks about it, for a fully aggressive spider.",
      },
      smaller: {
        value: 0.9, min: 0.3, max: 2, step: 0.05, unit: "×",
        label: "Picks on spiders up to",
        info: "Of its own size.",
      },
      family: { value: true, label: "Leaves its own family alone", info: "Parents, babies, brothers and sisters." },
      stalk: { value: 20, min: 2, max: 120, step: 1, unit: "s", label: "Stalks for", info: "Before it gives up." },
      notice: { value: 2.5, min: 0, max: 10, step: 0.1, unit: "b", label: "Noticed within", info: "For an average spider." },
      pounce: { value: 1.6, min: 0.2, max: 6, step: 0.1, unit: "b", label: "Pounces from", info: "" },
      duration: { value: 1.8, min: 0.3, max: 8, step: 0.1, unit: "s", label: "A fight lasts", info: "" },
      luck: {
        value: 0.35, min: 0, max: 2, step: 0.05, unit: "×",
        label: "Luck",
        info: "How much chance plays a part. 0 = the stronger always wins.",
      },
      escape: {
        value: 0.3, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Loser gets away",
        info: "For an average loser (quick and brave ones more).",
      },
      meals: { value: 2.5, min: 0, max: 10, step: 0.1, unit: "meals", label: "Eating a spider fills", info: "" },
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

  // ── Tools ─────────────────────────────────────────────────────────────────

  tools: {
    group: "tools",
    label: "Tools",
    info: "",
    params: {
      cut: {
        value: false,
        label: "Cut threads",
        info: "Drag across the den to cut any threads you cross. (Also the ✂ button in the den's bar, with ?tune.)",
      },
      stats: { value: false, label: "Show numbers over spiders", info: "Hunger, age and genes, for testing." },
      spawnFly: { value: 0, kind: "action", label: "Send in a fly", info: "" },
      bird: { value: 0, kind: "action", label: "Send in a bird", info: "" },
      frog: { value: 0, kind: "action", label: "Send in a frog", info: "" },
      pirate: { value: 0, kind: "action", label: "Send in a pirate spider", info: "" },
      fight: { value: 0, kind: "action", label: "Start a fight", info: "The picked spider (or a random one) goes for the nearest spider." },
      collapse: { value: 0, kind: "action", label: "Knock down a web", info: "Cuts every anchor of a random web." },
      fray: { value: 0, kind: "action", label: "Fray every web", info: "Takes every thread down to a third of its health." },
      mendAll: { value: 0, kind: "action", label: "Mend every web", info: "" },
      old: { value: 0, kind: "action", label: "Make the picked spider old", info: "" },
      starve: { value: 0, kind: "action", label: "Starve the picked spider", info: "Empties it, and it's been empty long enough to die." },
      clearLog: { value: 0, kind: "action", label: "Clear the deaths log", info: "" },
    },
  },

  detail: {
    group: "tools",
    label: "Detail",
    info: "Every spider is a whole animated spider, which takes work. With lots of them, some of it is done less often.",
    params: {
      above: {
        value: 24, min: 1, max: 150, step: 1,
        label: "Save work above",
        info: "Past this many spiders, the ones just sitting about are posed every other frame.",
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

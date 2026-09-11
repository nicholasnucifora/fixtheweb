/**
 * Every tunable for the hanging string + spider, with the range and
 * explanation the tuning panel shows for it (open the page with ?tune).
 *
 * `value` is the default. Units: b = the rendered height of the letter the
 * string hangs from, so everything scales with the logo; s = seconds;
 * % = percent of the spider's width.
 *
 * Code reads the plain `config` object at the bottom, live, every frame;
 * the panel edits it in place. A param added here shows up in the panel
 * automatically, under its section's group (tab).
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
export interface ColorParam {
  value: string;
  kind: "color";
  label: string;
  info: string;
}
export type Param = NumberParam | ToggleParam | ChoiceParam | ColorParam;

/** Top-level tabs in the tuning panel. */
export const groups = {
  string: {
    label: "String",
    info: "How the string hangs, swings and reacts to you.",
  },
  spidey: {
    label: "Spidey",
    info: "The spider on the end of the string: how it looks, where its parts sit and how they move. Blinking and other life will be added here later.",
  },
};

export interface Section {
  group: keyof typeof groups;
  label: string;
  info: string;
  params: Record<string, Param>;
}

type ShapeSource = "drawn" | "left" | "right";
const shapeOptions = (part: string) => ({
  drawn: `As drawn (left + right ${part})`,
  left: `Left ${part}, mirrored to both sides`,
  right: `Right ${part}, mirrored to both sides`,
});

/** Placement sliders for one pair of legs (mirrored left/right). */
const legPair = (n: number, where: string): Section => ({
  group: "spidey",
  label: `Legs ${n} (${where})`,
  info: `Where leg pair ${n} sits. Settings are mirrored, so the left and right leg always match.`,
  params: {
    shape: {
      value: "drawn" as ShapeSource,
      options: shapeOptions("leg"),
      label: "Shape",
      info: "Use both legs as you drew them, or copy one side's leg to both so you can compare which is better shaped.",
    },
    angle: {
      value: 0, min: -60, max: 60, step: 0.5, unit: "°",
      label: "Angle",
      info: "Turns the legs around their hips. Positive swings the tips up, negative down.",
    },
    bend: {
      value: 0, min: -60, max: 60, step: 0.5, unit: "°",
      label: "Curl",
      info: "Curls the legs smoothly along their length (the tip moves most). Positive curls the tips up.",
    },
    x: {
      value: 0, min: -10, max: 10, step: 0.1, unit: "%",
      label: "Sideways",
      info: "Moves the legs outward (+) or in toward the body (−).",
    },
    y: {
      value: 0, min: -10, max: 10, step: 0.1, unit: "%",
      label: "Up / down",
      info: "Moves the legs down (+) or up (−).",
    },
    scale: {
      value: 1, min: 0.5, max: 1.6, step: 0.01, unit: "×",
      label: "Size",
      info: "Scales the legs from their hips.",
    },
  },
});

export const schema = {
  // ── String ────────────────────────────────────────────────────────────────

  anchor: {
    group: "string",
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
    group: "string",
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
        info: "Downward pull. Higher = faster, snappier swings; lower = floaty, moon-like. The legs feel it too.",
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

  sway: {
    group: "string",
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
    group: "string",
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
    group: "string",
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
    group: "string",
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
    group: "string",
    label: "Simulation",
    info: "Engine settings. Mostly leave these alone.",
    params: {
      timeScale: {
        value: 1, min: 0.05, max: 2, step: 0.05, unit: "×",
        label: "Time scale",
        info: "Slow motion for tuning (slows the spider's legs and tilt too). 1 = real time.",
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
    group: "string",
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

  // ── Spidey ────────────────────────────────────────────────────────────────

  look: {
    group: "spidey",
    label: "Compare & size",
    info: "Which spider hangs on the string, how big it is, and where the string attaches to it.",
    params: {
      showFavicon: {
        value: false,
        label: "Show favicon spider",
        info: "On: shows the favicon (public/favicon.svg) and hides the custom spider, for comparing. Off: shows the custom spider.",
      },
      width: {
        value: 0.48, min: 0.1, max: 2, step: 0.01, unit: "b",
        label: "Spider width",
        info: "Width of the custom spider, legs included.",
      },
      faviconScale: {
        value: 1.13, min: 0.3, max: 3, step: 0.01, unit: "×",
        label: "Favicon size",
        info: "Size of the favicon when it's shown, relative to the spider width. The default makes the two bodies about the same size.",
      },
      attachX: {
        value: 0.5, min: 0, max: 1, step: 0.01,
        label: "String attach (across)",
        info: "Where on the spider the string connects: 0 = left edge, 0.5 = centre, 1 = right edge.",
      },
      attachY: {
        value: 0.03, min: 0, max: 1, step: 0.01,
        label: "String attach (down)",
        info: "0 = top edge, 1 = bottom. The default tucks the string just into the top of the head. The spider swings around this point.",
      },
      faviconAttachY: {
        value: 0.14, min: 0, max: 1, step: 0.01,
        label: "Favicon string attach (down)",
        info: "Same as above, for the favicon (its head starts lower in its square).",
      },
    },
  },

  colors: {
    group: "spidey",
    label: "Colours",
    info: "Colours of each part. The outline keeps the navy body visible on the dark page.",
    params: {
      body: { value: "#1b1e29", kind: "color", label: "Body & legs", info: "Fill of the body and legs." },
      eyes: { value: "#ffffff", kind: "color", label: "Eyes", info: "Eye whites." },
      pupils: { value: "#1b1e29", kind: "color", label: "Pupils", info: "Pupil colour." },
      mouth: { value: "#ffffff", kind: "color", label: "Mouth", info: "Mouth colour." },
      outline: { value: "#f2f2ee", kind: "color", label: "Outline", info: "Colour of the outline around the body and legs." },
      outlineMode: {
        value: "dark" as "dark" | "always" | "never",
        options: { dark: "Dark mode only", always: "Always", never: "Never" },
        label: "Outline shows",
        info: "When the outline is drawn. It traces the whole silhouette, so the seams between body and legs stay hidden.",
      },
      outlineWidth: {
        value: 0.02, min: 0, max: 0.08, step: 0.002, unit: "×",
        label: "Outline width",
        info: "Thickness of the outline, as a fraction of the spider's width.",
      },
    },
  },

  body: {
    group: "spidey",
    label: "Body",
    info: "The body's shape, breathing, and how it tilts as it swings. The face and legs move with it.",
    params: {
      scaleX: {
        value: 1, min: 0.5, max: 1.5, step: 0.01, unit: "×",
        label: "Width",
        info: "Stretches the body (and face) sideways. Legs stay attached.",
      },
      scaleY: {
        value: 1, min: 0.5, max: 1.5, step: 0.01, unit: "×",
        label: "Height",
        info: "Stretches the body (and face) up and down. Legs stay attached.",
      },
      breathe: {
        value: 0.015, min: 0, max: 0.1, step: 0.001, unit: "×",
        label: "Breathing",
        info: "How much the body gently swells and shrinks at rest. 0 = off. Off for reduced motion.",
      },
      breatheSpeed: {
        value: 0.35, min: 0.05, max: 2, step: 0.01, unit: "/s",
        label: "Breathing speed",
        info: "Breaths per second.",
      },
      tiltAmount: {
        value: 1, min: 0, max: 1.5, step: 0.01, unit: "×",
        label: "Tilt with string",
        info: "How much the spider turns to follow the string's angle. 1 = hangs in line with it; 0 = always upright.",
      },
      tiltSpring: {
        value: 5, min: 0.5, max: 20, step: 0.1, unit: "Hz",
        label: "Tilt springiness",
        info: "How quickly the spider turns to follow the string. High = snaps to it; low = lazy, heavy turning.",
      },
      tiltDamping: {
        value: 0.55, min: 0.05, max: 1.5, step: 0.01,
        label: "Tilt damping",
        info: "Low = it overshoots and rocks before settling; 1 = turns smoothly with no overshoot.",
      },
    },
  },

  face: {
    group: "spidey",
    label: "Face",
    info: "Moves or scales the eyes and mouth together.",
    params: {
      x: { value: 0, min: -10, max: 10, step: 0.1, unit: "%", label: "Sideways", info: "Moves the whole face left (−) or right (+)." },
      y: { value: 0, min: -10, max: 10, step: 0.1, unit: "%", label: "Up / down", info: "Moves the whole face up (−) or down (+)." },
      scale: { value: 1, min: 0.5, max: 1.5, step: 0.01, unit: "×", label: "Size", info: "Scales the whole face around its centre." },
    },
  },

  eyes: {
    group: "spidey",
    label: "Eyes",
    info: "The eye whites (the pupils have their own section).",
    params: {
      shape: {
        value: "drawn" as ShapeSource,
        options: shapeOptions("eye"),
        label: "Shape",
        info: "Use both eyes as drawn, or copy one eye to both sides to compare which is better shaped.",
      },
      size: { value: 1, min: 0.5, max: 1.6, step: 0.01, unit: "×", label: "Size", info: "Scales each eye around its own centre (pupils scale with them)." },
      spacing: { value: 0, min: -10, max: 10, step: 0.1, unit: "%", label: "Spacing", info: "Moves the eyes apart (+) or together (−)." },
      y: { value: 0, min: -10, max: 10, step: 0.1, unit: "%", label: "Up / down", info: "Moves both eyes up (−) or down (+)." },
    },
  },

  pupils: {
    group: "spidey",
    label: "Pupils",
    info: "Pupil shape, size, and looking at the cursor.",
    params: {
      shape: {
        value: "drawn" as ShapeSource,
        options: shapeOptions("pupil"),
        label: "Shape",
        info: "Use both pupils as drawn, or copy one pupil to both sides to compare which is better shaped.",
      },
      size: { value: 1, min: 0.3, max: 1.6, step: 0.01, unit: "×", label: "Size", info: "Scales each pupil around its own centre." },
      restX: {
        value: 0, min: -1, max: 1, step: 0.01,
        label: "Resting look (across)",
        info: "Where the pupils sit when not looking at anything: −1 = far left of the eye, 1 = far right.",
      },
      restY: {
        value: 0, min: -1, max: 1, step: 0.01,
        label: "Resting look (up/down)",
        info: "−1 = top of the eye, 1 = bottom.",
      },
      follow: { value: true, label: "Follow the cursor", info: "The pupils look toward the cursor when it's nearby." },
      range: {
        value: 0.75, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Look range",
        info: "How far the pupils can move inside the eye when looking. 1 = right to the edge of the eye.",
      },
      radius: {
        value: 4, min: 0.5, max: 20, step: 0.1, unit: "b",
        label: "Notice distance",
        info: "How close the cursor has to be for the spider to look at it. Further away, the pupils drift back to rest.",
      },
      reach: {
        value: 1.5, min: 0.1, max: 10, step: 0.1, unit: "b",
        label: "Full-look distance",
        info: "At this distance or more the pupils look fully toward the cursor; closer, they move proportionally less (so it can look at a cursor right in front of it).",
      },
      speed: {
        value: 10, min: 1, max: 40, step: 0.5, unit: "/s",
        label: "Look speed",
        info: "How quickly the pupils move to where they're looking.",
      },
    },
  },

  mouth: {
    group: "spidey",
    label: "Mouth",
    info: "Size and position of the smile.",
    params: {
      scaleX: { value: 1, min: 0.3, max: 2, step: 0.01, unit: "×", label: "Width", info: "Stretches the mouth sideways." },
      scaleY: { value: 1, min: 0.3, max: 2, step: 0.01, unit: "×", label: "Height", info: "Stretches the mouth up and down." },
      y: { value: 0, min: -10, max: 10, step: 0.1, unit: "%", label: "Up / down", info: "Moves the mouth up (−) or down (+)." },
    },
  },

  legs1: legPair(1, "top"),
  legs2: legPair(2, "middle"),
  legs3: legPair(3, "bottom"),

  legMotion: {
    group: "spidey",
    label: "Leg movement",
    info: "How the legs react as the spider swings. Each leg is a little spring: it gets pushed by the swing and by gravity, then settles back.",
    params: {
      enabled: { value: true, label: "Legs move", info: "Off = legs stay rigidly in place." },
      weight: {
        value: 0.35, min: 0, max: 1.5, step: 0.01, unit: "×",
        label: "Floppiness",
        info: "How much the legs get swung around by the spider's movement and tilt. 0 = rigid; high = dangly.",
      },
      spring: {
        value: 2.2, min: 0.3, max: 8, step: 0.05, unit: "Hz",
        label: "Springiness",
        info: "How quickly legs spring back. Low = slow and droopy; high = quick and twitchy.",
      },
      damping: {
        value: 0.35, min: 0.05, max: 1.5, step: 0.01,
        label: "Wobble damping",
        info: "Low = legs wobble back and forth before settling; 1 = settle smoothly without overshoot.",
      },
      curl: {
        value: 0.5, min: 0, max: 1, step: 0.01,
        label: "Bend vs swing",
        info: "How the movement shows: 0 = the whole leg swings stiffly from the hip; 1 = the leg bends smoothly along its length.",
      },
      curlFocus: {
        value: 1.5, min: 0.5, max: 3, step: 0.05,
        label: "Bend focus",
        info: "Where curling happens: low = evenly along the leg; high = mostly near the tip.",
      },
      maxAngle: {
        value: 35, min: 5, max: 90, step: 1, unit: "°",
        label: "Max movement",
        info: "Furthest a leg can be pushed from its resting position.",
      },
      variation: {
        value: 0.25, min: 0, max: 1, step: 0.01,
        label: "Variation",
        info: "Gives each leg slightly different springiness so they don't move in lockstep.",
      },
      fidget: {
        value: 2, min: 0, max: 20, step: 0.5, unit: "°",
        label: "Fidget",
        info: "Size of the occasional small twitch a random leg gives at rest. 0 = off. Off for reduced motion.",
      },
      fidgetRate: {
        value: 0.2, min: 0, max: 2, step: 0.01, unit: "/s",
        label: "Fidget rate",
        info: "Roughly how many twitches per second, across all legs.",
      },
    },
  },

  bob: {
    group: "spidey",
    label: "Weight & grab",
    info: "Physics of whatever hangs on the end. These change the swing whichever spider is showing.",
    params: {
      drag: {
        value: 0.7, min: 0, max: 5, step: 0.05, unit: "/s",
        label: "Air drag",
        info: "Damping on the spider. Lower = swings for longer before settling; higher = settles quickly.",
      },
      hitArea: {
        value: 0.2, min: 0, max: 1.5, step: 0.05, unit: "×",
        label: "Grab area",
        info: "Extra invisible area around the spider that still grabs it, as a fraction of its size.",
      },
    },
  },

  spideyDebug: {
    group: "spidey",
    label: "Debug",
    info: "Visual aids for placing parts.",
    params: {
      showPivots: { value: false, label: "Show leg hips", info: "Marks each leg's hip: the point it turns and bends around." },
      showHitArea: { value: false, label: "Show grab area", info: "Outlines the area you can grab the spider by." },
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

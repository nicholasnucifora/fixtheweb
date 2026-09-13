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
/** A button in the panel. Clicking bumps `value`; code watches for the change and acts. */
export interface ActionParam {
  value: number;
  kind: "action";
  label: string;
  info: string;
}
export type Param = NumberParam | ToggleParam | ChoiceParam | ColorParam | ActionParam;

/** Top-level tabs in the tuning panel. */
export const groups = {
  string: {
    label: "String",
    info: "How the string hangs, swings and reacts to you.",
  },
  animation: {
    label: "Animations",
    info: "Moves the spider plays on top of everything else. Click one to play it from the start; the settings below each one shape how it goes.",
  },
  expression: {
    label: "Faces",
    info: "Expressions it pulls when you do things to it. Each one has what sets it off and how long it lasts; pick one and Play to see it on its own. Turn off the first switch in any of them to stop it happening by itself.",
  },
  spidey: {
    label: "Spidey",
    info: "The spider on the end of the string: how it looks, where its parts sit and how they move.",
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
      springBack: {
        value: 0.09, min: 0, max: 0.6, step: 0.005, unit: "s",
        label: "Give under load",
        info: "How long the string takes to pull back after being stretched — by a fling, or the weight of the spider at the bottom of a fast swing. 0 = dead rigid, the spider stops instantly at full length; higher = stretchier, and slower to recover.",
      },
      springDamping: {
        value: 14, min: 0, max: 40, step: 0.5, unit: "/s",
        label: "Bounce damping",
        info: "How quickly a stretch settles. Low = the string twangs in and out like a bungee; high = it gives once and stops.",
      },
      maxStretch: {
        value: 0.12, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Max stretch",
        info: "The hard limit on stretching, however hard it's pulled (0.25 = never more than 25% longer than its length).",
      },
      compression: {
        value: 0, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Stiffness when slack",
        info: "How much the string resists being squashed. 0 = a real string: it can only pull, so spare length just falls into a loop. Higher makes it more like a chain of rods, which buckles and can flicker side to side when there's slack.",
      },
      iterations: {
        value: 10, min: 1, max: 40, step: 1,
        label: "Solver passes",
        info: "Constraint passes per physics step. Higher = holds its shape more precisely; lower = saggier and cheaper.",
      },
      behind: {
        value: true,
        label: "Behind the logo & text",
        info: "Draws the string and spider behind the page, so dragging the spider up takes it behind the logo, where it shows through the hole in the b. Off = always in front.",
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
        value: "free" as "x" | "free",
        options: { free: "Anywhere (string goes slack)", x: "Left/right only (rides the swing arc)" },
        label: "Drag mode",
        info: "Anywhere: the spider follows the pointer wherever it goes — beside the b, up above it, or in close, where the string goes slack. Left/right: the pointer only steers sideways and the spider rides its swing arc.",
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
      throwPower: {
        value: 1, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Throw on release",
        info: "How much of your own pointer speed the spider keeps when you let go. Without this it only keeps what the held point itself was doing, which is however far it still had to go to catch up with you — so flinging it into a corner of the window, or out past the end of the string, would sometimes drop it dead, because in both cases the point it was chasing had stopped. 0 = the old behaviour. Capped by Max fling speed below.",
      },
      throwWindow: {
        value: 0.09, min: 0.01, max: 0.5, step: 0.01, unit: "s",
        label: "Throw measured over",
        info: "How much of your last movement counts toward the throw. Short reads the final flick exactly; longer smooths over a wobble on the way. It's also how long a pause counts as putting it down: hold still for longer than this before letting go and the throw fades to nothing, as it should.",
      },
      maxThrow: {
        value: 12, min: 0, max: 40, step: 0.5, unit: "b/s",
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

  pull: {
    group: "string",
    label: "Wind-up",
    info: "Dragging past what the string can reach: it gives less and less, shudders, and flings the spider when you let go.",
    params: {
      stretch: {
        value: 0.3, min: 0, max: 1.5, step: 0.01, unit: "×",
        label: "Stretch",
        info: "How far past its length the string can be pulled, at most. 0 = it stops dead at full reach.",
      },
      softness: {
        value: 0.35, min: 0.02, max: 2, step: 0.01, unit: "×",
        label: "Give",
        info: "How quickly the stretch runs out as you pull further. Small = it reaches its limit almost at once (stiff); large = it keeps giving (slack elastic).",
      },
      snapBack: {
        value: 0.08, min: 0.01, max: 1, step: 0.01, unit: "s",
        label: "Snap-back time",
        info: "How long the stretched string takes to pull back to its length once you let go. Short = a violent whip; long = a lazy elastic that eases back.",
      },
      fling: {
        value: 9, min: 0, max: 40, step: 0.5, unit: "b/s",
        label: "Release fling",
        info: "Extra speed the spider gets when you let go of a fully wound string, sending it across the other way. 0 = it just springs back on its own.",
      },
      shakeStart: {
        value: 0.45, min: 0, max: 1, step: 0.01,
        label: "Shudder starts at",
        info: "How wound up it has to be before the string starts shaking. 0 = shakes from the first pull, 1 = never.",
      },
      shake: {
        value: 0.05, min: 0, max: 0.5, step: 0.005, unit: "b",
        label: "Shudder amount",
        info: "How far the string shakes when fully wound.",
      },
      shakeSpeed: {
        value: 26, min: 1, max: 80, step: 1, unit: "Hz",
        label: "Shudder speed",
        info: "How fast it shakes. High and small reads as a tight buzz; low and wide as a heavy wobble.",
      },
    },
  },

  edges: {
    group: "string",
    label: "Edges",
    info: "What happens when the string or spider reaches the edge of the window.",
    params: {
      enabled: {
        value: true,
        label: "Bounce off the edges",
        info: "Keeps the string and spider inside the window instead of letting them go off-screen.",
      },
      bounce: {
        value: 0.45, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Bounciness",
        info: "How much speed comes back off an edge. 0 = stops dead against it; 1 = bounces back at full speed.",
      },
      friction: {
        value: 0.15, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Edge friction",
        info: "How much it's slowed while sliding along an edge. 0 = slides freely, 1 = sticks.",
      },
      spiderSize: {
        value: 0.35, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Spider size at edges",
        info: "How big the spider counts as when it hits an edge, as a fraction of its width. Higher keeps more of it on screen.",
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
      leanForce: {
        value: 0.45, min: 0, max: 2, step: 0.01, unit: "×",
        label: "Lean sensitivity",
        info: "How much being moved leans it, on top of gravity. Low = it mostly just hangs, leaning slowly; high = it answers every flick of the cursor.",
      },
      tiltSource: {
        value: "force" as "force" | "string",
        options: {
          force: "The force on it (gravity + how it's moved)",
          string: "The string's direction",
        },
        label: "Leans with",
        info: "Force: it hangs feet-down, and only leans when something moves it — a swing, a yank, a fling. Swinging on a taut string that still leans it along the string, because that's where the force points. String: the older way, where it always lines up with the string's last stretch.",
      },
      tiltAmount: {
        value: 1, min: 0, max: 1.5, step: 0.01, unit: "×",
        label: "Lean amount",
        info: "How far it leans. 1 = full lean; 0 = always upright, whatever is happening.",
      },
      leanSmoothing: {
        value: 6, min: 1, max: 60, step: 0.5, unit: "/s",
        label: "Lean smoothing",
        info: "How much the force is smoothed before it leans the spider (the legs use the same reading). Low = slow, floaty leaning that lags behind; high = it answers every twitch of the cursor.",
      },
      tiltSpring: {
        value: 3.5, min: 0.5, max: 20, step: 0.1, unit: "Hz",
        label: "Lean springiness",
        info: "How quickly it turns to the lean it wants. High = snaps around; low = lazy, heavy turning.",
      },
      tiltDamping: {
        value: 0.85, min: 0.05, max: 1.5, step: 0.01,
        label: "Tilt damping",
        info: "Low = it overshoots and rocks before settling; 1 = turns smoothly with no overshoot.",
      },
      tiltSlack: {
        value: 1, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Upright when slack",
        info: "Only used when \"Leans with\" is set to the string: a loose string can't say which way up the spider hangs, so 1 = it straightens up as the string goes slack.",
      },
      tiltMax: {
        value: 32, min: 0, max: 180, step: 1, unit: "°",
        label: "Max lean",
        info: "Furthest it will lean from upright, however hard it's flung or wherever the string goes.",
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
      home: {
        value: "eye" as "eye" | "drawn",
        options: { eye: "Middle of the eye", drawn: "Where they're drawn" },
        label: "Pupils start from",
        info: "The pupils are drawn a little inward of their eyes' middles, which is a nice resting face but means each one starts its travel from a different place: look left and the left pupil ends up mid-eye while the right one hits the rim. \"Middle of the eye\" measures every look from the middle so both move alike, and the resting inward look comes from the slider below instead. \"Where they're drawn\" keeps the artwork's own offset and the lopsidedness that comes with it.",
      },
      restX: {
        value: 0, min: -1, max: 1, step: 0.01,
        label: "Resting look (across)",
        info: "Where the pupils sit when not looking at anything: −1 = far left of the eye, 1 = far right. Both eyes move the same way.",
      },
      restIn: {
        value: 0.28, min: -1, max: 1, step: 0.01,
        label: "Resting look (inward)",
        info: "The mirrored version: both pupils toward each other, so it rests slightly cross-eyed. Negative pushes them apart. 0.28 is about how far inward they're drawn in the artwork.",
      },
      restY: {
        value: 0, min: -1, max: 1, step: 0.01,
        label: "Resting look (up/down)",
        info: "−1 = top of the eye, 1 = bottom.",
      },
      follow: { value: true, label: "Follow the cursor", info: "The pupils look toward the cursor when it's nearby." },
      aim: {
        value: "point" as "point" | "trail",
        options: { point: "Point at it", trail: "Trail after it" },
        label: "How they aim",
        info: "Point at it: the pupil turns to face the cursor and travels the same amount however far away it is. Trail after it: the pupil copies where the cursor actually is, only reaching the rim of the eye once the cursor is a full look away — so small movements in front of its face barely shift the eyes.",
      },
      range: {
        value: 0.75, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Look range",
        info: "How far the pupils can move inside the eye when looking. 1 = right to the edge of the eye.",
      },
      radius: {
        value: 4, min: 0.5, max: 20, step: 0.1, unit: "b",
        label: "Notice distance",
        info: "How close the cursor has to be before it looks at all, measured from the point between the eyes so both eyes always agree about it. Further away, the pupils drift back to rest.",
      },
      converge: {
        value: 1, min: -1, max: 2, step: 0.05, unit: "×",
        label: "Converge",
        info: "Where each eye aims from, which is the whole of what makes it cross-eyed. 1 = its own centre, so a cursor between the eyes or right in front of its face turns them inward. 0 = both aim from the point between them, so they always point the same way and never cross. Above 1 exaggerates it; below 0 goes wall-eyed.",
      },
      settle: {
        value: 1, min: 0, max: 4, step: 0.05, unit: "eyes",
        label: "Settles within",
        info: "Something sitting on an eye can't be looked at with that eye, and \"which way is it?\" stops meaning anything — a pixel either side of the middle would throw the pupil to the top or the bottom of the eye, which is what makes the two look disjointed. Inside this distance of an eye, measured in multiples of that eye's own radius, its pupil eases back to resting instead. 1 = it settles as the cursor crosses the eye itself. 0 = no settling, and the flipping comes back.",
      },
      reach: {
        value: 1, min: 0.05, max: 10, step: 0.05, unit: "b",
        label: "Trail distance",
        info: "Only used by \"Trail after it\": how far away the cursor has to be for the pupil to reach the rim of the eye. Smaller = the eyes hit their limit sooner and small movements matter more.",
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
      rootDepth: {
        value: 1.5, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Hip overlap",
        info: "How far each leg's hidden base reaches into the body (in half-widths of the leg where it was cut off). It keeps the leg flush with the body: no faint seam at the join, and no gap when a leg turns. 0 = legs end at their straight cut; too deep and the base can poke out past the body's edge.",
      },
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

  legReact: {
    group: "spidey",
    label: "Leg reactions",
    info: "What the legs do when the cursor comes near them. Flip through the modes to see which feels right.",
    params: {
      mode: {
        value: "flinch" as "off" | "flinch" | "reach" | "curl" | "wiggle" | "wave" | "flick",
        options: {
          off: "Nothing",
          flinch: "Flinch away from the cursor",
          reach: "Reach toward the cursor",
          curl: "Curl up",
          wiggle: "Wiggle",
          wave: "Wave (ripples from leg to leg)",
          flick: "Flick once, as the cursor arrives",
        },
        label: "Reaction",
        info: "Flinch and reach lean away from or toward the cursor. Curl bends the leg up. Wiggle and wave shake while the cursor is near. Flick gives one kick and lets the leg's spring settle it.",
      },
      scope: {
        value: "each" as "each" | "nearest" | "all",
        options: {
          each: "Each leg on its own",
          nearest: "Only the nearest leg",
          all: "All legs together",
        },
        label: "Which legs react",
        info: "On its own: every leg answers the cursor by how near it is. Nearest: only the closest leg moves. Together: all six react as one, by whichever leg is nearest.",
      },
      radius: {
        value: 0.5, min: 0.05, max: 3, step: 0.01, unit: "b",
        label: "Notice distance",
        info: "How close the cursor has to get to a leg before it reacts at all.",
      },
      strength: {
        value: 18, min: 0, max: 60, step: 0.5, unit: "°",
        label: "Strength",
        info: "How far the leg moves when the cursor is right on it (or the size of the kick, for flick).",
      },
      falloff: {
        value: 1.5, min: 0.5, max: 4, step: 0.05,
        label: "Falloff",
        info: "How sharply the reaction fades with distance. 1 = even; higher = nothing until the cursor is almost touching.",
      },
      speed: {
        value: 6, min: 0.2, max: 20, step: 0.1, unit: "Hz",
        label: "Wiggle speed",
        info: "Wiggle and wave only: how fast the legs shake.",
      },
      waveOffset: {
        value: 60, min: 0, max: 180, step: 5, unit: "°",
        label: "Wave offset",
        info: "Wave only: how far behind each other the legs are in the ripple. 0 = they all move as one.",
      },
      ease: {
        value: 10, min: 1, max: 40, step: 0.5, unit: "/s",
        label: "Ease in/out",
        info: "How quickly a leg takes up the reaction and lets it go. Low = slow and gooey; high = instant and twitchy.",
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

  crisp: {
    group: "spidey",
    label: "Crispness",
    info: "Thin edges look uneven when they land between the screen's pixels: one side of the outline thin and grey, another a pixel thicker. These line the spider and string up with the pixels.",
    params: {
      wholePixels: {
        value: true,
        label: "Whole-pixel sizes",
        info: "Rounds the outline and string thickness, and the body's width and height, to whole screen pixels, so the outline is equally thick at the top and bottom of the head. Changes sizes by under half a pixel.",
      },
      snap: {
        value: true,
        label: "Snap to pixels when still",
        info: "Once the spider has settled, eases it (and the string) by under half a pixel onto the pixel grid and fully upright, so its edges are perfectly crisp. Eases off as soon as it moves. With the breeze on it never quite settles: set String → Breeze → Strength to 0 for this to kick in. Breathing also moves the edges.",
      },
      snapSpeed: {
        value: 4, min: 0.5, max: 30, step: 0.5, unit: "px/s",
        label: "Still: slower than",
        info: "Counts as settled when moving slower than this…",
      },
      snapAngle: {
        value: 0.6, min: 0.05, max: 5, step: 0.05, unit: "°",
        label: "Still: tilted less than",
        info: "…and tilted less than this…",
      },
      snapHold: {
        value: 0.25, min: 0, max: 2, step: 0.05, unit: "s",
        label: "Still: for at least",
        info: "…for at least this long, so snapping doesn't flick on and off at the ends of a swing.",
      },
      snapEase: {
        value: 0.15, min: 0, max: 1, step: 0.01, unit: "s",
        label: "Snap ease",
        info: "How long it takes to ease onto the pixel grid (and back off it). 0 = instant.",
      },
    },
  },

  // ── Animations ────────────────────────────────────────────────────────────

  dropIn: {
    group: "animation",
    label: "Drop in",
    info: "The abseil: how fast the thread spins out, what the legs do on the way down, and how it turns upright at the end.",
    params: {
      speed: {
        value: 1.2, min: 0.1, max: 8, step: 0.05, unit: "b/s",
        label: "Descent speed",
        info: "How fast the thread spins out, in b per second.",
      },
      attachY: {
        value: 0.95, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Thread comes from",
        info: "Where the thread leaves the spider while it's dropping, top to bottom of the drawing. Upside down the drawing is flipped, so 1 puts the thread at the top of the screen with the spider hanging below it — and right next to the legs holding on.",
      },
      startLength: {
        value: 0.04, min: 0, max: 0.5, step: 0.01, unit: "×",
        label: "Starting thread",
        info: "How much thread it starts with, as a fraction of the full length. 0 starts it right up inside the b.",
      },
      upsideDown: {
        value: true,
        label: "Starts upside down",
        info: "Hangs head-down on the way out, the way a real spider drops on its silk, then turns upright at the end.",
      },
      gripPair: {
        value: "3" as "1" | "2" | "3",
        options: { "1": "Front pair", "2": "Middle pair", "3": "Rear pair" },
        label: "Legs holding the thread",
        info: "Which pair of legs reaches for the thread and works it on the way down, the way a real spider draws silk with its hind legs. They let go and return to normal as it turns upright.",
      },
      grip: {
        value: 1, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Grip",
        info: "How far those legs turn toward the thread. 0 = they ignore it and just wiggle with the rest.",
      },
      work: {
        value: "hand" as "hand" | "steady" | "together" | "one",
        options: {
          hand: "Hand over hand",
          steady: "Just holds on",
          together: "Both together",
          one: "One leg works",
        },
        label: "What the holding legs do",
        info: "Hand over hand: the two take turns, one reaching further up the thread while the other draws down — the way you'd climb down a rope. Just holds on: they grip and stay put, which is closest to the truth, since the silk is spun out of its back end and the legs only steady the line. Both together: they work in step, opening and closing at once. One leg works: one holds the line steady while the other does the pulling.",
      },
      workSlide: {
        value: 0.45, min: 0, max: 1, step: 0.01, unit: "×",
        label: "How far they reach",
        info: "How far up and down the thread a leg's grip slides on each beat, as a fraction of \"Where they hold on\". This is most of what you see in the hand-over-hand: the leg's angle follows from where it's reaching for. 0 = they keep hold of the same spot.",
      },
      gripPull: {
        value: 14, min: 0, max: 40, step: 0.5, unit: "°",
        label: "Wrist flick",
        info: "An extra turn of the holding legs on each beat, on top of the reaching. 0 = the angle is left to follow the thread on its own.",
      },
      gripHip: {
        value: 1, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Hips move to the thread",
        info: "The holding legs are drawn with their hips out on the sides of the body, which is nowhere near the thread — turning them toward it just looks like it's rubbing its belly. While it drops, this slides those two hips from where they're drawn up to where the thread leaves its body, so the legs genuinely hold the line. They slide back as it turns upright, on the same fade as the grip, so you never catch them moving. 0 leaves them where they're drawn.",
      },
      gripSpread: {
        value: 0.3, min: 0, max: 0.8, step: 0.01, unit: "×",
        label: "…and sit this far apart",
        info: "How far apart the two moved hips sit, either side of the thread, as a fraction of the spider's width. Too close and the legs land on top of each other and read as one; too far and they're back out on the flanks where they can't reach.",
      },
      gripAlong: {
        value: 0.5, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Where they hold on",
        info: "How far up the thread the holding legs reach for it, as a multiple of the spider's width. 0 reaches for the spot where the thread meets its body, which folds them in over its back; further up and they hold the line above them, which reads better.",
      },
      gripReach: {
        value: 70, min: 0, max: 180, step: 1, unit: "°",
        label: "Grip reach",
        info: "The furthest those legs will turn from their normal pose to get to the thread.",
      },
      wiggle: {
        value: 10, min: 0, max: 45, step: 0.5, unit: "°",
        label: "Leg work (other legs)",
        info: "How much the legs that aren't holding the thread work while it's paying it out.",
      },
      wiggleSpeed: {
        value: 1.2, min: 0.2, max: 15, step: 0.1, unit: "Hz",
        label: "Leg work speed",
        info: "How fast the legs work on the way down, including the hand-over-hand of the legs holding the thread. Much above about 2 and it stops reading as legs working and starts to look like shimmering.",
      },
      curl: {
        value: 6, min: -20, max: 30, step: 0.5, unit: "°",
        label: "Other legs tuck in",
        info: "How much the legs that aren't holding the thread curl in toward the body on the way down, the way a spider tucks up on a dragline. Negative splays them out instead. Fades out with the rest of the drop as it turns upright.",
      },
      turnTime: {
        value: 0.6, min: 0.05, max: 3, step: 0.05, unit: "s",
        label: "Turn upright",
        info: "How long it takes to turn the right way up once the thread is fully out.",
      },
      pauseSpeed: {
        value: 0.8, min: 0, max: 10, step: 0.1, unit: "b/s",
        label: "Waits above",
        info: "While you're holding it, or it's swinging sideways faster than this, it stops paying out thread and waits. Its own descent never counts, and small movements don't interrupt it.",
      },
    },
  },

  blink: {
    group: "animation",
    label: "Blinking",
    info: "The eyes shut and open again, now and then.",
    params: {
      enabled: { value: true, label: "Blinks", info: "Off = the eyes stay open." },
      style: {
        value: "squash" as "squash" | "lids",
        options: { squash: "Squash flat", lids: "Close into lids" },
        label: "How it blinks",
        info: "Squash flat: the eye squashes down to nothing and the body shows through, as it always has. Close into lids: it squashes, and as it goes the eye turns into a shut ◡ line, like the closed eyes in the reference drawings.",
      },
      everyFrom: {
        value: 2.5, min: 0.2, max: 20, step: 0.1, unit: "s",
        label: "At least every",
        info: "Shortest gap between blinks.",
      },
      everyTo: {
        value: 7, min: 0.3, max: 30, step: 0.1, unit: "s",
        label: "At most every",
        info: "Longest gap between blinks. The gap is picked at random between the two.",
      },
      shutFor: {
        value: 0.16, min: 0.04, max: 1, step: 0.01, unit: "s",
        label: "Blink length",
        info: "How long one blink takes, shut and open again.",
      },
      amount: {
        value: 1, min: 0.2, max: 1, step: 0.01, unit: "×",
        label: "How far it shuts",
        info: "1 = fully closed; lower leaves it half-lidded, which reads as sleepy.",
      },
      doubleChance: {
        value: 0.25, min: 0, max: 1, step: 0.01,
        label: "Double blink",
        info: "How often a blink is followed straight away by a second one.",
      },
    },
  },

  gaze: {
    group: "animation",
    label: "Idle eyes",
    info: "Where the eyes wander when the cursor isn't near enough to hold their attention.",
    params: {
      enabled: { value: true, label: "Eyes wander", info: "Off = it stares straight ahead when nothing's happening." },
      everyFrom: {
        value: 1.2, min: 0.2, max: 15, step: 0.1, unit: "s",
        label: "At least every",
        info: "Shortest gap before it looks somewhere else.",
      },
      everyTo: {
        value: 4, min: 0.3, max: 20, step: 0.1, unit: "s",
        label: "At most every",
        info: "Longest gap before it looks somewhere else.",
      },
      range: {
        value: 0.7, min: 0, max: 1, step: 0.01, unit: "×",
        label: "How far it looks",
        info: "As a fraction of the room inside the eye. 1 = right to the edge.",
      },
      centreChance: {
        value: 0.3, min: 0, max: 1, step: 0.01,
        label: "Looks ahead",
        info: "How often it looks straight ahead instead of somewhere new.",
      },
      speed: {
        value: 7, min: 0.5, max: 30, step: 0.5, unit: "/s",
        label: "Eye speed",
        info: "How quickly the eyes move to the new spot. High = darting; low = drifting.",
      },
    },
  },

  idleLegs: {
    group: "animation",
    label: "Idle legs",
    info: "A leg stretches out and settles back, now and then.",
    params: {
      enabled: { value: true, label: "Legs stretch", info: "Off = the legs only move with the swing." },
      everyFrom: {
        value: 3, min: 0.3, max: 30, step: 0.1, unit: "s",
        label: "At least every",
        info: "Shortest gap between stretches.",
      },
      everyTo: {
        value: 9, min: 0.5, max: 60, step: 0.5, unit: "s",
        label: "At most every",
        info: "Longest gap between stretches.",
      },
      time: {
        value: 0.9, min: 0.1, max: 4, step: 0.05, unit: "s",
        label: "Stretch length",
        info: "How long one stretch takes, out and back.",
      },
      reach: {
        value: 16, min: 0, max: 60, step: 0.5, unit: "°",
        label: "How far it stretches",
        info: "How far the leg reaches at the top of the stretch.",
      },
    },
  },

  feed: {
    group: "animation",
    label: "Feeding",
    info: "Play this to put a fly on the page. Drag it to the spider: the mouth opens as it comes near, and eating it makes the spider a little bigger. Back to default puts its size back.",
    params: {
      growth: {
        value: 0.1, min: 0, max: 0.5, step: 0.01, unit: "×",
        label: "Growth per fly",
        info: "How much bigger it gets each time it eats. 0.1 = 10% bigger, and the next one is 10% on top of that.",
      },
      maxSize: {
        value: 2.5, min: 1, max: 6, step: 0.1, unit: "×",
        label: "Size limit",
        info: "How big eating can ever make it, compared with its normal size.",
      },
      growTime: {
        value: 0.8, min: 0.1, max: 4, step: 0.05, unit: "s",
        label: "Growing takes",
        info: "How long the growth takes. It eases in and out rather than popping.",
      },
      openDistance: {
        value: 1.2, min: 0.1, max: 6, step: 0.05, unit: "b",
        label: "Mouth opens within",
        info: "How close the fly has to get before the mouth starts opening.",
      },
      eatDistance: {
        value: 0.35, min: 0.05, max: 3, step: 0.05, unit: "b",
        label: "Eats within",
        info: "Let go this close to its mouth and the fly is eaten.",
      },
      mouthOpen: {
        value: 1.8, min: 1, max: 4, step: 0.05, unit: "×",
        label: "Mouth opening",
        info: "How much taller the mouth gets when it's wide open.",
      },
      mouthSpeed: {
        value: 9, min: 1, max: 30, step: 0.5, unit: "/s",
        label: "Mouth speed",
        info: "How quickly the mouth opens and closes.",
      },
      flySize: {
        value: 0.22, min: 0.05, max: 1, step: 0.01, unit: "b",
        label: "Fly size",
        info: "How big the fly is, next to the letter b.",
      },
      wingSpeed: {
        value: 14, min: 0, max: 40, step: 0.5, unit: "Hz",
        label: "Wing beat",
        info: "How fast its wings go.",
      },
      flutter: {
        value: 0.05, min: 0, max: 0.5, step: 0.01, unit: "b",
        label: "Hover drift",
        info: "How much it mills about in the air when you aren't holding it.",
      },
      grabArea: {
        value: 0.8, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Grab area",
        info: "Extra invisible area around the fly that still picks it up.",
      },
      spawnX: {
        value: 0.5, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Appears across",
        info: "Where it turns up, across the window.",
      },
      spawnY: {
        value: 0.55, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Appears down",
        info: "Where it turns up, down the window.",
      },
    },
  },

  faceMotion: {
    group: "spidey",
    label: "Face motion",
    info: "How expressions blend in and out, the pupils' inertia, and the squash.",
    params: {
      speed: {
        value: 9, min: 1, max: 40, step: 0.5, unit: "/s",
        label: "Expression speed",
        info: "How quickly the face moves to a new expression. Reactions (Impact, Poked, Grabbed…) go three times as fast.",
      },
      preview: {
        value: 2.5, min: 0.5, max: 10, step: 0.1, unit: "s",
        label: "Played faces last",
        info: "How long an expression played from the Faces tab stays up.",
      },
      previewShove: { value: true, label: "Played fast faces throw it", info: "Playing Thrown, Scared or Panicked gives the spider a shove too, so you see them with speed lines and all." },
      inertia: {
        value: 0.035, min: 0, max: 0.2, step: 0.001, unit: "",
        label: "Pupil inertia",
        info: "How far the pupils get left behind when it's yanked about, for each b/s² of acceleration, as a fraction of the room in the eye. Shoot it right and they slosh left, then settle. 0 = off.",
      },
      inertiaSpring: {
        value: 3, min: 0.5, max: 15, step: 0.1, unit: "Hz",
        label: "Pupil springiness",
        info: "How quickly the pupils swing back to where they should be.",
      },
      inertiaDamping: {
        value: 0.35, min: 0.05, max: 1.5, step: 0.01, unit: "",
        label: "Pupil settle",
        info: "Low and they slosh back and forth a few times; high and they settle straight away.",
      },
      tuck: {
        value: 18, min: 0, max: 60, step: 0.5, unit: "°",
        label: "Legs tuck (most)",
        info: "How far the legs curl in for expressions that brace themselves: Grabbed, Scared, Panicked, Surprised.",
      },
      spread: {
        value: 14, min: 0, max: 60, step: 0.5, unit: "°",
        label: "Legs spread (most)",
        info: "How far the legs fan out for Angry.",
      },
      squashSpring: {
        value: 5, min: 0.5, max: 20, step: 0.1, unit: "Hz",
        label: "Squash spring",
        info: "How bouncily the body springs back from being squashed (Faces → Impact).",
      },
      squashDamping: {
        value: 0.3, min: 0.05, max: 1.5, step: 0.01, unit: "",
        label: "Squash settle",
        info: "Low = it wobbles back; high = it just un-squashes.",
      },
    },
  },

  speedLines: {
    group: "spidey",
    label: "Speed lines",
    info: "Little air streaks trailing behind it when it's really moving, so a throw feels like a throw and a fall like a fall.",
    params: {
      enabled: { value: true, label: "Speed lines", info: "Off = no streaks." },
      minSpeed: {
        value: 4, min: 0.5, max: 40, step: 0.5, unit: "b/s",
        label: "Start at",
        info: "Slower than this and there are none.",
      },
      fullSpeed: {
        value: 14, min: 1, max: 80, step: 0.5, unit: "b/s",
        label: "Most at",
        info: "At this speed they're as many and as long as they get.",
      },
      rate: {
        value: 45, min: 1, max: 200, step: 1, unit: "/s",
        label: "How many",
        info: "Streaks per second at full speed.",
      },
      length: {
        value: 0.3, min: 0.02, max: 2, step: 0.01, unit: "b",
        label: "Length",
        info: "",
      },
      thickness: {
        value: 0.014, min: 0.002, max: 0.08, step: 0.001, unit: "b",
        label: "Thickness",
        info: "",
      },
      lifetime: {
        value: 0.22, min: 0.03, max: 2, step: 0.01, unit: "s",
        label: "Last for",
        info: "",
      },
      spread: {
        value: 0.7, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Spread",
        info: "How wide a band behind it they appear in, as a multiple of its size.",
      },
      behind: {
        value: 0.5, min: 0, max: 3, step: 0.05, unit: "×",
        label: "Start behind",
        info: "How far behind the spider they appear, as a multiple of its size.",
      },
      drift: {
        value: 0.08, min: 0.01, max: 1, step: 0.01, unit: "×",
        label: "Drift",
        info: "How fast they drift backwards, as a fraction of its speed.",
      },
    },
  },

  faceHappy: {
    group: "expression",
    label: "Happy",
    info: "Eyes close into happy arcs and it smiles bigger. Set off by being swung gently: playing nicely, as opposed to yeeting it.",
    params: {
      enabled: { value: true, label: "When swung gently", info: "Off = only when played from here." },
      minSpeed: {
        value: 0.8, min: 0, max: 10, step: 0.1, unit: "b/s",
        label: "Swinging at least",
        info: "Slower than this doesn't count as being swung.",
      },
      maxSpeed: {
        value: 3.5, min: 0.5, max: 20, step: 0.1, unit: "b/s",
        label: "…but slower than",
        info: "Faster than this isn't gentle any more.",
      },
      after: {
        value: 1.2, min: 0, max: 10, step: 0.1, unit: "s",
        label: "For at least",
        info: "How long it has to be swung nicely before it cheers up.",
      },
      linger: {
        value: 1.5, min: 0, max: 10, step: 0.1, unit: "s",
        label: "Stays happy for",
        info: "Once it stops being swung.",
      },
      smile: {
        value: 1.25, min: 0.5, max: 2, step: 0.01, unit: "×",
        label: "Smile size",
        info: "",
      },
    },
  },

  faceContent: {
    group: "expression",
    label: "Content",
    info: "Soft happy eyes and a small smile, for a while after it's eaten.",
    params: {
      enabled: { value: true, label: "After eating", info: "Off = only when played from here." },
      hold: {
        value: 3, min: 0, max: 20, step: 0.1, unit: "s",
        label: "Lasts",
        info: "",
      },
    },
  },

  faceExcited: {
    group: "expression",
    label: "Excited",
    info: "Big eyes and an open grin while food is on its way to its mouth.",
    params: {
      enabled: { value: true, label: "When food is near", info: "Off = only when played from here." },
      near: {
        value: 0.25, min: 0, max: 1, step: 0.01, unit: "×",
        label: "Food this close",
        info: "How far into its mouth-opening range the fly has to be (Animations → Feeding → Mouth opens within). 0 = as soon as it's in range, 1 = only right at its mouth.",
      },
      eyes: {
        value: 1.12, min: 0.8, max: 1.6, step: 0.01, unit: "×",
        label: "Eye size",
        info: "",
      },
    },
  },

  faceSuspicious: {
    group: "expression",
    label: "Suspicious",
    info: "Heavy lids and a flat mouth, still watching you. Set off by the cursor hanging around near it without doing anything, like it knows you're up to something.",
    params: {
      enabled: { value: true, label: "When the cursor lurks", info: "Off = only when played from here." },
      radius: {
        value: 1, min: 0.1, max: 6, step: 0.05, unit: "b",
        label: "Cursor within",
        info: "Measured from the edge of the spider.",
      },
      slow: {
        value: 1.2, min: 0.1, max: 10, step: 0.1, unit: "b/s",
        label: "Moving slower than",
        info: "",
      },
      after: {
        value: 2.5, min: 0.2, max: 20, step: 0.1, unit: "s",
        label: "For at least",
        info: "",
      },
      lid: {
        value: 0.45, min: 0, max: 0.9, step: 0.01, unit: "×",
        label: "Lids down",
        info: "",
      },
    },
  },

  faceAngry: {
    group: "expression",
    label: "Angry",
    info: "Brows slanting in, a frown, legs spread wide. Set off by annoyance building up: grabbing, throwing and jolting it all add to it, and it calms down by itself. Kept rare on purpose, so finding it is funny.",
    params: {
      enabled: { value: true, label: "When annoyed enough", info: "Off = only when played from here." },
      at: {
        value: 6, min: 1, max: 40, step: 0.5, unit: "",
        label: "Annoyance above",
        info: "How annoyed it has to get. The next three say what adds how much.",
      },
      grabCost: {
        value: 1, min: 0, max: 10, step: 0.1, unit: "",
        label: "Each grab adds",
        info: "",
      },
      throwCost: {
        value: 1.5, min: 0, max: 10, step: 0.1, unit: "",
        label: "Each hard throw adds",
        info: "Up to twice this for a really hard one.",
      },
      impactCost: {
        value: 1, min: 0, max: 10, step: 0.1, unit: "",
        label: "Each jolt adds",
        info: "",
      },
      calm: {
        value: 6, min: 0.5, max: 60, step: 0.5, unit: "s",
        label: "Calms down over",
        info: "How quickly annoyance fades.",
      },
      hold: {
        value: 2, min: 0, max: 20, step: 0.1, unit: "s",
        label: "Stays angry for at least",
        info: "",
      },
      slant: {
        value: 1, min: 0, max: 1.5, step: 0.01, unit: "×",
        label: "Brow slant",
        info: "",
      },
    },
  },

  faceSurprised: {
    group: "expression",
    label: "Surprised",
    info: "Big eyes, tiny pupils, a little o, legs flinching in. Set off by whipping the cursor at it; no click needed.",
    params: {
      enabled: { value: true, label: "When the cursor rushes at it", info: "Off = only when played from here." },
      speed: {
        value: 10, min: 1, max: 60, step: 0.5, unit: "b/s",
        label: "Coming in faster than",
        info: "",
      },
      radius: {
        value: 1.5, min: 0.1, max: 6, step: 0.05, unit: "b",
        label: "Within",
        info: "Measured from the edge of the spider.",
      },
      hold: {
        value: 0.5, min: 0.05, max: 5, step: 0.05, unit: "s",
        label: "Lasts",
        info: "",
      },
      cooldown: {
        value: 1.5, min: 0, max: 10, step: 0.1, unit: "s",
        label: "Not again for",
        info: "",
      },
    },
  },

  faceScared: {
    group: "expression",
    label: "Scared",
    info: "Worried brows and an open mouth, legs tucked. Set off by moving fast: thrown, falling, swung hard.",
    params: {
      enabled: { value: true, label: "When moving fast", info: "Off = only when played from here." },
      speed: {
        value: 5, min: 0.5, max: 40, step: 0.5, unit: "b/s",
        label: "Faster than",
        info: "",
      },
      linger: {
        value: 0.4, min: 0, max: 5, step: 0.05, unit: "s",
        label: "Lingers for",
        info: "Once it slows down again.",
      },
    },
  },

  facePanicked: {
    group: "expression",
    label: "Panicked",
    info: "Huge eyes, pinprick pupils and a wobbling scream. Scared, but for really fast, and the faster it goes the more of it you get.",
    params: {
      enabled: { value: true, label: "When moving really fast", info: "Off = only when played from here." },
      speed: {
        value: 9, min: 1, max: 60, step: 0.5, unit: "b/s",
        label: "Starts at",
        info: "",
      },
      full: {
        value: 16, min: 1, max: 80, step: 0.5, unit: "b/s",
        label: "Full panic at",
        info: "",
      },
      linger: {
        value: 0.5, min: 0, max: 5, step: 0.05, unit: "s",
        label: "Lingers for",
        info: "",
      },
      eyes: {
        value: 1.35, min: 1, max: 2, step: 0.01, unit: "×",
        label: "Eye size",
        info: "",
      },
      pupils: {
        value: 0.42, min: 0.2, max: 1, step: 0.01, unit: "×",
        label: "Pupil size",
        info: "",
      },
    },
  },

  faceGrabbed: {
    group: "expression",
    label: "Grabbed",
    info: "> < eyes, a wobbly grimace, legs braced in. While you're holding it.",
    params: {
      enabled: { value: true, label: "While held", info: "Off = only when played from here." },
      delay: {
        value: 0.2, min: 0, max: 2, step: 0.01, unit: "s",
        label: "After holding for",
        info: "A short delay, so a quick click can show Poked instead.",
      },
      string: { value: false, label: "Grabbing the string counts", info: "Off = only when you've got hold of the spider itself." },
    },
  },

  faceThrown: {
    group: "expression",
    label: "Thrown",
    info: "Mismatched wonky eyes and a little o, the moment you let go of it fast.",
    params: {
      enabled: { value: true, label: "When let go fast", info: "Off = only when played from here." },
      speed: {
        value: 4, min: 0.5, max: 40, step: 0.5, unit: "b/s",
        label: "Faster than",
        info: "",
      },
      hold: {
        value: 0.7, min: 0.05, max: 5, step: 0.05, unit: "s",
        label: "Lasts",
        info: "",
      },
    },
  },

  faceImpact: {
    group: "expression",
    label: "Impact",
    info: "— — eyes, a flat mouth and a squished body for a split second, then it springs back. Set off by a sudden jolt: the string snapping taut, or hitting the edge of the window.",
    params: {
      enabled: { value: true, label: "When jolted", info: "Off = only when played from here." },
      jolt: {
        value: 70, min: 5, max: 600, step: 5, unit: "b/s²",
        label: "A jolt harder than",
        info: "How sudden a stop it takes. Lower and ordinary swinging sets it off.",
      },
      hold: {
        value: 0.16, min: 0.05, max: 1, step: 0.01, unit: "s",
        label: "Lasts",
        info: "",
      },
      squash: {
        value: 0.35, min: 0, max: 0.8, step: 0.01, unit: "×",
        label: "Squash",
        info: "How much it squashes along the way it was hit.",
      },
      bulge: {
        value: 0.6, min: 0, max: 1.5, step: 0.01, unit: "×",
        label: "Bulge",
        info: "How much it bulges out the other way while squashed, as a fraction of the squash. 0 = it just gets thinner; 1 = it keeps its size, like a squashed ball.",
      },
      axis: {
        value: "hit" as "hit" | "vertical" | "horizontal",
        options: { hit: "Along the hit", vertical: "Always flat", horizontal: "Always thin" },
        label: "Squash direction",
        info: "Along the hit: squashes flat when the string snaps taut, thin and tall when it hits the side of the window, and anything in between. Played from here, it takes turns so you can see both. Always flat / Always thin: one way only.",
      },
    },
  },

  faceDizzy: {
    group: "expression",
    label: "Dizzy",
    info: "Spiralling or wonky eyes and a crooked mouth, after being whirled around.",
    params: {
      enabled: { value: true, label: "After being spun around", info: "Off = only when played from here." },
      turns: {
        value: 2.5, min: 0.5, max: 20, step: 0.1, unit: "turns",
        label: "After spinning",
        info: "How much swinging round it takes. Every bit of swing around the anchor counts, so hard back-and-forth gets there too.",
      },
      forget: {
        value: 3, min: 0.5, max: 20, step: 0.1, unit: "s",
        label: "Forgets spins over",
        info: "How quickly spinning stops counting once it stops.",
      },
      hold: {
        value: 2.5, min: 0.2, max: 10, step: 0.1, unit: "s",
        label: "Stays dizzy for",
        info: "",
      },
      eyes: {
        value: "spirals" as "spirals" | "wonky",
        options: {spirals: "Spirals", wonky: "Wonky pupils"},
        label: "Dizzy eyes",
        info: "Spirals: the eyes become turning spirals. Wonky pupils: one pupil up, one down, swimming.",
      },
      spin: {
        value: 1.2, min: 0, max: 5, step: 0.05, unit: "Hz",
        label: "Spiral speed",
        info: "How fast the spirals turn, or the wonky pupils swim.",
      },
    },
  },

  faceAnnoyed: {
    group: "expression",
    label: "Annoyed",
    info: "The ಠ_ಠ: half-shut eyes still staring right at you, and a flat little mouth. Set off by being grabbed over and over.",
    params: {
      enabled: { value: true, label: "When grabbed again and again", info: "Off = only when played from here." },
      count: {
        value: 4, min: 2, max: 20, step: 1, unit: "",
        label: "After this many grabs",
        info: "",
      },
      window: {
        value: 6, min: 1, max: 60, step: 0.5, unit: "s",
        label: "…within",
        info: "",
      },
      hold: {
        value: 3, min: 0.2, max: 20, step: 0.1, unit: "s",
        label: "Stays annoyed for",
        info: "",
      },
    },
  },

  facePoked: {
    group: "expression",
    label: "Poked",
    info: "One eye scrunched shut and a sideways mouth: ow. Set off by a quick click on it without dragging.",
    params: {
      enabled: { value: true, label: "When clicked quickly", info: "Off = only when played from here." },
      time: {
        value: 0.2, min: 0.05, max: 1, step: 0.01, unit: "s",
        label: "A click shorter than",
        info: "",
      },
      move: {
        value: 0.15, min: 0, max: 2, step: 0.01, unit: "b",
        label: "…moving less than",
        info: "",
      },
      hold: {
        value: 0.5, min: 0.05, max: 5, step: 0.05, unit: "s",
        label: "Lasts",
        info: "",
      },
    },
  },

  faceSmug: {
    group: "expression",
    label: "Smug",
    info: "One eye half-closed and a crooked grin, very pleased with itself. Set off by clicks that just miss it.",
    params: {
      enabled: { value: true, label: "When you keep missing it", info: "Off = only when played from here." },
      count: {
        value: 3, min: 1, max: 20, step: 1, unit: "",
        label: "After this many misses",
        info: "",
      },
      window: {
        value: 5, min: 1, max: 60, step: 0.5, unit: "s",
        label: "…within",
        info: "",
      },
      radius: {
        value: 0.8, min: 0.05, max: 4, step: 0.05, unit: "b",
        label: "A miss is a click within",
        info: "Measured from the edge of the spider.",
      },
      hold: {
        value: 2.5, min: 0.2, max: 20, step: 0.1, unit: "s",
        label: "Stays smug for",
        info: "",
      },
    },
  },

  faceSleepy: {
    group: "expression",
    label: "Sleepy",
    info: "Drowsy, after a while with nothing going on: its lids sink lower and lower, and now and then its eyes slide shut and it catches itself, until it falls asleep.",
    params: {
      enabled: { value: true, label: "When nothing happens for a while", info: "Off = only when played from here." },
      after: {
        value: 30, min: 3, max: 600, step: 1, unit: "s",
        label: "Nothing happening for",
        info: "Any cursor movement, click or motion resets this.",
      },
      lidFrom: {
        value: 0.35, min: 0, max: 0.95, step: 0.01, unit: "×",
        label: "Lids at first",
        info: "How far its lids droop when it first gets drowsy.",
      },
      lidTo: {
        value: 0.85, min: 0, max: 0.97, step: 0.01, unit: "×",
        label: "Lids just before sleep",
        info: "How far they've sunk by the time it falls asleep (Asleep → Nothing happening for).",
      },
      nods: { value: true, label: "Nods off", info: "Now and then its eyes slide shut and it catches itself." },
      nodEvery: {
        value: 4, min: 0.5, max: 20, step: 0.1, unit: "s",
        label: "Nods every",
        info: "How often its eyes slide shut while it's drowsy.",
      },
      wakeMove: {
        value: 0.25, min: 0, max: 3, step: 0.01, unit: "b",
        label: "Cursor has to move",
        info: "How far the cursor has to move to count as you being around, and to wake it. A resting hand still twitches the cursor a pixel or two, which shouldn't keep it awake. 0 = any movement at all.",
      },
    },
  },

  faceAsleep: {
    group: "expression",
    label: "Asleep",
    info: "Eyes shut, mouth a small o, hanging a little lower on its string. Moving the cursor wakes it.",
    params: {
      enabled: { value: true, label: "When nothing happens for longer", info: "Off = only when played from here." },
      after: {
        value: 60, min: 5, max: 1200, step: 1, unit: "s",
        label: "Nothing happening for",
        info: "",
      },
      sag: {
        value: 0.08, min: 0, max: 0.5, step: 0.01, unit: "×",
        label: "Hangs lower by",
        info: "As a fraction of the string's length.",
      },
      zees: { value: true, label: "Floating Z's", info: "Little Z's drift up off its head while it sleeps." },
      zeeEvery: {
        value: 1.3, min: 0.2, max: 10, step: 0.1, unit: "s",
        label: "A Z every",
        info: "How often a new Z floats up.",
      },
      zeeSize: {
        value: 0.16, min: 0.02, max: 0.5, step: 0.01, unit: "b",
        label: "Z size",
        info: "How big they are when they're fully grown.",
      },
      zeeRise: {
        value: 0.9, min: 0, max: 3, step: 0.05, unit: "b",
        label: "Z's float up",
        info: "How far each Z rises before it's gone.",
      },
      zeeDrift: {
        value: 0.45, min: -2, max: 2, step: 0.05, unit: "b",
        label: "Z's drift sideways",
        info: "Negative drifts them left.",
      },
      zeeLife: {
        value: 2, min: 0.2, max: 8, step: 0.1, unit: "s",
        label: "Z's last",
        info: "How long each Z takes to float up and fade.",
      },
    },
  },

  faceWake: {
    group: "expression",
    label: "Waking up",
    info: "How it comes round when something wakes it from Sleepy or Asleep.",
    params: {
      enabled: { value: true, label: "When woken", info: "Off = only when played from here." },
      style: {
        value: "groggy" as "groggy" | "yawn" | "startled",
        options: { groggy: "Groggy", yawn: "Big yawn", startled: "Startled" },
        label: "How it wakes",
        info: "Groggy: its eyes crack open under heavy lids, it blinks slowly, then they lift. Big yawn: it screws its eyes shut, stretches into a huge yawn, then opens them. Startled: its eyes pop open enormous, then it blinks.",
      },
      hold: {
        value: 1.6, min: 0.1, max: 5, step: 0.05, unit: "s",
        label: "Takes",
        info: "How long waking up takes, start to finish. The yawn looks best at about 2s, Startled at about 0.3s.",
      },
      stretch: {
        value: 0.1, min: 0, max: 0.4, step: 0.01, unit: "×",
        label: "Yawn stretch",
        info: "Big yawn only: how much it stretches taller mid-yawn.",
      },
      eyes: {
        value: 1.4, min: 1, max: 2, step: 0.01, unit: "×",
        label: "Startled eye size",
        info: "Startled only.",
      },
    },
  },

  faceTired: {
    group: "expression",
    label: "Deadpan",
    info: "Tiny blank pupils, heavy lids, a flat mouth, and it stops reacting to anything for a bit. What it does after a ridiculous amount of abuse.",
    params: {
      enabled: { value: true, label: "After far too much", info: "Off = only when played from here." },
      at: {
        value: 14, min: 2, max: 80, step: 0.5, unit: "",
        label: "Annoyance above",
        info: "The same annoyance as Angry (and what adds to it is set there), but further up.",
      },
      hold: {
        value: 4, min: 0.5, max: 30, step: 0.1, unit: "s",
        label: "Ignores you for",
        info: "",
      },
    },
  },

  faceSearch: {
    group: "expression",
    label: "Looking for you",
    info: "When the cursor leaves the page, it looks toward where it went, then the other way, then gives up.",
    params: {
      enabled: { value: true, label: "When the cursor leaves the page", info: "Off = only when played from here." },
      after: {
        value: 0.3, min: 0, max: 5, step: 0.05, unit: "s",
        label: "Starts after",
        info: "",
      },
      look: {
        value: 0.9, min: 0.1, max: 5, step: 0.05, unit: "s",
        label: "Looks each way for",
        info: "",
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

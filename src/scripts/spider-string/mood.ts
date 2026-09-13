import { config } from "./config";
import { type Face, type FaceLook, easeFace, faceFor, neutralFace } from "./face";
import { isIgnored } from "./ignore";
import type { Rope } from "./rope";

/**
 * What the spider feels about what you're doing to it, and so what face it pulls.
 *
 * Every expression is behavioural: something sets it off (being grabbed, thrown, jolted, spun,
 * left alone, stared at…) and it lasts a while. When several are going at once, the one highest
 * in PRIORITY wins, and the face eases from one to the next. Each has a section in the Faces
 * tab named after it, and playing that section shows the expression on its own for a moment.
 */

type Vec = [number, number];

/** Expression → its settings section, which is also the id it's played by. Highest priority first. */
const SECTIONS = {
  tired: "faceTired",
  impact: "faceImpact",
  wake: "faceWake",
  grabbed: "faceGrabbed",
  poked: "facePoked",
  panicked: "facePanicked",
  thrown: "faceThrown",
  scared: "faceScared",
  dizzy: "faceDizzy",
  angry: "faceAngry",
  annoyed: "faceAnnoyed",
  surprised: "faceSurprised",
  smug: "faceSmug",
  excited: "faceExcited",
  content: "faceContent",
  happy: "faceHappy",
  suspicious: "faceSuspicious",
  searching: "faceSearch",
  asleep: "faceAsleep",
  sleepy: "faceSleepy",
} as const;

export type Expression = keyof typeof SECTIONS;
const PRIORITY = Object.keys(SECTIONS) as Expression[];
const BY_SECTION = new Map(PRIORITY.map((e) => [SECTIONS[e] as string, e]));

/** Seconds after the page loads before it reacts to anything: its first drop onto the string is not something you did. */
const SETTLE = 1.2;
/** These arrive fast rather than easing in: they're reactions. */
const SNAPPY = new Set<Expression>(["impact", "wake", "poked", "surprised", "grabbed", "thrown"]);
/** Played from the panel, these give the spider a shove so you see them in context. */
const SHOVE: Partial<Record<Expression, () => number>> = {
  thrown: () => config.faceThrown.speed + 3,
  scared: () => config.faceScared.speed + 3,
  panicked: () => config.facePanicked.full,
};

interface LookContext {
  time: number;
  /** Where "searching" is looking (fractions of the eye's room). */
  toward: Vec;
  /** Which eye a poke scrunches: −1 left, 1 right. */
  wince: number;
}

const looks: Record<Expression, (m: LookContext) => FaceLook> = {
  tired: () => ({
    eyes: { lid: 0.5, pupil: 0.45, lookY: 0.35, lookHold: 0.85 },
    mouth: { drawn: 0, curve: 0, width: 0.35, thick: 0.8 },
  }),
  impact: () => ({
    eyes: { open: 0, flat: 1 },
    mouth: { drawn: 0, curve: 0, width: 0.75 },
    squash: config.faceImpact.squash,
  }),
  wake: () => ({
    eyes: { size: config.faceWake.eyes, pupil: 0.5 },
    mouth: { drawn: 0, curve: 0, open: 0.5, width: 0.32 },
  }),
  grabbed: () => ({
    eyes: { open: 0, squeeze: 1 },
    mouth: { drawn: 0, curve: 0, width: 0.75, wobble: 1, thick: 0.75 },
    tuck: 1,
  }),
  poked: ({ wince }) => {
    const scrunched = { open: 0, squeeze: 1 };
    const wary = { lid: 0.12 };
    return {
      left: wince < 0 ? scrunched : wary,
      right: wince > 0 ? scrunched : wary,
      mouth: { drawn: 0, curve: -0.25, skew: 0.7 * wince, width: 0.35 },
      tuck: 0.4,
    };
  },
  panicked: () => ({
    eyes: { size: config.facePanicked.eyes, pupil: config.facePanicked.pupils, lid: 0.06, slant: -1 },
    mouth: { drawn: 0, curve: -0.35, open: 0.65, roundTop: 1.5, roundBottom: 0.7, width: 0.7, wobble: 0.45 },
    tuck: 1,
  }),
  thrown: () => ({
    left: { size: 1.3, pupil: 0.55, lookX: 0.35, lookY: -0.35, lookHold: 0.7 },
    right: { size: 1.02, pupil: 0.62, lookX: -0.45, lookY: 0.4, lookHold: 0.7 },
    mouth: { drawn: 0, curve: 0, open: 0.45, width: 0.3 },
    tuck: 0.6,
  }),
  scared: () => ({
    eyes: { size: 1.18, pupil: 0.6, lid: 0.08, slant: -0.9 },
    mouth: { drawn: 0, curve: -0.3, open: 0.5, roundTop: 2, roundBottom: 0, width: 0.55 },
    tuck: 1,
  }),
  dizzy: ({ time }) => {
    const mouth = { drawn: 0, curve: 0.35, skew: 0.8, wobble: 0.35, width: 0.6 };
    if (config.faceDizzy.eyes === "wonky") {
      const swim = Math.sin(time * config.faceDizzy.spin * Math.PI * 2);
      return {
        left: { size: 1.12, lookX: 0.3 * swim, lookY: -0.8, lookHold: 1 },
        right: { size: 0.95, lookX: -0.3 * swim, lookY: 0.8, lookHold: 1 },
        mouth,
      };
    }
    return { eyes: { open: 0, spiral: 1 }, mouth };
  },
  angry: () => ({
    eyes: { lid: 0.42, slant: config.faceAngry.slant, pupil: 0.9 },
    mouth: { drawn: 0, curve: -0.7, width: 0.55 },
    spread: 1,
  }),
  annoyed: () => ({
    eyes: { lid: 0.5, slant: 0.05, pupil: 0.85 },
    mouth: { drawn: 0, curve: 0, width: 0.33, thick: 0.8 },
  }),
  surprised: () => ({
    eyes: { size: 1.22, pupil: 0.55 },
    mouth: { drawn: 0, curve: 0, open: 0.5, width: 0.3 },
    tuck: 0.7,
  }),
  smug: () => ({
    left: { lid: 0.48, slant: -0.2 },
    mouth: { drawn: 0, curve: 0.65, skew: -0.9, width: 0.6 },
  }),
  excited: () => ({
    eyes: { size: config.faceExcited.eyes, pupil: 1.1 },
    mouth: { drawn: 0, curve: 0.45, open: 0.6, roundTop: 0.15, roundBottom: 1.85, width: 0.9 },
  }),
  content: () => ({ eyes: { open: 0, happy: 0.9 }, mouth: { drawnSize: 0.9 } }),
  happy: () => ({ eyes: { open: 0, happy: 1 }, mouth: { drawnSize: config.faceHappy.smile } }),
  suspicious: () => ({
    eyes: { lid: config.faceSuspicious.lid, slant: 0.15 },
    mouth: { drawn: 0, curve: 0, width: 0.38, thick: 0.8 },
  }),
  searching: ({ toward }) => ({ eyes: { lookX: toward[0], lookY: toward[1], lookHold: 1 } }),
  asleep: () => ({
    eyes: { open: 0, closed: 1 },
    mouth: { drawn: 0, curve: 0, open: 0.3, width: 0.22 },
    sag: config.faceAsleep.sag,
  }),
  sleepy: () => ({
    eyes: { lid: config.faceSleepy.lid, lookY: 0.25, lookHold: 0.5 },
    mouth: { drawnSize: 0.85 },
  }),
};

export interface MoodFrame {
  /** px per b */
  unit: number;
  anchor: Vec;
  /** The spider's body centre (document px) and half its width (px), from the last frame. */
  center: Vec | null;
  radius: number;
  /** 0–1: how close food is to its mouth (0 when there's none). */
  foodNear: number;
  /** A scripted animation (the drop-in) has the spider, so leave it be. */
  busy: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function createMood(
  root: HTMLElement,
  rope: Rope,
  isHeld: () => boolean,
  isHoldingSpider: () => boolean,
) {
  const face: Face = neutralFace();
  const timers = new Map<Expression, number>();
  const strength = new Map<Expression, number>();
  const on = (e: Expression) => Boolean((config as unknown as Record<string, { enabled?: boolean }>)[SECTIONS[e]].enabled);
  const trigger = (e: Expression, seconds: number, amount = 1) => {
    timers.set(e, Math.max(timers.get(e) ?? 0, seconds));
    strength.set(e, amount);
  };

  let now = 0;
  let selected: Expression | null = null;
  let preview: Expression | null = null;
  let previewLeft = 0;
  let squashSpeed = 0;
  let wince = 1;

  // What it knows about you and itself.
  let unit = 0;
  let center: Vec | null = null;
  let radius = 0;
  let pointer: Vec | null = null;
  let lastPointer: Vec | null = null;
  let cursorGap = Infinity;
  let gone = false;
  let goneAt = 0;
  let exit: Vec = [0, 0];
  let toward: Vec = [0, 0];
  let lastActive = 0;
  let grabAt = -1;
  let grabMoved = 0;
  let releasedAt = -1e9;
  let releaseCounted = true;
  const grabs: number[] = [];
  const misses: number[] = [];
  let annoyance = 0;
  let spin = 0;
  let lastAngle: number | null = null;
  let swung = 0;
  let dwell = 0;
  let surprisedUntil = -1e9;
  let impactUntil = -1e9;
  let previousV: Vec = [0, 0];
  let previousSpeed = 0;
  let blinkAt = -1;

  /** Something happened: it's awake, and if it was asleep, it's startled awake. */
  const stir = () => {
    if ((selected === "sleepy" || selected === "asleep") && preview === null) {
      if (on("wake")) {
        trigger("wake", config.faceWake.hold);
        blinkAt = now + config.faceWake.hold;
      }
    }
    lastActive = now;
    timers.delete("sleepy");
    timers.delete("asleep");
  };

  const docPoint = (e: PointerEvent): Vec => [e.clientX + window.scrollX, e.clientY + window.scrollY];

  window.addEventListener(
    "pointermove",
    (e) => {
      const p = docPoint(e);
      if (pointer && grabAt >= 0) grabMoved += Math.hypot(p[0] - pointer[0], p[1] - pointer[1]);
      pointer = p;
      gone = false;
      stir();
    },
    { passive: true },
  );

  // Bubbling, so a press that grabbed the spider has already been claimed by the time this sees it.
  window.addEventListener("pointerdown", (e) => {
    stir();
    if (e.button !== 0 || isHeld() || isIgnored(e.target) || !center || !unit) return;
    const p = docPoint(e);
    const gap = Math.hypot(p[0] - center[0], p[1] - center[1]) - radius;
    if (gap < config.faceSmug.radius * unit) misses.push(now);
  });

  document.documentElement.addEventListener("pointerleave", () => {
    if (!pointer) return;
    gone = true;
    goneAt = now;
    exit = pointer;
  });

  root.addEventListener("spider:grab", () => {
    grabAt = now;
    grabMoved = 0;
    grabs.push(now);
    annoyance += config.faceAngry.grabCost;
    stir();
  });

  root.addEventListener("spider:release", () => {
    const poke = config.facePoked;
    if (grabAt >= 0 && now - grabAt < poke.time && grabMoved < poke.move * unit && on("poked")) {
      wince = Math.random() < 0.5 ? -1 : 1;
      trigger("poked", poke.hold);
    }
    grabAt = -1;
    // Letting go ends Grabbed straight away, or its linger would swallow the Thrown face.
    timers.delete("grabbed");
    releasedAt = now;
    releaseCounted = false;
    stir();
  });

  document.addEventListener("spider:play", (e) => {
    const id = (e as CustomEvent).detail?.id;
    const expression = BY_SECTION.get(id);
    if (!expression) return;
    preview = expression;
    previewLeft = config.faceMotion.preview;
    wince = Math.random() < 0.5 ? -1 : 1;
    const shove = SHOVE[expression];
    if (shove && config.faceMotion.previewShove && unit) {
      const speed = shove() * unit;
      const side = Math.random() < 0.5 ? -1 : 1;
      rope.addVelocity(rope.points.length - 1, side * speed, -speed * 0.35, 1 / config.sim.rate);
    }
  });

  document.addEventListener("spider:reset", () => {
    timers.clear();
    strength.clear();
    preview = null;
    previewLeft = 0;
    annoyance = 0;
    spin = 0;
    swung = 0;
    dwell = 0;
    grabs.length = 0;
    misses.length = 0;
    lastActive = now;
    blinkAt = -1;
  });

  return {
    /** The face as it is right now, eased; the spider draws this. */
    face,

    /** The expression showing, if any. */
    get current() {
      return selected;
    },

    /** How annoyed it is (Faces → Angry), for anyone curious. */
    get annoyance() {
      return annoyance;
    },

    /** It just ate. */
    ate() {
      stir();
      if (on("content")) trigger("content", config.faceContent.hold);
    },

    update(dt: number, frame: MoodFrame) {
      now += dt;
      unit = frame.unit;
      center = frame.center;
      radius = frame.radius;
      if (!unit || dt <= 0) return;

      for (const [e, left] of timers) {
        if (left - dt <= 0) timers.delete(e);
        else timers.set(e, left - dt);
      }

      const held = isHeld();
      const tail = rope.tail;
      const rate = config.sim.rate;
      const v: Vec = [((tail.x - tail.px) * rate) / unit, ((tail.y - tail.py) * rate) / unit];
      const speed = Math.hypot(v[0], v[1]);
      const jolt = Math.hypot(v[0] - previousV[0], v[1] - previousV[1]) / dt;
      previousV = v;

      if (speed > 1.5 || frame.busy || frame.foodNear > 0) stir();
      if (blinkAt >= 0 && now >= blinkAt) {
        blinkAt = -1;
        document.dispatchEvent(new CustomEvent("spider:play", { detail: { id: "blink" } }));
      }

      // Spin: every bit of swing around the anchor counts, and it's forgotten over time.
      const angle = Math.atan2(tail.x - frame.anchor[0], tail.y - frame.anchor[1]);
      if (lastAngle !== null) {
        let turn = angle - lastAngle;
        if (turn > Math.PI) turn -= Math.PI * 2;
        if (turn < -Math.PI) turn += Math.PI * 2;
        spin = spin * Math.exp(-dt / Math.max(0.05, config.faceDizzy.forget)) + Math.abs(turn) / (Math.PI * 2);
      }
      lastAngle = angle;
      annoyance *= Math.exp(-dt / Math.max(0.1, config.faceAngry.calm));

      if (!frame.busy && now > SETTLE) {
        // ── Held ──
        if (
          held &&
          grabAt >= 0 &&
          now - grabAt >= config.faceGrabbed.delay &&
          (isHoldingSpider() || config.faceGrabbed.string) &&
          on("grabbed")
        ) {
          trigger("grabbed", 0.12);
        }

        // ── Thrown, and flying ──
        if (!held) {
          if (now - releasedAt < 0.2 && speed > config.faceThrown.speed) {
            if (on("thrown")) trigger("thrown", config.faceThrown.hold);
            if (!releaseCounted) {
              annoyance += config.faceAngry.throwCost * Math.min(2, speed / config.faceThrown.speed);
              releaseCounted = true;
            }
          }
          const panic = config.facePanicked;
          if (on("panicked") && speed > panic.speed) {
            const how = clamp01((speed - panic.speed) / Math.max(0.001, panic.full - panic.speed));
            trigger("panicked", panic.linger, 0.55 + 0.45 * how);
          }
          if (on("scared") && speed > config.faceScared.speed) trigger("scared", config.faceScared.linger);

          // ── Jolted ──
          const hit = config.faceImpact;
          if (now - releasedAt > 0.25 && previousSpeed > 2 && jolt > hit.jolt && now > impactUntil) {
            impactUntil = now + 0.35;
            if (on("impact")) trigger("impact", hit.hold);
            annoyance += config.faceAngry.impactCost;
          }
        }
        previousSpeed = speed;

        // ── Spun ──
        if (on("dizzy") && spin > config.faceDizzy.turns) {
          trigger("dizzy", config.faceDizzy.hold);
          spin = 0;
        }

        // ── Fed up ──
        if (on("angry") && annoyance > config.faceAngry.at) trigger("angry", config.faceAngry.hold);
        if (on("tired") && annoyance > config.faceTired.at) {
          trigger("tired", config.faceTired.hold);
          annoyance = config.faceAngry.at * 0.5;
        }
        const nag = config.faceAnnoyed;
        while (grabs.length && now - grabs[0] > nag.window) grabs.shift();
        if (on("annoyed") && grabs.length >= nag.count) {
          trigger("annoyed", nag.hold);
          grabs.length = 0;
        }
        const smug = config.faceSmug;
        while (misses.length && now - misses[0] > smug.window) misses.shift();
        if (on("smug") && misses.length >= smug.count) {
          trigger("smug", smug.hold);
          misses.length = 0;
        }

        // ── You, the cursor ──
        if (pointer && center && !gone) {
          const gap = Math.hypot(pointer[0] - center[0], pointer[1] - center[1]) - radius;
          const coming = Number.isFinite(cursorGap) ? (cursorGap - gap) / dt / unit : 0;
          const moving = lastPointer
            ? Math.hypot(pointer[0] - lastPointer[0], pointer[1] - lastPointer[1]) / dt / unit
            : 0;
          cursorGap = gap;
          lastPointer = [pointer[0], pointer[1]];

          const jump = config.faceSurprised;
          if (on("surprised") && !held && gap < jump.radius * unit && coming > jump.speed && now > surprisedUntil) {
            trigger("surprised", jump.hold);
            surprisedUntil = now + jump.hold + jump.cooldown;
          }
          const lurk = config.faceSuspicious;
          dwell = !held && gap < lurk.radius * unit && moving < lurk.slow ? dwell + dt : 0;
          if (on("suspicious") && dwell > lurk.after) trigger("suspicious", 0.4);
        } else {
          cursorGap = Infinity;
          lastPointer = null;
          dwell = 0;
        }

        // ── Food ──
        if (on("excited") && frame.foodNear > 0 && frame.foodNear >= config.faceExcited.near) {
          trigger("excited", 0.3);
        }

        // ── Played with nicely ──
        const nice = config.faceHappy;
        swung = !held && speed >= nice.minSpeed && speed <= nice.maxSpeed ? swung + dt : Math.max(0, swung - dt * 2);
        if (on("happy") && swung >= nice.after) trigger("happy", nice.linger);

        // ── Where did you go? ──
        const search = config.faceSearch;
        if (gone && center && on("searching")) {
          const t = now - goneAt - search.after;
          if (t >= 0 && t < search.look * 2) {
            const dx = exit[0] - center[0];
            const dy = exit[1] - center[1];
            const d = Math.hypot(dx, dy) || 1;
            toward = t < search.look ? [(dx / d) * 0.9, (dy / d) * 0.9] : [(-dx / d) * 0.9, (dy / d) * 0.9];
            trigger("searching", 0.1);
          }
        }

        // ── Nothing going on ──
        const idle = now - lastActive;
        if (on("asleep") && idle > config.faceAsleep.after) trigger("asleep", 0.2);
        else if (on("sleepy") && idle > config.faceSleepy.after) {
          trigger("sleepy", 0.2, clamp01((idle - config.faceSleepy.after) / 2));
        }
      }

      // ── Which face ──
      if (previewLeft > 0) previewLeft -= dt;
      if (previewLeft <= 0) preview = null;
      if (preview === "searching") {
        const side = Math.sin(now * Math.PI * 0.9) >= 0 ? 1 : -1;
        toward = [0.9 * side, 0.1];
      }
      selected = preview ?? PRIORITY.find((e) => timers.has(e)) ?? null;
      const amount = selected ? (preview ? 1 : (strength.get(selected) ?? 1)) : 0;
      const target = faceFor(selected ? looks[selected]({ time: now, toward, wince }) : null, amount);
      const pace = config.faceMotion.speed * (selected && SNAPPY.has(selected) ? 3 : 1);
      easeFace(face, target, 1 - Math.exp(-pace * dt));

      // The squash springs, so a flattened body bounces back rather than just un-flattening.
      const motion = config.faceMotion;
      const w = Math.PI * 2 * motion.squashSpring;
      const steps = Math.ceil(dt / (1 / 240));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        squashSpeed += (w * w * (target.squash - face.squash) - 2 * motion.squashDamping * w * squashSpeed) * h;
        face.squash += squashSpeed * h;
      }
    },
  };
}

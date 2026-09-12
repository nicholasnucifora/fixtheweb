import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import type { Rope } from "./rope";

/**
 * Everything the spider does that isn't physics: scripted moves you play, and
 * idle life that ticks along on its own.
 *
 * Each animation owns a slice of `state`, and the rest of the code reads that
 * state and applies it — so nothing else needs to know animations exist. The
 * tuning panel's Animations tab plays one by firing a `spider:play` event with
 * the animation's id (matching its config section), and resets everything with
 * `spider:reset`.
 *
 *   dropIn   the spider abseils out from behind the b, paying thread out as it
 *            goes, holding the thread with its rear legs, then turns upright
 *   blink    eyes shut and open again, now and then
 *   gaze     eyes wander when nothing has their attention
 *   idleLegs a leg stretches now and then
 *   feed     a fly you drag in; the mouth opens, and eating it grows the spider
 */

const DEG = Math.PI / 180;
/** How long a played idle look keeps the eyes from the cursor, seconds. */
const PREVIEW = 3;
/** How quickly the holding legs get going, and stop again when you take hold (1/s). */
const WORK_EASE = 6;

export interface AnimationState {
  /** How much of the configured string length is spun out (1 = all of it). */
  lengthFactor: number;
  /** Extra rotation on the spider, radians (π = upside down). */
  tilt: number;
  /** Extra swing shared by the legs, radians, offset leg to leg by `legPhase`. */
  legSwing: number;
  legPhase: number;
  /** 0–1: how much the gripping legs are reaching for the thread. */
  grip: number;
  /** 0–1: how hard those legs are working the thread. Eases off when you take hold. */
  pull: number;
  /** While something overrides it, the thread hangs from here on the spider (fractions of the art). */
  attachX: number;
  attachY: number;
  /** 0–1: how much that override applies. */
  attachBlend: number;
  /** 0–1: how shut the eyes are. */
  blink: number;
  /** Seconds left of the eyes ignoring the cursor, so a played idle look can be seen. */
  idleLook: number;
  /** Where the eyes drift when nothing else has their attention (−1..1 of the room in the eye). */
  gazeX: number;
  gazeY: number;
  /** 0–1: how far the mouth is open. */
  mouth: number;
  /** Size multiplier, grown by feeding. */
  size: number;
  /** A leg stretching: which leg, and how far through (0–1). */
  stretchLeg: number;
  stretchAmount: number;
  /** Something scripted is playing, so the string's length is being driven by it. */
  active: boolean;
  /** Playing, but waiting for you to stop moving it about. */
  waiting: boolean;
}

const blank = (): AnimationState => ({
  lengthFactor: 1,
  tilt: 0,
  legSwing: 0,
  legPhase: 0,
  grip: 0,
  pull: 0,
  attachX: 0.5,
  attachY: 0.5,
  attachBlend: 0,
  blink: 0,
  idleLook: 0,
  gazeX: 0,
  gazeY: 0,
  mouth: 0,
  size: 1,
  stretchLeg: -1,
  stretchAmount: 0,
  active: false,
  waiting: false,
});

export function createAnimations(rope: Rope, isHeld: () => boolean) {
  const state = blank();

  // ── The drop-in ───────────────────────────────────────────────────────────
  let phase: "off" | "dropping" | "turning" = "off";
  let spun = 1;
  let turned = 1;

  // ── Idle life ─────────────────────────────────────────────────────────────
  let time = 0;
  let blinkAt = 2;
  let blinkFor = 0;
  let blinkLeft = 0;
  let gazeAt = 1;
  let gazeShow = false;
  let gazeTo = { x: 0, y: 0 };
  let stretchAt = 5;
  let stretchLeft = 0;

  // ── Feeding ───────────────────────────────────────────────────────────────
  let mouthWant = 0;
  let growFrom = 1;
  let growTo = 1;
  let growLeft = 0;

  const soon = (from: number, to: number) => from + Math.random() * Math.max(0, to - from);

  /** Puts the whole string back at the anchor so it can be spun out from nothing. */
  const gather = (a: AnchorFrame, factor: number) => {
    rope.setLength(Math.max(1, config.rope.length * a.unit * factor));
    rope.reset(a.x, a.y);
  };

  let pending: string | null = null;
  let resetting = false;
  document.addEventListener("spider:play", (e) => (pending = (e as CustomEvent).detail?.id ?? null));
  document.addEventListener("spider:reset", () => (resetting = true));

  return {
    state,

    /** True while the spider is out on a fresh thread, so food and idles can hold off. */
    get busy() {
      return phase !== "off";
    },

    /** The mouth opens as food comes near (0–1), and `eat` grows the spider. */
    mouthOpen(amount: number) {
      mouthWant = Math.max(0, Math.min(1, amount));
    },
    eat() {
      const grow = config.feed;
      growFrom = state.size;
      growTo = Math.min(grow.maxSize, state.size * (1 + grow.growth));
      growLeft = grow.growTime;
      mouthWant = 1;
    },

    /**
     * Once per frame, before the string's length is set. `sideways` is how fast the spider is
     * moving left or right (b/s) — its own falling doesn't count as being disturbed.
     */
    update(a: AnchorFrame, dt: number, sideways: number) {
      const drop = config.dropIn;

      if (resetting) {
        resetting = false;
        phase = "off";
        spun = 1;
        turned = 1;
        Object.assign(state, blank());
        mouthWant = 0;
        growLeft = 0;
        gather(a, 1);
      }

      if (pending) {
        const id = pending;
        pending = null;
        if (id === "dropIn") {
          phase = "dropping";
          spun = Math.max(0.01, drop.startLength);
          turned = 0;
          gather(a, spun);
        } else if (id === "blink") blinkLeft = config.blink.shutFor;
        else if (id === "gaze") {
          // The cursor normally has the eyes' attention, and it's usually right there on the Play
          // button, so hand them to the idle look for a moment or there's nothing to see.
          gazeAt = 0;
          gazeShow = true;
          state.idleLook = PREVIEW;
        } else if (id === "idleLegs") {
          stretchLeft = config.idleLegs.time;
          state.stretchLeg = Math.floor(Math.random() * 6);
        }
      }

      // ── Drop-in ─────────────────────────────────────────────────────────
      state.waiting = false;
      let pullTo = 0;
      if (phase === "dropping") {
        const busy = isHeld() || sideways > drop.pauseSpeed;
        state.waiting = busy;
        if (!busy) {
          spun = Math.min(1, spun + (drop.speed / Math.max(0.01, config.rope.length)) * dt);
          if (spun >= 1) {
            phase = "turning";
            turned = 0;
          }
        }
        state.tilt = drop.upsideDown ? Math.PI : 0;
        state.legSwing = busy ? 0 : drop.wiggle * DEG;
        // It keeps hold of the thread even while it waits; it just stops working it.
        state.grip = 1;
        pullTo = busy ? 0 : 1;
        // Abseiling spiders pay silk from the back end, so that's where the thread hangs from.
        state.attachX = 0.5;
        state.attachY = drop.attachY;
        state.attachBlend = 1;
      } else if (phase === "turning") {
        turned = Math.min(1, turned + dt / Math.max(0.01, drop.turnTime));
        const eased = turned * turned * (3 - 2 * turned);
        state.tilt = (drop.upsideDown ? Math.PI : 0) * (1 - eased);
        state.legSwing = drop.wiggle * DEG * (1 - eased);
        // Lets go of the thread and hands the attach point back as it rights itself.
        state.grip = 1 - eased;
        pullTo = 0;
        state.attachY = drop.attachY;
        state.attachBlend = 1 - eased;
        if (turned >= 1) phase = "off";
      } else {
        state.tilt = 0;
        state.legSwing = 0;
        state.grip = 0;
        pullTo = 0;
        state.attachBlend = 0;
      }
      // Working the thread stops and starts gently, so grabbing it doesn't freeze the legs mid-beat.
      state.pull += (pullTo - state.pull) * (1 - Math.exp(-WORK_EASE * dt));
      state.active = phase !== "off";
      state.lengthFactor = phase === "off" ? 1 : Math.max(0.01, spun);

      // ── Blinking ────────────────────────────────────────────────────────
      const blink = config.blink;
      if (blink.enabled && blinkLeft <= 0 && phase === "off") {
        blinkAt -= dt;
        if (blinkAt <= 0) {
          blinkLeft = blink.shutFor;
          blinkAt = soon(blink.everyFrom, blink.everyTo);
          // Now and then it blinks twice.
          if (Math.random() < blink.doubleChance) blinkAt = blink.shutFor * 1.6;
        }
      }
      if (blinkLeft > 0) {
        blinkLeft -= dt;
        blinkFor = Math.max(0, blinkLeft);
        // Shut fast, open a little slower.
        const through = 1 - blinkFor / Math.max(0.001, blink.shutFor);
        state.blink = Math.sin(Math.min(1, through) * Math.PI) ** 0.6 * blink.amount;
      } else state.blink = 0;

      // ── Idle gaze ───────────────────────────────────────────────────────
      const gaze = config.gaze;
      if (gaze.enabled) {
        gazeAt -= dt;
        if (gazeAt <= 0) {
          gazeAt = soon(gaze.everyFrom, gaze.everyTo);
          const spread = (much: number) => (Math.random() * 2 - 1) * gaze.range * much;
          if (gazeShow) {
            // Played from the panel: make sure it looks somewhere rather than straight ahead.
            gazeTo = { x: (Math.random() < 0.5 ? -1 : 1) * gaze.range * (0.6 + Math.random() * 0.4), y: spread(0.6) };
          } else if (Math.random() < gaze.centreChance) {
            gazeTo = { x: 0, y: 0 };
          } else {
            gazeTo = { x: spread(1), y: spread(0.6) };
          }
          gazeShow = false;
        }
        const ease = 1 - Math.exp(-gaze.speed * dt);
        state.gazeX += (gazeTo.x - state.gazeX) * ease;
        state.gazeY += (gazeTo.y - state.gazeY) * ease;
      } else {
        state.gazeX = state.gazeY = 0;
      }

      // ── A leg stretches now and then ────────────────────────────────────
      const idle = config.idleLegs;
      if (idle.enabled && stretchLeft <= 0 && phase === "off") {
        stretchAt -= dt;
        if (stretchAt <= 0) {
          stretchAt = soon(idle.everyFrom, idle.everyTo);
          stretchLeft = idle.time;
          state.stretchLeg = Math.floor(Math.random() * 6);
        }
      }
      if (stretchLeft > 0) {
        stretchLeft -= dt;
        const through = 1 - Math.max(0, stretchLeft) / Math.max(0.001, idle.time);
        state.stretchAmount = Math.sin(Math.min(1, through) * Math.PI) * idle.reach * DEG;
      } else {
        state.stretchAmount = 0;
        state.stretchLeg = -1;
      }

      // ── Feeding: the mouth, and growing ─────────────────────────────────
      const feed = config.feed;
      const mouthEase = 1 - Math.exp(-feed.mouthSpeed * dt);
      state.mouth += (mouthWant - state.mouth) * mouthEase;
      if (growLeft > 0) {
        growLeft -= dt;
        const through = 1 - Math.max(0, growLeft) / Math.max(0.001, feed.growTime);
        // Ease in and out of the new size.
        const eased = through * through * (3 - 2 * through);
        state.size = growFrom + (growTo - growFrom) * eased;
        if (growLeft <= 0) {
          state.size = growTo;
          mouthWant = 0;
        }
      }

      if (state.idleLook > 0) state.idleLook = Math.max(0, state.idleLook - dt);

      time += dt;
      state.legPhase = time * drop.wiggleSpeed * Math.PI * 2;
    },
  };
}

import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import type { Rope } from "./rope";

/**
 * Scripted moves the spider plays on top of everything else it does.
 *
 * There's one so far: the drop-in, where it comes out from behind the b upside
 * down and abseils, spinning its thread out as it goes, then turns upright when
 * the thread reaches the length set in the String settings. Grab it (or fling it
 * about) mid-drop and it simply waits, thread where it was, until things settle.
 *
 * The tuning panel plays an animation by bumping a counter in config (see the
 * Animations tab); `update` watches those counters. Everything an animation
 * wants to change about the spider is plain state here — how much thread is out,
 * an extra rotation, a leg swing — which the rest of the code reads and applies,
 * so nothing else needs to know animations exist.
 */

const DEG = Math.PI / 180;

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
  /** −1..1: the gripping legs working hand over hand. */
  pull: number;
  /** Something is playing, so the string's length is being driven by it. */
  active: boolean;
  /** Playing, but waiting for you to stop moving it about. */
  waiting: boolean;
}

export function createAnimations(rope: Rope, isHeld: () => boolean) {
  const state: AnimationState = {
    lengthFactor: 1,
    tilt: 0,
    legSwing: 0,
    legPhase: 0,
    grip: 0,
    pull: 0,
    active: false,
    waiting: false,
  };

  let phase: "off" | "dropping" | "turning" = "off";
  /** 0–1 of the string spun out, and 0–1 through turning upright. */
  let spun = 1;
  let turned = 1;
  let time = 0;
  const played = { dropIn: config.play.dropIn, reset: config.play.reset };

  /** Puts the whole string back at the anchor so it can be spun out from nothing. */
  const gather = (a: AnchorFrame, factor: number) => {
    rope.setLength(Math.max(1, config.rope.length * a.unit * factor));
    rope.reset(a.x, a.y);
  };

  return {
    state,

    /**
     * Once per frame, before the string's length is set. `sideways` is how fast the spider is
     * moving left or right (b/s) — its own falling doesn't count as being disturbed.
     */
    update(a: AnchorFrame, dt: number, sideways: number) {
      // The panel's buttons just bump a counter; a change means "play me".
      if (config.play.dropIn !== played.dropIn) {
        played.dropIn = config.play.dropIn;
        phase = "dropping";
        spun = Math.max(0.01, config.dropIn.startLength);
        turned = 0;
        time = 0;
        gather(a, spun);
      }
      if (config.play.reset !== played.reset) {
        played.reset = config.play.reset;
        phase = "off";
        spun = 1;
        turned = 1;
        gather(a, 1);
      }

      const drop = config.dropIn;
      state.waiting = false;

      if (phase === "dropping") {
        // Being carried around, or still swinging from it? Hold the thread where it is.
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
        state.pull = busy ? 0 : Math.sin(state.legPhase);
      } else if (phase === "turning") {
        turned = Math.min(1, turned + dt / Math.max(0.01, drop.turnTime));
        const eased = turned * turned * (3 - 2 * turned);
        state.tilt = (drop.upsideDown ? Math.PI : 0) * (1 - eased);
        // The legs settle as it rights itself.
        state.legSwing = drop.wiggle * DEG * (1 - eased);
        // Lets go of the thread as it rights itself, so the legs end up where they belong.
        state.grip = 1 - eased;
        state.pull = Math.sin(state.legPhase) * (1 - eased);
        if (turned >= 1) phase = "off";
      } else {
        state.tilt = 0;
        state.legSwing = 0;
        state.grip = 0;
        state.pull = 0;
      }

      time += dt;
      state.legPhase = time * drop.wiggleSpeed * Math.PI * 2;
      state.active = phase !== "off";
      state.lengthFactor = phase === "off" ? 1 : Math.max(0.01, spun);
    },
  };
}

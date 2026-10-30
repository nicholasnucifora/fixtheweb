import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import type { createDrag } from "./drag";
import type { Rope } from "./rope";

/** Development-only demonstrations; no synthetic pointer motion or saved test state. */
export function createRigTests(glyph: SVGGraphicsElement, rope: Rope, drag: ReturnType<typeof createDrag>) {
  const logo = glyph.ownerSVGElement ?? glyph;
  const original = logo.style.translate;
  const counters = {
    jump: config.snapTest.jump, reset: config.snapTest.reset,
    hold: config.pullTest.hold, release: config.pullTest.release,
    blink: config.eyelids.preview, sleepy: config.eyelids.sleepy, throw: config.speedLines.preview,
  };
  let shifted = false;
  let jumpPending = false;
  let resetPending = false;
  let resetRope = false;
  let holding = false;
  let pullKey = "";
  let blinkLeft = 0;
  const say = (section: string, message: string) => document.dispatchEvent(new CustomEvent("spider:tune-result", { detail: { section, message } }));
  document.addEventListener("spider:reset", () => { resetPending = true; });

  return {
    /** Whether the anchor must be remeasured after this update. */
    update(a: AnchorFrame, dt: number) {
      blinkLeft = Math.max(0, blinkLeft - dt);
      let moved = false;
      if (counters.reset !== config.snapTest.reset || resetPending) {
        counters.reset = config.snapTest.reset;
        resetPending = false;
        shifted = jumpPending = holding = false;
        logo.style.translate = original;
        drag.releaseTest(true);
        blinkLeft = 0;
        resetRope = true;
        moved = true;
        say("snapTest", "Reset: logo and string are back in place.");
      }
      if (counters.jump !== config.snapTest.jump) {
        counters.jump = config.snapTest.jump;
        holding = false;
        drag.releaseTest(true);
        shifted = !shifted;
        const offset = shifted ? config.snapTest.distance * a.unit : 0;
        logo.style.translate = offset ? config.snapTest.axis === "x" ? `${offset}px 0` : `0 ${offset}px` : original;
        jumpPending = true;
        moved = true;
      }
      if (counters.hold !== config.pullTest.hold) {
        counters.hold = config.pullTest.hold;
        holding = true;
        pullKey = "";
      }
      if (counters.release !== config.pullTest.release) {
        counters.release = config.pullTest.release;
        holding = false;
        drag.releaseTest();
        say("pullTest", "Released. Watch the recovery, then hold the same pull to compare.");
      }
      if (holding) {
        const key = [a.x, a.y, rope.length, config.pullTest.angle, config.pullTest.distance].join("|");
        if (key !== pullKey) {
          pullKey = key;
          drag.testPull(a, config.pullTest.angle, config.pullTest.distance);
          say("pullTest", `Holding a steady ${config.pullTest.distance}× pull at ${config.pullTest.angle}°. Change the stretch style to compare.`);
        }
      }
      if (counters.blink !== config.eyelids.preview) {
        counters.blink = config.eyelids.preview;
        blinkLeft = 1.2;
        say("eyelids", "Slow blink: ordinary blink speed is unchanged.");
      }
      if (counters.sleepy !== config.eyelids.sleepy) {
        counters.sleepy = config.eyelids.sleepy;
        document.dispatchEvent(new CustomEvent("spider:play", { detail: { id: "faceSleepy" } }));
        say("eyelids", "Playing sleepy lids with the existing face settings.");
      }
      if (counters.throw !== config.speedLines.preview) {
        counters.throw = config.speedLines.preview;
        holding = false;
        drag.releaseTest(true);
        rope.reset(a.x, a.y);
        const speed = config.speedLines.previewSpeed * a.unit / config.sim.rate;
        rope.tail.px = rope.tail.x - speed;
        rope.tail.py = rope.tail.y + speed * 0.25;
        say("speedLines", `Test throw at ${config.speedLines.previewSpeed} b/s. Motion lines start at ${config.speedLines.minSpeed} b/s.`);
      }
      return moved;
    },
    afterMeasure(a: AnchorFrame) {
      if (resetRope) {
        resetRope = false;
        rope.reset(a.x, a.y);
      }
    },
    recordJump(distance: number, carried: boolean) {
      if (!jumpPending) return;
      jumpPending = false;
      say("snapTest", `Jumped ${distance.toFixed(2)} b → ${carried ? "carried the string along" : "kept the string's inertia"}. Snap distance: ${config.anchor.snapDistance} b.`);
    },
    get blink() { return blinkLeft > 0 ? Math.sin((1 - blinkLeft / 1.2) * Math.PI) ** 0.6 : null; },
  };
}

import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import type { createDrag } from "./drag";
import type { Rope } from "./rope";

/** The only remaining demo: compare rotation on the same off-centre left pull. */
export function createRigTests(rope: Rope, drag: ReturnType<typeof createDrag>, resetPose: () => void, resetString: () => void) {
  let hold = config.grabRotation.preview, release = config.grabRotation.release;
  let pending = false, holding = false, key = "", resetting = false;
  document.addEventListener("spider:reset", () => { resetting = true; });
  document.addEventListener("spider:grab", () => { holding = pending = false; });
  return {
    update() {
      if (resetting) {
        resetting = holding = pending = false;
        drag.releaseTest(true);
        resetString();
      }
      if (hold !== config.grabRotation.preview) {
        hold = config.grabRotation.preview;
        drag.releaseTest(true);
        resetString();
        holding = pending = true;
        key = "";
        resetPose();
      }
      if (release !== config.grabRotation.release) {
        release = config.grabRotation.release;
        holding = pending = false;
        drag.releaseTest();
      }
    },
    afterLayout(a: AnchorFrame) {
      if (!holding) return;
      const next = [a.x, a.y, a.unit, rope.length].join("|");
      if (!pending && key === next) return;
      pending = false;
      key = next;
      drag.testPull(a, -55, 0.7, [0.12 * a.unit, 0.25 * a.unit]);
    },
  };
}

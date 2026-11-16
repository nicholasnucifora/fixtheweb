import { config } from "./config";
import type { Rope } from "./rope";

/** The approved string solver, with the existing smooth reel-in after a held pull. */
export function createElasticity() {
  let letOut = 0;
  const solve = (rope: Rope, held: number | null, stretch: number, dt: number) => {
    const response = config.rope;
    const want = held === null ? response.maxStretch : Math.max(response.maxStretch, stretch);
    letOut = want >= letOut ? want : want + (letOut - want) * Math.exp(-dt / Math.max(0.001, config.pull.snapBack));
    rope.solve(config.rope.iterations, response.stiffness, letOut, config.rope.compression, dt, response.springBack, response.springDamping);
  };
  return Object.assign(solve, { reset() { letOut = 0; } });
}

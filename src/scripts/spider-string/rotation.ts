import { smooth01 } from "./feel";

export type Point = readonly [number, number];

export function rotatePoint([x, y]: Point, angle: number): [number, number] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}

/** A continuous orbit: neutral above/below the anchor, full lean to either side, no grip bias. */
export function heldRotation([x, y]: Point, amount: number, width: number, max: number) {
  const distance = Math.hypot(x, y);
  if (distance < 1e-6) return 0;
  // Fade near the anchor, where a tiny movement otherwise changes the direction dramatically.
  const near = smooth01(distance / Math.max(1, width));
  return -(x / distance) * max * Math.max(0, Math.min(1, amount)) * near;
}

/** A little inertial lag while moving sideways, with no positional lean during a still hold. */
export function movementRotation(horizontalSpeed: number, amount: number, max: number) {
  // Speed is in anchor units per second, so the same gesture feels alike at any logo size.
  // Ease into the cap rather than abruptly pinning the angle during a fast drag.
  return Math.tanh(horizontalSpeed / 4) * max * Math.max(0, Math.min(1, amount));
}

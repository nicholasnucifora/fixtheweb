/** Continuous, frame-rate-independent responses shared by the rig and its tuning tests. */
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smooth01 = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
export const followAmount = (rate: number, dt: number) => -Math.expm1(-Math.max(0, rate) * Math.max(0, dt));

/** Radius is the half-attention distance, with a broad falloff rather than a visible boundary. */
export function cursorAttention(distance: number, radius: number, falloff: number) {
  if (!Number.isFinite(distance) || radius <= 0) return 0;
  return Math.pow(2, -Math.pow(Math.max(0, distance) / radius, Math.max(0.5, falloff)));
}

/** A restrained pull, eased in without changing the approved impact/animation squash. */
export function pullScale(tension: number, amount: number) {
  const along = 1 + smooth01(tension) * Math.max(0, Math.min(0.35, amount));
  return { along, across: 1 / Math.sqrt(along) };
}

export const carriesAnchor = (distance: number, unit: number, threshold: number) => distance > Math.max(0, threshold) * unit;

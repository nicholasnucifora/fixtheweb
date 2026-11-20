// Adapted from the Villow app illustration; fictional activity, no account data.
function getMonotoneSplineSlopes(values) {
  if (values.length < 2) return values.map(() => 0);
  const differences = values.slice(1).map((value, index) => value - values[index]);
  const slopes = values.map((_, index) => {
    if (index === 0) return differences[0];
    if (index === values.length - 1) return differences[differences.length - 1];
    if (differences[index - 1] * differences[index] <= 0) return 0;
    return (differences[index - 1] + differences[index]) / 2;
  });
  for (let index = 0; index < differences.length; index++) {
    const difference = differences[index];
    if (difference === 0) {
      slopes[index] = 0;
      slopes[index + 1] = 0;
      continue;
    }
    const startRatio = slopes[index] / difference;
    const endRatio = slopes[index + 1] / difference;
    const magnitude = Math.hypot(startRatio, endRatio);
    if (magnitude <= 3) continue;
    const scale = 3 / magnitude;
    slopes[index] = scale * startRatio * difference;
    slopes[index + 1] = scale * endRatio * difference;
  }
  return slopes;
}
function interpolateMonotoneSpline(values, slopes, position) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const clampedPosition = Math.max(0, Math.min(values.length - 1, position));
  const startIndex = Math.min(values.length - 2, Math.floor(clampedPosition));
  const progress = clampedPosition - startIndex;
  const progressSquared = progress * progress;
  const progressCubed = progressSquared * progress;
  const startValue = values[startIndex];
  const endValue = values[startIndex + 1];
  return (2 * progressCubed - 3 * progressSquared + 1) * startValue + (progressCubed - 2 * progressSquared + progress) * slopes[startIndex] + (-2 * progressCubed + 3 * progressSquared) * endValue + (progressCubed - progressSquared) * slopes[startIndex + 1];
}
export {
  getMonotoneSplineSlopes,
  interpolateMonotoneSpline
};

/** Pointer events over elements marked `data-spider-ignore` (e.g. the tuning panel) never grab or pluck. */
export const isIgnored = (target: EventTarget | null) =>
  target instanceof Element && target.closest("[data-spider-ignore]") !== null;

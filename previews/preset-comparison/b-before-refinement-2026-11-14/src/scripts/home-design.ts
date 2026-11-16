// Local refinements of the original opening. Colour mode is a separate preference.
export interface HomeDesign {
  type: "bubble" | "soft" | "simple";
  icons: "soft" | "outline" | "chunky";
  threadLength: number;
  spider: "lively" | "room" | "quiet";
  headline: string;
  action: string;
}
export const designKey = "ftw.home-design.v3";
export const defaultDesign: HomeDesign = {
  type: "soft", icons: "soft", threadLength: 150, spider: "lively",
  headline: "The internet can be better. Let's fix it.",
  action: "Explore the work",
};
export const defaultDesignB: HomeDesign = {
  ...defaultDesign,
  headline: "Digital life, shaped around the people living it.",
  action: "See what we're building",
};
export function currentDesignDefaults(): HomeDesign {
  return typeof document !== "undefined" && document.documentElement.dataset.previewPreset === "b" ? defaultDesignB : defaultDesign;
}
export function getDesignKey(): string {
  return currentDesignDefaults() === defaultDesignB ? `${designKey}.preset-b` : designKey;
}
export function cleanDesign(value: unknown): HomeDesign {
  const result = { ...currentDesignDefaults() };
  if (!value || typeof value !== "object") return result;
  const source = value as Record<string, unknown>;
  const allowed = { type: ["bubble", "soft", "simple"], icons: ["soft", "outline", "chunky"], spider: ["lively", "room", "quiet"] };
  for (const [key, options] of Object.entries(allowed)) {
    const value = source[key];
    if (typeof value === "string" && options.includes(value)) Object.assign(result, { [key]: value });
  }
  if (typeof source.threadLength === "number" && Number.isFinite(source.threadLength)) {
    result.threadLength = Math.max(60, Math.min(260, source.threadLength));
  }
  for (const [key, max] of [["headline", 100], ["action", 45]] as const) {
    if (typeof source[key] === "string" && source[key].trim()) result[key] = source[key].slice(0, max);
  }
  // Update the previous placeholder action while retaining custom design choices.
  if (result.action === "Join the campaign") result.action = defaultDesign.action;
  return result;
}
export function readDesign(key = getDesignKey()): HomeDesign {
  try { return cleanDesign(JSON.parse(localStorage.getItem(key) ?? "null")); } catch { return { ...currentDesignDefaults() }; }
}
export function writeDesign(key: string, design: HomeDesign): boolean {
  try { localStorage.setItem(key, JSON.stringify(cleanDesign(design))); return true; } catch { return false; }
}
export function applyDesign(design: HomeDesign) {
  const root = document.documentElement;
  root.dataset.designType = design.type;
  root.dataset.designIcons = design.icons;
  root.dataset.spiderSize = design.spider;
  root.style.setProperty("--hero-thread", design.threadLength + "px");
  const hero = document.querySelector<HTMLElement>("[data-development-hero]");
  if (!hero) return;
  for (const field of ["headline", "action"] as const) {
    const node = hero.querySelector(`[data-hero-${field}]`);
    if (node) node.textContent = design[field];
  }
}

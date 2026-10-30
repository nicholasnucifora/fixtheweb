import { schema, type Section } from "./config";

/** Only the areas still being tuned. Complete runtime defaults remain in config.ts. */
const pick = (section: keyof typeof schema, keys: string[] | null, group: Section["group"]): Section => {
  const from: Section = schema[section];
  return { ...from, group, params: keys ? Object.fromEntries(keys.map((key) => [key, from.params[key]])) : from.params };
};
export const homeSchema: Record<string, Section> = {
  anchor: pick("anchor", ["offsetX", "snapDistance"], "string"),
  snapTest: pick("snapTest", null, "string"),
  drag: pick("drag", ["follow"], "string"),
  pull: pick("pull", null, "string"),
  pullTest: pick("pullTest", null, "string"),
  pupils: pick("pupils", ["follow", "radius", "falloff", "attentionTime", "speed", "closeRadius", "closeSpeed", "range", "aim", "reach", "converge", "settle"], "spidey"),
  blink: pick("blink", ["style"], "spidey"),
  eyelids: pick("eyelids", null, "spidey"),
  speedLines: pick("speedLines", null, "animation"),
  particles: pick("particles", ["count"], "animation"),
  crisp: pick("crisp", ["wholePixels"], "animation"),
};
export const homeGroups = {
  string: { label: "String & pull", info: "Test layout jumps and compare steady pulls. The rest of the string settings are settled." },
  spidey: { label: "Eyes & lids", info: "Gradual cursor attention and eyelid comparisons. The approved faces and animation timings stay as they are." },
  animation: { label: "Motion lines", info: "Tune the wind streaks with a repeatable throw. Pluck count and pixel sizing are separate controls below." },
};

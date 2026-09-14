/**
 * The spider's wardrobe: every hat, pair of glasses, outfit and colour it can wear, and what it
 * takes to unlock the ones that are locked. Just the catalogue, so pages can list it when they're
 * built; what it's wearing right now is look.ts, drawing it is dress.ts, and the Spider Den's
 * controls are src/scripts/den.ts.
 */

export type Slot = "hat" | "eyes" | "face" | "outfit" | "back" | "feet" | "costume";
export type Tint = keyof typeof PALETTE;

/** How an item is earned. Kinds marked `soon` can't be earned yet (the page for them isn't built). */
export type Unlock = { kind: "discord" } | { kind: "newsletter" } | { kind: "snacks"; count: number };

export interface Item {
  id: string;
  label: string;
  /** The colour it comes in; items without one can't be recoloured. */
  tint?: Tint;
  unlock?: Unlock;
}

export interface Look {
  items: Record<Slot, string>;
  tints: Record<Slot, Tint>;
  skin: keyof typeof SKINS;
  pattern: keyof typeof PATTERNS;
  thread: keyof typeof THREADS;
  name: string;
}

/** Colours clothes come in: the site's ink, cream and greens, plus a few friends that sit well with them. */
export const PALETTE = {
  teal: { label: "Teal", color: "#2b8666" },
  mint: { label: "Mint", color: "#6ac7a7" },
  sky: { label: "Sky", color: "#5b9bd5" },
  plum: { label: "Plum", color: "#7a5aa6" },
  berry: { label: "Berry", color: "#c2497a" },
  coral: { label: "Coral", color: "#e8705a" },
  sunflower: { label: "Sunflower", color: "#f0b43c" },
  tan: { label: "Tan", color: "#b9855a" },
  cream: { label: "Cream", color: "#f4efe1" },
  ink: { label: "Ink", color: "#1b1e29" },
};

/** Body and leg colours. Ink is the spider as drawn (Spidey → Colours in the tuning panel). All dark enough for its white eyes. */
export const SKINS = {
  ink: { label: "Ink", color: "" },
  moss: { label: "Moss", color: "#2f6f5a" },
  ocean: { label: "Ocean", color: "#2d5b8a" },
  plum: { label: "Plum", color: "#56407e" },
  berry: { label: "Berry", color: "#8b3a5e" },
  ember: { label: "Ember", color: "#a44a2c" },
  cocoa: { label: "Cocoa", color: "#5e4436" },
  slate: { label: "Slate", color: "#4a5263" },
};

export const PATTERNS = {
  none: { label: "Plain" },
  spots: { label: "Spots" },
  stripes: { label: "Stripes" },
  stars: { label: "Starry" },
  fuzzy: { label: "Fuzzy" },
};

/** The thread's colour. Silk follows the page's ink, like the logo. */
export const THREADS = {
  silk: { label: "Silk", color: "" },
  teal: { label: "Teal", color: "#2b8666" },
  gold: { label: "Gold", color: "#d9a13b" },
  rainbow: { label: "Rainbow", color: "" },
};

export const SLOTS: Record<Slot, { label: string; items: Item[] }> = {
  hat: {
    label: "Hats",
    items: [
      { id: "topHat", label: "Top hat", tint: "teal" },
      { id: "party", label: "Party hat", tint: "coral" },
      { id: "beanie", label: "Beanie", tint: "sunflower" },
      { id: "cowboy", label: "Cowboy", tint: "tan" },
      { id: "propeller", label: "Propeller cap", tint: "sky" },
      { id: "bow", label: "Bow", tint: "berry" },
      { id: "flower", label: "Daisy", tint: "cream" },
      { id: "horns", label: "Devil horns", tint: "coral" },
      { id: "boppers", label: "Boppers", tint: "mint" },
      { id: "grad", label: "Graduate", tint: "ink" },
      { id: "viking", label: "Viking", tint: "cream" },
      { id: "chef", label: "Chef's hat", unlock: { kind: "snacks", count: 3 } },
      { id: "wizard", label: "Wizard", tint: "plum", unlock: { kind: "snacks", count: 10 } },
      { id: "halo", label: "Halo", unlock: { kind: "newsletter" } },
      { id: "crown", label: "Crown", unlock: { kind: "discord" } },
    ],
  },
  eyes: {
    label: "Eyewear",
    items: [
      { id: "specs", label: "Round specs", tint: "sunflower" },
      { id: "shades", label: "Shades", tint: "mint" },
      { id: "hearts", label: "Heart shades", tint: "coral" },
      { id: "monocle", label: "Monocle", tint: "sunflower" },
      { id: "patch", label: "Eye patch", tint: "tan" },
      { id: "3d", label: "3D glasses" },
    ],
  },
  face: {
    label: "Face",
    items: [
      { id: "blush", label: "Rosy cheeks", tint: "coral" },
      { id: "moustache", label: "Moustache", tint: "tan" },
      { id: "freckles", label: "Freckles", tint: "cream" },
      { id: "fangs", label: "Fangs" },
      { id: "plaster", label: "Plaster", tint: "tan" },
    ],
  },
  outfit: {
    label: "Outfits",
    items: [
      { id: "bowTie", label: "Bow tie", tint: "coral" },
      { id: "tie", label: "Tie", tint: "teal" },
      { id: "scarf", label: "Scarf", tint: "berry" },
      { id: "bandana", label: "Bandana", tint: "sky" },
      { id: "tee", label: "Stripy tee", tint: "teal" },
      { id: "tux", label: "Tuxedo", tint: "ink" },
      { id: "medal", label: "Gold medal", unlock: { kind: "snacks", count: 25 } },
    ],
  },
  back: {
    label: "On its back",
    items: [
      { id: "cape", label: "Cape", tint: "coral" },
      { id: "batWings", label: "Bat wings", tint: "plum" },
      { id: "fairyWings", label: "Fairy wings", tint: "mint" },
      { id: "jetpack", label: "Jetpack", unlock: { kind: "discord" } },
    ],
  },
  costume: {
    label: "Costumes",
    items: [
      { id: "ghost", label: "Ghost sheet", tint: "cream" },
      { id: "mummy", label: "Mummy", tint: "cream" },
      { id: "pumpkin", label: "Pumpkin", tint: "coral" },
      { id: "bee", label: "Bumblebee", tint: "sunflower" },
      { id: "dino", label: "Dino onesie", tint: "mint" },
      { id: "astronaut", label: "Astronaut", tint: "sky", unlock: { kind: "snacks", count: 15 } },
    ],
  },
  feet: {
    label: "Feet",
    items: [
      { id: "socks", label: "Stripy socks", tint: "coral" },
      { id: "sneakers", label: "Sneakers", tint: "sky" },
      { id: "painted", label: "Painted tips", tint: "berry" },
      { id: "rainbow", label: "Rainbow tips" },
    ],
  },
};

export const UNLOCKS = {
  discord: { label: "Join our Discord", soon: true },
  newsletter: { label: "Sign up to the newsletter", soon: true },
};

export const itemOf = (slot: Slot, id: string) => SLOTS[slot].items.find((item) => item.id === id) ?? null;

/** What it takes to unlock `item`, in a few words. */
export function unlockLabel(unlock: Unlock) {
  if (unlock.kind === "snacks") return `Feed it ${unlock.count} snack${unlock.count === 1 ? "" : "s"}`;
  return UNLOCKS[unlock.kind].label;
}

const DEFAULT_NAME = "Webby";

export const blankLook = (): Look => ({
  items: { hat: "none", eyes: "none", face: "none", outfit: "none", back: "none", feet: "none", costume: "none" },
  tints: Object.fromEntries(Object.keys(SLOTS).map((slot) => [slot, "coral"])) as Record<Slot, Tint>,
  skin: "ink",
  pattern: "none",
  thread: "silk",
  name: DEFAULT_NAME,
});


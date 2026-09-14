import { PALETTE, type Look, type Slot } from "./wardrobe";

/**
 * Draws what the spider's wearing (wardrobe.ts), on the same canvas as the spider and in the same
 * flat style: solid shapes in the site's colours, light ones edged in ink, and anything that sticks
 * out past the spider's silhouette included in its outline, so it all reads on a dark page too.
 *
 * Everything is drawn in body units: the body is (near enough) a circle of radius 1 centred on
 * 0,0, x to the right and y down, so the head's top is y −1 and its chin y 1. Hats sit around
 * y −0.8, the eyes at about ±0.38, −0.07, and outfits below the mouth.
 *
 * Each layer is its own function because it's drawn in its own space and at its own depth:
 * on its back (behind the legs), feet (on the legs), body (pattern and outfit, over the body),
 * face (over the eyes and mouth) and hat (on top). spider.ts and figure.ts call them in that order.
 *
 * A costume (a ghost sheet, a dino onesie…) is the whole spider dressed up, so it has a piece in any
 * of those layers it needs, and covers up whatever else is worn in the layers it hides.
 */

type Vec = [number, number];

/** Where the spider's parts are, from spider.ts (live) or figure.ts (still). */
export interface Fit {
  /** The body's centre and half-size, art units: body units are scaled from these. */
  body: { cx: number; cy: number; rx: number; ry: number; path: Path2D };
  /** Art space. `tip` is the far end of the leg, `hip` where it joins the body, `spine` a few points along it. */
  legs: { path: Path2D; tip: Vec; side: "left" | "right"; hip: Vec; spine: Vec[] }[];
  /** Art space → torso space (the body breathes and squashes), for pieces over the body that reach out over the legs. */
  toTorso?: (p: Vec) => Vec;
  /** Face space (art units). `size` is how big the expression has made the eye (1 = as drawn). */
  eyes: { side: "left" | "right"; center: Vec; radius: number; size: number }[];
  /** Face space: the mouth's middle, its top edge and width, and how much of the drawn mouth shows (0–1). */
  mouth: { center: Vec; top: number; width: number; drawn: number };
  /** Seconds, for things that move by themselves. */
  time: number;
  /** The spider's velocity in its own frame, b/s. */
  velocity: Vec;
  /** A springy lag (radians) that hats and dangly bits wobble by when it's swung about. */
  swing: number;
  /** Turns something hanging off the spider back to straight down on screen (radians). */
  hang: number;
  /** Nothing moves by itself: reduced motion, or a still picture. */
  still: boolean;
  skin: string;
  mouthColor: string;
}

/** Paint draws everything; edge draws only the parts that stick out, in the outline colour and wider, behind it all. */
export interface Pen {
  mode: "paint" | "edge";
  outline: string;
  /** The outline's full stroke width, art units. */
  width: number;
}

const INK = PALETTE.ink.color;
const CREAM = PALETTE.cream.color;
const WHITE = "#ffffff";
const GLASS = "#15171f";
const STEEL = "#9aa4b1";
/** Ink edge on light-coloured pieces, body units. */
const LINE = 0.035;

const tintOf = (look: Look, slot: Slot) => PALETTE[look.tints[slot]].color;

// ── Layers ───────────────────────────────────────────────────────────────────

const costumeOf = (look: Look) => COSTUMES[look.items.costume] ?? null;
/** Is this part of the look covered up by a costume? */
const covered = (look: Look, part: keyof Covers) => Boolean(costumeOf(look)?.covers[part]);

/** Behind the legs and body. Torso space. */
export function dressBack(ctx: CanvasRenderingContext2D, fit: Fit, look: Look, pen: Pen) {
  const draw = covered(look, "back") ? null : BACK[look.items.back];
  if (draw) inBody(ctx, fit, pen, (d) => draw(d, tintOf(look, "back")));
  const costume = costumeOf(look);
  if (costume?.back) inBody(ctx, fit, pen, (d) => costume.back!(d, tintOf(look, "costume")));
}

/** On the legs. Art space. */
export function dressFeet(ctx: CanvasRenderingContext2D, fit: Fit, look: Look, pen: Pen) {
  const costume = costumeOf(look);
  const draw = costume?.legs ?? (covered(look, "feet") ? null : FEET[look.items.feet]);
  if (!draw || pen.mode === "edge") return;
  const tint = tintOf(look, costume?.legs ? "costume" : "feet");
  fit.legs.forEach((leg, i) => {
    ctx.save();
    ctx.clip(leg.path);
    inBody(ctx, fit, pen, (d) => draw(d, tint, toBody(fit, leg.tip), i));
    ctx.restore();
  });
}

/** Over the body, under the face: its pattern, then its outfit, then a costume over the lot. Torso space. */
export function dressBody(ctx: CanvasRenderingContext2D, fit: Fit, look: Look, pen: Pen) {
  const pattern = covered(look, "pattern") ? null : PATTERNS[look.pattern];
  const outfit = covered(look, "outfit") ? null : OUTFITS[look.items.outfit];
  const costume = costumeOf(look)?.body;
  inBody(ctx, fit, pen, (d) => {
    if (pattern) pattern(d);
    if (outfit) outfit(d, tintOf(look, "outfit"));
    if (costume) costume(d, tintOf(look, "costume"));
  });
}

/** Over the eyes and mouth. Face space. */
export function dressFace(ctx: CanvasRenderingContext2D, fit: Fit, look: Look, pen: Pen) {
  const extra = covered(look, "face") ? null : FACES[look.items.face];
  const eyewear = covered(look, "eyes") ? null : EYEWEAR[look.items.eyes];
  if (pen.mode === "edge" || (!extra && !eyewear)) return;
  inBody(ctx, fit, pen, (d) => {
    const eyes = fit.eyes.map((e) => ({
      side: e.side,
      at: toBody(fit, e.center),
      r: (e.radius / fit.body.rx) * e.size,
    }));
    const mouth = {
      at: toBody(fit, fit.mouth.center),
      top: (fit.mouth.top - fit.body.cy) / fit.body.ry,
      width: fit.mouth.width / fit.body.rx,
    };
    if (extra) extra(d, tintOf(look, "face"), mouth);
    if (eyewear) eyewear(d, tintOf(look, "eyes"), eyes);
  });
}

/** On top of everything: a costume's top (a helmet), then a hat. Torso space. */
export function dressHat(ctx: CanvasRenderingContext2D, fit: Fit, look: Look, pen: Pen) {
  const costume = costumeOf(look);
  if (costume?.top) inBody(ctx, fit, pen, (d) => costume.top!(d, tintOf(look, "costume")));
  const draw = covered(look, "hat") ? null : HATS[look.items.hat];
  if (draw) inBody(ctx, fit, pen, (d) => draw(d, tintOf(look, "hat")));
}

/**
 * Just the piece one slot's item is, on its own with no spider in it: for dragging it out of the
 * wardrobe. Art space, like the spider it would go on.
 */
export function dressPiece(ctx: CanvasRenderingContext2D, fit: Fit, look: Look, slot: Slot) {
  const only: Look = {
    ...look,
    pattern: "none",
    items: { hat: "none", eyes: "none", face: "none", outfit: "none", back: "none", feet: "none", costume: "none" },
  };
  only.items[slot] = look.items[slot];
  const pen: Pen = { mode: "paint", outline: INK, width: 0 };
  // Socks and sleeves, without legs in them, keep the shape of the legs.
  dressFeet(ctx, fit, only, pen);
  dressBack(ctx, fit, only, pen);
  dressBody(ctx, fit, only, pen);
  dressFace(ctx, fit, only, pen);
  dressHat(ctx, fit, only, pen);
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

interface Draw {
  ctx: CanvasRenderingContext2D;
  fit: Fit;
  pen: Pen;
}
interface Paint {
  /** Sticks out past the spider, so it gets the outline. */
  edge?: boolean;
  alpha?: number;
  /** Ink edge: on by default for light colours that stick out. */
  line?: boolean;
  /** Ink edge drawn under the fill instead, so the overlapping pieces of one shape (a chef's hat's puffs) share one outline. */
  under?: boolean;
}

const toBody = (fit: Fit, [x, y]: Vec): Vec => [(x - fit.body.cx) / fit.body.rx, (y - fit.body.cy) / fit.body.ry];

function inBody(ctx: CanvasRenderingContext2D, fit: Fit, pen: Pen, fn: (d: Draw) => void) {
  ctx.save();
  ctx.translate(fit.body.cx, fit.body.cy);
  ctx.scale(fit.body.rx, fit.body.ry);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  fn({ ctx, fit, pen });
  ctx.restore();
}

function fill({ ctx, fit, pen }: Draw, path: Path2D, color: string, o: Paint = {}) {
  if (pen.mode === "edge") {
    if (!o.edge) return;
    ctx.fillStyle = ctx.strokeStyle = pen.outline;
    ctx.globalAlpha = 1;
    ctx.lineWidth = pen.width / fit.body.rx;
    ctx.fill(path);
    ctx.stroke(path);
    return;
  }
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.under) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE * 2;
    ctx.stroke(path);
  }
  ctx.fillStyle = color;
  ctx.fill(path);
  if (!o.under && (o.line ?? (o.edge && light(color)))) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.stroke(path);
  }
  ctx.globalAlpha = 1;
}

function stroke({ ctx, fit, pen }: Draw, path: Path2D, color: string, width: number, o: Paint = {}) {
  if (pen.mode === "edge") {
    if (!o.edge) return;
    ctx.strokeStyle = pen.outline;
    ctx.globalAlpha = 1;
    ctx.lineWidth = width + pen.width / fit.body.rx;
    ctx.stroke(path);
    return;
  }
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(path);
  ctx.globalAlpha = 1;
}

/** Runs `fn` turned by `angle` about x, y. */
function turned(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, fn: () => void) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

/** Runs `fn` with drawing clipped to `path` (paint only: clipped pieces never stick out). */
function clipped(d: Draw, path: Path2D, fn: () => void) {
  if (d.pen.mode === "edge") return;
  d.ctx.save();
  d.ctx.clip(path);
  fn();
  d.ctx.restore();
}

const path = (d = "") => new Path2D(d);
const circle = (x: number, y: number, r: number) => {
  const p = new Path2D();
  p.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  return p;
};
const ellipse = (x: number, y: number, rx: number, ry: number, rotation = 0) => {
  const p = new Path2D();
  p.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rotation, 0, Math.PI * 2);
  return p;
};
const rounded = (x: number, y: number, w: number, h: number, r: number | number[]) => {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
};
/** Points of `pts` as a closed shape, mirrored left↔right when `flip` is −1. */
const poly = (pts: Vec[], flip = 1) => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x * flip, y) : p.moveTo(x * flip, y)));
  p.closePath();
  return p;
};
function star(x: number, y: number, r: number, points = 5, inner = 0.45) {
  const p = new Path2D();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const d = i % 2 ? r * inner : r;
    if (i) p.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    else p.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  p.closePath();
  return p;
}
function heart(x: number, y: number, s: number) {
  const p = new Path2D();
  const at = (u: number, v: number): Vec => [x + u * s, y + v * s];
  p.moveTo(...at(0, 0.9));
  p.bezierCurveTo(...at(-0.25, 0.72), ...at(-1, 0.25), ...at(-1, -0.28));
  p.bezierCurveTo(...at(-1, -0.75), ...at(-0.45, -1), ...at(0, -0.55));
  p.bezierCurveTo(...at(0.45, -1), ...at(1, -0.75), ...at(1, -0.28));
  p.bezierCurveTo(...at(1, 0.25), ...at(0.25, 0.72), ...at(0, 0.9));
  p.closePath();
  return p;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Blends two #rrggbb colours. */
export function mix(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) || 0);
const luminance = (c: string) => {
  if (!/^#[0-9a-f]{6}$/i.test(c)) return 0;
  const [r, g, b] = hex(c).map((v) => (v / 255) ** 2.2);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Light enough that it needs an ink edge against the page. */
const light = (c: string) => luminance(c) > 0.6;
const darker = (c: string, t = 0.25) => mix(c, "#000000", t);
/** `usual` as a second colour on `c`, unless it's too alike to show up: then `otherwise`. */
const against = (c: string, usual: string, otherwise: string) =>
  Math.abs(luminance(c) - luminance(usual)) < 0.1 ? otherwise : usual;

// ── Hats ────────────────────────────────────────────────────────────────────

type HatDraw = (d: Draw, tint: string) => void;

/** Hats wobble on the head as it's swung about. */
const onHead = (d: Draw, lean: number, fn: () => void) => turned(d.ctx, 0, -0.85, lean + d.fit.swing * 0.6, fn);

const HATS: Record<string, HatDraw> = {
  topHat: (d, tint) =>
    onHead(d, -0.1, () => {
      const crown = path("M-0.43 -0.84L-0.47 -1.72Q-0.47 -1.78 -0.41 -1.78L0.41 -1.78Q0.47 -1.78 0.47 -1.72L0.43 -0.84Z");
      fill(d, crown, tint, { edge: true });
      const band = poly([[-0.435, -0.84], [-0.445, -1.04], [0.445, -1.04], [0.435, -0.84]]);
      fill(d, band, tint === INK ? PALETTE.teal.color : INK);
      fill(d, rounded(-0.66, -0.92, 1.32, 0.14, 0.07), tint, { edge: true });
    }),

  party: (d, tint) =>
    onHead(d, -0.22, () => {
      const cone = path("M-0.36 -0.8L0 -1.85L0.36 -0.8Q0 -0.7 -0.36 -0.8Z");
      fill(d, cone, tint, { edge: true });
      clipped(d, cone, () => {
        const stripe = against(tint, CREAM, PALETTE.sky.color);
        for (let i = -2; i <= 2; i++) {
          const y = -1.2 + i * 0.26;
          fill(d, poly([[-0.6, y + 0.15], [0.6, y - 0.15], [0.6, y - 0.04], [-0.6, y + 0.26]]), stripe);
        }
      });
      fill(d, circle(0, -1.86, 0.11), tint === CREAM ? PALETTE.sunflower.color : CREAM, { edge: true });
    }),

  beanie: (d, tint) =>
    onHead(d, 0, () => {
      const dome = path("M-0.72 -0.56C-0.72 -1.42 0.72 -1.42 0.72 -0.56Z");
      fill(d, dome, tint, { edge: true });
      fill(d, circle(0, -1.19, 0.16), against(tint, CREAM, PALETTE.coral.color), { edge: true });
      const band = rounded(-0.8, -0.66, 1.6, 0.25, 0.12);
      fill(d, band, tint, { edge: true });
      clipped(d, band, () => {
        for (let x = -0.75; x <= 0.76; x += 0.1) stroke(d, path(`M${x} -0.62L${x} -0.45`), darker(tint, 0.18), 0.03);
      });
    }),

  cowboy: (d, tint) =>
    onHead(d, 0.06, () => {
      const crown = path("M-0.4 -0.8C-0.46 -1.2 -0.38 -1.42 -0.2 -1.36Q0 -1.24 0.2 -1.36C0.38 -1.42 0.46 -1.2 0.4 -0.8Z");
      fill(d, crown, tint, { edge: true });
      clipped(d, crown, () => fill(d, rounded(-0.6, -1.0, 1.2, 0.13, 0), against(tint, INK, CREAM)));
      const brim = path(
        "M-1.05 -1.04Q-0.95 -0.74 -0.5 -0.72Q0 -0.66 0.5 -0.72Q0.95 -0.74 1.05 -1.04Q0.9 -0.84 0.5 -0.85Q0 -0.87 -0.5 -0.85Q-0.9 -0.84 -1.05 -1.04Z",
      );
      fill(d, brim, tint, { edge: true });
    }),

  propeller: (d, tint) =>
    onHead(d, 0, () => {
      const f = d.fit;
      const dome = path("M-0.64 -0.66C-0.64 -1.26 0.64 -1.26 0.64 -0.66Z");
      fill(d, dome, tint, { edge: true });
      const second = tint === PALETTE.coral.color ? PALETTE.sunflower.color : PALETTE.coral.color;
      clipped(d, dome, () => {
        fill(d, poly([[0, -1.4], [-0.2, -0.6], [0.2, -0.6]]), second);
        fill(d, poly([[0, -1.4], [-0.95, -0.6], [-0.66, -0.6]]), second);
        fill(d, poly([[0, -1.4], [0.95, -0.6], [0.66, -0.6]]), second);
      });
      fill(d, rounded(-0.68, -0.73, 1.36, 0.1, 0.05), darker(tint, 0.2), { edge: true });
      fill(d, rounded(-0.025, -1.38, 0.05, 0.26, 0.02), INK, { edge: true });
      // Seen side on, a spinning blade's length goes back and forth. Faster the faster it's moving.
      const speed = Math.hypot(...f.velocity);
      const spin = f.still ? 0.9 : f.time * (1.4 + Math.min(8, speed * 0.9)) * Math.PI * 2;
      const reach = 0.36;
      for (const [k, color] of [[0, PALETTE.sunflower.color], [Math.PI, PALETTE.coral.color]] as const) {
        const c = Math.cos(spin + k);
        if (Math.abs(c) < 0.02) continue;
        fill(d, ellipse((c * reach) / 2, -1.39, (Math.abs(c) * reach) / 2, 0.055), color, { edge: true });
      }
      fill(d, circle(0, -1.39, 0.05), INK, { edge: true });
    }),

  bow: (d, tint) =>
    turned(d.ctx, 0.44, -0.86, 0.35 + d.fit.swing * 0.8, () => {
      const loop = (flip: number) =>
        path(
          `M0.44 -0.86C${0.44 + flip * 0.12} -1.1 ${0.44 + flip * 0.4} -1.08 ${0.44 + flip * 0.36} -0.86C${0.44 + flip * 0.4} -0.64 ${0.44 + flip * 0.12} -0.62 0.44 -0.86Z`,
        );
      for (const flip of [-1, 1]) fill(d, loop(flip), tint, { edge: true });
      fill(d, ellipse(0.44, -0.86, 0.075, 0.085), darker(tint, 0.2), { edge: true });
    }),

  flower: (d, tint) =>
    turned(d.ctx, 0.48, -0.84, d.fit.swing, () => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        fill(d, ellipse(0.48 + Math.cos(a) * 0.13, -0.84 + Math.sin(a) * 0.13, 0.12, 0.055, a), tint, { edge: true });
      }
      fill(d, circle(0.48, -0.84, 0.085), tint === PALETTE.sunflower.color ? PALETTE.coral.color : PALETTE.sunflower.color, {
        edge: true,
      });
    }),

  horns: (d, tint) =>
    onHead(d, 0, () => {
      const horn = (flip: number) => path(`M${-0.5 * flip} -0.72C${-0.56 * flip} -0.98 ${-0.62 * flip} -1.1 ${-0.74 * flip} -1.22C${-0.5 * flip} -1.13 ${-0.32 * flip} -0.98 ${-0.28 * flip} -0.8Z`);
      for (const flip of [1, -1]) fill(d, horn(flip), tint, { edge: true });
    }),

  boppers: (d, tint) => {
    const f = d.fit;
    const band = new Path2D();
    band.ellipse(0, 0, 0.99, 0.99, 0, -Math.PI * 0.8, -Math.PI * 0.2);
    stroke(d, band, tint, 0.09, { edge: true });
    for (const side of [-1, 1]) {
      // Springy stalks: they lag behind the head and wave a little on their own.
      const wave = f.still ? 0 : Math.sin(f.time * 2.6 + side) * 0.05;
      const lean = f.swing * 2.2 + wave;
      const base: Vec = [side * 0.42, -0.9];
      const tip: Vec = [side * 0.62 + Math.sin(lean) * 0.55, -1.52 + Math.abs(Math.sin(lean)) * 0.15];
      const stalk = path(`M${base[0]} ${base[1]}Q${side * 0.48} -1.3 ${tip[0]} ${tip[1]}`);
      stroke(d, stalk, INK, 0.04, { edge: true });
      fill(d, circle(tip[0], tip[1], 0.12), tint, { edge: true });
      fill(d, circle(tip[0] - 0.04, tip[1] - 0.04, 0.035), WHITE, { alpha: 0.7 });
    }
  },

  grad: (d, tint) =>
    onHead(d, 0, () => {
      const f = d.fit;
      fill(d, path("M-0.5 -0.95L-0.5 -0.74Q0 -0.62 0.5 -0.74L0.5 -0.95Z"), tint, { edge: true });
      fill(d, poly([[-0.95, -1.12], [0, -1.42], [0.95, -1.12], [0, -0.86]]), tint, { edge: true });
      const gold = PALETTE.sunflower.color;
      // The tassel hangs straight down whichever way the spider's turned, and swings.
      const corner: Vec = [0.72, -1.04];
      const down = f.hang - f.swing * 1.5;
      const end: Vec = [corner[0] - Math.sin(down) * 0.42, corner[1] + Math.cos(down) * 0.42];
      stroke(d, path(`M0 -1.14L${corner[0]} ${corner[1]}L${end[0]} ${end[1]}`), gold, 0.035, { edge: true });
      turned(d.ctx, end[0], end[1], down, () => fill(d, rounded(end[0] - 0.05, end[1] - 0.02, 0.1, 0.16, 0.03), gold, { edge: true }));
      fill(d, circle(0, -1.14, 0.05), gold);
    }),

  viking: (d, tint) =>
    onHead(d, 0, () => {
      const horn = (flip: number) =>
        path(`M${-0.66 * flip} -0.72C${-0.95 * flip} -0.8 ${-1.12 * flip} -1.05 ${-1.02 * flip} -1.44C${-0.94 * flip} -1.2 ${-0.8 * flip} -1.04 ${-0.58 * flip} -1.0Z`);
      for (const flip of [1, -1]) fill(d, horn(flip), tint, { edge: true });
      fill(d, path("M-0.76 -0.56C-0.76 -1.34 0.76 -1.34 0.76 -0.56Z"), STEEL, { edge: true });
      fill(d, rounded(-0.07, -1.14, 0.14, 0.52, 0.05), darker(STEEL, 0.15));
      fill(d, rounded(-0.82, -0.66, 1.64, 0.17, 0.08), darker(STEEL, 0.2), { edge: true });
      for (let x = -0.6; x <= 0.61; x += 0.3) fill(d, circle(x, -0.575, 0.03), CREAM);
    }),

  chef: (d) =>
    onHead(d, 0.05, () => {
      const puff = circle(-0.36, -1.12, 0.28);
      puff.addPath(circle(0, -1.3, 0.34));
      puff.addPath(circle(0.36, -1.12, 0.28));
      puff.addPath(rounded(-0.5, -1.12, 1.0, 0.24, 0));
      fill(d, puff, WHITE, { edge: true, under: true });
      fill(d, rounded(-0.52, -0.94, 1.04, 0.22, 0.04), WHITE, { edge: true });
    }),

  wizard: (d, tint) =>
    onHead(d, 0, () => {
      const cone = path(
        "M-0.5 -0.82C-0.32 -1.2 -0.18 -1.6 0.02 -1.86Q0.2 -2.04 0.46 -1.93Q0.24 -1.86 0.14 -1.66C0.24 -1.35 0.36 -1.1 0.5 -0.82Z",
      );
      fill(d, cone, tint, { edge: true });
      const gold = against(tint, PALETTE.sunflower.color, CREAM);
      fill(d, star(-0.1, -1.2, 0.1), gold);
      fill(d, star(0.2, -1.42, 0.065), gold);
      fill(d, star(0.14, -1.0, 0.05), gold);
      fill(d, ellipse(0, -0.8, 0.84, 0.13), tint, { edge: true });
    }),

  halo: (d) => {
    const f = d.fit;
    const bob = f.still ? 0 : Math.sin(f.time * 2.2) * 0.05;
    stroke(d, ellipse(0, -1.3 + bob, 0.5, 0.13), PALETTE.sunflower.color, 0.09, { edge: true });
    stroke(d, ellipse(0, -1.3 + bob, 0.5, 0.13), "#ffe6a3", 0.03);
  },

  crown: (d) =>
    onHead(d, -0.08, () => {
      const gold = PALETTE.sunflower.color;
      const crown = poly([[-0.5, -0.74], [-0.54, -0.93], [-0.62, -1.34], [-0.3, -1.08], [0, -1.44], [0.3, -1.08], [0.62, -1.34], [0.54, -0.93], [0.5, -0.74]]);
      fill(d, crown, gold, { edge: true });
      fill(d, rounded(-0.52, -0.94, 1.04, 0.1, 0.02), darker(gold, 0.15));
      for (const [x, y] of [[-0.62, -1.34], [0, -1.44], [0.62, -1.34]] as Vec[]) fill(d, circle(x, y, 0.055), CREAM, { edge: true });
      fill(d, circle(-0.28, -0.83, 0.05), PALETTE.coral.color);
      fill(d, circle(0, -0.83, 0.06), PALETTE.teal.color);
      fill(d, circle(0.28, -0.83, 0.05), PALETTE.coral.color);
    }),
};

// ── Eyewear ────────────────────────────────────────────────────────────────

type Eye = { side: "left" | "right"; at: Vec; r: number };
type EyewearDraw = (d: Draw, tint: string, eyes: Eye[]) => void;

const pair = (eyes: Eye[]) => {
  const left = eyes.find((e) => e.side === "left") ?? eyes[0];
  const right = eyes.find((e) => e.side === "right") ?? eyes[1];
  return { left, right };
};

const glint = (d: Draw, [x, y]: Vec, r: number) =>
  stroke(d, path(`M${x - r * 0.45} ${y - r * 0.15}L${x - r * 0.15} ${y - r * 0.45}`), WHITE, r * 0.14, { alpha: 0.55 });

const EYEWEAR: Record<string, EyewearDraw> = {
  specs: (d, tint, eyes) => {
    const { left, right } = pair(eyes);
    for (const e of [left, right]) {
      fill(d, circle(e.at[0], e.at[1], e.r * 1.04), WHITE, { alpha: 0.08 });
      stroke(d, circle(e.at[0], e.at[1], e.r * 1.04), tint, 0.055);
    }
    const y = (left.at[1] + right.at[1]) / 2;
    stroke(d, path(`M${left.at[0] + left.r * 1.04} ${y}Q0 ${y - 0.1} ${right.at[0] - right.r * 1.04} ${y}`), tint, 0.045);
    stroke(d, path(`M${left.at[0] - left.r * 1.04} ${y}L${left.at[0] - left.r * 1.04 - 0.22} ${y - 0.06}`), tint, 0.045);
    stroke(d, path(`M${right.at[0] + right.r * 1.04} ${y}L${right.at[0] + right.r * 1.04 + 0.22} ${y - 0.06}`), tint, 0.045);
  },

  shades: (d, tint, eyes) => {
    const { left, right } = pair(eyes);
    for (const e of [left, right]) {
      const r = e.r;
      const lens = rounded(e.at[0] - r * 1.05, e.at[1] - r * 0.82, r * 2.1, r * 1.72, [r * 0.3, r * 0.3, r * 0.9, r * 0.9]);
      fill(d, lens, GLASS, { alpha: 0.9 });
      stroke(d, lens, tint, 0.045);
      glint(d, e.at, r);
    }
    const y = Math.min(left.at[1] - left.r * 0.6, right.at[1] - right.r * 0.6);
    stroke(d, path(`M${left.at[0] + left.r} ${y}L${right.at[0] - right.r} ${y}`), tint, 0.05);
  },

  hearts: (d, tint, eyes) => {
    for (const e of eyes) {
      const lens = heart(e.at[0], e.at[1] + e.r * 0.05, e.r * 1.12);
      fill(d, lens, tint, { alpha: 0.82 });
      stroke(d, lens, darker(tint, 0.3), 0.04);
      glint(d, [e.at[0] - e.r * 0.2, e.at[1] - e.r * 0.05], e.r * 0.8);
    }
    const { left, right } = pair(eyes);
    const y = (left.at[1] + right.at[1]) / 2 - 0.08;
    stroke(d, path(`M${left.at[0] + left.r * 0.8} ${y}Q0 ${y - 0.08} ${right.at[0] - right.r * 0.8} ${y}`), darker(tint, 0.3), 0.04);
  },

  monocle: (d, tint, eyes) => {
    const { right } = pair(eyes);
    const [x, y] = right.at;
    fill(d, circle(x, y, right.r * 1.06), WHITE, { alpha: 0.15 });
    stroke(d, circle(x, y, right.r * 1.06), tint, 0.06);
    const chain = path(`M${x + right.r * 0.75} ${y + right.r * 0.75}Q${x + right.r * 1.2} ${y + 0.75} 0.55 0.8`);
    d.ctx.save();
    d.ctx.setLineDash([0.035, 0.035]);
    stroke(d, chain, tint, 0.03);
    d.ctx.restore();
    glint(d, right.at, right.r);
  },

  patch: (d, tint, eyes) => {
    const { left, right } = pair(eyes);
    // Round the back of the head, over the patch and above the other eye, tucked in at the sides.
    const [lx, ly] = left.at;
    const strap = path(`M-1.1 ${ly + 0.12}Q${lx - left.r} ${ly - 0.1} ${lx} ${ly - left.r * 0.2}Q${right.at[0] - right.r * 0.5} ${right.at[1] - right.r - 0.2} 1.1 ${right.at[1] - right.r - 0.12}`);
    clipped(d, bodyClip(d), () => stroke(d, strap, tint, 0.05));
    const patch = ellipse(left.at[0], left.at[1], left.r * 1.02, left.r * 0.96);
    fill(d, patch, GLASS);
    stroke(d, patch, tint, 0.04);
  },

  "3d": (d, _tint, eyes) => {
    const { left, right } = pair(eyes);
    const lens = (e: Eye) => rounded(e.at[0] - e.r * 1.02, e.at[1] - e.r * 0.78, e.r * 2.04, e.r * 1.56, 0.06);
    fill(d, lens(left), "#e0524d", { alpha: 0.78 });
    fill(d, lens(right), "#3fb8cf", { alpha: 0.78 });
    stroke(d, lens(left), CREAM, 0.065);
    stroke(d, lens(right), CREAM, 0.065);
  },
};

// ── Face extras ─────────────────────────────────────────────────────────────

type Mouth = { at: Vec; top: number; width: number };
type FaceDraw = (d: Draw, tint: string, mouth: Mouth) => void;

const FACES: Record<string, FaceDraw> = {
  blush: (d, tint) => {
    for (const side of [-1, 1]) fill(d, ellipse(side * 0.68, 0.42, 0.15, 0.085), mix(tint, WHITE, 0.2), { alpha: 0.8 });
  },

  moustache: (d, tint, m) => {
    const s = m.width / 0.485;
    d.ctx.save();
    d.ctx.translate(m.at[0], m.top + 0.01);
    d.ctx.scale(s, s);
    for (const flip of [1, -1]) {
      const half = path(
        `M0 -0.02C${0.08 * flip} -0.1 ${0.22 * flip} -0.1 ${0.3 * flip} -0.02C${0.36 * flip} 0.03 ${0.44 * flip} 0.02 ${0.48 * flip} -0.07C${0.5 * flip} 0.08 ${0.38 * flip} 0.14 ${0.28 * flip} 0.1C${0.18 * flip} 0.07 ${0.08 * flip} 0.08 0 0.06Z`,
      );
      fill(d, half, tint);
    }
    d.ctx.restore();
  },

  freckles: (d, tint) => {
    const dots: Vec[] = [[0.56, 0.36], [0.66, 0.32], [0.73, 0.4], [0.61, 0.44], [0.7, 0.49], [0.52, 0.47]];
    for (const side of [-1, 1]) for (const [x, y] of dots) fill(d, circle(side * x, y, 0.024), tint, { alpha: 0.85 });
  },

  fangs: (d, _tint, m) => {
    // Fangs belong to the drawn smile, so they come and go with it.
    const alpha = d.fit.mouth.drawn;
    if (alpha < 0.05) return;
    const y = m.top + 0.17 * (m.width / 0.485);
    for (const side of [-1, 1]) {
      const x = m.at[0] + side * 0.085;
      fill(d, poly([[x - 0.04, y], [x + 0.04, y], [x + side * 0.01, y + 0.1]]), d.fit.mouthColor, { alpha });
    }
  },

  plaster: (d, tint) =>
    turned(d.ctx, 0.5, -0.64, -0.55, () => {
      fill(d, rounded(0.3, -0.705, 0.4, 0.13, 0.065), tint);
      fill(d, rounded(0.43, -0.69, 0.14, 0.1, 0.02), mix(tint, WHITE, 0.3));
      for (const [x, y] of [[0.36, -0.66], [0.36, -0.62], [0.64, -0.66], [0.64, -0.62]] as Vec[]) {
        fill(d, circle(x, y, 0.011), darker(tint, 0.3));
      }
    }),
};

// ── Outfits ─────────────────────────────────────────────────────────────────

type OutfitDraw = (d: Draw, tint: string) => void;

/** Something hanging from `x, y` that points straight down on screen, and swings. */
const dangling = (d: Draw, x: number, y: number, amount: number, fn: () => void) =>
  turned(d.ctx, x, y, (d.fit.hang - d.fit.swing * 1.2) * amount, fn);

const OUTFITS: Record<string, OutfitDraw> = {
  bowTie: (d, tint) =>
    turned(d.ctx, 0, 0.79, d.fit.swing * 0.3, () => {
      for (const flip of [-1, 1]) {
        fill(d, path(`M${0.03 * flip} 0.79Q${0.2 * flip} 0.68 ${0.34 * flip} 0.62Q${0.4 * flip} 0.79 ${0.34 * flip} 0.96Q${0.2 * flip} 0.9 ${0.03 * flip} 0.79Z`), tint);
        stroke(d, path(`M${0.1 * flip} 0.79L${0.25 * flip} 0.72`), darker(tint, 0.25), 0.025);
        stroke(d, path(`M${0.1 * flip} 0.8L${0.25 * flip} 0.87`), darker(tint, 0.25), 0.025);
      }
      fill(d, rounded(-0.07, 0.72, 0.14, 0.15, 0.04), darker(tint, 0.18));
    }),

  tie: (d, tint) =>
    dangling(d, 0, 0.72, 1, () => {
      const blade = path("M-0.05 0.82L0.05 0.82L0.12 1.3L0 1.43L-0.12 1.3Z");
      fill(d, blade, tint, { edge: true });
      clipped(d, blade, () => {
        const stripe = against(tint, CREAM, PALETTE.coral.color);
        for (let y = 0.9; y < 1.45; y += 0.14) fill(d, poly([[-0.2, y], [0.2, y - 0.1], [0.2, y - 0.06], [-0.2, y + 0.04]]), stripe, { alpha: 0.85 });
      });
      fill(d, poly([[-0.075, 0.7], [0.075, 0.7], [0.05, 0.83], [-0.05, 0.83]]), darker(tint, 0.15), { edge: true });
    }),

  scarf: (d, tint) => {
    const stripe = against(tint, CREAM, PALETTE.coral.color);
    dangling(d, 0.42, 0.8, 0.8, () => {
      for (const [dx, len] of [[0, 0.5], [0.13, 0.42]] as Vec[]) {
        const tail = rounded(0.36 + dx, 0.76, 0.14, len, 0.03);
        fill(d, tail, darker(tint, dx ? 0.12 : 0), { edge: true });
        fill(d, rounded(0.36 + dx, 0.66 + len, 0.14, 0.05, 0), stripe);
        for (let x = 0.38 + dx; x < 0.5 + dx; x += 0.04) stroke(d, path(`M${x} ${0.76 + len}L${x} ${0.84 + len}`), tint, 0.022, { edge: true });
      }
    });
    const band = path("M-0.82 0.56Q0 0.78 0.82 0.56L0.78 0.8Q0 1.02 -0.78 0.8Z");
    fill(d, band, tint, { edge: true });
    clipped(d, band, () => {
      stroke(d, path("M-1 0.66Q0 0.89 1 0.66"), stripe, 0.035);
      stroke(d, path("M-1 0.74Q0 0.97 1 0.74"), stripe, 0.035);
    });
  },

  bandana: (d, tint) =>
    turned(d.ctx, 0, 0.7, d.fit.swing * 0.35, () => {
      const cloth = path("M-0.64 0.64Q0 0.84 0.64 0.64L0 1.24Z");
      fill(d, cloth, tint, { edge: true });
      const dot = against(tint, CREAM, PALETTE.coral.color);
      for (const [x, y] of [[-0.36, 0.78], [0, 0.86], [0.36, 0.78], [-0.16, 1.0], [0.16, 1.0], [0, 1.14]] as Vec[]) {
        fill(d, circle(x, y, 0.03), dot);
      }
    }),

  tee: (d, tint) =>
    clipped(d, bodyClip(d), () => {
      const shirt = path("M-1.2 0.42Q0 0.98 1.2 0.42L1.2 1.2L-1.2 1.2Z");
      fill(d, shirt, tint);
      const stripe = against(tint, CREAM, PALETTE.coral.color);
      for (const y of [0.66, 0.86]) fill(d, path(`M-1.2 ${y}Q0 ${y + 0.24} 1.2 ${y}L1.2 ${y + 0.08}Q0 ${y + 0.32} -1.2 ${y + 0.08}Z`), stripe);
      stroke(d, path("M-1.2 0.43Q0 0.99 1.2 0.43"), stripe, 0.045);
    }),

  tux: (d, tint) =>
    clipped(d, bodyClip(d), () => {
      fill(d, path("M-0.4 0.64Q0 0.74 0.4 0.64L0 1.08Z"), WHITE);
      const tie = light(tint) ? INK : tint;
      for (const flip of [-1, 1]) fill(d, poly([[0.02 * flip, 0.72], [0.19 * flip, 0.63], [0.19 * flip, 0.81]]), tie);
      fill(d, circle(0, 0.72, 0.045), tie);
      fill(d, circle(0, 0.87, 0.022), INK);
      fill(d, circle(0, 0.96, 0.022), INK);
    }),

  medal: (d) =>
    dangling(d, 0, 0.62, 0.5, () => {
      fill(d, poly([[-0.5, 0.6], [-0.35, 0.6], [0.04, 0.98], [-0.08, 1.01]]), PALETTE.teal.color);
      fill(d, poly([[0.5, 0.6], [0.35, 0.6], [-0.04, 0.98], [0.08, 1.01]]), PALETTE.coral.color);
      const gold = PALETTE.sunflower.color;
      fill(d, circle(0, 1.09, 0.15), gold, { edge: true });
      stroke(d, circle(0, 1.09, 0.1), darker(gold, 0.2), 0.02);
      fill(d, star(0, 1.09, 0.07), darker(gold, 0.2));
    }),
};

// ── On its back ─────────────────────────────────────────────────────────────

type BackDraw = (d: Draw, tint: string) => void;

const BACK: Record<string, BackDraw> = {
  cape: (d, tint) => {
    const f = d.fit;
    // Streams out behind it as it moves, and ripples.
    const [vx, vy] = f.velocity;
    // A breeze sweeps it off to one side even at rest, so it reads as a cape rather than a skirt.
    const breeze = f.still ? 0.3 : 0.3 * Math.sin(f.time * 0.5 + 1);
    const blow = clamp(-vx * 0.06 + breeze, -0.8, 0.8);
    const lift = clamp(-Math.abs(vx) * 0.02 - vy * 0.03, -0.4, 0.15);
    const ripple = (i: number) => (f.still ? 0 : Math.sin(f.time * 5 + i * 1.7) * 0.04);
    turned(d.ctx, 0, -0.4, f.hang * 0.7, () => {
      /** The cape's outline, `spread` as wide and hemmed `bottom` down. */
      const cape = (spread: number, bottom: number) => {
        const p = new Path2D();
        const hem = 1.3 * spread;
        p.moveTo(-0.66, -0.4);
        p.quadraticCurveTo(0, -0.56, 0.66, -0.4);
        p.bezierCurveTo(1.0 * spread, 0.1, (1.2 + blow * 0.3) * spread, 0.8, hem + blow, bottom + ripple(0));
        const n = 6;
        for (let i = 1; i <= n; i++) {
          const x = hem - (2 * hem * i) / n + blow;
          p.quadraticCurveTo(x + hem / n, bottom + (i % 2 ? 0.12 : -0.04) + ripple(i), x, bottom + ripple(i));
        }
        p.bezierCurveTo((-1.2 + blow * 0.3) * spread, 0.8, -1.0 * spread, 0.1, -0.66, -0.4);
        p.closePath();
        return p;
      };
      fill(d, cape(1, 1.46 + lift), tint, { edge: true });
      // Its inside, in shadow behind the spider: leaves a bright edge down the sides and along the hem.
      fill(d, cape(0.84, 1.34 + lift), darker(tint, 0.28));
    });
  },

  batWings: (d, tint) => {
    const f = d.fit;
    const flap = f.still ? 0.4 : Math.sin(f.time * 5.5);
    for (const flip of [-1, 1]) {
      d.ctx.save();
      d.ctx.translate(0.5 * flip, -0.55);
      d.ctx.rotate(flip * flap * 0.14);
      d.ctx.scale(0.82 + flap * 0.18, 1);
      d.ctx.translate(-0.5 * flip, 0.55);
      const wing = path(
        `M${0.5 * flip} -0.55C${0.9 * flip} -1.1 ${1.5 * flip} -1.25 ${1.9 * flip} -0.95Q${1.7 * flip} -0.8 ${1.72 * flip} -0.62Q${1.5 * flip} -0.66 ${1.42 * flip} -0.46Q${1.22 * flip} -0.58 ${1.08 * flip} -0.36Q${0.9 * flip} -0.5 ${0.7 * flip} -0.2Z`,
      );
      fill(d, wing, tint, { edge: true });
      for (const [x, y] of [[1.72, -0.62], [1.42, -0.46], [1.08, -0.36]] as Vec[]) {
        stroke(d, path(`M${0.6 * flip} -0.52L${x * flip} ${y}`), darker(tint, 0.25), 0.025);
      }
      d.ctx.restore();
    }
  },

  fairyWings: (d, tint) => {
    const f = d.fit;
    const flutter = f.still ? 0 : Math.sin(f.time * 16) * 0.12;
    for (const flip of [-1, 1]) {
      turned(d.ctx, 0.45 * flip, -0.5, flip * flutter, () => {
        for (const [x, y, rx, ry, rot] of [
          [0.95, -0.95, 0.52, 0.28, -0.65],
          [1.05, -0.3, 0.34, 0.18, 0.35],
        ]) {
          const wing = ellipse(x * flip, y, rx, ry, rot * flip);
          fill(d, wing, tint, { alpha: 0.5 });
          stroke(d, wing, mix(tint, WHITE, 0.6), 0.03, { alpha: 0.9 });
        }
      });
    }
  },

  jetpack: (d) => {
    const f = d.fit;
    const speed = Math.hypot(...f.velocity);
    for (const flip of [-1, 1]) {
      const x = 0.54 * flip;
      const tank = rounded(x - 0.16, 0.08, 0.32, 1.06, 0.16);
      fill(d, tank, STEEL, { edge: true });
      fill(d, rounded(x - 0.16, 0.5, 0.32, 0.08, 0), PALETTE.coral.color);
      fill(d, poly([[x - 0.1, 1.1], [x + 0.1, 1.1], [x + 0.13, 1.22], [x - 0.13, 1.22]]), INK, { edge: true });
      // Flames: a flicker at rest, roaring when it's flung.
      const flicker = f.still ? 0.5 : 0.5 + 0.5 * Math.sin(f.time * 31 + flip * 2) * Math.sin(f.time * 17);
      const len = 0.18 + flicker * 0.1 + Math.min(0.7, speed * 0.06);
      const flame = (w: number, l: number) => path(`M${x - w} 1.22Q${x} ${1.22 + l * 1.25} ${x} ${1.22 + l}Q${x} ${1.22 + l * 1.25} ${x + w} 1.22Z`);
      fill(d, flame(0.11, len), PALETTE.sunflower.color, { alpha: 0.95 });
      fill(d, flame(0.06, len * 0.6), PALETTE.coral.color);
    }
  },
};

// ── Feet ────────────────────────────────────────────────────────────────────

type FootDraw = (d: Draw, tint: string, tip: Vec, leg: number) => void;

const RAINBOW = [PALETTE.coral.color, PALETTE.sunflower.color, PALETTE.mint.color, PALETTE.sky.color, PALETTE.plum.color, PALETTE.berry.color];

const polish = (d: Draw, color: string, [x, y]: Vec) => {
  fill(d, circle(x, y, 0.13), color);
  fill(d, circle(x + 0.03, y - 0.03, 0.03), WHITE, { alpha: 0.6 });
};

const FEET: Record<string, FootDraw> = {
  socks: (d, tint, [x, y]) => {
    const stripe = against(tint, CREAM, PALETTE.coral.color);
    for (let k = 6; k >= 1; k--) fill(d, circle(x, y, k * 0.055), k % 2 ? tint : stripe);
  },
  sneakers: (d, tint, [x, y]) => {
    fill(d, circle(x, y, 0.27), CREAM);
    fill(d, circle(x, y, 0.22), tint);
    fill(d, circle(x, y, 0.07), WHITE, { alpha: 0.8 });
  },
  painted: (d, tint, tip) => polish(d, tint, tip),
  rainbow: (d, _tint, tip, leg) => polish(d, RAINBOW[leg % RAINBOW.length], tip),
};

// ── Patterns ────────────────────────────────────────────────────────────────

type PatternDraw = (d: Draw) => void;

const PATTERNS: Record<string, PatternDraw> = {
  spots: (d) =>
    clipped(d, bodyClip(d), () => {
      const spot = mix(d.fit.skin, WHITE, 0.2);
      for (const [x, y, r] of [
        [-0.62, -0.62, 0.12], [0.1, -0.84, 0.09], [0.56, -0.58, 0.1], [-0.24, -0.72, 0.07], [0.34, -0.9, 0.05],
        [-0.9, 0.05, 0.09], [0.88, 0.2, 0.1], [-0.72, 0.62, 0.1], [0.62, 0.72, 0.08], [0.06, 0.9, 0.07],
      ]) {
        fill(d, circle(x, y, r), spot);
      }
    }),
  stripes: (d) =>
    clipped(d, bodyClip(d), () => {
      const band = mix(d.fit.skin, WHITE, 0.16);
      for (let y = -0.92; y < 1; y += 0.22) {
        fill(d, path(`M-1.2 ${y + 0.1}Q0 ${y - 0.08} 1.2 ${y + 0.1}L1.2 ${y + 0.19}Q0 ${y + 0.01} -1.2 ${y + 0.19}Z`), band);
      }
    }),
  stars: (d) =>
    clipped(d, bodyClip(d), () => {
      const f = d.fit;
      for (const [x, y, r, i] of [
        [-0.6, -0.66, 0.09, 0], [0.12, -0.82, 0.06, 1], [0.6, -0.55, 0.08, 2], [-0.88, 0.1, 0.06, 3],
        [0.86, 0.22, 0.07, 4], [-0.68, 0.64, 0.07, 5], [0.58, 0.74, 0.06, 6], [-0.25, -0.88, 0.04, 7],
      ]) {
        const twinkle = f.still ? 1 : 0.75 + 0.25 * Math.sin(f.time * 2 + i * 1.3);
        fill(d, star(x, y, r * twinkle, 4, 0.35), i % 3 ? CREAM : PALETTE.sunflower.color, { alpha: 0.9 });
      }
    }),
  fuzzy: (d) => {
    const n = 64;
    const tufts = new Path2D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const [cx, sy] = [Math.cos(a), Math.sin(a)];
      const w = 0.035;
      tufts.moveTo(cx * 0.93 - sy * w, sy * 0.93 + cx * w);
      tufts.lineTo(cx * (1.07 + (i % 3) * 0.02), sy * (1.07 + (i % 3) * 0.02));
      tufts.lineTo(cx * 0.93 + sy * w, sy * 0.93 - cx * w);
      tufts.closePath();
    }
    fill(d, tufts, d.fit.skin, { edge: true, line: false });
  },
};

// ── Costumes ────────────────────────────────────────────────────────────────

/** What a costume covers up: those parts of the look aren't drawn while it's on. */
interface Covers {
  back?: boolean;
  feet?: boolean;
  outfit?: boolean;
  pattern?: boolean;
  /** Face extras (a moustache, freckles). */
  face?: boolean;
  eyes?: boolean;
  hat?: boolean;
}

interface Costume {
  covers: Covers;
  /** Behind everything (wings, a tail). Torso space. */
  back?: BackDraw;
  /** On each leg, clipped to it. Art space. */
  legs?: FootDraw;
  /** Over the body, and anything that spreads out over the legs too. Torso space, under the face. */
  body?: OutfitDraw;
  /** Over the face (a helmet). Torso space. */
  top?: OutfitDraw;
}

const SUIT = "#eef0f2";
const STEM = "#6f8a4b";

/** Where the eyes are (body units), and how big. */
const eyesOf = (f: Fit) => f.eyes.map((e) => ({ at: toBody(f, e.center), r: (e.radius / f.body.rx) * e.size }));
/** The mouth's middle (body units) and width. */
const mouthOf = (f: Fit) => ({ at: toBody(f, f.mouth.center), width: f.mouth.width / f.body.rx });
/** Which way is down on screen, in the spider's own frame. */
const downOf = (f: Fit): Vec => [-Math.sin(f.hang), Math.cos(f.hang)];

const COSTUMES: Record<string, Costume> = {
  /**
   * A sheet thrown over the whole spider. It's shaped round wherever the legs actually are, so
   * lifting a leg lifts the sheet with it, and it hangs down from them in a wavy hem.
   */
  ghost: {
    covers: { back: true, feet: true, outfit: true, pattern: true, face: true },
    body: (d, tint) => {
      const f = d.fit;
      const down = downOf(f);
      // Round the head, and out over every leg.
      const reach: Vec[] = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        reach.push([Math.cos(a) * 1.08, Math.sin(a) * 1.1 - 0.03]);
      }
      for (const leg of f.legs) {
        for (const p of [...leg.spine, leg.tip]) {
          const [x, y] = toBody(f, f.toTorso ? f.toTorso(p) : p);
          const out = Math.hypot(x, y) || 1;
          reach.push([x + (x / out) * 0.12, y + (y / out) * 0.12]);
        }
      }
      // How far it reaches out each way round, softened so it's rounded like cloth rather than a box.
      const N = 72;
      const out = Array.from({ length: N }, (_, k) => {
        const a = (k / N) * Math.PI * 2;
        const [c, s] = [Math.cos(a), Math.sin(a)];
        return Math.max(...reach.map(([x, y]) => x * c + y * s));
      });
      const soft = out.map((_, k) => {
        let sum = 0;
        for (let j = -4; j <= 4; j++) sum += out[(k + j + N) % N] * (5 - Math.abs(j));
        return sum / 25;
      });
      // It hangs: the lower it is, the further it falls, in a wavy hem that sways, and lags behind a swing.
      const lag = clamp(-f.velocity[0] * 0.025, -0.35, 0.35);
      const sway = f.still ? 0 : f.time * 2.2;
      const sheet = soft.map((r, k): Vec => {
        const a = (k / N) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const low = clamp((x * down[0] + y * down[1] - 0.1) / 0.85, 0, 1) ** 1.5;
        const hem = 0.5 + 0.5 * Math.cos(a * 16 + sway);
        const drop = low * (0.3 + 0.12 * hem);
        return [x + down[0] * drop + lag * low, y + down[1] * drop];
      });
      const shape = smoothLoop(sheet);
      fill(d, shape, tint, { edge: true });
      clipped(d, shape, () => {
        // Folds falling from where it drapes over the legs.
        const shade = darker(tint, 0.1);
        for (const leg of f.legs) {
          const [x, y] = toBody(f, f.toTorso ? f.toTorso(leg.tip) : leg.tip);
          const fold = path(`M${x * 0.8} ${y * 0.8}Q${x * 0.9 + down[0] * 0.4} ${y + down[1] * 0.4} ${x * 0.85 + down[0] * 1.2} ${y + down[1] * 1.2}`);
          stroke(d, fold, shade, 0.045, { alpha: 0.7 });
        }
        stroke(d, path("M-0.35 -0.9Q-0.6 -0.95 -0.72 -0.7"), WHITE, 0.05, { alpha: 0.45 });
        // Holes cut for the eyes and mouth.
        for (const e of eyesOf(f)) fill(d, ellipse(e.at[0], e.at[1], e.r * 1.28, e.r * 1.34), INK);
        const m = mouthOf(f);
        fill(d, ellipse(m.at[0], m.at[1] + 0.02, m.width * 0.8, 0.2), INK);
      });
    },
  },

  /** Bandages wound round and round the body and every leg, with gaps for the eyes and mouth, and a loose end. */
  mummy: {
    covers: { back: true, feet: true, outfit: true, pattern: true },
    legs: (d, tint, tip, i) => {
      const f = d.fit;
      const hip = toBody(f, f.legs[i].hip);
      fill(d, rounded(-4, -4, 8, 8, 0), tint);
      const across = Math.atan2(tip[1] - hip[1], tip[0] - hip[0]) + Math.PI / 2 + (i % 2 ? 0.35 : -0.35);
      turned(d.ctx, hip[0], hip[1], across, () => {
        for (let k = -16; k <= 16; k++) {
          const y = hip[1] + k * 0.085;
          stroke(d, path(`M${hip[0] - 3} ${y}L${hip[0] + 3} ${y}`), darker(tint, 0.2), 0.016);
        }
      });
      // Pale bandages need an edge to show on a light page (half of it's clipped away inside the leg).
      if (light(tint)) stroke(d, legClip(d, i), INK, LINE * 2);
    },
    body: (d, tint) => {
      const f = d.fit;
      const band = darker(tint, 0.2);
      clipped(d, bodyClip(d), () => {
        fill(d, rounded(-1.3, -1.3, 2.6, 2.6, 0), tint);
        for (let k = 0, y = -1.02; y < 1.1; y += 0.15, k++) {
          const tilt = k % 2 ? 0.07 : -0.07;
          stroke(d, path(`M-1.2 ${y + tilt}Q0 ${y - tilt * 1.5} 1.2 ${y - tilt}`), band, 0.02);
        }
        // Gaps in the wrapping, where the eyes and mouth peek out.
        const eyes = eyesOf(f);
        const ey = eyes.reduce((sum, e) => sum + e.at[1], 0) / (eyes.length || 1);
        const er = Math.max(...eyes.map((e) => e.r), 0.2);
        fill(d, path(`M-1.2 ${ey - er * 1.45}Q0 ${ey - er * 1.8} 1.2 ${ey - er * 1.3}L1.2 ${ey + er * 1.2}Q0 ${ey + er * 1.55} -1.2 ${ey + er * 1.3}Z`), f.skin);
        const m = mouthOf(f);
        fill(d, ellipse(m.at[0], m.at[1] + 0.02, m.width * 0.78, 0.18), f.skin);
      });
      if (light(tint)) stroke(d, bodyClip(d), INK, LINE);
      dangling(d, 0.78, 0.5, 1, () => {
        const tail = path("M0.72 0.5L0.86 0.5L0.9 1.05L0.84 0.98L0.78 1.06Z");
        fill(d, tail, tint, { edge: true });
        stroke(d, path("M0.75 0.72L0.88 0.7M0.76 0.9L0.89 0.88"), band, 0.016);
      });
    },
  },

  /** A round pumpkin with the spider's face poking through, legs sticking out the sides. */
  pumpkin: {
    covers: { back: true, outfit: true, pattern: true },
    body: (d, tint) => {
      const lobes = ellipse(-0.44, 0.08, 0.72, 1.0);
      lobes.addPath(ellipse(0.44, 0.08, 0.72, 1.0));
      lobes.addPath(ellipse(0, 0.04, 0.68, 1.08));
      fill(d, lobes, tint, { edge: true, under: true });
      const rib = darker(tint, 0.22);
      for (const x of [-0.5, 0.5]) stroke(d, path(`M${x * 0.5} -0.98Q${x * 1.75} 0.06 ${x * 0.5} 1.1`), rib, 0.04);
      stroke(d, path("M0 -1.02L0 -0.9M0 1.02L0 1.1"), rib, 0.04);
      stroke(d, path("M-0.92 -0.35Q-1.02 0.08 -0.88 0.48"), mix(tint, WHITE, 0.3), 0.05, { alpha: 0.6 });
      fill(d, path("M-0.09 -0.97L-0.13 -1.3Q0 -1.4 0.11 -1.32L0.09 -0.97Z"), STEM, { edge: true });
      stroke(d, path("M0.08 -1.12C0.32 -1.34 0.56 -1.1 0.4 -1.0C0.28 -0.94 0.3 -1.12 0.44 -1.12"), STEM, 0.035, { edge: true });
      fill(d, path("M-0.1 -1.12Q-0.45 -1.36 -0.62 -1.12Q-0.4 -0.98 -0.1 -1.12Z"), mix(STEM, WHITE, 0.15), { edge: true });
    },
  },

  /** Stripes, a stinger, wings that buzz and antennae that boing. */
  bee: {
    covers: { back: true, outfit: true, pattern: true },
    back: (d) => {
      const f = d.fit;
      const buzz = f.still ? 0 : Math.sin(f.time * 38) * 0.1;
      for (const flip of [-1, 1]) {
        turned(d.ctx, 0.35 * flip, -0.55, flip * buzz, () => {
          const wing = ellipse(0.95 * flip, -1.0, 0.55, 0.32, -0.55 * flip);
          fill(d, wing, WHITE, { alpha: 0.6, edge: true });
          stroke(d, wing, INK, 0.03, { alpha: 0.5 });
          const low = ellipse(1.05 * flip, -0.45, 0.36, 0.2, 0.25 * flip);
          fill(d, low, WHITE, { alpha: 0.55, edge: true });
          stroke(d, low, INK, 0.03, { alpha: 0.5 });
        });
      }
    },
    body: (d, tint) => {
      clipped(d, bodyClip(d), () => {
        fill(d, rounded(-1.3, -1.3, 2.6, 2.6, 0), tint);
        fill(d, path("M-1.2 -1.2L1.2 -1.2L1.2 -0.8Q0 -0.64 -1.2 -0.8Z"), INK);
        for (const y of [0.5, 0.84]) fill(d, path(`M-1.2 ${y}Q0 ${y + 0.16} 1.2 ${y}L1.2 ${y + 0.16}Q0 ${y + 0.32} -1.2 ${y + 0.16}Z`), INK);
        const m = mouthOf(d.fit);
        fill(d, ellipse(m.at[0], m.at[1] + 0.02, m.width * 0.7, 0.16), INK);
      });
      fill(d, poly([[-0.11, 0.95], [0.11, 0.95], [0, 1.24]]), INK, { edge: true });
    },
    top: (d) => {
      const f = d.fit;
      for (const side of [-1, 1]) {
        const wave = f.still ? 0 : Math.sin(f.time * 3 + side) * 0.06;
        const lean = f.swing * 2 + wave;
        const tip: Vec = [side * 0.55 + Math.sin(lean) * 0.45, -1.48 + Math.abs(Math.sin(lean)) * 0.12];
        stroke(d, path(`M${side * 0.3} -0.92Q${side * 0.38} -1.3 ${tip[0]} ${tip[1]}`), INK, 0.045, { edge: true });
        fill(d, circle(tip[0], tip[1], 0.1), INK, { edge: true });
      }
    },
  },

  /** A green onesie: a hood with spikes and the face showing through, a paler belly, clawed feet and a tail. */
  dino: {
    covers: { back: true, feet: true, outfit: true, pattern: true },
    back: (d, tint) => {
      const f = d.fit;
      const wag = f.still ? 0 : Math.sin(f.time * 2.4) * 0.12;
      turned(d.ctx, -0.45, 0.75, f.hang * 0.6 + wag, () => {
        const tail = path("M-0.2 0.45C-0.8 0.6 -1.2 0.95 -1.72 1.42Q-1.2 1.28 -0.55 1.05Z");
        fill(d, tail, tint, { edge: true });
        for (const [x, y] of [[-0.9, 0.84], [-1.2, 1.06], [-1.48, 1.26]] as Vec[]) {
          fill(d, poly([[x - 0.1, y + 0.04], [x + 0.08, y - 0.06], [x - 0.08, y - 0.2]]), darker(tint, 0.18), { edge: true });
        }
      });
    },
    legs: (d, tint, [x, y], i) => {
      const hip = toBody(d.fit, d.fit.legs[i].hip);
      fill(d, rounded(-4, -4, 8, 8, 0), tint);
      const out = Math.atan2(y - hip[1], x - hip[0]);
      for (const spread of [-0.5, 0, 0.5]) {
        const a = out + spread;
        const at: Vec = [x - Math.cos(out) * 0.06, y - Math.sin(out) * 0.06];
        fill(d, poly([[at[0] + Math.cos(a + 1.3) * 0.05, at[1] + Math.sin(a + 1.3) * 0.05], [at[0] + Math.cos(a) * 0.14, at[1] + Math.sin(a) * 0.14], [at[0] + Math.cos(a - 1.3) * 0.05, at[1] + Math.sin(a - 1.3) * 0.05]]), CREAM);
      }
    },
    body: (d, tint) => {
      const f = d.fit;
      const spike = darker(tint, 0.16);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.83 - (i / 5) * 0.66);
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const r = 0.94;
        fill(d, poly([[c * r - s * 0.13, s * r + c * 0.13], [c * (r + 0.3), s * (r + 0.3)], [c * r + s * 0.13, s * r - c * 0.13]]), spike, { edge: true });
      }
      clipped(d, bodyClip(d), () => {
        fill(d, rounded(-1.3, -1.3, 2.6, 2.6, 0), tint);
        fill(d, ellipse(0, 1.08, 0.58, 0.34), mix(tint, CREAM, 0.6));
        const eyes = eyesOf(f);
        const m = mouthOf(f);
        const top = Math.min(...eyes.map((e) => e.at[1] - e.r * 1.6), -0.3);
        const bottom = Math.max(m.at[1] + 0.2, 0.3);
        const opening = ellipse(0, (top + bottom) / 2, 0.8, (bottom - top) / 2);
        fill(d, opening, f.skin);
        stroke(d, opening, darker(tint, 0.22), 0.06);
      });
    },
  },

  /** A white spacesuit, gloves and boots in the costume's colour, and a glass helmet over the face. */
  astronaut: {
    covers: { back: true, feet: true, outfit: true, pattern: true, hat: true },
    back: (d) => {
      fill(d, rounded(-0.82, -0.5, 1.64, 1.3, 0.22), STEEL, { edge: true });
      fill(d, rounded(-0.72, -0.4, 1.44, 0.1, 0.05), darker(STEEL, 0.15));
    },
    legs: (d, tint, [x, y], i) => {
      const hip = toBody(d.fit, d.fit.legs[i].hip);
      fill(d, rounded(-4, -4, 8, 8, 0), SUIT);
      const mid: Vec = [(x + hip[0]) / 2, (y + hip[1]) / 2];
      fill(d, circle(mid[0], mid[1], 0.1), mix(SUIT, STEEL, 0.5));
      fill(d, circle(x, y, 0.2), tint);
      stroke(d, legClip(d, i), INK, LINE * 2);
    },
    body: (d, tint) => {
      // The suit's only below the neck: the head's in the helmet, so the face shows through the glass.
      const suit = path("M-1.3 0.66Q0 0.86 1.3 0.66L1.3 1.3L-1.3 1.3Z");
      clipped(d, bodyClip(d), () => {
        fill(d, suit, SUIT);
        stroke(d, suit, INK, LINE);
      });
      fill(d, rounded(-0.26, 0.82, 0.52, 0.14, 0.04), tint);
      for (const [x, color] of [[-0.14, PALETTE.coral.color], [0, PALETTE.sunflower.color], [0.14, PALETTE.mint.color]] as const) {
        fill(d, circle(x, 0.89, 0.035), color);
      }
    },
    top: (d, tint) => {
      const helmet = circle(0, -0.06, 1.2);
      fill(d, helmet, "#bfe2f0", { alpha: 0.12, edge: true });
      stroke(d, helmet, STEEL, 0.1, { edge: true });
      stroke(d, path("M-0.78 -0.62Q-0.66 -0.9 -0.36 -1.02"), WHITE, 0.08, { alpha: 0.7 });
      stroke(d, path("M-0.9 -0.22Q-0.92 -0.36 -0.86 -0.46"), WHITE, 0.06, { alpha: 0.6 });
      fill(d, rounded(-0.2, -1.36, 0.4, 0.14, 0.05), tint, { edge: true });
    },
  },
};

// ── Shapes ──────────────────────────────────────────────────────────────────

/** A smooth closed curve through the middles of a loop's sides, bending at its points. */
function smoothLoop(loop: Vec[]) {
  const p = new Path2D();
  const mid = (i: number): Vec => {
    const a = loop[i % loop.length];
    const b = loop[(i + 1) % loop.length];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  p.moveTo(...mid(0));
  for (let i = 1; i <= loop.length; i++) p.quadraticCurveTo(...loop[i % loop.length], ...mid(i));
  p.closePath();
  return p;
}

/** Leg `i`'s outline, in body units (like bodyClip). */
function legClip(d: Draw, i: number) {
  const { cx, cy, rx, ry } = d.fit.body;
  const p = new Path2D();
  p.addPath(d.fit.legs[i].path, new DOMMatrix().scale(1 / rx, 1 / ry).translate(-cx, -cy));
  return p;
}

/** The body's own outline, in body units (the clip is set before the body-unit scale, so it's rebuilt here). */
function bodyClip(d: Draw) {
  const { cx, cy, rx, ry, path: body } = d.fit.body;
  const p = new Path2D();
  p.addPath(body, new DOMMatrix().scale(1 / rx, 1 / ry).translate(-cx, -cy));
  return p;
}

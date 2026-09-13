import { config } from "./config";

/**
 * The spider's face as a handful of numbers, so expressions blend into one another instead of
 * swapping pictures.
 *
 * Each eye has an openness, an upper and lower lid, a brow slant, a size, a pupil size, a look
 * of its own, and a set of stroked shapes it can turn into: shut ◡, happy ◠, squeezed > <, flat —
 * and a spiral. The mouth is either the drawn mouth from the artwork, or a shaped one: a bend
 * (smile to frown), an opening with its own top and bottom roundness, a wobble and a lean.
 *
 * mood.ts decides what the face should be doing and eases these numbers toward it; the spider
 * draws whatever they currently are, with the helpers at the bottom.
 */

type Vec = [number, number];

export interface EyeFace {
  /** 1 = open, 0 = squashed shut. */
  open: number;
  /** Upper lid down over the eye, 0–1. */
  lid: number;
  /** Lid slant: + drops the inner corner (cross \ /), − the outer corner (worried / \). */
  slant: number;
  /** Lower lid up over the eye, 0–1. */
  lower: number;
  /** Eye size, and pupil size, as multipliers. */
  size: number;
  pupil: number;
  /** How far the eye has become each stroked shape, 0–1. */
  closed: number;
  happy: number;
  squeeze: number;
  flat: number;
  spiral: number;
  /** A look of the expression's own (fractions of the room in the eye) and how much it wins over the cursor. */
  lookX: number;
  lookY: number;
  lookHold: number;
}

export interface MouthFace {
  /** How much of the artwork's mouth shows, and at what size. The rest of the way is the shaped mouth. */
  drawn: number;
  drawnSize: number;
  /** Bend of the shaped mouth: + smile, − frown. */
  curve: number;
  /** How far it's open. */
  open: number;
  /** Roundness of the opening above and below its middle line, 0–2 (0 = flat). */
  roundTop: number;
  roundBottom: number;
  width: number;
  wobble: number;
  /** Lopsided: + lifts the right corner. */
  skew: number;
  thick: number;
}

export interface Face {
  left: EyeFace;
  right: EyeFace;
  mouth: MouthFace;
  /** Body squashed flat (+) or stretched tall (−). */
  squash: number;
  /** Legs curl in, and fan out, as fractions of Face motion's maximums. */
  tuck: number;
  spread: number;
  /** Hangs lower on the string, as a fraction of its length. */
  sag: number;
}

/** What an expression changes; anything left out stays neutral. `eyes` applies to both, then `left`/`right` on top. */
export interface FaceLook {
  eyes?: Partial<EyeFace>;
  left?: Partial<EyeFace>;
  right?: Partial<EyeFace>;
  mouth?: Partial<MouthFace>;
  squash?: number;
  tuck?: number;
  spread?: number;
  sag?: number;
}

const neutralEye = (): EyeFace => ({
  open: 1,
  lid: 0,
  slant: 0,
  lower: 0,
  size: 1,
  pupil: 1,
  closed: 0,
  happy: 0,
  squeeze: 0,
  flat: 0,
  spiral: 0,
  lookX: 0,
  lookY: 0,
  lookHold: 0,
});

const neutralMouth = (): MouthFace => ({
  drawn: 1,
  drawnSize: 1,
  curve: 0.6,
  open: 0,
  roundTop: 1,
  roundBottom: 1,
  width: 1,
  wobble: 0,
  skew: 0,
  thick: 1,
});

export const neutralFace = (): Face => ({
  left: neutralEye(),
  right: neutralEye(),
  mouth: neutralMouth(),
  squash: 0,
  tuck: 0,
  spread: 0,
  sag: 0,
});

/** The face `look` would give at `amount` (0 = neutral, 1 = the full expression). */
export function faceFor(look: FaceLook | null, amount: number): Face {
  const face = neutralFace();
  if (!look || amount <= 0) return face;
  const toward = <T extends object>(into: T, parts: (Partial<T> | undefined)[]) => {
    const merged = Object.assign({}, ...parts.filter(Boolean)) as Record<string, number>;
    const target = into as Record<string, number>;
    for (const key of Object.keys(merged)) target[key] += (merged[key] - target[key]) * amount;
  };
  toward(face.left, [look.eyes, look.left]);
  toward(face.right, [look.eyes, look.right]);
  toward(face.mouth, [look.mouth]);
  face.squash = (look.squash ?? 0) * amount;
  face.tuck = (look.tuck ?? 0) * amount;
  face.spread = (look.spread ?? 0) * amount;
  face.sag = (look.sag ?? 0) * amount;
  return face;
}

/** Eases `face` a fraction `k` of the way to `to`. The squash is left to its own spring. */
export function easeFace(face: Face, to: Face, k: number) {
  const ease = (into: object, from: object) => {
    const a = into as Record<string, number>;
    const b = from as Record<string, number>;
    for (const key of Object.keys(b)) a[key] += (b[key] - a[key]) * k;
  };
  ease(face.left, to.left);
  ease(face.right, to.right);
  ease(face.mouth, to.mouth);
  face.tuck += (to.tuck - face.tuck) * k;
  face.spread += (to.spread - face.spread) * k;
  face.sag += (to.sag - face.sag) * k;
}

// ── Drawing ──────────────────────────────────────────────────────────────────

/** What the drawing needs to know about each eye, in face coordinates. */
export interface EyeShape {
  side: "left" | "right";
  center: Vec;
  radius: number;
  white: Path2D;
  pupil: Path2D;
  pupilCenter: Vec;
  /** The pupil's offset from where it's drawn, and its slosh on top (already in art units). */
  look: Vec;
  slosh: Vec;
}

export interface MouthShape {
  path: Path2D;
  center: Vec;
  top: number;
  width: number;
}

export interface FaceColors {
  body: string;
  eyes: string;
  pupils: string;
  mouth: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Draws both eyes in passes — whites, then pupils, then lids, then stroked shapes — so an eye
 * grown big enough to overlap its neighbour doesn't paint over the other one's pupil.
 * `blink` is the Blinking animation (0–1); `time` drives the dizzy spirals.
 */
export function drawEyes(
  ctx: CanvasRenderingContext2D,
  eyes: EyeShape[],
  face: Face,
  blink: number,
  colors: FaceColors,
  time: number,
) {
  const lidsBlink = config.blink.style === "lids";
  const shut = clamp01(blink);
  const parts = eyes.map((eye) => {
    const f = eye.side === "left" ? face.left : face.right;
    return {
      eye,
      f,
      open: Math.max(0.001, clamp01(f.open) * (1 - shut)),
      closed: Math.max(f.closed, lidsBlink ? smooth(0.35, 0.9, shut) : 0),
    };
  });

  // Scaled about the eye's middle for its size, then squashed for how open it is.
  const around = (eye: EyeShape, f: EyeFace, open: number) => {
    const [cx, cy] = eye.center;
    ctx.translate(cx, cy);
    ctx.scale(f.size, f.size * open);
    ctx.translate(-cx, -cy);
  };

  for (const { eye, f, open } of parts) {
    ctx.save();
    around(eye, f, open);
    ctx.fillStyle = colors.eyes;
    ctx.fill(eye.white);
    ctx.restore();
  }

  for (const { eye, f, open } of parts) {
    ctx.save();
    around(eye, f, open);
    ctx.clip(eye.white);
    const [px, py] = eye.pupilCenter;
    ctx.translate(eye.look[0] + eye.slosh[0] + px, eye.look[1] + eye.slosh[1] + py);
    ctx.scale(f.pupil, f.pupil);
    ctx.translate(-px, -py);
    ctx.fillStyle = colors.pupils;
    ctx.fill(eye.pupil);
    ctx.restore();
  }

  // Lids are body-coloured shapes laid over the eye, cut to its outline.
  for (const { eye, f, open } of parts) {
    if (f.lid < 0.002 && f.lower < 0.002) continue;
    const [cx, cy] = eye.center;
    const r = eye.radius;
    const inward = eye.side === "left" ? 1 : -1;
    ctx.save();
    around(eye, f, open);
    ctx.clip(eye.white);
    ctx.fillStyle = colors.body;
    if (f.lid >= 0.002) {
      const edge = cy - r + 2 * r * clamp01(f.lid);
      // A slant only shows once there's some lid to slant.
      const tilt = f.slant * 0.6 * Math.min(1, f.lid * 5);
      const at = (x: number) => edge + tilt * (x - cx) * inward;
      ctx.beginPath();
      ctx.moveTo(cx - 2 * r, cy - 3 * r);
      ctx.lineTo(cx + 2 * r, cy - 3 * r);
      ctx.lineTo(cx + 2 * r, at(cx + 2 * r));
      ctx.lineTo(cx - 2 * r, at(cx - 2 * r));
      ctx.closePath();
      ctx.fill();
    }
    if (f.lower >= 0.002) {
      // Curved up in the middle, like cheeks pushing up into a squint.
      const edge = cy + r - 2 * r * clamp01(f.lower);
      ctx.beginPath();
      ctx.moveTo(cx - 2 * r, cy + 3 * r);
      ctx.lineTo(cx - 2 * r, edge + 0.3 * r * f.lower);
      ctx.quadraticCurveTo(cx, edge - 0.6 * r * f.lower, cx + 2 * r, edge + 0.3 * r * f.lower);
      ctx.lineTo(cx + 2 * r, cy + 3 * r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // The stroked shapes. Each one grows in as it arrives, so swapping between them reads as a morph.
  ctx.strokeStyle = colors.eyes;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const { eye, f, closed } of parts) {
    const [cx, cy] = eye.center;
    const r = eye.radius;
    const inward = eye.side === "left" ? 1 : -1;
    const shapes: [number, (weight: number) => void][] = [
      [
        closed,
        () => {
          ctx.moveTo(cx - 0.72 * r, cy - 0.05 * r);
          ctx.quadraticCurveTo(cx, cy + 0.62 * r, cx + 0.72 * r, cy - 0.05 * r);
        },
      ],
      [
        f.happy,
        () => {
          ctx.moveTo(cx - 0.72 * r, cy + 0.2 * r);
          ctx.quadraticCurveTo(cx, cy - 0.55 * r, cx + 0.72 * r, cy + 0.2 * r);
        },
      ],
      [
        f.squeeze,
        () => {
          ctx.moveTo(cx - inward * 0.55 * r, cy - 0.55 * r);
          ctx.lineTo(cx + inward * 0.5 * r, cy);
          ctx.lineTo(cx - inward * 0.55 * r, cy + 0.55 * r);
        },
      ],
      [
        f.flat,
        () => {
          ctx.moveTo(cx - 0.72 * r, cy);
          ctx.lineTo(cx + 0.72 * r, cy);
        },
      ],
      [
        f.spiral,
        () => {
          const turns = 2.4;
          const spin = time * config.faceDizzy.spin * Math.PI * 2 * inward;
          for (let i = 0; i <= 56; i++) {
            const t = i / 56;
            const a = t * turns * Math.PI * 2 + spin;
            const d = 0.8 * r * t;
            const x = cx + Math.cos(a) * d;
            const y = cy + Math.sin(a) * d;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        },
      ],
    ];
    shapes.forEach(([amount, path], index) => {
      if (amount < 0.01) return;
      ctx.save();
      ctx.translate(cx, cy);
      const grow = f.size * (0.55 + 0.45 * clamp01(amount));
      ctx.scale(grow, grow);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = clamp01(amount * 1.4);
      // Spirals are longer, so a thinner line keeps them from clogging up.
      ctx.lineWidth = r * (index === 4 ? 0.2 : 0.34);
      ctx.beginPath();
      path(amount);
      ctx.stroke();
      ctx.restore();
    });
  }
}

/**
 * The mouth: the artwork's own, faded against a shaped one. `feed` (0–1) is how far it has
 * dropped open for food, which hinges the drawn mouth at its top as before.
 */
export function drawMouth(
  ctx: CanvasRenderingContext2D,
  m: MouthFace,
  shape: MouthShape,
  feed: number,
  color: string,
) {
  const drawn = clamp01(m.drawn);
  ctx.fillStyle = ctx.strokeStyle = color;

  if (drawn > 0.01) {
    ctx.save();
    ctx.globalAlpha = drawn;
    const [cx, cy] = shape.center;
    ctx.translate(cx, cy);
    ctx.scale(m.drawnSize, m.drawnSize);
    ctx.translate(-cx, -cy);
    const drop = 1 + (config.feed.mouthOpen - 1) * Math.max(0, feed);
    if (drop !== 1) {
      ctx.translate(0, shape.top);
      ctx.scale(1, drop);
      ctx.translate(0, -shape.top);
    }
    ctx.fill(shape.path);
    ctx.restore();
  }

  const shaped = 1 - drawn;
  if (shaped < 0.01) return;
  const w = shape.width * m.width;
  const [cx, cy] = shape.center;
  const bend = w * 0.22 * m.curve;
  const height = w * 0.55 * Math.max(0, m.open) + shape.width * 0.2 * Math.max(0, feed) * 0.6;
  const steps = 24;
  const top: Vec[] = [];
  const bottom: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = -1 + (2 * i) / steps;
    const x = cx + (u * w) / 2;
    // Smile: middle down, corners up, kept centred on the mouth's spot.
    const line =
      cy +
      bend * (1 - u * u) -
      bend / 2 -
      m.skew * w * 0.16 * u +
      m.wobble * w * 0.07 * Math.sin((u + 1) * Math.PI * 3);
    const round = Math.sqrt(Math.max(0, 1 - u * u));
    top.push([x, line - height * 0.5 * round * m.roundTop]);
    bottom.push([x, line + height * 0.5 * round * m.roundBottom]);
  }
  ctx.save();
  ctx.globalAlpha = shaped;
  ctx.lineWidth = shape.width * 0.2 * m.thick;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

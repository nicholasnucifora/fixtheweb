import spiderSource from "../../assets/spider/spider.svg?raw";
import type { AnchorFrame } from "./anchor";
import type { AnimationState } from "./animation";
import { config } from "./config";
import { type Fit, type Pen, dressBack, dressBody, dressFace, dressFeet, dressHat } from "./dress";
import { type Face, drawEyes, drawMouth } from "./face";
import { stringDeviceWidth } from "./render";
import type { Rope } from "./rope";
import { SKINS, type Look } from "./wardrobe";

/**
 * The spider on the end of the string, drawn onto the string's canvas.
 *
 * Why a canvas rather than SVG in the page: the browser moves and rotates page
 * elements as flat images whenever it puts them on their own layer (which it
 * does for anything sitting on top of a canvas), and a rotated image's edges
 * shimmer. Drawing the paths straight onto the canvas renders them crisply at
 * their exact position and angle every frame. The `bob` element is only the
 * invisible grab target that follows the spider around.
 *
 * Shapes come from src/assets/spider/spider.svg (built by scripts/build-spider.mjs).
 * Layers, back to front: an outline traced around the whole silhouette (so the
 * seams between body and legs never show), the legs, then the torso (body +
 * face). Every leg is a small damped spring pushed around by the spider's swing
 * and by gravity; its movement shows as a swing from the hip, a smooth curl
 * along the leg, or a mix.
 *
 * Paths are rebuilt from their original points, so shape swaps (a mirrored eye,
 * pupil or leg), placement sliders and curls never accumulate drift.
 *
 * Whatever it's wearing (`look`, from wardrobe.ts) is drawn in among those layers by dress.ts:
 * a cape behind the legs, socks on them, an outfit on the body, glasses over the face, a hat on top.
 */

const DEG = Math.PI / 180;
/** A curl needs a bigger angle than a whole-leg swing to move the tip as far. */
const CURL_GAIN = 1.5;
/** Physics sub-step, so stiff springs stay stable at low frame rates. */
const MAX_STEP = 1 / 240;
const DEBUG_COLOR = "#ff5a5f";

type Vec = [number, number];
type Side = "left" | "right";
type Source = "drawn" | "left" | "right";
export interface Cmd {
  cmd: string;
  args: number[];
}
export interface Shape {
  cmds: Cmd[];
  center: Vec;
  size: Vec;
}
interface Leg {
  side: Side;
  pair: 1 | 2 | 3;
  pivot: Vec;
  /** The leg as drawn (flat cut at the hip)… */
  baseCmds: Cmd[];
  /** …and with its hidden root, which is what's drawn. */
  cmds: Cmd[];
  /** Ends of the straight cut where the leg meets the body. */
  cut: [Vec, Vec] | null;
  /** Furthest point from the hip, art units… */
  reach: number;
  /** …which is the tip, relative to the hip as drawn, and where it is this frame (art units). */
  tipRel: Vec;
  tip: Vec;
  /** Direction of the leg's weight from the hip, as drawn. */
  weightDir: Vec;
  /** Angle away from its placed pose (rad), and its angular velocity. */
  phi: number;
  omega: number;
  /** −1..1, fixed per leg, so legs don't spring in lockstep. */
  tone: number;
  d: string;
  path: Path2D;
  /** Where the hip is this frame, art units (for the debug marker). */
  hip: Vec;
  /** A few points along the leg, relative to its hip as drawn, for measuring how near the cursor is. */
  spine: Vec[];
  /** Those points in art coordinates, from the last pose. */
  sampled: Vec[];
  /** Reaction to the cursor: extra swing and curl, eased in and out. */
  react: number;
  reactBend: number;
  /** Was the cursor near it last frame? (So a flick only fires as it arrives.) */
  wasNear: boolean;
}
/** What the last update worked out, for drawing. */
interface Pose {
  /** Art units → document px, for the spider… */
  art: DOMMatrix;
  /** …and the favicon's box (top-left at 0,0, width × height px) → document px. */
  box: DOMMatrix;
  width: number;
  height: number;
  /** Art units per CSS px, for 1px-ish debug strokes. */
  artPerPx: number;
  /** Outline thickness, art units. */
  outline: number;
  torso: DOMMatrix;
  face: DOMMatrix;
}

export function createSpider(bob: HTMLElement, rope: Rope, animation: AnimationState, face: Face, look: Look) {
  const svg = new DOMParser().parseFromString(spiderSource, "image/svg+xml").documentElement;
  const [, , W, H] = (svg.getAttribute("viewBox") ?? "0 0 596 401").split(/\s+/).map(Number);
  const pct = W / 100;
  /**
   * Where the thread meets the spider, art units. Normally the point set in Spidey → Look,
   * but an animation can hang it somewhere else (abseiling from the rear, say) and blend back.
   */
  const attachPoint = (): Vec => {
    const blend = Math.max(0, Math.min(1, animation.attachBlend));
    const look = config.look;
    return [
      (look.attachX + (animation.attachX - look.attachX) * blend) * W,
      (look.attachY + (animation.attachY - look.attachY) * blend) * H,
    ];
  };
  const favicon = new Image();
  favicon.src = "/favicon.svg";
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const dOf = (el: Element | null) => el?.getAttribute("d") ?? "";
  const shapeOf = (el: Element | null) => shape(parse(dOf(el)));

  // ── Parts ─────────────────────────────────────────────────────────────────
  const bodyEl = svg.querySelector('[data-part="body"]');
  const bodyPath = new Path2D(dOf(bodyEl));
  const bodyShape = shapeOf(bodyEl);
  const bodyCenter = bodyShape.center;

  const legs: Leg[] = [...svg.querySelectorAll("[data-leg]")].map((el, i) => {
    const id = el.getAttribute("data-leg") ?? "L1";
    const nums = (name: string) => (el.getAttribute(name) ?? "").split(" ").filter(Boolean).map(Number);
    const pivot = nums("data-pivot") as Vec;
    const cut = nums("data-cut");
    const weight = nums("data-weight");
    const cmds = parse(dOf(el));
    const pts = points(cmds).map(([x, y]) => [x - pivot[0], y - pivot[1]] as Vec);
    const mean: Vec = [avg(pts.map((p) => p[0])), avg(pts.map((p) => p[1]))];
    const every = Math.max(1, Math.ceil(pts.length / 8));
    const tipRel = pts.reduce((far, p) => (Math.hypot(p[0], p[1]) > Math.hypot(far[0], far[1]) ? p : far), [0, 0] as Vec);
    return {
      side: id[0] === "R" ? "right" : "left",
      pair: Number(id[1]) as 1 | 2 | 3,
      pivot,
      baseCmds: cmds,
      cmds,
      cut: cut.length === 4 ? ([[cut[0], cut[1]], [cut[2], cut[3]]] as [Vec, Vec]) : null,
      reach: Math.max(...pts.map((p) => Math.hypot(p[0], p[1]))),
      tipRel,
      tip: pivot,
      // From the build script, measured before the hidden root is added; the mean is a fallback.
      weightDir: normalize(weight.length === 2 ? (weight as Vec) : mean),
      phi: 0,
      omega: 0,
      tone: ((i * 0.618034) % 1) * 2 - 1,
      d: "",
      path: new Path2D(),
      hip: pivot,
      spine: pts.filter((_, k) => k % every === 0),
      sampled: [],
      react: 0,
      reactBend: 0,
      wasNear: false,
    };
  });
  const legOf = (side: Side, pair: number) => legs.find((l) => l.side === side && l.pair === pair)!;
  const pairConfig = (pair: 1 | 2 | 3) => [config.legs1, config.legs2, config.legs3][pair - 1];

  const eyes = (["left", "right"] as Side[]).map((side) => {
    const g = svg.querySelector(`[data-part="eye"][data-side="${side}"]`);
    return {
      side,
      whiteShape: shapeOf(g?.querySelector('[data-part="eye-white"]') ?? null),
      pupilShape: shapeOf(g?.querySelector('[data-part="pupil"]') ?? null),
      white: new Path2D(),
      pupil: new Path2D(),
      /** Where the eye sits once placed, art units: a blink shuts toward this line. */
      center: [0, 0] as Vec,
      pupilCenter: [0, 0] as Vec,
      /** How far off the eye's middle the pupil is drawn, art units. */
      drawn: [0, 0] as Vec,
      /** How far the pupil can move from the eye's middle, art units, and the eye's own radius. */
      room: 0,
      radius: 0,
      /** Pupils left behind by a sudden move (art units), and how fast they're swinging back (fractions of room/s). */
      slosh: [0, 0] as Vec,
      sloshAt: [0, 0] as Vec,
      sloshSpeed: [0, 0] as Vec,
      look: [0, 0] as Vec,
    };
  });
  const eyeOf = (side: Side) => eyes.find((e) => e.side === side)!;
  const mouthShape = shapeOf(svg.querySelector('[data-part="mouth"]'));
  let mouthPath = new Path2D();
  /** The top of the mouth once placed: opening it drops the jaw from here. Its middle and width shape the drawn-on mouths. */
  let mouthTop = 0;
  let mouthCenter: Vec = [0, 0];
  let mouthWidth = 0;
  const faceCenter: Vec = [
    avg([...eyes.map((e) => e.whiteShape.center[0]), mouthShape.center[0]]),
    avg([...eyes.map((e) => e.whiteShape.center[1]), mouthShape.center[1]]),
  ];

  /** Which shape to draw on `side`, and whether it's the other side's, mirrored. */
  const pick = <T>(source: Source, side: Side, of: (s: Side) => T) =>
    source === "drawn" ? { from: of(side), mirrored: false } : { from: of(source), mirrored: source !== side };

  /** A shape redrawn centred on `at`, scaled, optionally mirrored left↔right. */
  const place = (s: Shape, mirrored: boolean, at: Vec, sx: number, sy: number) =>
    new Path2D(mapPath(s.cmds, (x, y) => [at[0] + (x - s.center[0]) * sx * (mirrored ? -1 : 1), at[1] + (y - s.center[1]) * sy]));

  // ── Face: rebuilt only when its settings change ───────────────────────────
  let faceKey = "";
  let faceMatrix = new DOMMatrix();
  const layoutFace = () => {
    const key = JSON.stringify([config.face, config.eyes, config.pupils.shape, config.pupils.size, config.mouth]);
    if (key === faceKey) return;
    faceKey = key;

    const f = config.face;
    faceMatrix = new DOMMatrix().translate(f.x * pct, f.y * pct).scale(f.scale, f.scale, 1, faceCenter[0], faceCenter[1]);

    for (const eye of eyes) {
      const out = eye.side === "left" ? -1 : 1;
      const size = config.eyes.size;
      const at: Vec = [
        eye.whiteShape.center[0] + (out * config.eyes.spacing * pct) / 2,
        eye.whiteShape.center[1] + config.eyes.y * pct,
      ];
      const white = pick(config.eyes.shape as Source, eye.side, (s) => eyeOf(s).whiteShape);
      eye.white = place(white.from, white.mirrored, at, size, size);
      eye.center = at;

      // The pupil keeps its drawn position within the eye, scaled with it.
      eye.pupilCenter = [
        at[0] + (eye.pupilShape.center[0] - eye.whiteShape.center[0]) * size,
        at[1] + (eye.pupilShape.center[1] - eye.whiteShape.center[1]) * size,
      ];
      const pupilSize = size * config.pupils.size;
      const pupil = pick(config.pupils.shape as Source, eye.side, (s) => eyeOf(s).pupilShape);
      eye.pupil = place(pupil.from, pupil.mirrored, eye.pupilCenter, pupilSize, pupilSize);

      eye.drawn = [eye.pupilCenter[0] - at[0], eye.pupilCenter[1] - at[1]];
      const eyeRadius = (Math.min(...eye.whiteShape.size) / 2) * size;
      const pupilRadius = (Math.max(...pupil.from.size) / 2) * pupilSize;
      eye.room = Math.max(0, eyeRadius - pupilRadius);
      eye.radius = eyeRadius;
    }

    const m = config.mouth;
    const mouthAt: Vec = [mouthShape.center[0], mouthShape.center[1] + m.y * pct];
    mouthPath = place(mouthShape, false, mouthAt, m.scaleX, m.scaleY);
    mouthTop = mouthAt[1] - (mouthShape.size[1] * m.scaleY) / 2;
    mouthCenter = mouthAt;
    mouthWidth = mouthShape.size[0] * m.scaleX;
  };

  // ── Hidden hip roots ──────────────────────────────────────────────────────
  // Each leg's straight cut is swapped for a rounded base reaching into the body.
  // The body hides it, but it means solid leg sits under the body's edge: no
  // anti-aliasing seam where the two meet, and no gap when a leg turns.
  let rootDepth = -1;
  const updateRoots = () => {
    const depth = config.legMotion.rootDepth;
    if (depth === rootDepth) return;
    rootDepth = depth;
    for (const leg of legs) {
      leg.cmds = depth > 0 && leg.cut ? withRoot(leg.baseCmds, leg.cut, leg.pivot, bodyCenter, depth) : leg.baseCmds;
      leg.d = "";
    }
  };

  // ── Legs: reshaped every frame from their spring state ────────────────────
  const poseLegs = (torsoPoint: (p: Vec) => Vec, gripAt: (along: number) => Vec) => {
    const moving = config.legMotion.enabled;
    const curl = moving ? config.legMotion.curl : 0;
    const focus = config.legMotion.curlFocus;
    for (const leg of legs) {
      const pair = pairConfig(leg.pair);
      const { from, mirrored } = pick(pair.shape as Source, leg.side, (s) => legOf(s, leg.pair));
      // Sliders are written for "tips up = positive"; that's clockwise on the left, anticlockwise on the right.
      const up = leg.side === "left" ? 1 : -1;
      // Animations swing the legs too, offset leg to leg so they don't move as one.
      const worked = animation.legSwing * Math.sin(animation.legPhase + legs.indexOf(leg) * 1.1);
      // …and one pair can be holding the thread, reaching for wherever it leaves the spider
      // and working it hand over hand. Those legs are busy, so they skip the idle swing.
      const holding = animation.grip > 0 && leg.pair === Number(config.dropIn.gripPair);
      // An idle stretch reaches one leg out and brings it back.
      const stretching = legs.indexOf(leg) === animation.stretchLeg ? up * animation.stretchAmount : 0;
      // Expressions fan the legs out (top pair up, bottom pair down) and curl them in to brace.
      const fan = leg.pair === 1 ? 1 : leg.pair === 3 ? -1 : 0;
      const spread = up * fan * config.faceMotion.spread * DEG * face.spread;
      const swing =
        up * pair.angle * DEG + leg.react + (holding ? 0 : worked + stretching) + leg.phi * (1 - curl) + spread;
      // The legs with nothing to hold tuck up while it drops.
      const tuck = holding ? 0 : up * config.dropIn.curl * DEG * animation.grip;
      const brace = up * config.faceMotion.tuck * DEG * face.tuck;
      const bend = up * pair.bend * DEG + leg.reactBend + leg.phi * curl * CURL_GAIN + tuck + brace;
      // Hips ride along with the torso (breathing, width/height, a squash) so legs stay attached.
      const onBody = torsoPoint(leg.pivot);
      const hip: Vec = [onBody[0] - up * pair.x * pct, onBody[1] + pair.y * pct];
      if (holding) {
        // …except the pair holding the thread, whose hips slide toward where the thread leaves the
        // body so the legs can actually reach it. The slide follows the grip, which fades over the
        // turn, so they walk back to their drawn places rather than snapping.
        // Either side of where the thread leaves the body, rather than both on the same spot,
        // or the two legs land on top of each other and read as one.
        const to = attachPoint();
        const move = config.dropIn.gripHip * animation.grip;
        const side = (leg.side === "left" ? -1 : 1) * config.dropIn.gripSpread * (W / 2);
        hip[0] += (to[0] + side - hip[0]) * move;
        hip[1] += (to[1] - hip[1]) * move;
      }
      // Turn the leg from its placed pose toward the thread, and add the hand-over-hand.
      let reach = 0;
      if (holding) {
        const drop = config.dropIn;
        // Where this leg is in its cycle. The two legs sharing a beat is what makes them clap;
        // half a cycle apart is what makes it hand over hand.
        const beat =
          drop.work === "steady"
            ? 0
            : drop.work === "together"
              ? Math.sin(animation.legPhase)
              : drop.work === "one"
                ? leg.side === "left"
                  ? Math.sin(animation.legPhase)
                  : 0
                : Math.sin(animation.legPhase + (leg.side === "left" ? 0 : Math.PI));
        // …so it reaches for a different spot up the thread, and its angle follows from that.
        const swung = animation.pull * beat;
        const along = Math.max(0, drop.gripAlong * (1 + swung * drop.workSlide));
        const to = gripAt(along);
        const toThread: Vec = [to[0] - hip[0], to[1] - hip[1]];
        const rest = rotate(leg.weightDir, swing);
        const turn = Math.atan2(cross(rest, toThread), rest[0] * toThread[0] + rest[1] * toThread[1]);
        const most = drop.gripReach * DEG;
        const hand = swung * drop.gripPull * DEG * (leg.side === "left" ? 1 : -1);
        reach = animation.grip * drop.grip * (Math.max(-most, Math.min(most, turn)) + hand);
      }
      const cos = Math.cos(swing + reach);
      const sin = Math.sin(swing + reach);
      const put = (x: number, y: number): Vec => {
        let px = x - from.pivot[0];
        let py = y - from.pivot[1];
        if (mirrored) px = -px;
        if (bend) [px, py] = rotate([px, py], bend * (Math.hypot(px, py) / from.reach) ** focus);
        return [hip[0] + (px * cos - py * sin) * pair.scale, hip[1] + (px * sin + py * cos) * pair.scale];
      };
      const d = mapPath(from.cmds, put);
      // Where the leg ended up, so the cursor's distance to it can be measured next frame.
      leg.sampled = from.spine.map(([sx, sy]) => put(sx + from.pivot[0], sy + from.pivot[1]));
      leg.tip = put(from.tipRel[0] + from.pivot[0], from.tipRel[1] + from.pivot[1]);
      if (d !== leg.d) {
        leg.d = d;
        leg.path = new Path2D(d);
      }
      leg.hip = hip;
    }
  };

  /**
   * Legs notice the cursor. `mode` picks what they do about it and `scope` which
   * of them join in; the movement eases in and out on top of their placed pose,
   * so their springs carry on underneath.
   */
  const reactToCursor = (dt: number, cursor: Vec | null) => {
    const r = config.legReact;
    const radius = r.radius * (W / config.look.width);
    const ease = 1 - Math.exp(-r.ease * dt);
    const still = reducedMotion.matches;

    // How near the cursor is to each leg, 0–1.
    const near = legs.map((leg) => {
      if (!cursor || r.mode === "off" || radius <= 0) return 0;
      let closest = Infinity;
      for (const [x, y] of leg.sampled) closest = Math.min(closest, Math.hypot(x - cursor[0], y - cursor[1]));
      return Math.max(0, 1 - closest / radius) ** r.falloff;
    });
    const most = Math.max(0, ...near);
    if (r.scope === "all") near.fill(most);
    else if (r.scope === "nearest") near.forEach((amount, i) => (near[i] = amount === most && most > 0 ? most : 0));

    legs.forEach((leg, i) => {
      const amount = near[i];
      const strength = r.strength * DEG * amount;
      let swing = 0;
      let bend = 0;
      if (amount > 0 && cursor) {
        // Which side of the leg the cursor is on, so it can move away from it or toward it.
        const tip = leg.sampled[leg.sampled.length - 1] ?? leg.hip;
        const along: Vec = [tip[0] - leg.hip[0], tip[1] - leg.hip[1]];
        const toCursor: Vec = [cursor[0] - leg.hip[0], cursor[1] - leg.hip[1]];
        const side = Math.sign(cross(along, toCursor)) || 1;
        const up = leg.side === "left" ? 1 : -1;
        const phase = r.mode === "wave" ? i * r.waveOffset * DEG : 0;
        const wobble = still ? 1 : Math.sin(time * r.speed * Math.PI * 2 + phase);
        if (r.mode === "flinch") swing = -side * strength;
        else if (r.mode === "reach") swing = side * strength;
        else if (r.mode === "curl") bend = up * strength;
        else if (r.mode === "wiggle" || r.mode === "wave") swing = wobble * strength;
        else if (r.mode === "flick" && !leg.wasNear && amount > 0.2) {
          // One kick as the cursor arrives; the leg's own spring takes it from there.
          leg.omega -= side * r.strength * DEG * 2 * Math.PI * config.legMotion.spring;
        }
      }
      leg.wasNear = amount > 0.2;
      leg.react += (swing - leg.react) * ease;
      leg.reactBend += (bend - leg.reactBend) * ease;
    });
  };

  /** One physics step for every leg. `gravity` is the felt pull (gravity minus the spider's acceleration) in the spider's own frame, in g. */
  const stepLegs = (dt: number, gravity: Vec, fidget: number) => {
    const m = config.legMotion;
    if (!m.enabled) {
      for (const leg of legs) leg.phi = leg.omega = 0;
      return;
    }
    const max = m.maxAngle * DEG;
    for (const leg of legs) {
      const w = 2 * Math.PI * m.spring * (1 + m.variation * 0.5 * leg.tone);
      const up = leg.side === "left" ? 1 : -1;
      const rest = rotate(leg.weightDir, up * pairConfig(leg.pair).angle * DEG);
      // Only the change from hanging still pushes the leg, so its placed pose is its resting pose.
      const torque = cross(rotate(rest, leg.phi), gravity) - cross(rest, [0, 1]);
      if (fidget && Math.random() < (m.fidgetRate * dt) / legs.length) {
        leg.omega += (Math.random() < 0.5 ? -1 : 1) * fidget * DEG * w;
      }
      leg.omega += (w * w * (m.weight * torque - leg.phi) - 2 * m.damping * w * leg.omega) * dt;
      leg.phi += leg.omega * dt;
      if (Math.abs(leg.phi) > max) {
        leg.phi = Math.sign(leg.phi) * max;
        leg.omega = 0;
      }
    }
  };

  // ── Pupils look at the cursor ──────────────────────────────────────────────
  let pointer: { x: number; y: number } | null = null;
  const events = new AbortController();
  window.addEventListener("pointermove", (e) => (pointer = { x: e.clientX, y: e.clientY }), {
    passive: true,
    signal: events.signal,
  });
  document.documentElement.addEventListener("pointerleave", () => (pointer = null), { signal: events.signal });

  /** `faceToDoc` maps the face's coordinates to document px, so tilt, breathing and face sliders all count. */
  const lookAround = (dt: number, faceToDoc: DOMMatrix) => {
    const p = config.pupils;
    const artPerB = W / config.look.width;
    const at =
      p.follow && pointer
        ? faceToDoc.inverse().transformPoint(new DOMPoint(pointer.x + window.scrollX, pointer.y + window.scrollY))
        : null;
    // Two separate questions, so that tuning one doesn't disturb the other:
    //   which way does each eye point  →  where it aims from (Converge)
    //   how far does the pupil travel  →  one shared amount (Close-up look, Full-look distance)
    // Measuring the amount from between the eyes rather than from each eye is what keeps them even:
    // per-eye, a cursor off to the left is nearly touching the left eye and miles from the right, so
    // one pupil would creep while the other pinned itself to the rim.
    const between: Vec = [avg(eyes.map((e) => e.center[0])), avg(eyes.map((e) => e.center[1]))];
    const distance = at ? Math.hypot(at.x - between[0], at.y - between[1]) / artPerB : Infinity;
    // Idle animations played from the panel get a moment with the eyes to themselves.
    const noticed = at !== null && distance < p.radius && animation.idleLook <= 0;
    const reach = Math.max(0.001, p.reach);
    const k = 1 - Math.exp(-p.speed * dt);
    for (const eye of eyes) {
      // Everything here is measured from the middle of the eye, so the two eyes travel alike.
      // "Inward" is toward the other eye, which is +x for the left one.
      const inward = eye.side === "left" ? 1 : -1;
      // Left alone, the eyes sit at rest and wander (Animations → Idle eyes).
      const idle: Vec = [
        (p.restX + inward * p.restIn + animation.gazeX) * eye.room,
        (p.restY + animation.gazeY) * eye.room,
      ];
      let look = idle;
      if (noticed && at) {
        const room = eye.room * p.range;
        // Where this eye aims from: the point between the eyes, its own middle, or further out
        // still. Its own middle is what crosses them, because each eye then sees a close cursor
        // as being off to its inward side.
        const from: Vec = [
          between[0] + (eye.center[0] - between[0]) * p.converge,
          between[1] + (eye.center[1] - between[1]) * p.converge,
        ];
        const dx = at.x - from[0];
        const dy = at.y - from[1];
        const dist = Math.hypot(dx, dy);
        let aimed: Vec;
        if (p.aim === "trail") {
          // The pupil sits where the cursor is, shrunk to fit the eye: the rim at a full look away.
          const scale = room / (reach * artPerB);
          aimed = clampLength([dx * scale, dy * scale], room);
        } else {
          const len = dist || 1;
          aimed = [(dx / len) * room, (dy / len) * room];
        }
        // Close in, the direction stops being worth anything: a cursor a pixel above the middle of
        // an eye and one a pixel below point the pupil to opposite rims. So near the eye — or near
        // whatever point it's aiming from — the look eases back to resting instead of flipping.
        const near = Math.min(dist, Math.hypot(at.x - eye.center[0], at.y - eye.center[1]));
        const ease = Math.min(1, near / Math.max(0.001, p.settle * eye.radius));
        look = [idle[0] + (aimed[0] - idle[0]) * ease, idle[1] + (aimed[1] - idle[1]) * ease];
      }
      // Where the pupil wants to be, still from the middle of the eye…
      const expression = eye.side === "left" ? face.left : face.right;
      // Shrunk pupils have more room to move in.
      const room = Math.max(0, eye.radius - (eye.radius - eye.room) * expression.pupil);
      const home = p.home === "drawn" ? eye.drawn : ([0, 0] as Vec);
      let want: Vec = [home[0] + look[0], home[1] + look[1]];
      // An expression can have a look of its own (Faces), and win over the cursor as much as it says.
      const hold = Math.max(0, Math.min(1, expression.lookHold));
      if (hold > 0) {
        want = [
          want[0] + (expression.lookX * room - want[0]) * hold,
          want[1] + (expression.lookY * room - want[1]) * hold,
        ];
      }
      want = clampLength(want, room);
      // …turned back into an offset from where it was drawn, which is what gets drawn.
      eye.look[0] += (want[0] - eye.drawn[0] - eye.look[0]) * k;
      eye.look[1] += (want[1] - eye.drawn[1] - eye.look[1]) * k;
      slosh(eye, dt, room);
    }
  };

  /**
   * Pupils have a little inertia: yank the spider one way and they get left behind the other way
   * for a moment, then swing back. A damped spring driven by the body's acceleration, felt in the
   * face's own frame so a tilted spider sloshes along its own axes.
   */
  const slosh = (eye: (typeof eyes)[number], dt: number, room: number) => {
    const m = config.faceMotion;
    const turn = -(tilt + animation.tilt);
    const felt = rotate(accel, turn);
    const push: Vec = [-felt[0] * m.inertia, -felt[1] * m.inertia];
    const w = Math.PI * 2 * m.inertiaSpring;
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      for (const j of [0, 1]) {
        eye.sloshSpeed[j] += (w * w * (push[j] - eye.sloshAt[j]) - 2 * m.inertiaDamping * w * eye.sloshSpeed[j]) * h;
        eye.sloshAt[j] += eye.sloshSpeed[j] * h;
      }
    }
    // Kept inside the eye along with wherever it's already looking.
    const at: Vec = [eye.look[0] + eye.drawn[0], eye.look[1] + eye.drawn[1]];
    const total = clampLength([at[0] + eye.sloshAt[0] * room, at[1] + eye.sloshAt[1] * room], room);
    eye.slosh = [total[0] - at[0], total[1] - at[1]];
  };

  /**
   * Where the holding legs reach, art units: a point a little way up the actual thread, so they
   * hold the line above them rather than folding in over the spot it leaves their body.
   */
  const threadAt = (art: DOMMatrix, alpha: number, width: number, attach: Vec, along: number): Vec => {
    const n = rope.points.length;
    if (animation.grip <= 0 || along <= 0 || n < 2 || rope.length <= 0) return attach;
    const spacing = rope.length / (n - 1);
    const back = Math.max(0, n - 1 - Math.round((along * width) / spacing));
    const p = rope.at(back, alpha);
    const q = art.inverse().transformPoint(new DOMPoint(p.x, p.y));
    return [q.x, q.y];
  };

  // ── The grab target: sized and placed like the spider, DOM only touched on change ──
  let styleKey = "";
  const sizeGrabTarget = (width: number, height: number, px: number, py: number) => {
    const key = [width, height, px, py, config.bob.hitArea, config.spideyDebug.showHitArea].join("|");
    if (key === styleKey) return;
    styleKey = key;
    bob.style.setProperty("--bob-w", `${width}px`);
    bob.style.setProperty("--bob-h", `${height}px`);
    bob.style.setProperty("--bob-hit", `${-config.bob.hitArea * 100}%`);
    bob.style.transformOrigin = `${px}% ${py}%`;
    bob.toggleAttribute("data-show-hit", config.spideyDebug.showHitArea);
  };

  // ── Motion state ──────────────────────────────────────────────────────────
  let pose: Pose | null = null;
  let started = false;
  let tilt = 0;
  let tiltSpeed = 0;
  let time = 0;
  let velocity: Vec = [0, 0];
  let accel: Vec = [0, 0];
  /** Seconds it's been settled, how far it's eased onto the pixel grid (0–1), and the string's matching nudge (px). */
  let stillFor = 0;
  let snap = 0;
  let stringShift = 0;
  /** What hats and dangly clothes wobble by (rad), and how fast. */
  let swing = 0;
  let swingSpeed = 0;

  /** Where everything is this frame, for the clothes (dress.ts). */
  const fitNow = (skin: string, mouthColor: string): Fit => ({
    body: { cx: bodyCenter[0], cy: bodyCenter[1], rx: bodyShape.size[0] / 2, ry: bodyShape.size[1] / 2, path: bodyPath },
    legs: legs.map((leg) => ({ path: leg.path, tip: leg.tip, side: leg.side })),
    eyes: eyes.map((eye) => ({ side: eye.side, center: eye.center, radius: eye.radius, size: face[eye.side].size })),
    mouth: { center: mouthCenter, top: mouthTop, width: mouthWidth, drawn: face.mouth.drawn },
    time,
    velocity: rotate(velocity, -(tilt + animation.tilt)),
    swing,
    hang: -(tilt + animation.tilt),
    still: reducedMotion.matches,
    skin,
    mouthColor,
  });

  return {
    /** Stops following the cursor, for a spider that's gone for good. */
    dispose: () => events.abort(),

    /** Sideways nudge (CSS px) that lines the string up with the pixel grid while the spider is snapped. */
    stringShift: () => stringShift,

    /** The middle of the body in document px, or null before the first frame. */
    center(): Vec | null {
      if (!pose) return null;
      const p = pose.art.multiply(pose.torso).transformPoint(new DOMPoint(bodyCenter[0], bodyCenter[1]));
      return [p.x, p.y];
    },

    /** Half the spider's width, px. */
    radius: () => (pose ? pose.width / 2 : 0),

    /** How far below the thread's end the middle of the spider hangs at rest, px, for a spider `unit` big. */
    hang: (unit: number) => ((H / 2 - attachPoint()[1]) * config.look.width * unit) / W,

    /** The mouth, in document px — what food is dragged to. */
    mouth(): Vec {
      if (!pose) return [0, 0];
      const p = pose.art.multiply(pose.torso).multiply(pose.face).transformPoint(new DOMPoint(mouthShape.center[0], mouthTop));
      return [p.x, p.y];
    },

    /**
     * Once per frame, after the string has moved. `dt` is this frame's time (time scale applied),
     * `simDt` the physics time actually stepped, and `alpha` how far between the last two physics
     * steps to draw (see Rope.at). `pixelRatio` is device px per CSS px on the canvas.
     */
    update(a: AnchorFrame, dt: number, simDt: number, alpha: number, pixelRatio: number) {
      const fav = config.look.showFavicon;
      // Feeding it makes it bigger (Animations → Feeding).
      const width = config.look.width * a.unit * (fav ? config.look.faviconScale : 1) * animation.size;
      const height = fav ? width : (width * H) / W;
      const attach = attachPoint();
      const px = fav ? 50 : (attach[0] / W) * 100;
      const py = fav ? config.look.faviconAttachY * 100 : (attach[1] / H) * 100;
      sizeGrabTarget(width, height, px, py);

      const n = rope.points.length;
      const tail = rope.at(n - 1, alpha);
      const b = config.body;

      if (simDt > 0) {
        // Velocity straight from the physics (exact per step, unlike frame-to-frame positions),
        // and smoothed acceleration in b/s²: what the legs feel as it swings.
        const t = rope.tail;
        const v: Vec = [((t.x - t.px) * config.sim.rate) / a.unit, ((t.y - t.py) * config.sim.rate) / a.unit];
        const smooth = 1 - Math.exp(-config.body.leanSmoothing * simDt);
        accel = [
          accel[0] + ((v[0] - velocity[0]) / simDt - accel[0]) * smooth,
          accel[1] + ((v[1] - velocity[1]) / simDt - accel[1]) * smooth,
        ];
        velocity = v;
      } else if (dt > 0) {
        // No physics stepped this frame: ease the felt force back toward plain gravity rather than
        // freezing on the last spike, so a held-still spider always settles upright.
        const fade = Math.exp(-config.body.leanSmoothing * dt);
        accel = [accel[0] * fade, accel[1] * fade];
      }

      // Which way "down" feels to the spider: gravity, plus however it's being moved. Hanging
      // still that's straight down, so it sits upright; swung on a taut string it points along the
      // string, so it leans into the swing; yanked sideways it leans into the yank. The legs feel
      // the same force.
      const g = config.rope.gravity;
      const felt = clampLength([-accel[0] / g, 1 - accel[1] / g], 4);
      // The body only takes `leanForce` of the movement, so it sways rather than whips about;
      // the legs still feel the whole thing (their own Floppiness scales that).
      const swayed = clampLength([(-accel[0] / g) * b.leanForce, 1 - (accel[1] / g) * b.leanForce], 4);
      const limit = b.tiltMax * DEG;
      let lean = Math.atan2(-swayed[0], swayed[1]);
      if (b.tiltSource === "string") {
        // The old way: follow the string itself, averaged over the last few links (one link's
        // direction wanders when the string is loose), fading to upright as the string goes slack.
        const back = rope.at(Math.max(0, n - 4), alpha);
        const head = rope.at(0, alpha);
        const taut = rope.length > 0 ? Math.min(1, Math.hypot(tail.x - head.x, tail.y - head.y) / rope.length) : 1;
        lean = Math.atan2(-(tail.x - back.x), tail.y - back.y) * (1 - b.tiltSlack * (1 - taut));
      }
      const tiltTarget = Math.max(-limit, Math.min(limit, lean)) * b.tiltAmount;

      if (!started) {
        started = true;
        tilt = tiltTarget;
      }

      if (dt > 0) {
        const still = reducedMotion.matches;
        const steps = Math.ceil(dt / MAX_STEP);
        const h = dt / steps;
        const tw = 2 * Math.PI * b.tiltSpring;
        // Clothes lag behind being shoved sideways, or turned, and bounce back: a loose, springy wobble.
        const shove = rotate(accel, -tilt)[0];
        const swingTo = still ? 0 : Math.max(-0.6, Math.min(0.6, -shove * 0.004));
        const sw = 2 * Math.PI * 2.2;
        for (let i = 0; i < steps; i++) {
          tiltSpeed += (tw * tw * (tiltTarget - tilt) - 2 * b.tiltDamping * tw * tiltSpeed) * h;
          tilt += tiltSpeed * h;
          stepLegs(h, rotate(felt, -tilt), still ? 0 : config.legMotion.fidget);
          swingSpeed += (sw * sw * (swingTo - swing) - 2 * 0.18 * sw * swingSpeed - (still ? 0 : tiltSpeed * sw * 0.5)) * h;
          swing += swingSpeed * h;
        }
        time += dt;
      }

      const breath = reducedMotion.matches ? 1 : 1 + b.breathe * Math.sin(time * b.breatheSpeed * Math.PI * 2);
      const torsoScale: Vec = [b.scaleX * breath, b.scaleY * breath];
      // An expression can squash it (Faces → Impact) along the way it was hit, bulging out the other
      // way: flat off the end of the string, thin off a wall. The hit's direction is on screen, so
      // it's turned into the spider's own frame first. About where the thread holds it, so it stays
      // on the string rather than shrinking away from it.
      const hitAxis = rotate(face.squashAxis, -(tilt + animation.tilt));
      const hitAngle = Math.atan2(hitAxis[1], hitAxis[0]) / DEG;
      const torso = new DOMMatrix()
        .translate(attach[0], attach[1])
        .rotate(hitAngle)
        .scale(Math.max(0.2, 1 - face.squash), Math.max(0.2, 1 + face.squash * config.faceImpact.bulge))
        .rotate(-hitAngle)
        .translate(-attach[0], -attach[1])
        .scale(torsoScale[0], torsoScale[1], 1, bodyCenter[0], bodyCenter[1]);
      const torsoPoint = (q: Vec): Vec => {
        const t = torso.transformPoint(new DOMPoint(q[0], q[1]));
        return [t.x, t.y];
      };

      // ── Pixel crispness (Spidey → Crispness) ──
      const crisp = config.crisp;
      // Whole-pixel body size, so the outline lands on pixel edges at the top and bottom alike.
      let kx = width / W;
      let ky = kx;
      if (crisp.wholePixels && !fav) {
        const bw = bodyShape.size[0] * b.scaleX;
        const bh = bodyShape.size[1] * b.scaleY;
        kx = Math.max(1, Math.round(bw * kx * pixelRatio)) / (bw * pixelRatio);
        ky = Math.max(1, Math.round(bh * ky * pixelRatio)) / (bh * pixelRatio);
      }
      const outlinePx = config.colors.outlineWidth * W * ky * pixelRatio;
      const outline = (crisp.wholePixels && outlinePx > 0 ? Math.max(1, Math.round(outlinePx)) : outlinePx) / (ky * pixelRatio);

      // Settled for long enough? Then ease onto the pixel grid and upright; ease off as soon as it moves.
      const calm =
        crisp.snap &&
        !fav &&
        Math.hypot(velocity[0], velocity[1]) * a.unit < crisp.snapSpeed &&
        Math.abs(tilt) < crisp.snapAngle * DEG;
      stillFor = calm ? stillFor + dt : 0;
      const snapTarget = calm && stillFor >= crisp.snapHold ? 1 : 0;
      snap = crisp.snapEase > 0 ? snap + (snapTarget - snap) * (1 - Math.exp((-3 * dt) / crisp.snapEase)) : snapTarget;
      if (snap < 0.001) snap = snapTarget;

      // The spider: its attach point on the string's end, turned around that point.
      let art = new DOMMatrix()
        .translate(tail.x, tail.y)
        .rotate((tilt * (1 - snap) + animation.tilt) / DEG)
        .scale(kx, ky)
        .translate(-attach[0], -attach[1]);
      stringShift = 0;
      if (snap > 0) {
        // Line the string's edges up with pixel columns and the body's top edge with a pixel row
        // (the body's height is whole pixels, so the bottom edge lines up too).
        const left = (tail.x - window.scrollX) * pixelRatio - stringDeviceWidth(a, pixelRatio) / 2;
        const top = art.multiply(torso).transformPoint(new DOMPoint(bodyCenter[0], bodyCenter[1] - bodyShape.size[1] / 2));
        const row = (top.y - window.scrollY) * pixelRatio;
        stringShift = ((Math.round(left) - left) / pixelRatio) * snap;
        art = new DOMMatrix().translate(stringShift, ((Math.round(row) - row) / pixelRatio) * snap).multiply(art);
      }
      const box = new DOMMatrix()
        .translate(tail.x, tail.y)
        .rotate(tilt / DEG)
        .translate((-px / 100) * width, (-py / 100) * height);

      if (!fav) {
        layoutFace();
        updateRoots();
        const at = pointer
          ? art.inverse().transformPoint(new DOMPoint(pointer.x + window.scrollX, pointer.y + window.scrollY))
          : null;
        reactToCursor(dt, at ? [at.x, at.y] : null);
        poseLegs(torsoPoint, (along) => threadAt(art, alpha, width, attach, along));
        lookAround(dt, art.multiply(torso).multiply(faceMatrix));
      }
      pose = { art, box, width, height, artPerPx: 1 / kx, outline, torso, face: faceMatrix };

      const sx = window.scrollX;
      const sy = window.scrollY;
      bob.style.transform = `translate(${tail.x - sx}px, ${tail.y - sy}px) translate(${-px}%, ${-py}%) rotate(${tilt + animation.tilt}rad)`;
    },

    /** Draws the spider with the renderer's context (already mapping document px to the canvas). */
    draw: (ctx: CanvasRenderingContext2D) => {
      if (!pose) return;
      ctx.save();

      if (config.look.showFavicon) {
        transform(ctx, pose.box);
        if (favicon.complete && favicon.naturalWidth) ctx.drawImage(favicon, 0, 0, pose.width, pose.height);
        ctx.restore();
        return;
      }

      transform(ctx, pose.art);
      const c = { ...config.colors, body: SKINS[look.skin].color || config.colors.body };
      ctx.lineJoin = "round";
      const fit = fitNow(c.body, c.mouth);
      const { torso: torsoMatrix, face: faceMatrixNow, outline } = pose;
      const inTorso = (fn: () => void) => {
        ctx.save();
        transform(ctx, torsoMatrix);
        fn();
        ctx.restore();
      };

      // Outline: the whole silhouette, filled and stroked, behind everything. Clothes that stick
      // out past the spider are part of the silhouette too.
      if (outline > 0 && (c.outlineMode === "always" || (c.outlineMode === "dark" && dark.matches))) {
        const edge: Pen = { mode: "edge", outline: c.outline, width: outline * 2 };
        inTorso(() => dressBack(ctx, fit, look, edge));
        ctx.fillStyle = ctx.strokeStyle = c.outline;
        ctx.lineWidth = outline * 2; // half is hidden behind the parts
        for (const leg of legs) {
          ctx.fill(leg.path);
          ctx.stroke(leg.path);
        }
        inTorso(() => {
          ctx.fill(bodyPath);
          ctx.stroke(bodyPath);
          dressBody(ctx, fit, look, edge);
          dressHat(ctx, fit, look, edge);
        });
      }

      const paint: Pen = { mode: "paint", outline: c.outline, width: 0 };
      inTorso(() => dressBack(ctx, fit, look, paint));
      ctx.fillStyle = c.body;
      for (const leg of legs) ctx.fill(leg.path);
      dressFeet(ctx, fit, look, paint);

      inTorso(() => {
        ctx.fillStyle = c.body;
        ctx.fill(bodyPath);
        dressBody(ctx, fit, look, paint);
        ctx.save();
        transform(ctx, faceMatrixNow);
        // The face is whatever expression it's pulling (face.ts, mood.ts), blinks included.
        drawEyes(ctx, eyes, face, animation.blink, c);
        drawMouth(ctx, face.mouth, { path: mouthPath, center: mouthCenter, top: mouthTop, width: mouthWidth }, animation.mouth, c.mouth);
        dressFace(ctx, fit, look, paint);
        ctx.restore();
        dressHat(ctx, fit, look, paint);
      });

      if (config.spideyDebug.showPivots) {
        ctx.fillStyle = DEBUG_COLOR;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 * pose.artPerPx;
        for (const leg of legs) {
          ctx.beginPath();
          ctx.arc(leg.hip[0], leg.hip[1], W * 0.012, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  };
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

const transform = (ctx: CanvasRenderingContext2D, m: DOMMatrix) => ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);

/** Parses an absolute M/L/C/Z path (what scripts/build-spider.mjs writes). */
export function parse(d: string): Cmd[] {
  const out: Cmd[] = [];
  for (const t of d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []) {
    if (/[a-zA-Z]/.test(t)) out.push({ cmd: t, args: [] });
    else out[out.length - 1]?.args.push(Number(t));
  }
  return out;
}

/** Rebuilds a path with every point passed through `fn`. */
function mapPath(cmds: Cmd[], fn: (x: number, y: number) => Vec) {
  let d = "";
  for (const { cmd, args } of cmds) {
    d += cmd;
    for (let i = 0; i < args.length; i += 2) {
      const [x, y] = fn(args[i], args[i + 1]);
      d += `${i ? " " : ""}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  return d;
}

/** Bounds of a path, following its curves (not just their control points). */
export function shape(cmds: Cmd[]): Shape {
  const pts: Vec[] = [];
  let at: Vec = [0, 0];
  for (const { cmd, args } of cmds) {
    if (cmd === "C") {
      for (let t = 0.125; t <= 1; t += 0.125) {
        const u = 1 - t;
        pts.push([0, 1].map((k) => u ** 3 * at[k] + 3 * u * u * t * args[k] + 3 * u * t * t * args[2 + k] + t ** 3 * args[4 + k]) as Vec);
      }
    } else if (args.length) pts.push([args[args.length - 2], args[args.length - 1]]);
    if (args.length) at = [args[args.length - 2], args[args.length - 1]];
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { cmds, center: [(x0 + x1) / 2, (y0 + y1) / 2], size: [x1 - x0, y1 - y0] };
}

/**
 * Replaces the straight edge between the cut's ends with a half-ellipse bulging
 * away from it toward `towards` (the body), `depth` half-widths deep.
 */
function withRoot(cmds: Cmd[], cut: [Vec, Vec], pivot: Vec, towards: Vec, depth: number): Cmd[] {
  const same = (p: Vec, q: Vec) => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01;
  let at: Vec = [0, 0];
  return cmds.flatMap((c) => {
    const from = at;
    if (c.args.length) at = [c.args[c.args.length - 2], c.args[c.args.length - 1]];
    const to = at;
    const isCut = c.cmd === "L" && ((same(from, cut[0]) && same(to, cut[1])) || (same(from, cut[1]) && same(to, cut[0])));
    if (!isCut) return [c];

    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const u: Vec = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
    let inward: Vec = [-u[1], u[0]];
    if ((towards[0] - pivot[0]) * inward[0] + (towards[1] - pivot[1]) * inward[1] < 0) inward = [-inward[0], -inward[1]];
    const r = length / 2;
    const deep = r * depth;
    const K = 0.5523; // bezier handle length for a quarter ellipse
    const add = (p: Vec, v: Vec, s: number): Vec => [p[0] + v[0] * s, p[1] + v[1] * s];
    const apex = add(pivot, inward, deep);
    return [
      { cmd: "C", args: [...add(from, inward, K * deep), ...add(apex, u, -K * r), ...apex] },
      { cmd: "C", args: [...add(apex, u, K * r), ...add(to, inward, K * deep), ...to] },
    ];
  });
}

const points = (cmds: Cmd[]) =>
  cmds.flatMap(({ args }) => args.flatMap((_, i) => (i % 2 ? [] : [[args[i], args[i + 1]] as Vec])));
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const cross = (a: Vec, b: Vec) => a[0] * b[1] - a[1] * b[0];
const rotate = ([x, y]: Vec, a: number): Vec => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const normalize = ([x, y]: Vec): Vec => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};
const clampLength = ([x, y]: Vec, max: number): Vec => {
  const l = Math.hypot(x, y);
  return l > max ? [(x / l) * max, (y / l) * max] : [x, y];
};

import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import type { Rope } from "./rope";

/**
 * The spider on the end of the string: positions it, and brings the parts of
 * src/assets/spider/spider.svg to life.
 *
 * Layers, back to front: an outline traced around the whole silhouette (so the
 * seams between body and legs never show), the legs, then the torso (body +
 * face). Every leg is a small damped spring pushed around by the spider's swing
 * and by gravity; its movement shows as a swing from the hip, a smooth curl
 * along the leg, or a mix.
 *
 * Paths are rebuilt from their original points, so shape swaps (a mirrored
 * eye, pupil or leg), placement sliders and curls never accumulate drift.
 */

const DEG = Math.PI / 180;
const SVG = "http://www.w3.org/2000/svg";
/** A curl needs a bigger angle than a whole-leg swing to move the tip as far. */
const CURL_GAIN = 1.5;
/** Physics sub-step, so stiff springs stay stable at low frame rates. */
const MAX_STEP = 1 / 240;

type Vec = [number, number];
type Side = "left" | "right";
type Source = "drawn" | "left" | "right";
interface Cmd {
  cmd: string;
  args: number[];
}
interface Shape {
  cmds: Cmd[];
  center: Vec;
  size: Vec;
}
interface Leg {
  side: Side;
  pair: 1 | 2 | 3;
  el: SVGPathElement;
  outline: SVGPathElement;
  marker: SVGCircleElement;
  pivot: Vec;
  cmds: Cmd[];
  /** Furthest point from the hip, art units. */
  reach: number;
  /** Direction of the leg's weight from the hip, as drawn. */
  weightDir: Vec;
  /** Angle away from its placed pose (rad), and its angular velocity. */
  phi: number;
  omega: number;
  /** −1..1, fixed per leg, so legs don't spring in lockstep. */
  tone: number;
  d: string;
}

export function createSpider(bob: HTMLElement, rope: Rope) {
  const svg = bob.querySelector<SVGSVGElement>("svg.art")!;
  const W = svg.viewBox.baseVal.width;
  const H = svg.viewBox.baseVal.height;
  const pct = W / 100;
  // Must be displayed while parts are measured.
  bob.dataset.look = "spider";

  const q = <T extends Element>(selector: string, from: ParentNode = svg) => from.querySelector(selector) as T;
  const make = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}) => {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  /** A copy for the outline layer: same geometry, none of the part's hooks or colours. */
  const outlineCopy = <T extends SVGElement>(el: T) => {
    const copy = el.cloneNode() as T;
    for (const { name } of [...copy.attributes]) if (name.startsWith("data-") || name === "fill") copy.removeAttribute(name);
    return copy;
  };

  // ── Build the layers ──────────────────────────────────────────────────────
  const body = q<SVGPathElement>('[data-part="body"]');
  const face = q<SVGGElement>('[data-part="face"]');
  const mouth = q<SVGPathElement>('[data-part="mouth"]');
  const torso = make("g", { "data-part": "torso" });
  body.before(torso);
  torso.append(body, face);

  const outlineLegs = make("g");
  const outlineTorso = make("g");
  const outline = make("g", { class: "spider-outline" });
  outline.append(outlineLegs, outlineTorso);
  outlineTorso.append(outlineCopy(body));
  svg.prepend(outline);

  const markers = make("g", { class: "spider-markers" });
  svg.append(markers);

  const shape = (el: SVGGraphicsElement): Shape => {
    const b = el.getBBox();
    return { cmds: parse(el.getAttribute("d") ?? ""), center: [b.x + b.width / 2, b.y + b.height / 2], size: [b.width, b.height] };
  };

  const legs: Leg[] = [...svg.querySelectorAll<SVGPathElement>("[data-leg]")].map((el, i) => {
    const id = el.dataset.leg ?? "L1";
    const pivot = (el.dataset.pivot ?? "0 0").split(" ").map(Number) as Vec;
    const cmds = parse(el.getAttribute("d") ?? "");
    const pts = points(cmds).map(([x, y]) => [x - pivot[0], y - pivot[1]] as Vec);
    const mean: Vec = [avg(pts.map((p) => p[0])), avg(pts.map((p) => p[1]))];
    const copy = outlineCopy(el);
    outlineLegs.append(copy);
    const marker = make("circle", { r: String(W * 0.012) });
    markers.append(marker);
    return {
      side: id[0] === "R" ? "right" : "left",
      pair: Number(id[1]) as 1 | 2 | 3,
      el,
      outline: copy,
      marker,
      pivot,
      cmds,
      reach: Math.max(...pts.map((p) => Math.hypot(p[0], p[1]))),
      weightDir: normalize(mean),
      phi: 0,
      omega: 0,
      tone: ((i * 0.618034) % 1) * 2 - 1,
      d: "",
    };
  });
  const legOf = (side: Side, pair: number) => legs.find((l) => l.side === side && l.pair === pair)!;
  const pairConfig = (pair: 1 | 2 | 3) => [config.legs1, config.legs2, config.legs3][pair - 1];

  const eyes = (["left", "right"] as Side[]).map((side) => {
    const g = q<SVGGElement>(`[data-part="eye"][data-side="${side}"]`);
    const white = q<SVGPathElement>('[data-part="eye-white"]', g);
    const pupil = q<SVGPathElement>('[data-part="pupil"]', g);
    return {
      side,
      g,
      white,
      pupil,
      whiteShape: shape(white),
      pupilShape: shape(pupil),
      pupilCenter: [0, 0] as Vec,
      /** How far the pupil can move from the eye's centre, art units. */
      room: 0,
      look: [0, 0] as Vec,
    };
  });
  const eyeOf = (side: Side) => eyes.find((e) => e.side === side)!;
  const mouthShape = shape(mouth);
  const bodyCenter = shape(body).center;
  const faceCenter: Vec = [
    avg([...eyes.map((e) => e.whiteShape.center[0]), mouthShape.center[0]]),
    avg([...eyes.map((e) => e.whiteShape.center[1]), mouthShape.center[1]]),
  ];

  /** Which shape to draw on `side`, and whether it's the other side's, mirrored. */
  const pick = <T>(source: Source, side: Side, of: (s: Side) => T) =>
    source === "drawn" ? { from: of(side), mirrored: false } : { from: of(source), mirrored: source !== side };

  /** A shape redrawn centred on `at`, scaled, optionally mirrored left↔right. */
  const place = (s: Shape, mirrored: boolean, at: Vec, sx: number, sy: number) =>
    mapPath(s.cmds, (x, y) => [at[0] + (x - s.center[0]) * sx * (mirrored ? -1 : 1), at[1] + (y - s.center[1]) * sy]);

  // ── Face: rebuilt only when its settings change ───────────────────────────
  let faceKey = "";
  const layoutFace = () => {
    const key = JSON.stringify([config.face, config.eyes, config.pupils.shape, config.pupils.size, config.mouth]);
    if (key === faceKey) return;
    faceKey = key;

    const f = config.face;
    face.setAttribute("transform", aboutPoint(faceCenter, f.scale, f.scale, [f.x * pct, f.y * pct]));

    for (const eye of eyes) {
      const out = eye.side === "left" ? -1 : 1;
      const size = config.eyes.size;
      const at: Vec = [
        eye.whiteShape.center[0] + (out * config.eyes.spacing * pct) / 2,
        eye.whiteShape.center[1] + config.eyes.y * pct,
      ];
      const white = pick(config.eyes.shape as Source, eye.side, (s) => eyeOf(s).whiteShape);
      eye.white.setAttribute("d", place(white.from, white.mirrored, at, size, size));

      // The pupil keeps its drawn position within the eye, scaled with it.
      eye.pupilCenter = [
        at[0] + (eye.pupilShape.center[0] - eye.whiteShape.center[0]) * size,
        at[1] + (eye.pupilShape.center[1] - eye.whiteShape.center[1]) * size,
      ];
      const pupilSize = size * config.pupils.size;
      const pupil = pick(config.pupils.shape as Source, eye.side, (s) => eyeOf(s).pupilShape);
      eye.pupil.setAttribute("d", place(pupil.from, pupil.mirrored, eye.pupilCenter, pupilSize, pupilSize));

      const eyeRadius = (Math.min(...eye.whiteShape.size) / 2) * size;
      const pupilRadius = (Math.max(...pupil.from.size) / 2) * pupilSize;
      eye.room = Math.max(0, eyeRadius - pupilRadius);
    }

    const m = config.mouth;
    mouth.setAttribute("d", place(mouthShape, false, [mouthShape.center[0], mouthShape.center[1] + m.y * pct], m.scaleX, m.scaleY));
  };

  // ── Legs: redrawn every frame from their spring state ─────────────────────
  const drawLegs = (torsoScale: Vec) => {
    const moving = config.legMotion.enabled;
    const curl = moving ? config.legMotion.curl : 0;
    const focus = config.legMotion.curlFocus;
    for (const leg of legs) {
      const pair = pairConfig(leg.pair);
      const src = pick(pair.shape as Source, leg.side, (s) => legOf(s, leg.pair));
      // Sliders are written for "tips up = positive"; that's clockwise on the left, anticlockwise on the right.
      const up = leg.side === "left" ? 1 : -1;
      const swing = up * pair.angle * DEG + leg.phi * (1 - curl);
      const bend = up * pair.bend * DEG + leg.phi * curl * CURL_GAIN;
      // Hips ride along with the torso's scale (breathing, width/height) so legs stay attached.
      const hip: Vec = [
        bodyCenter[0] + (leg.pivot[0] - bodyCenter[0]) * torsoScale[0] - up * pair.x * pct,
        bodyCenter[1] + (leg.pivot[1] - bodyCenter[1]) * torsoScale[1] + pair.y * pct,
      ];
      const cos = Math.cos(swing);
      const sin = Math.sin(swing);
      const { from, mirrored } = src;

      const d = mapPath(from.cmds, (x, y) => {
        let px = x - from.pivot[0];
        let py = y - from.pivot[1];
        if (mirrored) px = -px;
        if (bend) {
          const a = bend * (Math.hypot(px, py) / from.reach) ** focus;
          [px, py] = rotate([px, py], a);
        }
        return [hip[0] + (px * cos - py * sin) * pair.scale, hip[1] + (px * sin + py * cos) * pair.scale];
      });
      if (d !== leg.d) {
        leg.d = d;
        leg.el.setAttribute("d", d);
        leg.outline.setAttribute("d", d);
      }
      leg.marker.setAttribute("cx", hip[0].toFixed(2));
      leg.marker.setAttribute("cy", hip[1].toFixed(2));
    }
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
      const k = w * w;
      const up = leg.side === "left" ? 1 : -1;
      const rest = rotate(leg.weightDir, up * pairConfig(leg.pair).angle * DEG);
      // Only the change from hanging still pushes the leg, so its placed pose is its resting pose.
      const torque = cross(rotate(rest, leg.phi), gravity) - cross(rest, [0, 1]);
      if (fidget && Math.random() < (m.fidgetRate * dt) / legs.length) {
        leg.omega += (Math.random() < 0.5 ? -1 : 1) * fidget * DEG * w;
      }
      leg.omega += (k * (m.weight * torque - leg.phi) - 2 * m.damping * w * leg.omega) * dt;
      leg.phi += leg.omega * dt;
      if (Math.abs(leg.phi) > max) {
        leg.phi = Math.sign(leg.phi) * max;
        leg.omega = 0;
      }
    }
  };

  // ── Pupils look at the cursor ──────────────────────────────────────────────
  let pointer: { x: number; y: number } | null = null;
  window.addEventListener("pointermove", (e) => (pointer = { x: e.clientX, y: e.clientY }), { passive: true });
  document.documentElement.addEventListener("pointerleave", () => (pointer = null));

  const lookAround = (dt: number) => {
    const p = config.pupils;
    const artPerB = W / config.look.width;
    for (const eye of eyes) {
      let target: Vec = [p.restX * eye.room, p.restY * eye.room];
      const m = p.follow && pointer ? eye.g.getScreenCTM() : null;
      if (m && pointer) {
        // Cursor in the eye's own coordinates, so tilt, breathing and face sliders are all accounted for.
        const at = new DOMPoint(pointer.x, pointer.y).matrixTransform(m.inverse());
        const dx = at.x - eye.pupilCenter[0];
        const dy = at.y - eye.pupilCenter[1];
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist / artPerB < p.radius) {
          const amount = Math.min(1, dist / artPerB / p.reach) * p.range * eye.room;
          target = [(dx / dist) * amount, (dy / dist) * amount];
        }
      }
      const k = 1 - Math.exp(-p.speed * dt);
      eye.look[0] += (target[0] - eye.look[0]) * k;
      eye.look[1] += (target[1] - eye.look[1]) * k;
      eye.pupil.setAttribute("transform", `translate(${eye.look[0].toFixed(2)} ${eye.look[1].toFixed(2)})`);
    }
  };

  // ── Size, look, colours: DOM only touched when something changed ─────────
  let styleKey = "";
  const applyStyle = (unit: number) => {
    const fav = config.look.showFavicon;
    const c = config.colors;
    const width = config.look.width * unit * (fav ? config.look.faviconScale : 1);
    const height = fav ? width : (width * H) / W;
    const px = fav ? 50 : config.look.attachX * 100;
    const py = (fav ? config.look.faviconAttachY : config.look.attachY) * 100;
    const key = [fav, width, px, py, config.bob.hitArea, Object.values(c), Object.values(config.spideyDebug)].join("|");
    if (key !== styleKey) {
      styleKey = key;
      const s = bob.style;
      bob.dataset.look = fav ? "favicon" : "spider";
      bob.dataset.outline = c.outlineMode;
      bob.toggleAttribute("data-show-hit", config.spideyDebug.showHitArea);
      markers.style.display = config.spideyDebug.showPivots ? "" : "none";
      s.setProperty("--bob-w", `${width}px`);
      s.setProperty("--bob-h", `${height}px`);
      s.setProperty("--bob-hit", `${-config.bob.hitArea * 100}%`);
      s.setProperty("--spider-body", c.body);
      s.setProperty("--spider-eyes", c.eyes);
      s.setProperty("--spider-pupils", c.pupils);
      s.setProperty("--spider-mouth", c.mouth);
      s.setProperty("--spider-outline", c.outline);
      s.setProperty("--spider-outline-width", String(c.outlineWidth * W));
      s.transformOrigin = `${px}% ${py}%`;
    }
    return { px, py };
  };

  // ── Motion state ──────────────────────────────────────────────────────────
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let started = false;
  let tilt = 0;
  let tiltSpeed = 0;
  let time = 0;
  let lastPos: Vec = [0, 0];
  let velocity: Vec = [0, 0];
  let accel: Vec = [0, 0];

  return {
    /** Once per frame, after the string has moved. `dt` is simulated seconds (time scale applied). */
    update(a: AnchorFrame, dt: number) {
      const { px, py } = applyStyle(a.unit);
      const pts = rope.points;
      const tail = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const stringAngle = Math.atan2(-(tail.x - prev.x), tail.y - prev.y);
      const b = config.body;

      if (!started) {
        started = true;
        tilt = stringAngle * b.tiltAmount;
        lastPos = [tail.x, tail.y];
      }

      if (dt > 0) {
        // The spider's acceleration (b/s²), smoothed: what the legs feel as it swings.
        const v: Vec = [(tail.x - lastPos[0]) / dt / a.unit, (tail.y - lastPos[1]) / dt / a.unit];
        const smooth = 1 - Math.exp(-20 * dt);
        accel = [
          accel[0] + (((v[0] - velocity[0]) / dt) - accel[0]) * smooth,
          accel[1] + (((v[1] - velocity[1]) / dt) - accel[1]) * smooth,
        ];
        velocity = v;
        lastPos = [tail.x, tail.y];

        const g = config.rope.gravity;
        const felt = clampLength([-accel[0] / g, 1 - accel[1] / g], 4);
        const still = reducedMotion.matches;
        const steps = Math.ceil(dt / MAX_STEP);
        const h = dt / steps;
        const tw = 2 * Math.PI * b.tiltSpring;
        for (let i = 0; i < steps; i++) {
          tiltSpeed += (tw * tw * (stringAngle * b.tiltAmount - tilt) - 2 * b.tiltDamping * tw * tiltSpeed) * h;
          tilt += tiltSpeed * h;
          stepLegs(h, rotate(felt, -tilt), still ? 0 : config.legMotion.fidget);
        }
        time += dt;
      }

      if (!config.look.showFavicon) {
        const breath = reducedMotion.matches ? 1 : 1 + b.breathe * Math.sin(time * b.breatheSpeed * Math.PI * 2);
        const torsoScale: Vec = [b.scaleX * breath, b.scaleY * breath];
        const t = aboutPoint(bodyCenter, torsoScale[0], torsoScale[1]);
        torso.setAttribute("transform", t);
        outlineTorso.setAttribute("transform", t);
        layoutFace();
        drawLegs(torsoScale);
        lookAround(dt);
      }

      const sx = window.scrollX;
      const sy = window.scrollY;
      bob.style.transform = `translate(${tail.x - sx}px, ${tail.y - sy}px) translate(${-px}%, ${-py}%) rotate(${tilt}rad)`;
    },
  };
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

/** Parses an absolute M/L/C/Z path (what scripts/build-spider.mjs writes). */
function parse(d: string): Cmd[] {
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
/** SVG transform scaling around `c`, then shifting by `offset`. */
const aboutPoint = (c: Vec, sx: number, sy: number, offset: Vec = [0, 0]) =>
  `translate(${c[0] + offset[0]} ${c[1] + offset[1]}) scale(${sx} ${sy}) translate(${-c[0]} ${-c[1]})`;

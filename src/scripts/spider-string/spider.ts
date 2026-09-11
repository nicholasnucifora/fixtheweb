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
  /** The leg as drawn (flat cut at the hip)… */
  baseCmds: Cmd[];
  /** …and with its hidden root, which is what's drawn. */
  cmds: Cmd[];
  /** Ends of the straight cut where the leg meets the body. */
  cut: [Vec, Vec] | null;
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
    const cutEnds = (el.dataset.cut ?? "").split(" ").map(Number);
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
      baseCmds: cmds,
      cmds,
      cut: cutEnds.length === 4 ? ([[cutEnds[0], cutEnds[1]], [cutEnds[2], cutEnds[3]]] as [Vec, Vec]) : null,
      reach: Math.max(...pts.map((p) => Math.hypot(p[0], p[1]))),
      // From the build script, measured before the hidden root was added; the mean is a fallback.
      weightDir: normalize(el.dataset.weight ? (el.dataset.weight.split(" ").map(Number) as Vec) : mean),
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
    // Cursor in the face's coordinates (both eyes share them), so tilt, breathing and face sliders are accounted for.
    const m = p.follow && pointer ? eyes[0].g.getScreenCTM() : null;
    const at = m && pointer ? new DOMPoint(pointer.x, pointer.y).matrixTransform(m.inverse()) : null;
    // Both eyes decide together, measured from the point between them, so they never
    // disagree about whether the cursor is close enough to look at.
    const between: Vec = [avg(eyes.map((e) => e.pupilCenter[0])), avg(eyes.map((e) => e.pupilCenter[1]))];
    const distance = at ? Math.hypot(at.x - between[0], at.y - between[1]) / artPerB : Infinity;
    const strength = distance < p.radius ? Math.min(1, distance / p.reach) * p.range : 0;
    for (const eye of eyes) {
      let target: Vec = [p.restX * eye.room, p.restY * eye.room];
      if (strength > 0 && at) {
        // Each eye still aims from its own centre, so they turn in slightly on a close cursor.
        const dx = at.x - eye.pupilCenter[0];
        const dy = at.y - eye.pupilCenter[1];
        const dist = Math.hypot(dx, dy) || 1;
        target = [(dx / dist) * strength * eye.room, (dy / dist) * strength * eye.room];
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
  let velocity: Vec = [0, 0];
  let accel: Vec = [0, 0];

  return {
    /**
     * Once per frame, after the string has moved. `dt` is this frame's time (time scale applied),
     * `simDt` the physics time actually stepped, and `alpha` how far between the last two physics
     * steps to draw (see Rope.at).
     */
    update(a: AnchorFrame, dt: number, simDt: number, alpha: number) {
      const { px, py } = applyStyle(a.unit);
      const n = rope.points.length;
      const tail = rope.at(n - 1, alpha);
      const prev = rope.at(n - 2, alpha);
      const stringAngle = Math.atan2(-(tail.x - prev.x), tail.y - prev.y);
      const b = config.body;

      if (!started) {
        started = true;
        tilt = stringAngle * b.tiltAmount;
      }

      if (simDt > 0) {
        // Velocity straight from the physics (exact per step, unlike frame-to-frame positions),
        // and smoothed acceleration in b/s²: what the legs feel as it swings.
        const t = rope.tail;
        const v: Vec = [((t.x - t.px) * config.sim.rate) / a.unit, ((t.y - t.py) * config.sim.rate) / a.unit];
        const smooth = 1 - Math.exp(-20 * simDt);
        accel = [
          accel[0] + ((v[0] - velocity[0]) / simDt - accel[0]) * smooth,
          accel[1] + ((v[1] - velocity[1]) / simDt - accel[1]) * smooth,
        ];
        velocity = v;
      }

      if (dt > 0) {
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
        updateRoots();
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

/** SVG transform scaling around `c`, then shifting by `offset`. */
const aboutPoint = (c: Vec, sx: number, sy: number, offset: Vec = [0, 0]) =>
  `translate(${c[0] + offset[0]} ${c[1] + offset[1]}) scale(${sx} ${sy}) translate(${-c[0]} ${-c[1]})`;

import { den } from "./config";
import type { Light } from "./daytime";
import type { Palette, Scene } from "./scenes";

/**
 * The Spider Den's sky, and the light of the time of day, drawn flat like everything else.
 *
 * By day the sky's blue and the sun crosses it, warming everything a little, with soft shafts of
 * sunlight and a faint cartoon lens flare. Around sunrise and sunset it glows orange. At night it's
 * a deep blue with stars and the moon, everything takes on a cool moonlit tint, and fireflies come
 * out. Out of doors the sky's behind everything; through a window, it's just what's seen through the
 * window, and the room's in the same light.
 *
 * It's the size of the whole den, so it's built to be cheap to draw, every frame, with nothing big
 * drawn again just because something moved:
 * - The sky's colours are a full-size layer, painted again only when they've changed by a shade.
 * - The sun, moon and clouds are little pictures, drawn again only when their colour changes, and
 *   put wherever they are each frame, so they glide however fast time goes. Stars are specks.
 * - The scenery's painted once (per scene, size and theme). Its light is a copy of it with one wash
 *   of colour over it, made again when the light's changed by a shade: a couple of quick fills, not
 *   painting every branch and leaf again.
 * world.ts tints the spiders, bugs and predators in the little boxes round them, and the webs by
 * their colour, rather than laying colour over the whole den.
 */

type Vec = [number, number];
type Rgb = [number, number, number];

/** Where the sky shows (den px), and where the sun and moon go down. */
export interface SkyView {
  l: number;
  t: number;
  r: number;
  b: number;
  horizon: number;
}

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = ([r, g, b]: Rgb, a = 1) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
/** Rounded to a step, to tell when something's changed enough to be worth drawing again. */
const step = (v: number, size: number) => Math.round(v / size);

/** The sky's colours, top and bottom, by day, at golden hour and by night, for a light and a dark page. */
const SKY = {
  light: {
    day: [hex("#bfe0ef"), hex("#eef6f0")],
    golden: [hex("#f1b58e"), hex("#fde2b6")],
    night: [hex("#3e4872"), hex("#727ca4")],
    cloud: { day: hex("#ffffff"), golden: hex("#ffd7c4"), night: hex("#8a93b8") },
    tintNight: hex("#1a2358"),
  },
  dark: {
    day: [hex("#2e4a66"), hex("#3e5262")],
    golden: [hex("#4a3553"), hex("#7a5046")],
    night: [hex("#0d1224"), hex("#1b2138")],
    cloud: { day: hex("#4c5f78"), golden: hex("#6e4f60"), night: hex("#262d48") },
    tintNight: hex("#050a28"),
  },
};

/** The light's tint: a colour laid over everything at `alpha`. */
export interface Tint {
  color: Rgb;
  alpha: number;
  css: string;
}

/**
 * The tint for `light`: cool and dim by night, golden at sunrise and sunset, a touch warm by day. Three
 * washes of colour, one over another, come to the same as one wash, so it's a single fill.
 */
export function tintOf(light: Light, dark: boolean): Tint {
  const s = den.sky;
  const washes: [Rgb, number][] = [
    [(dark ? SKY.dark : SKY.light).tintNight, light.night * s.night * (dark ? 0.45 : 0.42)],
    [hex("#ff8a3d"), light.golden * s.golden * (dark ? 0.12 : 0.16)],
    [hex("#ffd27a"), light.day * (1 - light.golden) * s.warm * 0.08],
  ];
  let keep = 1;
  let added: Rgb = [0, 0, 0];
  for (const [color, a] of washes) {
    const alpha = Math.max(0, Math.min(1, a));
    if (alpha <= 0) continue;
    added = [added[0] * (1 - alpha) + color[0] * alpha, added[1] * (1 - alpha) + color[1] * alpha, added[2] * (1 - alpha) + color[2] * alpha];
    keep *= 1 - alpha;
  }
  const alpha = 1 - keep;
  const color: Rgb = alpha > 0 ? [added[0] / alpha, added[1] / alpha, added[2] / alpha] : [0, 0, 0];
  return { color, alpha, css: css(color, alpha) };
}

/** A colour (#rrggbb or rgba()) under `tint`. */
export function tinted(color: string, tint: Tint) {
  let rgb: Rgb;
  let a = 1;
  if (color.startsWith("#")) rgb = hex(color);
  else {
    const parts = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
    rgb = [parts[0], parts[1], parts[2]];
    a = parts[3] ?? 1;
  }
  return css(mix(rgb, tint.color, tint.alpha), a);
}

interface Star {
  x: number;
  y: number;
  r: number;
  twinkle: number;
}
interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
  /** Its picture, and what it was drawn for. */
  sprite: HTMLCanvasElement;
  drawn: string;
}
interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  rate: number;
}

const PUFFS: [number, number, number][] = [
  [0, 0, 1],
  [0.85, 0.18, 0.72],
  [-0.8, 0.22, 0.68],
  [0.35, -0.3, 0.7],
  [-0.3, -0.18, 0.6],
];

export interface Background {
  /** The den's canvas, and device px to a den px. */
  canvas: HTMLCanvasElement;
  dpr: number;
  unit: number;
  scene: Scene | null;
  /** Changes whenever the scene's rebuilt. */
  sceneKey: string;
  palette: Palette;
  /** The page's own background: the room, with a window. */
  room: string;
  /** Time of day, and its light. */
  t: number;
  light: Light;
  dark: boolean;
}

/** Sizes `canvas` to `w` × `h` den px at `dpr`, clears it, and sets its context to draw in den px from (`x`, `y`). */
function ready(canvas: HTMLCanvasElement, w: number, h: number, dpr: number, x = 0, y = 0) {
  const cw = Math.max(1, Math.ceil(w * dpr));
  const ch = Math.max(1, Math.ceil(h * dpr));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.setTransform(dpr, 0, 0, dpr, -x * dpr, -y * dpr);
  return ctx;
}

export function createSky() {
  /** The sky's colours (and, indoors, the room), full size. */
  const skyLayer = document.createElement("canvas");
  let skyDrawn = "";
  let skyPlaceDrawn = "";
  let skyAt = 0;
  /** The scenery as painted, and the same in the light of the time of day. */
  const scenery = document.createElement("canvas");
  let sceneryDrawn = "";
  const lit = document.createElement("canvas");
  let litDrawn = "";
  let litAt = 0;
  const sunSprite = document.createElement("canvas");
  let sunDrawn = "";
  const moonSprite = document.createElement("canvas");
  let moonDrawn = "";
  /** A firefly's glow. */
  const glow = document.createElement("canvas");
  let glowDrawn = "";

  let stars: Star[] = [];
  let clouds: Cloud[] = [];
  let fireflies: Firefly[] = [];
  let builtFor = "";

  /** Stars, clouds and fireflies, scattered once for this size of den. */
  const build = (view: SkyView, unit: number) => {
    const key = JSON.stringify([Math.round(view.l), Math.round(view.t), Math.round(view.r), Math.round(view.b), Math.round(unit), den.sky.stars, den.sky.clouds, den.sky.fireflies]);
    if (key === builtFor) return;
    builtFor = key;
    const w = view.r - view.l;
    const h = view.horizon - view.t;
    stars = Array.from({ length: Math.round(den.sky.stars * (w / 1200)) }, () => ({
      x: view.l + Math.random() * w,
      y: view.t + Math.random() ** 1.4 * h * 0.9,
      r: 0.6 + Math.random() ** 3 * 1.6,
      twinkle: Math.random() * Math.PI * 2,
    }));
    clouds = Array.from({ length: Math.round(den.sky.clouds) }, (_, i) => ({
      x: Math.random(),
      y: view.t + h * (0.08 + (i / Math.max(1, den.sky.clouds)) * 0.4 + Math.random() * 0.08),
      size: Math.round(unit * (0.35 + Math.random() * 0.4)),
      speed: 0.6 + Math.random() * 0.8,
      sprite: document.createElement("canvas"),
      drawn: "",
    }));
    fireflies = Array.from({ length: Math.round(den.sky.fireflies) }, () => ({
      x: view.l + Math.random() * w,
      y: view.t + (0.25 + Math.random() * 0.7) * (view.b - view.t),
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
      rate: 0.6 + Math.random() * 0.8,
    }));
  };

  /** The sun and moon's way across the sky: `p` 0 (rising, left) to 1 (setting, right). */
  const arc = (view: SkyView, p: number, unit: number): Vec => {
    const w = view.r - view.l;
    // Its highest, clear of the den's bar along the top.
    const top = view.t + (view.horizon - view.t) * 0.26;
    return [view.l + w * (0.06 + 0.88 * p), view.horizon + unit * 0.3 - Math.sin(Math.PI * p) * (view.horizon + unit * 0.3 - top)];
  };
  const sunAt = (view: SkyView, t: number, unit: number) => arc(view, (t - 0.21) / 0.58, unit);
  const moonAt = (view: SkyView, t: number, unit: number) => arc(view, (((t + 0.5) % 1) - 0.21) / 0.58, unit);
  const viewOf = (b: Background): SkyView => b.scene?.sky ?? { l: 0, t: 0, r: b.canvas.width / b.dpr, b: b.canvas.height / b.dpr, horizon: (b.canvas.height / b.dpr) * 0.92 };

  /** The sun's picture (glow, rays and all), centred: drawn again only when its colour's changed. Returns how far it reaches. */
  const sunPicture = (r: number, dpr: number, light: Light, dark: boolean) => {
    const warm = step(light.golden, 1 / 40) / 40;
    const key = JSON.stringify([r, dpr, warm, dark]);
    const haloR = r * (3.2 + warm * 1.8);
    const reach = Math.ceil(haloR);
    if (key === sunDrawn) return reach;
    sunDrawn = key;
    const ctx = ready(sunSprite, reach * 2, reach * 2, dpr, -reach, -reach);
    const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, haloR);
    halo.addColorStop(0, css(mix(hex("#ffe29a"), hex("#ffae63"), warm), dark ? 0.35 : 0.55));
    halo.addColorStop(1, css(hex("#ffd98a"), 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(mix(hex("#ffd566"), hex("#ffa45a"), warm), 0.75);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const long = i % 2 ? 1.55 : 1.8;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      ctx.moveTo(c * r * 1.18 - s * r * 0.16, s * r * 1.18 + c * r * 0.16);
      ctx.lineTo(c * r * long, s * r * long);
      ctx.lineTo(c * r * 1.18 + s * r * 0.16, s * r * 1.18 - c * r * 0.16);
      ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = css(mix(hex("#ffd35c"), hex("#ff9f4a"), warm));
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(hex("#fff3c4"), 0.55);
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.32, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    return reach;
  };

  /** The moon's picture, likewise. */
  const moonPicture = (r: number, dpr: number, light: Light, dark: boolean) => {
    const night = step(light.night, 1 / 40) / 40;
    const key = JSON.stringify([r, dpr, night, dark]);
    const reach = r * 4;
    if (key === moonDrawn) return reach;
    moonDrawn = key;
    const ctx = ready(moonSprite, reach * 2, reach * 2, dpr, -reach, -reach);
    const halo = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, reach);
    halo.addColorStop(0, css(hex("#dfe6ff"), (dark ? 0.22 : 0.35) * night));
    halo.addColorStop(1, css(hex("#dfe6ff"), 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(hex("#f5f1dc"));
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(hex("#dcd6ba"));
    ctx.beginPath();
    for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.28, 0.12, 0.16], [-0.05, 0.42, 0.12], [0.35, -0.38, 0.09]]) {
      ctx.moveTo(cx * r + cr * r, cy * r);
      ctx.arc(cx * r, cy * r, cr * r, 0, Math.PI * 2);
    }
    ctx.fill();
    return reach;
  };

  /** A cloud's picture, in `color`: drawn again only when its colour's changed. Returns half its size. */
  const cloudPicture = (c: Cloud, dpr: number, color: string) => {
    const key = JSON.stringify([c.size, dpr, color]);
    const half = c.size * 1.4;
    if (key === c.drawn) return half;
    c.drawn = key;
    const ctx = ready(c.sprite, half * 2, half * 2, dpr, -half, -half);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const [dx, dy, s] of PUFFS) {
      ctx.moveTo(dx * c.size + c.size * 0.5 * s, dy * c.size * 0.5);
      ctx.arc(dx * c.size, dy * c.size * 0.5, c.size * 0.5 * s, 0, Math.PI * 2);
    }
    ctx.fill();
    return half;
  };

  /** Soft shafts of sunlight and a faint lens flare, fanning out from the sun (plain washes of colour: cheap). */
  const drawSunlight = (ctx: CanvasRenderingContext2D, view: SkyView, [sx, sy]: Vec, unit: number, light: Light, dark: boolean) => {
    const s = den.sky;
    const up = Math.max(0, Math.min(1, light.sun / 0.3)) * light.day;
    if (up <= 0.02) return;
    const w = view.r - view.l;
    const cx = (view.l + view.r) / 2;
    const cy = (view.t + view.b) / 2;
    if (s.rays > 0) {
      const reach = Math.hypot(w, view.b - view.t) * 0.6;
      const toward = Math.atan2(cy - sy, cx - sx);
      const strength = s.rays * up * (dark ? 0.1 : 0.16);
      const color = mix(hex("#fff1c1"), hex("#ffc27d"), light.golden);
      // One fill for all five beams, fading out as they reach across.
      const beam = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach);
      beam.addColorStop(0, css(color, strength));
      beam.addColorStop(0.4, css(color, strength * 0.35));
      beam.addColorStop(1, css(color, 0));
      ctx.fillStyle = beam;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = toward + (i - 2) * 0.22;
        const spread = 0.018 + (i % 2) * 0.014;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle - spread) * reach, sy + Math.sin(angle - spread) * reach);
        ctx.lineTo(sx + Math.cos(angle + spread) * reach, sy + Math.sin(angle + spread) * reach);
        ctx.closePath();
      }
      ctx.fill();
    }
    if (s.flare > 0) {
      const flare: [number, number, string][] = [
        [0.35, 0.06, "#fff4c9"],
        [0.6, 0.13, "#ffd08a"],
        [0.8, 0.04, "#b8e4ff"],
        [1.15, 0.2, "#ffe2a8"],
        [1.45, 0.08, "#ffc3a0"],
      ];
      const strength = s.flare * up * (dark ? 0.05 : 0.08);
      for (const [along, size, color] of flare) {
        const fx = sx + (cx - sx) * along;
        const fy = sy + (cy - sy) * along;
        const r = unit * size;
        const ring = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
        ring.addColorStop(0, css(hex(color), strength * 0.35));
        ring.addColorStop(0.75, css(hex(color), strength));
        ring.addColorStop(1, css(hex(color), 0));
        ctx.fillStyle = ring;
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  return {
    /**
     * Draws the den's background straight onto `ctx` (the den's canvas, all of it): the sky (or,
     * indoors, the room and the sky through the window), stars, sun, moon and clouds, the scenery in
     * the light, and sunbeams. Leaves `ctx` drawing in den px.
     */
    draw(ctx: CanvasRenderingContext2D, b: Background) {
      const { canvas, dpr, unit, light, t, dark } = b;
      const view = viewOf(b);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const indoors = !!b.scene?.indoors;
      build(view, unit);
      const tint = tintOf(light, dark);

      // The sky's colours: painted again when they've changed by a shade.
      const theme = dark ? SKY.dark : SKY.light;
      const golden = light.golden * den.sky.golden;
      const top = mix(mix(theme.night[0], theme.day[0], light.day), theme.golden[0], golden * 0.75);
      const bottom = mix(mix(theme.night[1], theme.day[1], light.day), theme.golden[1], golden);
      const room = indoors ? tinted(b.room.startsWith("#") ? b.room : "#fafaf7", tint) : "";
      const now = performance.now();
      const skyPlace = JSON.stringify([canvas.width, canvas.height, dpr, view, indoors, b.room]);
      const skyKey = JSON.stringify([room, top.map((v) => step(v, 2.5)), bottom.map((v) => step(v, 2.5))]);
      // A new size or scene, straight away; a change of colour, up to 8 times a second.
      if (skyPlace !== skyPlaceDrawn || (skyKey !== skyDrawn && now - skyAt > 125)) {
        skyPlaceDrawn = skyPlace;
        skyDrawn = skyKey;
        skyAt = now;
        const sctx = ready(skyLayer, w, h, dpr);
        if (indoors) {
          sctx.fillStyle = room;
          sctx.fillRect(0, 0, w, h);
        }
        const gradient = sctx.createLinearGradient(0, view.t, 0, view.horizon);
        gradient.addColorStop(0, css(top));
        gradient.addColorStop(1, css(bottom));
        sctx.fillStyle = gradient;
        sctx.fillRect(view.l, view.t, view.r - view.l, view.b - view.t);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(skyLayer, 0, 0);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (indoors) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(view.l, view.t, view.r - view.l, view.b - view.t);
        ctx.clip();
      }
      // Stars, twinkling, as it gets dark.
      if (light.night > 0.05 && stars.length) {
        const clock = performance.now() / 1000;
        ctx.fillStyle = "#fffbe8";
        for (const star of stars) {
          const a = light.night * (0.45 + 0.55 * Math.sin(clock * (0.5 + star.r * 0.3) + star.twinkle) ** 2);
          if (a < 0.03) continue;
          ctx.globalAlpha = a;
          ctx.fillRect(star.x - star.r, star.y - star.r, star.r * 2, star.r * 2);
          if (star.r > 1.6) {
            // The bright ones get a little sparkle.
            ctx.fillRect(star.x - star.r * 2.2, star.y - 0.4, star.r * 4.4, 0.8);
            ctx.fillRect(star.x - 0.4, star.y - star.r * 2.2, 0.8, star.r * 4.4);
          }
        }
        ctx.globalAlpha = 1;
      }
      // The sun and the moon, wherever they are right now.
      const sunR = Math.round(unit * 0.3);
      const sun = sunAt(view, t, unit);
      if (den.sky.sun && light.sun > -0.25) {
        const reach = sunPicture(sunR, dpr, light, dark);
        ctx.drawImage(sunSprite, sun[0] - reach, sun[1] - reach, reach * 2, reach * 2);
      }
      if (den.sky.moon && light.sun < 0.25) {
        const [mx, my] = moonAt(view, t, unit);
        const reach = moonPicture(Math.round(sunR * 0.8), dpr, light, dark);
        ctx.drawImage(moonSprite, mx - reach, my - reach, reach * 2, reach * 2);
      }
      // Clouds drift with the time of day, so they hurry along when time does.
      if (clouds.length) {
        const color = css(mix(mix(theme.cloud.night, theme.cloud.day, step(light.day, 1 / 48) / 48), theme.cloud.golden, step(golden, 1 / 48) / 48));
        ctx.globalAlpha = dark ? 0.8 : 0.9 - 0.3 * light.night;
        for (const c of clouds) {
          const half = cloudPicture(c, dpr, color);
          const along = (((c.x + t * den.sky.drift * c.speed) % 1) + 1) % 1;
          const x = view.l - c.size * 2 + along * (view.r - view.l + c.size * 4);
          ctx.drawImage(c.sprite, x - half, c.y - half, half * 2, half * 2);
        }
        ctx.globalAlpha = 1;
      }
      if (indoors) ctx.restore();

      // The scenery, in the light: a copy of it with the light's wash over it, made again when the light's changed by a shade.
      if (b.scene && den.webs.scenery > 0) {
        const sceneryKey = JSON.stringify([canvas.width, canvas.height, dpr, b.sceneKey, dark]);
        if (sceneryKey !== sceneryDrawn) {
          sceneryDrawn = sceneryKey;
          litDrawn = "";
          b.scene.paint(ready(scenery, w, h, dpr), b.palette);
        }
        let picture = scenery;
        if (tint.alpha > 0.01) {
          const litKey = JSON.stringify([sceneryKey, step(tint.alpha, 0.015), tint.color.map((v) => step(v, 6))]);
          // A new scene, straight away; a change of light, up to 4 times a second.
          if (litKey !== litDrawn && (!litDrawn || now - litAt > 250)) {
            litDrawn = litKey;
            litAt = now;
            const lctx = ready(lit, w, h, dpr);
            lctx.setTransform(1, 0, 0, 1, 0, 0);
            lctx.drawImage(scenery, 0, 0);
            lctx.globalCompositeOperation = "source-atop";
            lctx.fillStyle = tint.css;
            lctx.fillRect(0, 0, lit.width, lit.height);
            lctx.globalCompositeOperation = "source-over";
          }
          picture = lit;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = den.webs.scenery;
        ctx.drawImage(picture, 0, 0);
        ctx.globalAlpha = 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Sunbeams over it all (through the window, indoors).
      if (indoors) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(view.l, view.t, view.r - view.l, view.b - view.t);
        ctx.clip();
      }
      drawSunlight(ctx, view, sun, unit, light, dark);
      if (indoors) ctx.restore();
    },

    /** Fireflies, wandering and blinking, once it's dark (den px). `dt`: seconds of movement. */
    fireflies(ctx: CanvasRenderingContext2D, b: Background, dt: number) {
      const { light, unit, dpr } = b;
      if (light.night <= 0.2 || !fireflies.length) return;
      const view = viewOf(b);
      const r = Math.round(unit * 0.09);
      const key = JSON.stringify([r, dpr]);
      if (key !== glowDrawn) {
        glowDrawn = key;
        const g = ready(glow, r * 2, r * 2, dpr, -r, -r);
        const halo = g.createRadialGradient(0, 0, 0, 0, 0, r);
        halo.addColorStop(0, "rgba(240, 255, 170, 0.85)");
        halo.addColorStop(0.18, "rgba(232, 255, 138, 0.6)");
        halo.addColorStop(1, "rgba(198, 255, 90, 0)");
        g.fillStyle = halo;
        g.fillRect(-r, -r, r * 2, r * 2);
        g.fillStyle = "#fbffd8";
        g.beginPath();
        g.arc(0, 0, Math.max(1, unit * 0.012), 0, Math.PI * 2);
        g.fill();
      }
      for (const f of fireflies) {
        f.vx += (Math.random() - 0.5) * unit * 1.2 * dt;
        f.vy += (Math.random() - 0.5) * unit * 1.2 * dt;
        f.vx *= Math.exp(-1.5 * dt);
        f.vy *= Math.exp(-1.5 * dt);
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < view.l) f.x = view.r;
        if (f.x > view.r) f.x = view.l;
        f.y = Math.max(view.t + (view.b - view.t) * 0.2, Math.min(view.b - unit * 0.1, f.y));
        f.phase += dt * f.rate * 2;
        const blink = Math.max(0, Math.sin(f.phase)) ** 3 * light.night;
        if (blink < 0.02) continue;
        ctx.globalAlpha = blink;
        ctx.drawImage(glow, f.x - r, f.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    },
  };
}

export type Sky = ReturnType<typeof createSky>;

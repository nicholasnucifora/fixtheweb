import { den } from "./config";
import type { Light } from "./daytime";

/**
 * The Spider Den's sky, and the light of the time of day, drawn flat like everything else.
 *
 * By day the sky's blue and the sun crosses it, warming everything a little, with a soft cartoon
 * lens flare and shafts of sunlight. Around sunrise and sunset it glows orange. At night it's a deep
 * blue with stars and the moon, everything takes on a cool moonlit tint, and fireflies come out. Out
 * of doors the sky's behind everything; through a window, it's just what's seen through the window.
 *
 * world.ts draws the den on a clear canvas, then `tint`s what's there, puts the sky behind it
 * (`paint`, then drawn in with destination-over), and adds `glow` on top.
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
  puffs: [number, number, number][];
}
interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  rate: number;
}

/** Tints what's drawn on `ctx` (not what's clear) for the light: cool and dim by night, golden at sunrise and sunset, a touch warm by day. */
function tintFor(ctx: CanvasRenderingContext2D, w: number, h: number, light: Light, dark: boolean) {
  const s = den.sky;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const night = light.night * s.night;
  if (night > 0.01) {
    ctx.fillStyle = css((dark ? SKY.dark : SKY.light).tintNight, night * (dark ? 0.45 : 0.42));
    ctx.fillRect(0, 0, w, h);
  }
  const golden = light.golden * s.golden;
  if (golden > 0.01) {
    ctx.fillStyle = css(hex("#ff8a3d"), golden * (dark ? 0.12 : 0.16));
    ctx.fillRect(0, 0, w, h);
  }
  const warm = light.day * (1 - light.golden) * s.warm;
  if (warm > 0.01) {
    ctx.fillStyle = css(hex("#ffd27a"), warm * 0.08);
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function createSky() {
  const layer = document.createElement("canvas");
  let stars: Star[] = [];
  let clouds: Cloud[] = [];
  let fireflies: Firefly[] = [];
  let builtFor = "";
  let clock = 0;

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
    clouds = Array.from({ length: Math.round(den.sky.clouds) }, (_, i) => {
      const size = unit * (0.35 + Math.random() * 0.4);
      return {
        x: Math.random(),
        y: view.t + h * (0.08 + (i / Math.max(1, den.sky.clouds)) * 0.4 + Math.random() * 0.08),
        size,
        speed: 0.6 + Math.random() * 0.8,
        puffs: [
          [0, 0, 1],
          [0.85, 0.18, 0.72],
          [-0.8, 0.22, 0.68],
          [0.35, -0.3, 0.7],
          [-0.3, -0.18, 0.6],
        ],
      };
    });
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

  const drawSun = (ctx: CanvasRenderingContext2D, [x, y]: Vec, r: number, light: Light, dark: boolean) => {
    const warm = light.golden;
    const glowR = r * (3.2 + warm * 1.8);
    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, glowR);
    glow.addColorStop(0, css(mix(hex("#ffe29a"), hex("#ffae63"), warm), dark ? 0.35 : 0.55));
    glow.addColorStop(1, css(hex("#ffd98a"), 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();
    // Cartoon rays, turning slowly.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(clock * 0.12);
    ctx.fillStyle = css(mix(hex("#ffd566"), hex("#ffa45a"), warm), 0.75);
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      const long = i % 2 ? 1.55 : 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, -r * 1.18);
      ctx.lineTo(0, -r * long);
      ctx.lineTo(r * 0.16, -r * 1.18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = css(mix(hex("#ffd35c"), hex("#ff9f4a"), warm));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(hex("#fff3c4"), 0.55);
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawMoon = (ctx: CanvasRenderingContext2D, [x, y]: Vec, r: number, light: Light, dark: boolean) => {
    const glowR = r * 4;
    const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, glowR);
    glow.addColorStop(0, css(hex("#dfe6ff"), (dark ? 0.22 : 0.35) * light.night));
    glow.addColorStop(1, css(hex("#dfe6ff"), 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(hex("#f5f1dc"));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(hex("#dcd6ba"));
    for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.28, 0.12, 0.16], [-0.05, 0.42, 0.12], [0.35, -0.38, 0.09]]) {
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return {
    /**
     * The sky for time of day `t` in `light`, on its own layer the size of `canvas` (device px,
     * `dpr` to a den px): the whole of it out of doors, or through a window (`view`, with the room
     * around it in `room`). `dt`: seconds of movement since last time, for twinkling and drifting.
     */
    paint(canvas: HTMLCanvasElement, dpr: number, unit: number, view: SkyView, window: boolean, room: string, t: number, light: Light, dark: boolean, dt: number) {
      clock += dt;
      if (layer.width !== canvas.width || layer.height !== canvas.height) {
        layer.width = canvas.width;
        layer.height = canvas.height;
      }
      build(view, unit);
      const ctx = layer.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, layer.width, layer.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      if (window) {
        // The room, in the same light as everything in it.
        ctx.fillStyle = room;
        ctx.fillRect(0, 0, w, h);
        tintFor(ctx, w, h, light, dark);
        ctx.save();
        ctx.beginPath();
        ctx.rect(view.l, view.t, view.r - view.l, view.b - view.t);
        ctx.clip();
      }
      const theme = dark ? SKY.dark : SKY.light;
      const [dayTop, dayBottom] = theme.day;
      const [goldTop, goldBottom] = theme.golden;
      const [nightTop, nightBottom] = theme.night;
      const golden = light.golden * den.sky.golden;
      const top = mix(mix(nightTop, dayTop, light.day), goldTop, golden * 0.75);
      const bottom = mix(mix(nightBottom, dayBottom, light.day), goldBottom, golden);
      const gradient = ctx.createLinearGradient(0, view.t, 0, view.horizon);
      gradient.addColorStop(0, css(top));
      gradient.addColorStop(1, css(bottom));
      ctx.fillStyle = gradient;
      ctx.fillRect(view.l, view.t, view.r - view.l, view.b - view.t);

      // Stars, twinkling, as it gets dark.
      if (light.night > 0.05 && stars.length) {
        ctx.fillStyle = "#fffbe8";
        for (const s of stars) {
          const a = light.night * (0.45 + 0.55 * Math.sin(clock * (1.2 + s.r) + s.twinkle) ** 2);
          if (a < 0.03) continue;
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
          if (s.r > 1.6) {
            // The bright ones get a little sparkle.
            ctx.fillRect(s.x - s.r * 2.2, s.y - 0.4, s.r * 4.4, 0.8);
            ctx.fillRect(s.x - 0.4, s.y - s.r * 2.2, 0.8, s.r * 4.4);
          }
        }
        ctx.globalAlpha = 1;
      }

      const sunR = unit * 0.3;
      if (den.sky.sun && light.sun > -0.25) drawSun(ctx, sunAt(view, t, unit), sunR, light, dark);
      if (den.sky.moon && light.sun < 0.25) drawMoon(ctx, moonAt(view, t, unit), sunR * 0.8, light, dark);

      // Clouds drift with the time of day, so they hurry along when time does.
      if (clouds.length) {
        const cloudColor = mix(mix(theme.cloud.night, theme.cloud.day, light.day), theme.cloud.golden, golden);
        ctx.fillStyle = css(cloudColor, dark ? 0.8 : 0.9 - 0.3 * light.night);
        const span = view.r - view.l;
        for (const c of clouds) {
          const along = (((c.x + t * den.sky.drift * c.speed) % 1) + 1) % 1;
          const x = view.l - c.size * 2 + along * (span + c.size * 4);
          ctx.beginPath();
          for (const [dx, dy, s] of c.puffs) {
            ctx.moveTo(x + dx * c.size + c.size * 0.5 * s, c.y + dy * c.size * 0.5);
            ctx.arc(x + dx * c.size, c.y + dy * c.size * 0.5, c.size * 0.5 * s, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }
      if (window) ctx.restore();
      return layer;
    },

    /** Tints what's drawn on `ctx` so far for the light (see tintFor). */
    tint(ctx: CanvasRenderingContext2D, w: number, h: number, light: Light, dark: boolean) {
      tintFor(ctx, w, h, light, dark);
    },

    /** On top of everything: sunbeams and a little lens flare by day, fireflies by night. `dt`: seconds of movement. */
    glow(ctx: CanvasRenderingContext2D, unit: number, view: SkyView, window: boolean, t: number, light: Light, dark: boolean, dt: number) {
      const s = den.sky;
      const w = view.r - view.l;
      ctx.save();
      if (window) {
        ctx.beginPath();
        ctx.rect(view.l, view.t, view.r - view.l, view.b - view.t);
        ctx.clip();
      }
      ctx.globalCompositeOperation = dark ? "lighter" : "screen";
      const [sx, sy] = sunAt(view, t, unit);
      const up = Math.max(0, Math.min(1, light.sun / 0.3)) * light.day;
      if (up > 0.02 && (s.rays > 0 || s.flare > 0)) {
        // Soft shafts of sunlight, swaying a little, fading out as they reach across.
        if (s.rays > 0) {
          const reach = Math.hypot(w, view.b - view.t) * 0.85;
          const toward = Math.atan2((view.t + view.b) / 2 - sy, (view.l + view.r) / 2 - sx);
          const strength = s.rays * up * (dark ? 0.12 : 0.22);
          const color = mix(hex("#fff1c1"), hex("#ffc27d"), light.golden);
          for (let i = 0; i < 5; i++) {
            const angle = toward + (i - 2) * 0.22 + Math.sin(clock * 0.15 + i * 1.7) * 0.04;
            const spread = 0.018 + (i % 2) * 0.014;
            const beam = ctx.createLinearGradient(sx, sy, sx + Math.cos(angle) * reach, sy + Math.sin(angle) * reach);
            beam.addColorStop(0, css(color, strength));
            beam.addColorStop(0.4, css(color, strength * 0.35));
            beam.addColorStop(1, css(color, 0));
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(angle - spread) * reach, sy + Math.sin(angle - spread) * reach);
            ctx.lineTo(sx + Math.cos(angle + spread) * reach, sy + Math.sin(angle + spread) * reach);
            ctx.closePath();
            ctx.fill();
          }
        }
        // A cartoon lens flare: faint rings along the line from the sun through the middle.
        if (s.flare > 0) {
          const cx = (view.l + view.r) / 2;
          const cy = (view.t + view.b) / 2;
          const flare: [number, number, string][] = [
            [0.35, 0.06, "#fff4c9"],
            [0.6, 0.13, "#ffd08a"],
            [0.8, 0.04, "#b8e4ff"],
            [1.15, 0.2, "#ffe2a8"],
            [1.45, 0.08, "#ffc3a0"],
          ];
          const strength = s.flare * up * (dark ? 0.05 : 0.09);
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
      }

      // Fireflies, wandering and blinking, once it's dark.
      if (light.night > 0.2 && fireflies.length) {
        const shown = light.night;
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
          const blink = Math.max(0, Math.sin(f.phase)) ** 3 * shown;
          if (blink < 0.02) continue;
          const r = unit * 0.09;
          const halo = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
          halo.addColorStop(0, css(hex("#e8ff8a"), 0.75 * blink));
          halo.addColorStop(1, css(hex("#c6ff5a"), 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = css(hex("#fbffd8"), blink);
          ctx.beginPath();
          ctx.arc(f.x, f.y, Math.max(1, unit * 0.012), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  };
}

export type Sky = ReturnType<typeof createSky>;

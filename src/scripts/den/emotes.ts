import { den } from "./config";

/**
 * Little symbols that pop up over a Spider Den spider as it feels something: a heart, an angry
 * mark, a !, a ?, a sweat drop, a musical note, a sparkle, a tear, or a trail of dots. Each pops in,
 * drifts up and fades. Drawn flat, in the site's colours, like everything else on the canvas.
 */

export type Emote = "heart" | "anger" | "alarm" | "question" | "sweat" | "note" | "sparkle" | "tear" | "dots" | "skull";

interface Shown {
  kind: Emote;
  age: number;
  life: number;
  /** Off to one side of the head, so a few at once don't stack. */
  side: number;
}

export interface EmoteColors {
  ink: string;
  accent: string;
  surface: string;
}

export function createEmotes() {
  let list: Shown[] = [];
  let lastSide = 1;

  return {
    /** Shows `kind` (if emotes are on, and it's chatty enough: `always` skips that roll). */
    add(kind: Emote, always = false) {
      const e = den.emotes;
      if (!e.enabled || (!always && Math.random() > e.chance)) return;
      // The same one already showing just starts over.
      const same = list.find((s) => s.kind === kind);
      if (same) {
        same.age = Math.min(same.age, 0.2);
        return;
      }
      lastSide = -lastSide;
      list.push({ kind, age: 0, life: e.life * (kind === "dots" ? 1.4 : 1), side: lastSide * (0.4 + Math.random() * 0.3) });
      if (list.length > 3) list.shift();
    },

    clear() {
      list = [];
    },

    update(dt: number) {
      for (const s of list) s.age += dt;
      list = list.filter((s) => s.age < s.life);
    },

    /** Above a head at (x, y) (document px), for a spider `radius` px across. */
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, unit: number, colors: EmoteColors) {
      if (!list.length) return;
      const size = Math.max(9, den.emotes.size * unit);
      for (const s of list) {
        const t = s.age / s.life;
        const pop = t < 0.12 ? 0.6 + (t / 0.12) * 0.55 : t < 0.2 ? 1.15 - ((t - 0.12) / 0.08) * 0.15 : 1;
        const alpha = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
        const ex = x + s.side * radius * 0.9;
        const ey = y - radius * 0.35 - t * size * 1.4;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(ex, ey);
        ctx.scale(pop, pop);
        drawEmote(ctx, s.kind, size, s.age, colors);
        ctx.restore();
      }
    },
  };
}

const CORAL = "#e8705a";
const RED = "#d9473f";
const GOLD = "#f0b43c";
const BLUE = "#5b9bd5";

/** One emote, centred on 0, 0, about `size` tall. */
function drawEmote(ctx: CanvasRenderingContext2D, kind: Emote, size: number, age: number, colors: EmoteColors) {
  const s = size / 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const outline = (path: Path2D, fill: string) => {
    ctx.lineWidth = Math.max(2, s * 0.28);
    ctx.strokeStyle = colors.surface;
    ctx.stroke(path);
    ctx.fillStyle = fill;
    ctx.fill(path);
  };
  const glyph = (text: string, color: string, scale = 1.6) => {
    ctx.font = `800 ${Math.round(size * scale)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(2, s * 0.35);
    ctx.strokeStyle = colors.surface;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
  };
  switch (kind) {
    case "heart": {
      const p = new Path2D();
      p.moveTo(0, s * 0.9);
      p.bezierCurveTo(-s * 0.25, s * 0.72, -s, s * 0.25, -s, -s * 0.28);
      p.bezierCurveTo(-s, -s * 0.8, -s * 0.4, -s, 0, -s * 0.5);
      p.bezierCurveTo(s * 0.4, -s, s, -s * 0.8, s, -s * 0.28);
      p.bezierCurveTo(s, s * 0.25, s * 0.25, s * 0.72, 0, s * 0.9);
      outline(p, CORAL);
      break;
    }
    case "anger": {
      // The classic cross-shaped vein: four curved ticks.
      const p = new Path2D();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const [c, n] = [Math.cos(a), Math.sin(a)];
        p.moveTo(c * s * 0.25 - n * s * 0.35, n * s * 0.25 + c * s * 0.35);
        p.quadraticCurveTo(c * s * 0.55, n * s * 0.55, c * s * 0.25 + n * s * 0.35, n * s * 0.25 - c * s * 0.35);
      }
      const pulse = 1 + Math.sin(age * 18) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.lineWidth = s * 0.55;
      ctx.strokeStyle = colors.surface;
      ctx.stroke(p);
      ctx.lineWidth = s * 0.28;
      ctx.strokeStyle = RED;
      ctx.stroke(p);
      break;
    }
    case "alarm":
      glyph("!", CORAL);
      break;
    case "question":
      glyph("?", colors.ink);
      break;
    case "note":
      glyph("♪", colors.accent, 1.4);
      break;
    case "dots": {
      const n = 1 + Math.floor((age * 3) % 3);
      for (let i = 0; i < n; i++) {
        const p = new Path2D();
        p.arc((i - 1) * s * 0.75, s * 0.3, s * 0.2, 0, Math.PI * 2);
        outline(p, colors.ink);
      }
      break;
    }
    case "sweat":
    case "tear": {
      const p = new Path2D();
      p.moveTo(0, -s);
      p.bezierCurveTo(s * 0.2, -s * 0.4, s * 0.7, 0, s * 0.7, s * 0.35);
      p.arc(0, s * 0.35, s * 0.7, 0, Math.PI);
      p.bezierCurveTo(-s * 0.7, 0, -s * 0.2, -s * 0.4, 0, -s);
      if (kind === "tear") ctx.translate(0, age * s * 0.8);
      outline(p, BLUE);
      break;
    }
    case "sparkle": {
      const p = new Path2D();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const d = i % 2 ? s * 0.28 : s;
        if (i) p.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        else p.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      p.closePath();
      ctx.rotate(age * 2);
      outline(p, GOLD);
      break;
    }
    case "skull": {
      const p = new Path2D();
      p.arc(0, -s * 0.15, s * 0.75, Math.PI * 0.85, Math.PI * 2.15);
      p.lineTo(s * 0.45, s * 0.8);
      p.lineTo(-s * 0.45, s * 0.8);
      p.closePath();
      outline(p, colors.surface);
      ctx.fillStyle = colors.ink;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * s * 0.3, -s * 0.1, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
}

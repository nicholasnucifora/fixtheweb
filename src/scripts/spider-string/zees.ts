import { config } from "./config";

/**
 * Little Z's that drift up off the top of the spider's head while it's asleep.
 *
 * Each one is drawn as a stroked Z in the string's colour, so it matches the spider's line work.
 * They start small just above its head, grow as they rise, sway a little, and fade out.
 */

type Vec = [number, number];

interface Zee {
  x: number;
  y: number;
  age: number;
  life: number;
  size: number;
  /** Which way it drifts, and where in its sway it starts. */
  side: number;
  sway: number;
}

export function createZees() {
  let list: Zee[] = [];
  let owed = 0;
  let unit = 0;

  return {
    /**
     * `asleep` is 1 while it sleeps. `center` is the spider's body centre (document px) and
     * `radius` half its width (px); the Z's leave from the top of its head, off to one side.
     */
    update(dt: number, asleep: number, center: Vec | null, radius: number, pxPerB: number) {
      const z = config.faceAsleep;
      unit = pxPerB;
      if (asleep > 0 && z.zees && center && unit > 0) {
        owed += dt / Math.max(0.1, z.zeeEvery);
        while (owed >= 1) {
          owed -= 1;
          // Alternate sides a little, so a string of them doesn't stack into one column.
          const side = list.length % 2 === 0 ? 1 : 0.6;
          list.push({
            x: center[0] + radius * 0.35 * side,
            y: center[1] - radius * 0.55,
            age: 0,
            life: Math.max(0.2, z.zeeLife),
            size: z.zeeSize * unit * (0.85 + Math.random() * 0.3),
            side,
            sway: Math.random() * Math.PI * 2,
          });
        }
      } else {
        // The first Z comes out soon after it nods off, rather than a whole interval later.
        owed = Math.min(owed, 0.7);
      }
      for (const zee of list) zee.age += dt;
      list = list.filter((zee) => zee.age < zee.life);
    },

    /** Strokes with the context's current strokeStyle. */
    draw(ctx: CanvasRenderingContext2D) {
      if (!list.length) return;
      const z = config.faceAsleep;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const zee of list) {
        const t = zee.age / zee.life;
        const size = zee.size * (0.5 + 0.7 * t);
        const x = zee.x + z.zeeDrift * unit * t * zee.side + Math.sin(zee.sway + t * Math.PI * 2) * 0.04 * unit;
        const y = zee.y - z.zeeRise * unit * t;
        // Fade in quickly, then out slowly as it rises.
        ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        ctx.lineWidth = size * 0.2;
        ctx.beginPath();
        ctx.moveTo(x - size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y - size / 2);
        ctx.lineTo(x - size / 2, y + size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

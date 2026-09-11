/**
 * Short, thick line particles that shoot out, slow down, shrink and fade.
 * Knows nothing about plucks: callers decide where and how they spawn.
 */

export interface ParticleSpawn {
  x: number;
  y: number;
  /** Launch velocity, px/s. The dash points along it. */
  vx: number;
  vy: number;
  /** px */
  length: number;
  width: number;
  /** Seconds. */
  life: number;
  /** Deceleration, 1/s. */
  drag: number;
  /** Downward acceleration while flying, px/s². */
  gravity: number;
  /** 0–1: how much the dash shortens by the end of its life. */
  shrink: number;
}

interface Particle extends ParticleSpawn {
  age: number;
  /** Unit direction the dash is drawn along, fixed at launch. */
  dx: number;
  dy: number;
}

export class Particles {
  private list: Particle[] = [];

  spawn(s: ParticleSpawn) {
    const speed = Math.hypot(s.vx, s.vy) || 1;
    this.list.push({ ...s, age: 0, dx: s.vx / speed, dy: s.vy / speed });
  }

  update(dt: number) {
    for (const p of this.list) {
      p.age += dt;
      const keep = Math.exp(-p.drag * dt);
      p.vx *= keep;
      p.vy = p.vy * keep + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }

  /** Strokes with the context's current strokeStyle. */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.lineCap = "round";
    for (const p of this.list) {
      const t = p.age / p.life;
      const len = p.length * (1 - t * p.shrink);
      ctx.globalAlpha = 1 - t * t;
      ctx.lineWidth = p.width * (1 - t * 0.4);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.dx * len, p.y + p.dy * len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

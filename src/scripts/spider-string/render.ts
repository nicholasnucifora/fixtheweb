import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import type { Particles } from "./particles";
import type { Rope } from "./rope";

const DEBUG_COLOR = "#ff5a5f";

/**
 * Draws the string and particles on a viewport-sized canvas, and positions
 * the spider element. Simulation works in document px; this is where they're
 * shifted by the scroll offset into the viewport.
 */
export function createRenderer(root: HTMLElement, canvas: HTMLCanvasElement, bob: HTMLElement) {
  const ctx = canvas.getContext("2d")!;
  let dpr = 1;
  let color = "";
  let bobSize = "";
  let bobHit = "";

  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  };
  // Colour comes from CSS (`color` on the root), so it follows light/dark mode.
  const readColor = () => (color = getComputedStyle(root).color);

  resize();
  readColor();
  window.addEventListener("resize", resize);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColor);

  /** Only touches the style when a value actually changed. */
  const sizeBob = (unit: number) => {
    const size = `${config.bob.radius * 2 * unit}px`;
    if (size !== bobSize) bob.style.setProperty("--bob-size", (bobSize = size));
    const hit = `${-config.bob.hitArea * 100}%`;
    if (hit !== bobHit) bob.style.setProperty("--bob-hit", (bobHit = hit));
  };

  return {
    draw(rope: Rope, particles: Particles, a: AnchorFrame) {
      const sx = window.scrollX;
      const sy = window.scrollY;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, -sx * dpr, -sy * dpr);
      ctx.strokeStyle = color;

      drawString(ctx, rope, Math.max(1, config.rope.thickness * a.unit));
      particles.draw(ctx);
      if (config.debug.showPoints) drawPoints(ctx, rope, a);

      // Spider sits on the tail, turned to hang along the last stretch of string.
      sizeBob(a.unit);
      const pts = rope.points;
      const tail = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const angle = Math.atan2(-(tail.x - prev.x), tail.y - prev.y);
      bob.style.transform = `translate(${tail.x - sx}px, ${tail.y - sy}px) translate(-50%, -50%) rotate(${angle}rad)`;
    },
  };
}

/** Smooth curve through the rope points (quadratic segments via midpoints). */
function drawString(ctx: CanvasRenderingContext2D, rope: Rope, width: number) {
  const pts = rope.points;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const tail = pts[pts.length - 1];
  ctx.lineTo(tail.x, tail.y);
  ctx.stroke();
}

/** Debug: a dot per rope point (hollow when pinned) and a ring on the attach point. */
function drawPoints(ctx: CanvasRenderingContext2D, rope: Rope, a: AnchorFrame) {
  const r = Math.max(2, a.unit * 0.012);
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = DEBUG_COLOR;
  ctx.lineWidth = 1;
  for (const p of rope.points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    if (p.w === 0) ctx.stroke();
    else ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(a.x, a.y, r * 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

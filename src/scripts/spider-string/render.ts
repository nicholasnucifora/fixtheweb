import type { AnchorFrame } from "./anchor";
import { config } from "./config";
import type { Particles } from "./particles";
import type { Rope } from "./rope";

const DEBUG_COLOR = "#ff5a5f";

type Point = { x: number; y: number };

/**
 * Draws the string and particles on a viewport-sized canvas. Simulation works
 * in document px; this is where they're shifted by the scroll offset into the
 * viewport. (The spider itself is spider.ts.)
 */
export function createRenderer(root: HTMLElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let scaleX = 1;
  let scaleY = 1;
  let color = "";

  // Exactly one canvas pixel per device pixel, so nothing drawn on it gets resampled (blurry or shimmery).
  const fit = (cssWidth: number, cssHeight: number, deviceWidth?: number, deviceHeight?: number) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = deviceWidth ?? Math.round(cssWidth * dpr);
    canvas.height = deviceHeight ?? Math.round(cssHeight * dpr);
    scaleX = canvas.width / (cssWidth || 1);
    scaleY = canvas.height / (cssHeight || 1);
  };
  const observer = new ResizeObserver(([entry]) => {
    const device = entry.devicePixelContentBoxSize?.[0];
    fit(entry.contentRect.width, entry.contentRect.height, device?.inlineSize, device?.blockSize);
  });
  try {
    observer.observe(canvas, { box: "device-pixel-content-box" });
  } catch {
    observer.observe(canvas);
  }
  fit(canvas.clientWidth, canvas.clientHeight);

  // Colour comes from CSS (`color` on the root), so it follows light/dark mode.
  const readColor = () => (color = getComputedStyle(root).color);
  readColor();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColor);

  return {
    /**
     * `alpha`: how far between the last two physics steps to draw (see Rope.at).
     * `drawSpider` draws on top of the string, in the same document-px space.
     */
    draw(rope: Rope, particles: Particles, a: AnchorFrame, alpha: number, drawSpider?: (ctx: CanvasRenderingContext2D) => void) {
      const sx = window.scrollX;
      const sy = window.scrollY;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scaleX, 0, 0, scaleY, -sx * scaleX, -sy * scaleY);
      ctx.strokeStyle = color;

      const pts = rope.points.map((_, i) => rope.at(i, alpha));
      drawString(ctx, pts, Math.max(1, config.rope.thickness * a.unit));
      drawSpider?.(ctx);
      ctx.strokeStyle = color;
      particles.draw(ctx);
      if (config.debug.showPoints) drawPoints(ctx, rope, pts, a);
    },
  };
}

/** Smooth curve through the rope points (quadratic segments via midpoints). */
function drawString(ctx: CanvasRenderingContext2D, pts: Point[], width: number) {
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
function drawPoints(ctx: CanvasRenderingContext2D, rope: Rope, pts: Point[], a: AnchorFrame) {
  const r = Math.max(2, a.unit * 0.012);
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = DEBUG_COLOR;
  ctx.lineWidth = 1;
  rope.points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
    if (p.w === 0) ctx.stroke();
    else ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(a.x, a.y, r * 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

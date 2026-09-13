import spiderSource from "../../assets/spider/spider.svg?raw";
import { config } from "./config";
import { type Fit, type Pen, dressBack, dressBody, dressFace, dressFeet, dressHat } from "./dress";
import { parse, shape } from "./spider";
import { SKINS, type Look } from "./wardrobe";

/**
 * The spider standing still, as drawn, wearing a look: for pictures like the Spider Den's
 * wardrobe tiles. The same artwork and the same clothes (dress.ts) as the one on the string,
 * without any of its life.
 */

type Vec = [number, number];

export interface Figure {
  /** The artwork's size, art units. */
  width: number;
  height: number;
  /** Draws it at the context's current transform, in art units. `outline` draws the dark-mode edge. */
  draw(ctx: CanvasRenderingContext2D, look: Look, outline: boolean): void;
}

let figure: Figure | null = null;

export function getFigure(): Figure {
  if (figure) return figure;
  const svg = new DOMParser().parseFromString(spiderSource, "image/svg+xml").documentElement;
  const [, , W, H] = (svg.getAttribute("viewBox") ?? "0 0 596 401").split(/\s+/).map(Number);
  const dOf = (el: Element | null) => el?.getAttribute("d") ?? "";

  const bodyD = dOf(svg.querySelector('[data-part="body"]'));
  const body = shape(parse(bodyD));
  const bodyPath = new Path2D(bodyD);

  const legs = [...svg.querySelectorAll("[data-leg]")].map((el) => {
    const pivot = (el.getAttribute("data-pivot") ?? "0 0").split(" ").map(Number) as Vec;
    const cmds = parse(dOf(el));
    const points = cmds.flatMap(({ args }) => args.flatMap((_, i) => (i % 2 ? [] : [[args[i], args[i + 1]] as Vec])));
    const tip = points.reduce((far, p) =>
      Math.hypot(p[0] - pivot[0], p[1] - pivot[1]) > Math.hypot(far[0] - pivot[0], far[1] - pivot[1]) ? p : far,
    );
    return { path: new Path2D(dOf(el)), tip, side: (el.getAttribute("data-leg")?.[0] === "R" ? "right" : "left") as Fit["legs"][number]["side"] };
  });

  const eyes = (["left", "right"] as const).map((side) => {
    const g = svg.querySelector(`[data-part="eye"][data-side="${side}"]`);
    const whiteD = dOf(g?.querySelector('[data-part="eye-white"]') ?? null);
    const white = shape(parse(whiteD));
    return {
      side,
      white: new Path2D(whiteD),
      pupil: new Path2D(dOf(g?.querySelector('[data-part="pupil"]') ?? null)),
      center: white.center,
      radius: Math.min(...white.size) / 2,
    };
  });

  const mouthD = dOf(svg.querySelector('[data-part="mouth"]'));
  const mouth = shape(parse(mouthD));
  const mouthPath = new Path2D(mouthD);

  const fitFor = (skin: string): Fit => ({
    body: { cx: body.center[0], cy: body.center[1], rx: body.size[0] / 2, ry: body.size[1] / 2, path: bodyPath },
    legs,
    eyes: eyes.map((e) => ({ side: e.side, center: e.center, radius: e.radius, size: 1 })),
    mouth: { center: mouth.center, top: mouth.center[1] - mouth.size[1] / 2, width: mouth.size[0], drawn: 1 },
    time: 0,
    velocity: [0, 0],
    swing: 0,
    hang: 0,
    still: true,
    skin,
    mouthColor: config.colors.mouth,
  });

  figure = {
    width: W,
    height: H,
    draw(ctx, look, outline) {
      const c = config.colors;
      const skin = SKINS[look.skin].color || c.body;
      const fit = fitFor(skin);
      const edgeWidth = c.outlineWidth * W * 2;
      ctx.save();
      ctx.lineJoin = "round";

      if (outline) {
        const edge: Pen = { mode: "edge", outline: c.outline, width: edgeWidth };
        dressBack(ctx, fit, look, edge);
        ctx.fillStyle = ctx.strokeStyle = c.outline;
        ctx.lineWidth = edgeWidth;
        for (const leg of legs) {
          ctx.fill(leg.path);
          ctx.stroke(leg.path);
        }
        ctx.fill(bodyPath);
        ctx.stroke(bodyPath);
        dressBody(ctx, fit, look, edge);
        dressHat(ctx, fit, look, edge);
      }

      const paint: Pen = { mode: "paint", outline: c.outline, width: 0 };
      dressBack(ctx, fit, look, paint);
      ctx.fillStyle = skin;
      for (const leg of legs) ctx.fill(leg.path);
      dressFeet(ctx, fit, look, paint);
      ctx.fillStyle = skin;
      ctx.fill(bodyPath);
      dressBody(ctx, fit, look, paint);
      for (const eye of eyes) {
        ctx.fillStyle = c.eyes;
        ctx.fill(eye.white);
        ctx.fillStyle = c.pupils;
        ctx.fill(eye.pupil);
      }
      ctx.fillStyle = c.mouth;
      ctx.fill(mouthPath);
      dressFace(ctx, fit, look, paint);
      dressHat(ctx, fit, look, paint);
      ctx.restore();
    },
  };
  return figure;
}

import { PARTS, type Life, type Part } from "./model";

/**
 * A whole life drawn as weeks on a canvas. The weeks already lived are hollow: grey before the first iPhone
 * went on sale, drab brown since. The rest of it is split into blocks by what it'll go on, screen time
 * last, with the part of it that's worth it in its own colour. Wide, the years run across and the weeks
 * down; narrow, the other way round. Colours come from the canvas's --life-* custom properties.
 *
 * play() starts with every week left as free time, then takes each part out of it in turn (sleep, work,
 * upkeep, screens) until only the free time off screens is left.
 */

export const WEEKS = 52;

/** Where play() is up to: the start (all of it free), taking a part out, or done. */
export type Stage = "start" | Exclude<Part, "free"> | "done";

export interface Grid {
  /** Draws this life, stopping anything playing: as it ends up, or at the start, with none of it taken yet. */
  show(life: Life, stage?: "start" | "done"): void;
  /** Plays the current life being carved up. */
  play(): void;
}

interface Options {
  /** Each frame of play(): the stage, and how far through it (eased, 0 to 1). */
  onFrame?: (stage: Stage, progress: number) => void;
}

const TAKEN = PARTS.filter((part): part is Exclude<Part, "free"> => part !== "free");
const HOLD = 700;
const STAGE = 950;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** The blocks drawn after the weeks lived, in order: screen time is split into the rest and what's worth it. */
const BLOCKS = ["sleep", "work", "upkeep", "screens", "worth", "free"] as const;
type Block = (typeof BLOCKS)[number];

/** The weeks lived (and how many were before smartphones), and the weeks each block takes of the rest, rounded so they add up. */
function weeksOf(life: Life) {
  const past = life.inputs.age * WEEKS;
  const before = Math.round((life.inputs.age - life.withSmartphones) * WEEKS);
  const future = Math.round(life.end * WEEKS) - past;
  const years: Record<Block, number> = { ...life.years, screens: life.years.screens - life.worth, worth: life.worth };
  const exact = BLOCKS.map((block) => (years[block] / life.left) * future);
  const counts = exact.map(Math.floor);
  const order = exact.map((value, i) => [value - counts[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < future - counts.reduce((a, b) => a + b, 0); k++) counts[order[k][1]]++;
  return {
    past,
    before,
    future,
    counts: Object.fromEntries(BLOCKS.map((block, i) => [block, counts[i]])) as Record<Block, number>,
  };
}

export function createGrid(canvas: HTMLCanvasElement, { onFrame }: Options = {}): Grid {
  const ctx = canvas.getContext("2d")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let life: Life | null = null;
  let frame = 0;
  /** How much of each part is drawn taken out: the stage being played and how far through it. */
  let drawn: { stage: Stage; progress: number } = { stage: "done", progress: 1 };

  const draw = () => {
    if (!life) return;
    const style = getComputedStyle(canvas);
    const colour = (name: string) => style.getPropertyValue(`--life-${name}`).trim();
    const width = canvas.clientWidth;
    const years = Math.ceil(life.end);
    const wide = width >= 640;
    const cols = wide ? years : WEEKS;
    const rows = wide ? WEEKS : years;
    // Room for the age labels: above when wide, down the side when narrow.
    const top = wide ? 20 : 0;
    const left = wide ? 0 : 24;
    const pitch = (width - left) / cols;
    const gap = pitch >= 9 ? 2 : 1;
    const height = Math.ceil(top + rows * pitch);
    const dpr = devicePixelRatio || 1;
    canvas.style.height = `${height}px`;
    // Only resized when it's changed, since that throws the drawing away.
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { past, before, future, counts } = weeksOf(life);
    // Each part's weeks as far as it's been taken out, in order; whatever's not taken is free.
    const at = TAKEN.indexOf(drawn.stage as (typeof TAKEN)[number]);
    const fills: string[] = [];
    TAKEN.forEach((part, i) => {
      const done = drawn.stage === "done" || (at >= 0 && i < at);
      const blocks: Block[] = part === "screens" ? ["screens", "worth"] : [part];
      const total = blocks.reduce((sum, block) => sum + counts[block], 0);
      let n = done ? total : at === i ? Math.round(total * drawn.progress) : 0;
      for (const block of blocks) {
        const fill = colour(block);
        for (let k = 0; k < counts[block] && n > 0; k++, n--) fills.push(fill);
      }
    });
    const free = colour("free");
    const pastBefore = colour("past");
    const pastSince = colour("past-phones");

    const cell = pitch - gap;
    const side = Math.max(cell - 1, 0.5);
    ctx.lineWidth = 1;
    for (let i = 0; i < past + future; i++) {
      const year = Math.floor(i / WEEKS);
      const week = i % WEEKS;
      const x = left + (wide ? year : week) * pitch;
      const y = top + (wide ? week : year) * pitch;
      if (i < past) {
        ctx.strokeStyle = i < before ? pastBefore : pastSince;
        ctx.strokeRect(x + 0.5, y + 0.5, side, side);
      } else {
        ctx.fillStyle = fills[i - past] ?? free;
        ctx.fillRect(x, y, cell, cell);
      }
    }

    // Ages every ten years, and where "now" is.
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.fillStyle = colour("label");
    ctx.textBaseline = wide ? "alphabetic" : "middle";
    ctx.textAlign = wide ? "left" : "right";
    const age = life.inputs.age;
    for (let year = 0; year < years; year += 10) {
      // Out of the way of the "now" label.
      if (wide ? year > age - 4 && year < age + 7 : Math.abs(year - age) < 3) continue;
      if (wide) ctx.fillText(String(year), year * pitch, 12);
      else ctx.fillText(String(year), left - 6, year * pitch + pitch / 2);
    }
    ctx.fillStyle = colour("now");
    ctx.font = "800 10px system-ui, sans-serif";
    if (wide) {
      // Kept inside the canvas when "now" is near the end.
      const label = `▼ ${age}, now`;
      ctx.fillText(label, Math.min(age * pitch, width - ctx.measureText(label).width), 12);
    } else {
      ctx.fillText(`${age} ▶`, left - 2, age * pitch + pitch / 2);
    }
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  new ResizeObserver(() => draw()).observe(canvas);

  return {
    show(next, stage = "done") {
      stop();
      life = next;
      drawn = { stage, progress: stage === "done" ? 1 : 0 };
      draw();
    },
    play() {
      stop();
      if (!life || reduced.matches) {
        drawn = { stage: "done", progress: 1 };
        draw();
        return onFrame?.("done", 1);
      }
      const started = performance.now();
      const tick = (now: number) => {
        const elapsed = now - started;
        const k = Math.floor((elapsed - HOLD) / STAGE);
        if (elapsed < HOLD) drawn = { stage: "start", progress: 0 };
        else if (k < TAKEN.length) drawn = { stage: TAKEN[k], progress: ease((elapsed - HOLD - k * STAGE) / STAGE) };
        else drawn = { stage: "done", progress: 1 };
        draw();
        onFrame?.(drawn.stage, drawn.progress);
        frame = drawn.stage === "done" ? 0 : requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
  };
}

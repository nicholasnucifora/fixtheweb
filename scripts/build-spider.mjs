// Assembles the spider from its separately exported parts into one SVG where
// every part shares the same 596×401 space:
//
//   npm run build:spider
//
// Parts in design/spider/parts/ may be exported cropped to their own bounds.
// Each one is placed by lining its points up with the full traced spider
// (design/spider/reference/spider-full.svg). A part exported on the full
// 596×401 canvas is used as-is, so a redrawn part should be exported that way.
//
// Legs get a data-pivot: the middle of the straight cut where they meet the body.

import { readFileSync, writeFileSync } from "node:fs";

const PARTS = "design/spider/parts/";
const REFERENCE = "design/spider/reference/spider-full.svg";
const OUT = "src/assets/spider/spider.svg";
const [WIDTH, HEIGHT] = [596, 401];
const INK = "#1B1E29";
const WHITE = "#FFFFFF";

const legs = {
  L1: "leg-left-1.svg", L2: "leg-left-2.svg", L3: "leg-left-3.svg",
  R1: "leg-right-1.svg", R2: "leg-right-2.svg", R3: "leg-right-3.svg",
};

/** First path's d, plus the file's viewBox size. Duplicate paths (same d) are ignored. */
function load(file) {
  const svg = readFileSync(file, "utf8");
  const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  return { d: svg.match(/ d="([^"]+)"/)[1], w, h };
}

/** Parses an absolute M/L/C/Z path into commands with numeric args. */
function parse(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  const out = [];
  for (const t of tokens) {
    if (/[a-zA-Z]/.test(t)) {
      if (!"MLCZ".includes(t)) throw new Error(`Unsupported path command "${t}" (export with absolute M/L/C/Z only)`);
      out.push({ cmd: t, args: [] });
    } else out[out.length - 1].args.push(Number(t));
  }
  return out;
}

const points = (cmds) => cmds.flatMap(({ args }) => args.flatMap((_, i) => (i % 2 ? [] : [[args[i], args[i + 1]]])));
const near = (a, b, tol) => Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol;

/** Offset that lines the part's points up with the most reference points. */
function placement(name, part, refPoints) {
  if (part.w === WIDTH && part.h === HEIGHT) return [0, 0];
  const own = points(parse(part.d));
  let best = { offset: null, hits: 0 };
  for (const p of own) {
    for (const r of refPoints) {
      const offset = [r[0] - p[0], r[1] - p[1]];
      const hits = own.filter((q) => refPoints.some((s) => near([q[0] + offset[0], q[1] + offset[1]], s, 0.01))).length;
      if (hits > best.hits) best = { offset, hits };
    }
  }
  if (best.hits < 4) throw new Error(`${name}: couldn't line it up with the reference spider. Export it on the full ${WIDTH}×${HEIGHT} canvas.`);
  return best.offset;
}

const round = (n) => +n.toFixed(3);
const shift = (cmds, [dx, dy]) =>
  cmds.map(({ cmd, args }) => ({ cmd, args: args.map((v, i) => round(v + (i % 2 ? dy : dx))) }));
const serialize = (cmds) => cmds.map(({ cmd, args }) => cmd + args.join(" ")).join("");

const refPoints = points(parse(load(REFERENCE).d));
const placed = {};
const place = (name, file) => {
  const part = load(PARTS + file);
  const offset = placement(name, part, refPoints);
  placed[name] = shift(parse(part.d), offset);
  console.log(`${name.padEnd(10)} ${file.padEnd(18)} offset ${offset.map(round).join(", ")}`);
};

place("body", "body.svg");
place("eyeLeft", "eye-left.svg");
place("eyeRight", "eye-right.svg");
place("pupilLeft", "pupil-left.svg");
place("pupilRight", "pupil-right.svg");
place("mouth", "mouth-smile.svg");
for (const [id, file] of Object.entries(legs)) place(id, file);

// Hip pivot: the middle of the leg's longest straight edge, which is the cut where it meets the body.
const bodyPoints = points(placed.body);
const gapToBody = (p) => Math.min(...bodyPoints.map((b) => Math.hypot(p[0] - b[0], p[1] - b[1])));
const pivots = {};
for (const id of Object.keys(legs)) {
  let cut = null;
  let at = [0, 0];
  for (const { cmd, args } of placed[id]) {
    const end = args.length ? [args[args.length - 2], args[args.length - 1]] : at;
    const length = Math.hypot(end[0] - at[0], end[1] - at[1]);
    if (cmd === "L" && (!cut || length > cut.length)) cut = { from: at, to: end, length };
    at = end;
  }
  if (!cut) throw new Error(`${id}: no straight cut edge found where it meets the body`);
  pivots[id] = [round((cut.from[0] + cut.to[0]) / 2), round((cut.from[1] + cut.to[1]) / 2)];
  const gaps = [gapToBody(cut.from), gapToBody(cut.to)].map((g) => g.toFixed(2)).join(" / ");
  console.log(`${id} pivot ${pivots[id].join(", ")}  (cut ends are ${gaps} from the body outline)`);
}

const legPaths = Object.keys(legs)
  .map((id) => `<path data-leg="${id}" data-pivot="${pivots[id].join(" ")}" d="${serialize(placed[id])}" fill="${INK}"/>`)
  .join("\n");

const svg = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
<g data-part="legs">
${legPaths}
</g>
<path data-part="body" d="${serialize(placed.body)}" fill="${INK}"/>
<g data-part="face">
<g data-part="eye" data-side="left">
<path data-part="eye-white" d="${serialize(placed.eyeLeft)}" fill="${WHITE}"/>
<path data-part="pupil" d="${serialize(placed.pupilLeft)}" fill="${INK}"/>
</g>
<g data-part="eye" data-side="right">
<path data-part="eye-white" d="${serialize(placed.eyeRight)}" fill="${WHITE}"/>
<path data-part="pupil" d="${serialize(placed.pupilRight)}" fill="${INK}"/>
</g>
<path data-part="mouth" d="${serialize(placed.mouth)}" fill="${WHITE}"/>
</g>
</svg>
`;
writeFileSync(OUT, svg);
console.log(`wrote ${OUT}`);

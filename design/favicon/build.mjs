// Generates favicon variants + a preview page from the source spider SVG.
// Run: node design/favicon/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const src = readFileSync(join(root, "FTW_favicon_attempt1.svg"), "utf8");

const NAVY = "#1B1E29";
const TEAL = "#6AC7A7";
const WHITE = "#FFFFFF";

const fullD = src.match(/ d="([^"]+)"/)[1];

// Cut the string (thread) off the top of the outer contour.
const STRING_START = "M483.435 1.411C483.137 2.187 482.814 67.775 482.716 147.161L482.539 291.5";
const STRING_END_FROM = "L523.693 264.121";
const STRING_END_TO = "483.435 1.411Z";
if (!fullD.startsWith(STRING_START)) throw new Error("string start not found");
const endFrom = fullD.indexOf(STRING_END_FROM);
const endTo = fullD.indexOf(STRING_END_TO) + STRING_END_TO.length;
if (endFrom < 0 || endTo < endFrom) throw new Error("string end not found");
const noStringD = "M482.539 291.5" + fullD.slice(STRING_START.length, endFrom) + "Z" + fullD.slice(endTo);

// Eye sockets are evenodd holes; these fill them so the eyes read on any background.
const eyeWhites = (fill) =>
  `<circle cx="384.5" cy="564.5" r="104" fill="${fill}"/><circle cx="616.5" cy="564.5" r="104" fill="${fill}"/>`;

const path = (d, fill) => `<path fill-rule="evenodd" clip-rule="evenodd" d="${d}" fill="${fill}"/>`;

// Each variant: a square viewBox + body(scheme) -> inner SVG markup.
const variants = [
  {
    id: "a-original",
    label: "A. As drawn (with string)",
    note: "Reference. Letterboxed to a square, so the spider is small and the string is a hairline.",
    viewBox: "0 -79.5 1004 1004",
    body: (s) => path(fullD, s.ink),
  },
  {
    id: "b-no-string",
    label: "B. String removed",
    note: "Same art, string cut. Still 1.8:1 wide, so ~45% of the square is empty.",
    viewBox: "-10 56.25 1024 1024",
    body: (s) => eyeWhites(s.eye) + path(noStringD, s.ink),
  },
  {
    id: "c-face-crop",
    label: "C. Tight crop (legs bleed off)",
    note: "Crops to the body so eyes + smile are ~2x bigger. Legs run off the edges.",
    viewBox: "170 236 664 664",
    body: (s) => eyeWhites(s.eye) + path(noStringD, s.ink),
  },
  {
    id: "d-badge",
    label: "D. Teal badge",
    note: "Rounded teal tile, navy spider. Same look in light and dark tabs.",
    viewBox: "0 0 1200 1200",
    fixed: true,
    body: () =>
      `<rect width="1200" height="1200" rx="270" fill="${TEAL}"/>` +
      `<g transform="translate(600 600) scale(1.02) translate(-502 -568.25)">${eyeWhites(WHITE)}${path(noStringD, NAVY)}</g>`,
  },
];

const LIGHT = { ink: NAVY, eye: WHITE };
const DARK = { ink: TEAL, eye: WHITE };

const svg = (v, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.viewBox}">${inner}</svg>`;

// Production-style file: one SVG that flips colours with the browser theme.
const adaptive = (v) => {
  if (v.fixed) return svg(v, v.body(LIGHT));
  const inner = v.body({ ink: "var(--ink)", eye: "var(--eye)" })
    .replaceAll('fill="var(--ink)"', 'class="ink"')
    .replaceAll('fill="var(--eye)"', 'class="eye"');
  const style = `<style>.ink{fill:${LIGHT.ink}}.eye{fill:${LIGHT.eye}}@media (prefers-color-scheme:dark){.ink{fill:${DARK.ink}}.eye{fill:${DARK.eye}}}</style>`;
  return svg(v, style + inner);
};

const outDir = join(here, "variants");
mkdirSync(outDir, { recursive: true });
for (const v of variants) writeFileSync(join(outDir, `${v.id}.svg`), adaptive(v) + "\n");

const uri = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);

const rows = variants
  .map((v) => {
    const light = uri(svg(v, v.body(LIGHT)));
    const dark = uri(svg(v, v.body(DARK)));
    const sizes = [16, 32, 48, 64];
    return `
<section>
  <h2>${v.label}</h2>
  <p class="note">${v.note} <code>variants/${v.id}.svg</code></p>
  <div class="grid">
    <div class="tabs light"><div class="tab"><img src="${light}" width="16" height="16" alt=""><span>Fix the Web</span></div><div class="tab off"><span>New tab</span></div></div>
    <div class="tabs dark"><div class="tab"><img src="${dark}" width="16" height="16" alt=""><span>Fix the Web</span></div><div class="tab off"><span>New tab</span></div></div>
    <div class="sizes light">${sizes.map((n) => `<img src="${light}" width="${n}" height="${n}" alt="">`).join("")}</div>
    <div class="sizes dark">${sizes.map((n) => `<img src="${dark}" width="${n}" height="${n}" alt="">`).join("")}</div>
    <div class="px light"><canvas data-src="${light}" data-n="16"></canvas><canvas data-src="${light}" data-n="32"></canvas><span>true 16px / 32px, blown up</span></div>
    <div class="px dark"><canvas data-src="${dark}" data-n="16"></canvas><canvas data-src="${dark}" data-n="32"></canvas></div>
    <div class="touch"><img src="${v.fixed ? light : uri(svg(v, `<rect x="-2000" y="-2000" width="5000" height="5000" fill="${TEAL}"/>` + v.body({ ink: NAVY, eye: WHITE })))}" width="90" height="90" alt=""><span>iOS home screen (180px, needs a solid bg)</span></div>
  </div>
</section>`;
  })
  .join("\n");

const html = `<!doctype html>
<meta charset="utf-8">
<title>Fix the Web favicon preview</title>
<link rel="icon" href="../../public/favicon.svg" type="image/svg+xml">
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 24px; background: #fafafa; color: ${NAVY}; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 0; }
  .note { margin: 2px 0 10px; color: #555; }
  section { background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 14px 16px; margin: 0 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .light { background: #dee1e6; } .dark { background: #202124; color: #e8eaed; }
  .tabs { display: flex; gap: 2px; padding: 8px 8px 0; border-radius: 6px; }
  .tab { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px 8px 0 0; font-size: 12px; width: 150px; }
  .light .tab { background: #fff; } .dark .tab { background: #35363a; }
  .tab.off { background: transparent; opacity: .7; }
  .sizes, .px { display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 6px; font-size: 12px; }
  canvas { width: 64px; height: 64px; image-rendering: pixelated; }
  .touch { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; font-size: 12px; color: #555; }
  .touch img { border-radius: 20px; }
</style>
<h1>Favicon preview</h1>
<p class="note">Left column = light browser chrome, right = dark. Tab strip and pixel views are what matter most. Regenerate with <code>node design/favicon/build.mjs</code>.</p>
${rows}
<script>
  for (const c of document.querySelectorAll("canvas")) {
    const n = +c.dataset.n, img = new Image();
    c.width = c.height = n;
    img.onload = () => c.getContext("2d").drawImage(img, 0, 0, n, n);
    img.src = c.dataset.src;
  }
</script>
`;
writeFileSync(join(here, "preview.html"), html);
console.log(`wrote ${variants.length} variants + preview.html`);

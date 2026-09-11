// Generates favicon options + a preview page from the source spider SVG.
// Run: npm run favicon, then open design/favicon/preview.html
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const SOURCE = "FTW_favicon_attempt2.svg";
// Set to an option id (a variants/*.svg name) to ship it as public/favicon.svg; null leaves the live favicon as is.
const FAVICON = null;

const NAVY = "#1B1E29";
const TEAL = "#6AC7A7";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#F1EFE8";

const src = readFileSync(join(root, SOURCE), "utf8");
const D = src.match(/ d="([^"]+)"/)[1];
const [W, H] = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
const CX = W / 2;
const CY = H / 2;
// Top-centre of the head in source units, where a string attaches. Specific to attempt2.
const HEAD_X = 246;
// ~1px at 16px for a ~560-unit icon.
const STRING_W = 30;
const WEB_W = 22;

// The first subpath is the outer silhouette; the rest are eye/mouth holes and pupils.
const SILHOUETTE = D.slice(0, D.indexOf("Z") + 1);

const svg = (viewBox, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
const box = (S, x0, y0) => `${x0} ${y0} ${S} ${S}`;
const centred = (S) => box(S, CX - S / 2, CY - S / 2);

// ---- Plain spider: light mode is the bare spider filling the square edge to edge; ----
// ---- each treatment only changes dark mode.                                        ----

// White silhouette underneath fills the eye/mouth holes (the source leaves them transparent).
const PLAIN_ART = `<path d="${SILHOUETTE}" fill="${WHITE}"/><path fill-rule="evenodd" d="${D}" fill="${NAVY}"/>`;

// Farthest silhouette point from the centre (control points included, so slightly generous).
const reach = () => {
  const n = SILHOUETTE.match(/-?[\d.]+/g).map(Number);
  let max = 0;
  for (let i = 0; i + 1 < n.length; i += 2) max = Math.max(max, Math.hypot(n[i] - CX, n[i + 1] - CY));
  return max;
};

const treatments = [
  { id: "none", label: "No outline", outline: 0 },
  { id: "outline-025", label: "Outline ¼px", outline: 0.25 },
  { id: "outline-05", label: "Outline ½px", outline: 0.5 },
  { id: "outline-075", label: "Outline ¾px", outline: 0.75 },
  { id: "outline", label: "Outline 1px", outline: 1 },
  { id: "circle", label: "Off-white circle" },
  { id: "tile", label: "Off-white tile" },
];

// The viewBox is the dark layout. Light mode scales the art up to fill the square via the
// transform attribute, which `.art{transform:none}` cancels in dark mode.
const plainOption = (t) => {
  const fit = W + 8; // spider width plus a hair, so leg tips never touch the edge
  const isOutline = "outline" in t;
  // "Outline Npx" is N px each side at 16px: S = fit + 2r with r = N·S/16.
  const S = Math.round(isOutline ? fit / (1 - t.outline / 8) : t.id === "circle" ? 2 * reach() * 1.04 : W * 1.12);
  const [x0, y0] = [CX - S / 2, CY - S / 2];
  const k = +(S / fit).toFixed(3);
  const darkEl = isOutline
    ? t.outline
      ? `<path class="dark" d="${SILHOUETTE}" fill="${WHITE}" stroke="${WHITE}" stroke-width="${((t.outline * S) / 8).toFixed(1)}" stroke-linejoin="round"/>`
      : ""
    : t.id === "circle"
      ? `<circle class="dark" cx="${CX}" cy="${CY}" r="${S / 2}" fill="${OFF_WHITE}"/>`
      : `<rect class="dark" x="${x0}" y="${y0}" width="${S}" height="${S}" rx="${Math.round(S * 0.22)}" fill="${OFF_WHITE}"/>`;
  const art = (scaled) =>
    `<g class="art"${scaled ? ` transform="translate(${CX} ${CY}) scale(${k}) translate(${-CX} ${-CY})"` : ""}>${PLAIN_ART}</g>`;
  const vb = box(S, x0, y0);
  return {
    id: `plain-${t.id}`,
    label: t.label,
    light: svg(vb, art(true)),
    dark: svg(vb, darkEl + art(false)),
    adaptive: svg(
      vb,
      `<style>.dark{display:none}@media (prefers-color-scheme:dark){.dark{display:inline}.art{transform:none}}</style>` +
        darkEl +
        art(true),
    ),
  };
};

const plain = treatments.map(plainOption);

// ---- Other directions --------------------------------------------------------------

const thread = (len) =>
  `<rect x="${HEAD_X - STRING_W / 2}" y="${-len}" width="${STRING_W}" height="${len + 40}"/>`;

// White underlay fills the eye/mouth holes; its stroke grows into a sticker outline when halo > 0.
const spider = (halo, { string = 0 } = {}) => {
  const t = string ? thread(string) : "";
  return (
    `<g fill="${WHITE}" stroke="${WHITE}" stroke-width="${halo}" stroke-linejoin="round"><path d="${SILHOUETTE}"/>${t}</g>` +
    (t ? `<g fill="${NAVY}">${t}</g>` : "") +
    `<path fill-rule="evenodd" clip-rule="evenodd" d="${D}" fill="${NAVY}"/>`
  );
};

// Spider web centred on (cx, cy): spokes at `angles` (degrees, y-down), rings sagging
// toward the centre. `open` drops the first/last spoke so corner webs don't hug the edges.
const web = (cx, cy, angles, radii, spokeLen, { open = false } = {}) => {
  const pt = (r, a) =>
    [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)].map((n) => n.toFixed(1)).join(" ");
  const spokes = (open ? angles.slice(1, -1) : angles).map((a) => `M${cx} ${cy}L${pt(spokeLen, a)}`).join("");
  const rings = radii
    .map((r) => `M${pt(r, angles[0])}` + angles.slice(1).map((a, i) => `Q${pt(r * 0.86, (a + angles[i]) / 2)} ${pt(r, a)}`).join(""))
    .join("");
  return `<path d="${spokes}${rings}" fill="none" stroke="${TEAL}" stroke-width="${WEB_W}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

// Spider sits at the bottom with S/16 of room below; the space above is for the string.
const hangingTop = (S) => H + S / 16 - S;
const hanging = (S) => box(S, CX - S / 2, hangingTop(S));

const others = [
  {
    id: "plain-zoom",
    group: "Cropped",
    label: "Plain, zoomed",
    note: "Bigger face; the leg tips run off the edges.",
    S: 440,
    viewBox: centred(440),
    body: (h) => spider(h),
  },
  {
    id: "string",
    group: "String",
    label: "Hanging on a string",
    note: "String runs off the top edge and fills the empty space above.",
    S: 564,
    viewBox: hanging(564),
    body: (h) => spider(h, { string: 220 }),
  },
  {
    id: "swing",
    group: "String",
    label: "Swinging",
    note: "Tilted 14°, like the logo spider mid-swing.",
    S: 660,
    viewBox: box(660, 0, 0),
    body: (h) => `<g transform="translate(330 372) rotate(14) translate(${-CX} ${-CY})">${spider(h, { string: 700 })}</g>`,
  },
  {
    id: "string-webs",
    group: "Web",
    label: "String + corner webs",
    note: "Teal cobwebs in the top corners. Likely too fine at 16px.",
    S: 564,
    viewBox: hanging(564),
    body: (h) => {
      const x0 = CX - 282;
      const y0 = hangingTop(564);
      return (
        web(x0, y0, [0, 15, 45, 75, 90], [70, 135, 200], 230, { open: true }) +
        web(x0 + 564, y0, [90, 105, 135, 165, 180], [70, 135, 200], 230, { open: true }) +
        spider(h, { string: 220 })
      );
    },
  },
  {
    id: "on-web",
    group: "Web",
    label: "Sitting on a web",
    note: "Teal web behind the spider, running off the edges.",
    S: 564,
    viewBox: centred(564),
    body: (h) => web(CX, CY, [0, 45, 90, 135, 180, 225, 270, 315, 360], [215, 275], 420) + spider(h),
  },
  {
    id: "tile-teal",
    group: "Box",
    fixed: true,
    label: "Teal tile",
    note: "Identical in light and dark.",
    S: 600,
    viewBox: box(600, 0, 0),
    body: () => `<rect width="600" height="600" rx="132" fill="${TEAL}"/><g transform="translate(53.5 113)">${spider(0)}</g>`,
  },
  {
    id: "tile-teal-string",
    group: "Box",
    fixed: true,
    label: "Teal tile + string",
    note: "Spider hanging inside the tile.",
    S: 640,
    viewBox: box(640, 0, 0),
    body: () =>
      `<rect width="640" height="640" rx="140" fill="${TEAL}"/><g transform="translate(73.5 210)">${spider(0, { string: 260 })}</g>`,
  },
  {
    id: "circle-teal",
    group: "Box",
    fixed: true,
    label: "Teal circle",
    note: "Round badge instead of a tile.",
    S: 580,
    viewBox: box(580, 0, 0),
    body: () => `<circle cx="290" cy="290" r="290" fill="${TEAL}"/><g transform="translate(43.5 103)">${spider(0)}</g>`,
  },
  {
    id: "tile-navy",
    group: "Box",
    fixed: true,
    label: "Navy tile",
    note: "Navy tile, spider with the white sticker outline.",
    S: 640,
    viewBox: box(640, 0, 0),
    body: () => `<rect width="640" height="640" rx="140" fill="${NAVY}"/><g transform="translate(73.5 133)">${spider(60)}</g>`,
  },
];

// White sticker outline on dark chrome: S/8 total ≈ 1px each side at 16px.
const halo = (S) => Math.round(S / 8);
const otherOption = (v) => ({
  id: v.id,
  group: v.group,
  label: v.label,
  note: v.note + (v.fixed ? "" : " Dark mode adds the white outline."),
  light: svg(v.viewBox, v.body(0)),
  dark: svg(v.viewBox, v.body(halo(v.S))),
  adaptive: v.fixed
    ? svg(v.viewBox, v.body(0))
    : svg(
        v.viewBox,
        `<style>.halo{stroke-width:0}@media (prefers-color-scheme:dark){.halo{stroke-width:${halo(v.S)}px}}</style>` +
          v.body("HALO").replaceAll('stroke-width="HALO"', 'class="halo"'),
      ),
});

// ---- Output --------------------------------------------------------------------------

const options = [...plain, ...others.map(otherOption)];

const outDir = join(here, "variants");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const o of options) writeFileSync(join(outDir, `${o.id}.svg`), o.adaptive + "\n");

if (FAVICON) {
  const o = options.find((o) => o.id === FAVICON);
  if (!o) throw new Error(`unknown FAVICON ${FAVICON}`);
  writeFileSync(join(root, "public", "favicon.svg"), o.adaptive + "\n");
}

// The live favicon, split into forced light/dark renders by unwrapping its media query.
const live = readFileSync(join(root, "public", "favicon.svg"), "utf8").trim();
const DARK_MQ = /@media \(prefers-color-scheme:dark\)\{(.*)\}<\/style>/;

const icons = [
  ...options.filter((o) => o.group),
  {
    id: "live",
    group: "Current",
    label: "Live favicon",
    note: "What public/favicon.svg ships today.",
    light: live.replace(DARK_MQ, "</style>"),
    dark: live.replace(DARK_MQ, "$1</style>"),
    adaptive: live,
  },
];

const uri = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
const imgs = (s, sizes) => sizes.map((n) => `<img src="${uri(s)}" width="${n}" height="${n}" alt="">`).join("");
const pixel = (s, n = 16) => `<canvas data-src="${uri(s)}" data-n="${n}"></canvas>`;
const tryButton = (icon, label = "Try as tab icon") => `<button data-icon="${uri(icon)}">${label}</button>`;

const matrixCell = (s, mode, o) =>
  `<td class="${mode}"><div class="chip"><img src="${uri(s)}" width="16" height="16" alt=""><span>Fix the Web</span></div>` +
  `<div class="row">${imgs(s, [32])}${pixel(s)}</div>` +
  (o ? `<div class="row"><code>${o.id}</code>${tryButton(o.adaptive, "Try")}</div>` : "") +
  `</td>`;

const matrixTable = `<div class="scroll"><table class="matrix">
<thead><tr><th>Light</th>${plain.map((o) => `<th>Dark<br><small>${o.label}</small></th>`).join("")}</tr></thead>
<tbody><tr>${matrixCell(plain[0].light, "light")}${plain.map((o) => matrixCell(o.dark, "dark", o)).join("")}</tr></tbody>
</table></div>`;

const tabBar = (mode) =>
  `<div class="bar ${mode}">${icons
    .map((t) => `<div class="tab"><img src="${uri(t[mode])}" width="16" height="16" alt=""><span>${t.label}</span></div>`)
    .join("")}</div>`;

const strip = (mode) =>
  `<div class="strip ${mode}">${icons
    .map((t) => `<figure>${pixel(t[mode])}<figcaption>${t.label}</figcaption></figure>`)
    .join("")}</div>`;

const card = (t) => `
<section class="card">
  <header><h3>${t.label}</h3>${tryButton(t.adaptive)}</header>
  <p class="note">${t.note} <code>${t.id === "live" ? "public/favicon.svg" : `variants/${t.id}.svg`}</code></p>
  <div class="panel light">${imgs(t.light, [16, 32, 48, 64])}${pixel(t.light)}${pixel(t.light, 32)}</div>
  <div class="panel dark">${imgs(t.dark, [16, 32, 48, 64])}${pixel(t.dark)}${pixel(t.dark, 32)}</div>
</section>`;

const groups = [...new Set(icons.map((t) => t.group))];

const html = `<!doctype html>
<meta charset="utf-8">
<title>Fix the Web favicon preview</title>
<link rel="icon" href="../../public/favicon.svg" type="image/svg+xml">
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 24px auto; max-width: 1200px; padding: 0 24px; background: #f6f6f3; color: ${NAVY}; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #666; margin: 28px 0 10px; }
  h3 { font-size: 15px; margin: 0; }
  .note { margin: 4px 0 10px; color: #555; }
  code { font-size: 11px; }
  .light { background: #dee1e6; } .dark { background: #202124; color: #e8eaed; }
  .scroll { overflow-x: auto; }
  .matrix { border-collapse: separate; border-spacing: 6px; }
  .matrix th { font-size: 12px; text-align: left; vertical-align: bottom; padding: 0 4px; white-space: nowrap; }
  .matrix th small { font-weight: 400; color: #666; }
  .matrix td { padding: 10px; border-radius: 8px; vertical-align: top; }
  .chip { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px; font-size: 11px; width: 104px; }
  .light .chip { background: #fff; } .dark .chip { background: #35363a; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
  .matrix canvas { width: 48px; height: 48px; }
  .bar { display: flex; flex-wrap: wrap; gap: 2px; padding: 8px; border-radius: 8px; margin-bottom: 8px; }
  .tab { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; font-size: 12px; width: 150px; }
  .tab span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .light .tab { background: #fff; } .dark .tab { background: #35363a; }
  .strip { display: flex; flex-wrap: wrap; gap: 14px; padding: 12px; border-radius: 8px; margin-bottom: 8px; }
  figure { margin: 0; width: 76px; text-align: center; font-size: 11px; }
  figure canvas { width: 64px; height: 64px; }
  canvas { width: 48px; height: 48px; image-rendering: pixelated; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(460px, 100%), 1fr)); gap: 12px; }
  .card { background: #fff; border: 1px solid #e3e3de; border-radius: 12px; padding: 14px 16px; }
  .card header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .panel { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 12px; border-radius: 8px; margin-top: 6px; }
  button { font: inherit; font-size: 12px; border: 1px solid #ccc; background: #fff; color: ${NAVY}; border-radius: 99px; padding: 3px 10px; cursor: pointer; }
  button.on { background: ${TEAL}; border-color: ${TEAL}; }
</style>
<h1>Favicon preview</h1>
<p class="note">Source: <code>${SOURCE}</code>. "Try" swaps this page's real tab icon (it follows your OS light/dark setting). Regenerate with <code>npm run favicon</code>.</p>

<h2>Plain spider: pick a dark mode</h2>
<p class="note">Light mode is the bare spider filling the square. Outline widths are per side at 16px; on a high-DPI screen the tab icon is drawn with twice the pixels, so ½px lands as one crisp device pixel. Thinner outlines leave more room, so the spider grows. Each cell: tab at real size, 32px, and true 16px blown up.</p>
${matrixTable}

<h2>Other directions, at real size in a tab strip</h2>
${tabBar("light")}
${tabBar("dark")}

<h2>Other directions, true 16px blown up</h2>
${strip("light")}
${strip("dark")}

${groups.map((g) => `<h2>${g}</h2><div class="cards">${icons.filter((t) => t.group === g).map(card).join("")}</div>`).join("\n")}

<script>
  for (const c of document.querySelectorAll("canvas")) {
    const n = +c.dataset.n, img = new Image();
    c.width = c.height = n;
    img.onload = () => c.getContext("2d").drawImage(img, 0, 0, n, n);
    img.src = c.dataset.src;
  }
  const link = document.querySelector("link[rel=icon]");
  for (const b of document.querySelectorAll("button[data-icon]")) {
    b.onclick = () => {
      link.href = b.dataset.icon;
      document.querySelectorAll("button.on").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
    };
  }
</script>
`;
writeFileSync(join(here, "preview.html"), html);
console.log(`wrote ${options.length} options + preview.html${FAVICON ? `, favicon = ${FAVICON}` : ""}`);

# fixtheweb

Astro site for Fix the Web.

## Develop

```bash
npm install
npm run dev
```

## Deploy (Cloudflare Workers)

Static assets only for now; config is in `wrangler.jsonc`.

- Workers & Pages → Create → Import a repository
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node version comes from `.nvmrc` (Astro needs 22.12+)

## Brand assets

- `src/assets/brand/fixtheweb-logo.svg` — main logo. Navy paths use `currentColor` so the page text colour drives light/dark mode; "the" stays teal.
- `public/favicon.svg` — favicon. Light mode: the navy spider filling the square. Dark mode: adds a ½px white outline so it stays visible on dark tab bars, with bigger pupils so the eyes read at 16px.
- `public/favicon.ico` — 16/32/48px fallback for browsers without SVG favicons (the dark-mode design, since it reads on light and dark UI).
- `public/apple-touch-icon.png` — 180px iOS home-screen icon: the light-mode spider on the site's background.
- Both PNG-based files are rendered from `favicon.svg`; regenerate them if the favicon changes.
- Each letter path in the logo has a `data-glyph` attribute (`f`, `i`, `i-dot`, `x`, `the`, `w`, `e`, `b`) so effects can target a letter by selector.

## Spider string

A string hangs from the bottom of the logo's "b" with a draggable spider on the end. By default it's a placeholder circle; `look.showArt` swaps in `public/favicon.svg` as a static stand-in until the rigged spider is ready. `src/components/SpiderString.astro` takes an `anchor` selector for the glyph to hang from; the logic is in `src/scripts/spider-string/`:

- `config.ts`: every feel value with its default, range and description (length, weight, swing, sway, drag, pluck, particles…). Sizes are in multiples of the anchor glyph's height, so it all scales with the logo.
- `tune.ts`: live tuning panel built from `config.ts`, with String and Spidey tabs. Open the page with `?tune` (e.g. `http://localhost:4321/?tune`). Tweaks are saved in that browser and only apply with `?tune`; "Copy changes" gives JSON to bake into `config.ts`.
- `anchor.ts`: finds the glyph's lowest point and tracks it on the page every frame.
- `rope.ts`: Verlet string physics (no DOM).
- `drag.ts`: grab/drag/release of the spider or the string, and blocking text selection while held.
- `pluck.ts`: pointer crossing the string → nudge + particle burst. `particles.ts` draws the dashes.
- `render.ts`: canvas drawing and spider positioning. `index.ts` wires it all into one loop.

The root element emits `spider:grab`, `spider:release` and `spider:pluck` events and sets `data-spider` / `data-string` (`idle|hover|held`) for styling.

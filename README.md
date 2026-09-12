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
- `design/spider/parts/` — the spider drawn as separate parts (body, each eye, each pupil, mouth, six legs). `design/spider/reference/` holds the traced full spider they were cut from.
- `src/assets/spider/spider.svg` — the parts assembled into one SVG. Generated: after changing a part, run `npm run build:spider`. Parts exported cropped are lined up with the reference automatically; a redrawn part should be exported on the full 596×401 canvas. Legs are numbered top to bottom (`L1`–`L3`, `R1`–`R3`, left/right as you look at it) and carry their hip pivot.
- Each letter path in the logo has a `data-glyph` attribute (`f`, `i`, `i-dot`, `x`, `the`, `w`, `e`, `b`) so effects can target a letter by selector.

## Spider string

A string hangs from the bottom of the logo's "b" with a draggable spider on the end. The spider is `src/assets/spider/spider.svg`, brought to life by `spider.ts`; the favicon can be swapped in (`look.showFavicon`) to compare. `src/components/SpiderString.astro` takes an `anchor` selector for the glyph to hang from; the logic is in `src/scripts/spider-string/`:

- `config.ts`: every feel value with its default, range and description (length, weight, swing, sway, drag, pluck, particles…). Sizes are in multiples of the anchor glyph's height, so it all scales with the logo.
- `tune.ts`: live tuning panel built from `config.ts`, with String and Spidey tabs. Open the page with `?tune` (e.g. `http://localhost:4321/?tune`). Tweaks are saved in that browser and only apply with `?tune`; "Copy changes" gives JSON to bake into `config.ts`.
- `anchor.ts`: finds the glyph's lowest point and tracks it on the page every frame.
- `rope.ts`: Verlet string physics (no DOM).
- `drag.ts`: grab/drag/release of the spider or the string. Dragging within reach lets the string go slack; past it the string gives less and less (a rubber band that shudders, then flings the spider on release). Also blocks text selection while held.
- `pluck.ts`: pointer crossing the string → nudge + particle burst. `particles.ts` draws the dashes.
- `spider.ts`: the spider, drawn onto the same canvas as the string so it stays crisp while it moves and turns (the SVG is only its source of shapes) — positioning and tilt, colours and outline, face and part placement (including mirrored eyes/pupils/legs), pupils following the cursor, breathing, spring-driven legs that swing and curl, and legs that react to the cursor coming near them (flinch, reach, curl, wiggle, wave or flick).
- `render.ts`: canvas drawing of the string and dashes. `index.ts` wires it all into one loop.

The root element emits `spider:grab`, `spider:release` and `spider:pluck` events and sets `data-spider` / `data-string` (`idle|hover|held`) for styling.

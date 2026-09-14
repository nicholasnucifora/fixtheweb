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

The root element emits `spider:grab`, `spider:release`, `spider:pluck` and `spider:eat` events and sets `data-spider` / `data-string` (`idle|hover|held`) for styling.

## Spider Den

`/den` (linked under the header's logo) has two views: **Dress up**, where you dress a spider up, and **The den**, where all your spiders live (below). Dress up has hats, eyewear, face bits, outfits, capes and wings, socks, full-body costumes, body colours and patterns, the thread's colour and a name. Snacks (a fly, ladybird, moth or cookie) are dragged to its mouth, and the tricks and moods play its animations. Whatever the main spider wears is saved in that browser and worn by every spider on the site: the one on the logo, the header's badge and the den's own.

- `wardrobe.ts`: the catalogue: every item, the colours they come in, and what unlocks the locked ones. Add an item here and draw it in `dress.ts`; the den lists it automatically.
- `dress.ts`: draws what it's wearing on the spider's canvas, layer by layer (behind the legs, on the legs, on the body, over the face, on top), in body units where the body is a circle of radius 1. Pieces that stick out get the spider's dark-mode outline; hats and dangly things wobble as it swings. A costume (ghost sheet, mummy, pumpkin, bumblebee, dino onesie, astronaut) has a piece in whichever layers it needs and covers up what's worn in the layers it hides; the ghost sheet is shaped round wherever the legs are, so it moves with them. `dressPiece` draws one item on its own, for dragging it out of the wardrobe.
- `look.ts`: what it's wearing (`worn`), what the den is trying on (`trying`), snacks eaten and unlocks, all in localStorage and kept in step across tabs.
- `figure.ts`: the spider standing still in a look, for the den's picture tiles.
- `src/pages/den.astro` and `src/scripts/den.ts`: the page, its two views, the spider picker, the picked spider's card and the wardrobe. The Dress up spider is a `SpiderString` with `stage` and `hook` (hanging from the web's hub down into a slot, and playable) and `tryOn`.
- `src/layouts/Base.astro` and `src/components/Header.astro`: the page shell and header both pages share.

Locked items can be tried on in the den but aren't saved until they're unlocked. Snack ones unlock by feeding it; `discord` and `newsletter` ones can't be earned yet. To unlock everything in your own browser, open any page with `?unlock-all` (`?lock-all` locks it again).

### The den

All your spiders, living on webs spun in a scene: a **tree**, an open **window** or a garden **fence** (switched at the top, and remembered). Nobody's picked to begin with. The **Wardrobe** button opens the wardrobe, and anything in it can be dragged onto any spider; you carry just the item, and with nobody picked its pictures show a plain spider. Press a spider (or use the picker) to pick it: its card shows how it's doing, and clicking in the wardrobe dresses it. Close the card, press Escape or press somewhere empty to let go. The **main spider** is the one worn all over the site: it glows, and has a star over it and in the picker. Any spider can be made the main one from its card.

- Webs are spun like real ones: anchor lines out to branches, the window frame or fence posts (some forking as they reach them), a frame between those, spokes, and a spiral following the frame's shape. Corners get cobwebs, and long bridge lines cross the gaps.
- Spiders walk the threads and the scenery itself, sit, nap, hunt down flies stuck in the webs, let themselves down on strings and climb back up, and jump between webs. Only webs catch a spider you let go of: branches, frames and posts aren't sticky, so it passes through them.
- Grab one and fling it. Threads within a free zone of where you let go don't touch it; past that, every thread it crosses slows it, and once it's slow enough it's caught. Put it down gently and it stays right where you let go if that's on a thread, or drops from there onto the first web below. Off the bottom or either side, it comes back round the other side.
- Pull a dangling spider past its string's reach and let go: the string snaps and it goes flying.
- Flies drift in and get stuck; drag one to a spider's mouth to feed it yourself (that counts toward unlocks).
- A grown-up that's well fed can lay eggs (from its card). The egg sac hatches into babies, which grow up as they eat and over time. Spiders get hungry, even while you're away; one left empty for long enough starves and floats away. The main spider never does.

The spiders are the site's own (`spider.ts`, `mood.ts`, `animation.ts`), so anything tuned on the home page with `?tune` applies to them too. What's only in the den is `src/scripts/den/`:

- `config.ts`: every den-only setting (webs, catching, habits, strings snapping, jumping, hunger, growing up, babies, dying, flies), tuned live at `/den?tune`. That panel also has buttons to send in a fly, feed or starve everyone, lay or hatch eggs, grow the babies up, rebuild the webs and start the den over, and a life speed for watching hours pass in seconds. Tweaks saved on the home page's panel apply at `/den?tune` too.
- `colony.ts`: every spider (look, age, growth, hunger, plumpness) and egg sacs, in localStorage, and which spider is picked (if any) and being dressed. The main spider's look is `look.ts`'s `worn`.
- `scenes.ts`: the tree, window and fence: their scenery, and the things in them webs are tied to and spiders walk along.
- `web.ts`: the webs as a graph of threads (and the scenery, as threads that aren't drawn): spinning them between the scene's things, the springy wobble, nearest thread, crossings and paths.
- `critter.ts`: one spider on the webs, and everything it does.
- `bugs.ts`: flies, moths and ladybirds, and snacks offered from the wardrobe.
- `world.ts`: the canvas, the loop, egg sacs, snapped strings, and grabbing things.

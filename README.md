# fixtheweb

Astro site for Fix the Web.

## Develop

```bash
npm install
npm run dev
```

The public build is a single, non-scrolling coming-soon screen: the Fix the Web logo and its
draggable spider. The new homepage, Villow case study, design/access brief, Ideas and About
are available only in `npm run dev`. Preview routes live in `src/previews/` and are registered only
by the development server; production builds do not emit those pages. Query parameters cannot
enable them on the public site. `npm run preview` shows the production coming-soon screen.
Homepage tuning is complete and `/?tune` has no controls. Den development tuning remains at `/old-pages/den?tune`.

### Per-page A/B previews

Open `http://127.0.0.1:4321/?preset=b` when running on port 4321. The preview bar switches
between pages and between **Preset A** and **Preset B**. Each page remembers its own selection
in this browser. Explicit `?preset=a` and `?preset=b` URLs override that page's saved choice.
B is the default on a first visit; browser back/forward and no-storage comparison links work.
The switch keeps a corresponding section in view where possible. Homepage design controls
also have separate A/B storage so changing a headline in B does not overwrite A.

A preserves the first implementation's content on Home, Villow and Design & access, except
for the requested removal of submission references. B
expands the mission, capabilities, proposals and specific contribution pathways in response
to Nicholas's supplied critique. Both share the navigation and comparison controls.

- `/ideas` — new page: A gives an overview; B explains each proposal, precedent and trade-off,
  including cross-device wellbeing, corrections, creator actions, recommendations, three AI
  concepts and authentic discussion. These are explicitly unbuilt proposals/open questions.
- `/about` — new page: A is a short introduction; B adds the broader story and preserves the
  full current personal message from the unpublished Villow About source.

The 14 November refinement makes B's opening and framing more direct, explains the practical
API and permission barriers, and removes the submission page and links from both presets.
The full founder message and detailed proposal data are unchanged. A subsequent Villow B
refinement puts the external website invitation first and focuses this page on design
principles, access, policy and evaluation. The 15 November opening presents Villow as
"Our blueprint for better social media", with its own Varela Round wordmark. After consultation
with the Villow preview chat, B now owns the transferable principles rather than repeating the
product tour: one interactive story about attention incentives and personal agency, eight
principles across four themes, and optional short connections to Villow. The bold incentive
illustration replaces the earlier box-and-arrow comparison. Detailed proposals remain on Ideas. Villow A remains the original
comparison.
The prior B copy is saved in `previews/preset-comparison/b-before-refinement-2026-11-14/`;
the edit record is in `previews/preset-comparison/README.md`.

The expanded content map and draft are in
`docs/strategy/2026-11-12-preset-b-content-map.md`. Preset metadata is in
`src/lib/page-presets.ts`; the comparison UI and storage behavior are in
`src/components/PresetSwitch.astro` and `PreviewState.astro`. Existing A bodies are retained
as `home-a.astro`, `villow-a.astro` and `design-access-a.astro`; corresponding B files are separate.
Development routes use request rendering to read the preset query. Production remains static
and contains neither these routes nor the preview controls.

### First implementation (Preset A)

The local homepage now introduces the mission, Villow, three design questions, the path from
building to learning and platform adoption, access, and ways to contribute. Its finite-feed
illustration uses fictional videos and local-only interaction. It makes no account changes.

- `/work/villow` — the first-project case study and expandable questions about finite feeds,
  worthwhile reflection and usable subscription controls.
- `/notes/design-and-access` — the independent experimentation proposal and source links.
- `/old-pages` — the Den and Life calculator, retained separately for possible later use or removal.
  The old `/den` and `/life` addresses still work; their new archive routes are
  `/old-pages/den` and `/old-pages/life`. Their underlying behavior and browser data are retained.

The archive is a local review area. These routes and their assets
are excluded from the public build. `scripts/test-site-visibility.mjs` checks the separation.
The direction and evidence behind the first implementation are recorded in `docs/strategy/`.

### Local design playground

The homepage's **Design** button opens options on that same page: a side panel on desktop and a
bottom panel on smaller screens. Changes apply immediately and save in this browser, without a
separate preview or Apply step. Old `/design` bookmarks redirect to the homepage with its panel open.
Options include message presets, editable copy and button text, string length (60–260 px, default
150), three spider sizes, three type treatments, and an eight-icon reference.
The header uses the original full Fix the Web wordmark, without a second spider.
Only its background fades in as you scroll. The large centred wordmark is the hero's heading, followed
by the existing headline, a short explanation and an **Explore the work** button that scrolls to
Villow. A separate Get involved link leads to contribution routes. Neither submits a signup.
A separate down-arrow link also encourages scrolling.
The main spider is larger, with a longer thread, using the existing stage rig and simulation.
Canvas scaling follows current CSS dimensions and device pixel ratio each frame, keeping the
rendered spider aligned with its grab target through browser zoom and resizing.

The navigation sun/moon switch controls light and dark mode for every development page.
It follows the device until selected, then remembers the choice separately from design preferences
under `ftw.color-mode.v1`. Other tabs, canvas spiders and Villow mark follow that choice.
The revised opening uses the v3 design preference key, retaining saved visual preferences and
custom copy. The former default “Join the campaign” label updates to “Explore the work”.
No play caption or slogan row appears.

The playground and its bundled Fredoka/Nunito fonts (SIL OFL licences alongside them in
`src/assets/fonts/`) are development-only. `/design` is not emitted by production builds.
Development stays local unless explicitly requested otherwise: no pushing or publishing.

## Den coupon

In the development preview, den settings and spider dress-up share one paid-feature unlock. The den, spider details and feeding
remain available without it. The coupon prompt is accessible from Dress up, Wardrobe and the settings
gear. Existing item-specific wardrobe unlocks still apply.

The Cloudflare Worker (`worker/index.mjs`) verifies coupons at `/api/den/access`. It issues a signed,
host-only, Secure, HttpOnly, SameSite=Strict cookie, valid for one year. Browser storage never grants
access, and neither the coupon digest nor signing key is included in the public JavaScript. The
client rechecks access on load, focus and every minute while visible. Cookies must be enabled.

No coupon is active until these **Cloudflare Worker secrets** are configured:

- `DEN_COUPON_SHA256`: SHA-256 hex digest of the coupon after trimming, uppercasing and removing
  whitespace and dashes (`/[\s-]/g`). Use a long, randomly generated coupon.
- `DEN_SESSION_SECRET`: an independently generated random secret of at least 32 bytes, encoded as
  hex or base64. Keep it out of Git, public environment variables and build output.

Set these through Cloudflare's encrypted secret settings or `wrangler secret put`. Changing either
invalidates previous cookies. Five redemption attempts per minute per IP are allowed by the Worker
rate-limit binding; unavailable verification or rate limiting leaves access locked. Request bodies
are bounded, cross-site redemption is rejected and session responses must never be cached.

`npm run dev` serves the frontend only; without the Worker API, paid features stay locked. The
coupon backend is retained for the den's future release; a production build currently excludes the
den frontend. Never add real secrets to a test or example file. The automated tests use isolated,
test-only secrets without changing the site's configuration.

Production builds exclude `?tune`, `?unlock-all` and `?lock-all` debug behavior. `npm run build` also
generates `dist/_headers`, including exact hashes for Astro's inline scripts. This restricts scripts,
embedding, form destinations and browser permissions while preserving the site's dynamic CSS.

The simulation and wardrobe still run in the visitor's browser. Server verification prevents forged
cookies and the old localStorage shortcut; it is not DRM against someone rewriting their own client.
There is no payment processor, purchase ledger, per-customer coupon or single-use redemption system.

Run `npm test` for server/client access, forgery, expiry, rotation, CSRF, rate limiting and CSP checks.

## Deploy (Cloudflare Workers)

Static assets plus the coupon-verification Worker; config is in `wrangler.jsonc`.

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
- `src/assets/brand/villow-mark-*.svg` — Villow's mark, beside "Our work" on the home page, copied unchanged out of Villow's own icon kit (version 3, 2026-09-20). Six files: an `on-light` and an `on-dark` for each of the kit's three cuts, which differ in how the gap between the sail and the swoosh is handled at small sizes (plain = 33px and up, `small` = 21–32px, `micro` = 20px and under). `src/components/VillowMark.astro` picks the cut from the height it's drawn at and the palette with `prefers-color-scheme`, the same setting the page's own colours follow, since the site has no theme toggle of its own. Villow's `fixed` and `mono` versions aren't used here. These are Villow's, not ours: a size or palette that's missing has to come from their kit, not be made from these.

## Spider string

A string hangs from the bottom of the logo's "b" with a draggable spider on the end. The spider is `src/assets/spider/spider.svg`, brought to life by `spider.ts`; the favicon can be swapped in (`look.showFavicon`) to compare. `src/components/SpiderString.astro` takes an `anchor` selector for the glyph to hang from; the logic is in `src/scripts/spider-string/`:

- `config.ts`: every feel value with its default, range and description (length, weight, swing, sway, drag, pluck, particles…). Sizes are in multiples of the anchor glyph's height, so it all scales with the logo.
- Homepage tuning is finished: `/?tune` no longer loads a panel or pull demos, even in development. The empty homepage schema ignores all old saved experiments. `tune.ts` remains available for the separate Den development tools.
- The accepted string, drag, fling and release behaviour stays unchanged. `elasticity.ts` only handles the original smooth reel-in after a hand pull; `rope.ts` retains the original solver. Whole-spider stretch, snap distance, gradual cursor attention, clean squash blinks and motion-line defaults remain as approved.
- **Accepted held rotation: Stretch, movement tilt, Turn amount 0.8.** It keeps the approved whole-spider stretch along the pull, with a small tilt driven only by sideways speed while held. The existing angular spring returns it level when movement stops, wherever it is around the anchor. The drag offset turns with the body to keep the grabbed material point under the cursor. Release resumes ordinary leaning. Fix the Web keeps its expressive leg motion. The earlier movement/position alternatives remain source options but have no homepage controls.
- Integration requirements for the Villow site footer and app offline/error screens, including their fixed-leg profiles, are in [docs/SPIDER-INTEGRATION.md](docs/SPIDER-INTEGRATION.md). These are base-spider integrations without Den, customization or feeding.
- Eye whites and pupils are clipped before drawing, with no default lid outline. Motion streaks keep their independent defaults of 0.55 opacity and 35 per second; plucks keep three dashes.
- `anchor.ts`: finds the glyph's lowest point and tracks it on the page every frame.
- `rope.ts`: Verlet string physics (no DOM).
- `drag.ts`: grab/drag/release of the spider or the string. Dragging within reach lets the string go slack; past it the string gives less and less, then recoils on release. Also blocks text selection while held.
- `pluck.ts`: pointer crossing the string → nudge + particle burst. `particles.ts` draws the dashes.
- `spider.ts`: the spider, drawn onto the same canvas as the string so it stays crisp while it moves and turns (the SVG is only its source of shapes) — positioning and tilt, colours and outline, face and part placement (including mirrored eyes/pupils/legs), pupils following the cursor, breathing, spring-driven legs that swing and curl, and legs that react to the cursor coming near them (flinch, reach, curl, wiggle, wave or flick).
- `render.ts`: canvas drawing of the string and dashes. `index.ts` wires it all into one loop.

The root element emits `spider:grab`, `spider:release`, `spider:pluck` and `spider:eat` events and sets `data-spider` / `data-string` (`idle|hover|held`) for styling.

## Your Life on Screens

`/life` (under Campaign in the header) takes your age and shows the rest of your life carved up: sleep, work and study, upkeep, screens, and the free time off screens that's left. Its homepage teaser is removed while the homepage is being redesigned. It's meant to be blunt, like a plain cigarette pack: screen time is drawn in Pantone 448 C, the colour Australia's packs are. Every number is cited, and the sources are listed at the bottom of the page.

- Years left come from each country's latest period life table (Australia, the US, the UK), by single year of age and sex.
- Each year of that is split by an average day at that age from the American Time Use Survey (2025, by age band), averaged over every day of the year.
- Screen time counts phones whether or not they were the main thing going on. The slider starts at the average for your age: tracked time on phones, tablets and computers outside work (Ofcom) plus TV at that age, or teenagers' all-screens figure (Common Sense). Left there, later years follow the averages; drag it and your number is kept for life. It comes out of free time first, then out of meals, chores and errands, never sleep or work.
- "Worth it" (starting at teenagers' measured share on calls, reading and making things) only splits the screens block; it gives no years back.
- The weeks already lived are split at the first iPhone's release (29 June 2007), and the whole-lives comparison shows how much of each generation's life came before smartphones.
- The grid's colours were checked with the dataviz palette validator on the label's paper; screens stay Pantone 448 C, which reads dark and grey on purpose.
- `src/scripts/life/data.ts`: every figure and where it came from (`SOURCES` is the page's numbered reference list). Update the life tables and time use bands here when new releases come out.
- `src/scripts/life/model.ts`: the sums (a day at an age, years left, a whole life).
- `src/scripts/life/grid.ts`: the life drawn in weeks on a canvas, played out part by part the first time it's scrolled into view.
- `src/previews/life.astro` and `src/scripts/life.ts`: the development-only page and its inputs, remembered in that browser. `src/components/Cite.astro` is the footnote link.

## Spider Den

`/den` (linked from the header) has two views: **Dress up**, where you dress a spider up, and **The den**, where all your spiders live (below). Dress up has hats, eyewear, face bits, outfits, capes and wings, socks, full-body costumes, body colours and patterns, the thread's colour and a name. Snacks (a fly, ladybird, moth or cookie) are dragged to its mouth, and the tricks and moods play its animations. Whatever the main spider wears is saved in that browser and worn by every spider on the site: the one on the homepage logo and the den's own.

- `wardrobe.ts`: the catalogue: every item, the colours they come in, and what unlocks the locked ones. Add an item here and draw it in `dress.ts`; the den lists it automatically.
- `dress.ts`: draws what it's wearing on the spider's canvas, layer by layer (behind the legs, on the legs, on the body, over the face, on top), in body units where the body is a circle of radius 1. Pieces that stick out get the spider's dark-mode outline; hats and dangly things wobble as it swings. A costume (ghost sheet, mummy, pumpkin, bumblebee, dino onesie, astronaut) has a piece in whichever layers it needs and covers up what's worn in the layers it hides; the ghost sheet is shaped round wherever the legs are, so it moves with them. `dressPiece` draws one item on its own, for dragging it out of the wardrobe.
- `look.ts`: what it's wearing (`worn`), what the den is trying on (`trying`), snacks eaten and unlocks, all in localStorage and kept in step across tabs.
- `figure.ts`: the spider standing still in a look, for the den's picture tiles.
- `src/previews/den.astro` and `src/scripts/den.ts`: the development-only page, its two views, the spider picker, a spider's details and the wardrobe. The Dress up spider is a `SpiderString` with `stage` and `hook` (hanging from the web's hub down into a slot, and playable) and `tryOn`.
- `src/layouts/Base.astro` and `src/components/Header.astro`: the page shell and header both pages share.

After the paid dress-up unlock, locked items can be tried on in the den but aren't saved until they're earned. Snack ones unlock by feeding it; `discord` and `newsletter` ones can't be earned yet. In development only, `?unlock-all` unlocks the wardrobe items (`?lock-all` locks them again); neither grants the paid feature unlock. There's a **Have a code?** box (in the wardrobe's Snacks & tricks tab, and the den's settings) for item codes; it's a placeholder for now, with no codes yet. Add those item codes to `CODES` in `look.ts`. The paid coupon is validated separately by the Worker.

### The den

All your spiders, living on webs spun in a scene: a **tree**, an open **window** or a garden **fence** (switched at the top, and remembered). Nobody's picked to begin with. The **Wardrobe** button opens the wardrobe, and anything in it can be dragged onto any spider; you carry just the item, and with nobody picked its pictures show a plain spider. Press a spider to pick it: clicking in the wardrobe dresses it. Press a spider in the picker along the top (hovering shows an ⓘ) to open its details on the right, where the wardrobe goes: how it's doing, what it's like, and buttons to dress it up, feed it, lay eggs or make it the main spider. Close them, press Escape or press somewhere empty to let go. Anything the den has to tell you pops up for a moment at the bottom when there's nothing open on the right. The **main spider** is the one worn all over the site: it glows, and has a star over it and in the picker. In the den, spiders take no notice of the cursor (on the home page, the spider's eyes follow it and its legs react to it).

- Webs are spun like real ones: anchor lines out to branches, the window frame or fence posts (some forking as they reach them), a frame between those, spokes, and a spiral following the frame's shape. Corners get cobwebs, and long bridge lines cross the gaps.
- Spiders walk the threads and the scenery itself, sit, nap, hunt down flies stuck in the webs, let themselves down on strings and climb back up, and jump between webs. They like a little personal space: one that finds itself sitting on top of another shuffles along, and they don't pick somewhere to sit that someone's already sitting. Only webs catch a spider you let go of: branches, frames and posts aren't sticky, so it passes through them.
- Grab one and fling it. Threads within a free zone of where you let go don't touch it; past that, every thread it crosses slows it, and once it's slow enough it's caught. Put it down gently and it stays right where you let go if that's on a thread, or drops from there onto the first web below. Off the bottom or either side, it comes back round the other side.
- Pull a dangling spider past its string's reach and let go: the string snaps and it goes flying.
- Flies drift in and get stuck; drag one to a spider's mouth to feed it yourself (that counts toward unlocks).
- A grown-up that's well fed can lay eggs (from its details), and grown-ups court each other and lay on their own, even while the den's not on screen. The egg sac hatches into babies, which grow up in a couple of hours of being fed (faster the more they eat). Spiders get hungry, even while you're away; one left empty for long enough starves and floats away. Spiders also grow old: they slow down, get droopy-eyed and weaker, and at the end of their life die of old age. The main spider never dies (unless that's turned on in tuning).
- **Webs wear out.** Every thread has health: it fades over time, faster where spiders walk a lot, and a fly hitting it or struggling in it wears it too. A worn-out thread breaks: each half dangles and swings from where it's still tied, then fades away, and anything no longer tied to the scenery falls. A snapping thread jolts the threads tied to it, which may snap a moment later too: a healthy web mostly holds, but an old one can come down in a chain. Spiders mend worn threads (a little glowing pass along the thread, which gets less see-through), and rebuild broken ones, even a web that's gone completely, the way an orb weaver builds: a line across the gap first, then the anchors tying it to things, the frame, the spokes, and the spiral from the outside in. They lay a whole line at a time: walking it across (sagging a little on their own thread), dropping down it on a dragline to somewhere below, or, across a long gap to something they can catch on, rearing up and floating a line over on the breeze until it snags, then walking out along it to make it strong. How strong a spider's silk is is in its genes.
- **Genes and personality.** Every spider is born with genes (speed, appetite, silk, strength, size, lifespan, fertility) and its colours: body colour, pattern and thread. Babies take after their parents, with a little wobble, and now and then a colour neither parent has (rarer colours turn up less). Quick spiders get hungry quicker; slow, hungry ones have a harder time. Colours are in the genes, so a den-born spider's can't be changed in the wardrobe (the first spider's can). Each spider also has a personality: temper, whether it loves or hates being flung, nerve, aggression, energy and tidiness. It shows in the faces it pulls and the little emotes over its head (an angry vein, a !, a ?, a sweat drop, a trail of dots, and a heart when you save it from something that was about to eat it). Its details sum a spider up in words ("Quick", "Grumpy", "Loves being flung", "Rare colours") rather than numbers; the numbers are for tuning.
- **Predators.** Now and then a bird swoops in, a frog hops up and shoots its tongue, or a pirate spider sneaks in along the webs, and goes for a spider (usually a small, slow or old one). Spiders near it panic, and the one it's after might run, jump, drop on its string, or freeze. Grab a spider to save it, press a predator to shoo it, or snatch a spider back out of a bird's feet (as it flies off) or a frog's mouth (before it swallows): it'll show you a heart.
- **Fights.** A starving, aggressive spider may stalk a smaller one and pounce. The other might run, jump away, drop, brace itself or freeze. Bigger, stronger, better-fed spiders usually win, but luck plays a part, and the loser sometimes gets away. The winner eats the loser.
- **Deaths** go in the log at the top right, with how each one died: how long it went hungry, how old it got, or what got it. A red badge counts new ones (including while you were away).
- **Day and night.** The den has its own day (20 minutes at ordinary speed, carrying on while you're away). The sun crosses the sky, warming everything a little, with a faint cartoon lens flare; sunrise and sunset glow orange; at night the sky's deep blue with the moon and stars, everything takes a cool moonlit tint, and fireflies come out. Out of doors the sky's behind the whole scene; in the window scene it's what you see through the window, and the room darkens with it. Orb weavers are night owls, so the spiders mostly nap by day and get busy building, mending and getting about after dark. More moths come out at night and ladybirds by day; birds hunt by day, frogs and pirate spiders mostly at night.
- **The den's settings** (the ⚙ in the bar): how fast time runs (¼× to 8×), how many flies and predators come, and whether starving spiders fight. Time speed is the den's day and life: the sun and moon, hunger, growing up, hatching, how often flies and predators come by and eggs get laid, and webs fraying. Everyone still moves at nearly their usual pace (at 4×, about 1.2× as fast), so it's still nice to watch. The panel shows the time in the den and how long a day takes.
- There can be up to 40 spiders by default (up to 150 with tuning). Every spider is a whole animated rig (legs, face, moods, string physics), so the old cap of 16 kept the den light; with 40 it runs at about 5 ms a frame, and above a threshold (tunable) spiders just sitting about are posed every other frame.

The spiders are the site's own (`spider.ts`, `mood.ts`, `animation.ts`) and share its accepted defaults. Homepage tuning is complete; saved homepage experiments no longer apply. What's only in the den is `src/scripts/den/`:

- `config.ts`: every den-only setting (webs, thread health, breaking and mending, catching, habits, emotes, strings snapping, jumping, hunger, growing up and old, babies, dying, genes and how much each matters, personality, predators, fights, flies), tuned live at `/den?tune`. That panel also has buttons to send in a fly, a bird, a frog or a pirate spider, start a fight, knock down, fray or mend webs, make the picked spider old or starve it, feed or starve everyone, lay or hatch eggs, grow the babies up, re-roll genes, rebuild the webs, clear the deaths log and start the den over, and a life speed for watching hours pass in seconds.
- With `?tune`, the den also has a ✂ in its bar (drag across threads to cut them, and watch the pieces dangle and fall), and a spider's details get a **Genes and personality** section: sliders for every trait, its colours (any spider's colours can be changed while testing), and buttons to re-roll it, make it old or starve it.
- `colony.ts`: every spider (look, genes, personality, age, growth, hunger, plumpness, family) and egg sacs, in localStorage, and which spider is picked (if any) and being dressed. The den's clock (sped up by the settings) and dying are here. The main spider's look is `look.ts`'s `worn`.
- `genes.ts`: genes and personality, inheriting them, and what they mean.
- `deaths.ts`: the deaths log. `settings.ts`: the den's own settings (time, flies, predators, fights).
- `scenes.ts`: the tree, window and fence: their scenery, the things in them webs are tied to and spiders walk along, and where the sky shows.
- `daytime.ts`: the den's time of day, and how light it is. `sky.ts`: the sky, sun, moon, stars and clouds, the light of the time of day, lens flare and fireflies.
- `web.ts`: the webs as a graph of threads (and the scenery, as threads that aren't drawn): spinning them between the scene's things, the springy wobble, nearest thread, crossings and paths, each thread's health, breaking and falling apart, mending and re-spinning, and saving a web's state.
- `debris.ts`: broken threads, dangling and falling as they fade.
- `critter.ts`: one spider on the webs, and everything it does (including mending, spinning, stalking, fleeing and fighting).
- `emotes.ts`: the little symbols over a spider's head. `predators.ts`: the bird and the frog (the pirate spider is a `critter.ts` spider).
- `bugs.ts`: flies, moths and ladybirds, and snacks offered from the wardrobe.
- `world.ts`: the canvas, the loop, egg sacs, snapped strings, grabbing things, predators and fights, and the cut tool.

# Shared Spidey integration handoff

The user approved the Fix the Web homepage interaction on 31 October 2026: **Stretch, movement tilt**, with **Turn amount 0.8**. Homepage tuning is finished. The Fix the Web project remains the source of truth; do not revive the discarded elasticity presets or retune the accepted physics during either integration.

This is the implementation brief for the existing **Vilo/Villow site** and **Disconnect/Vilo app** agents. Their recipient integrations are still theirs to implement and review in their own projects. This document does not mean those integrations already exist.

## Required correction after first integration review

The first integrations incorrectly made the entire spider static under `prefers-reduced-motion: reduce`. That preference is active in the user's preview. This is not the behaviour of the approved Fix the Web spider: its facial animation and user-initiated dragging remain live. **Do not use reduced motion to skip mounting the runtime, disable cursor tracking, stop the visible frame loop, skip mood/blink updates, or send a permanent `dt = 0`.** Reduce decorative breathing, ambient sway and unnecessary effects inside the running renderer instead. The recipient's fixed-leg option is separate and must not disable facial or body interaction.

The runtime must keep its live clocks advancing while visible: `animations.update`, `mood.update`, `spider.update`, then an actual canvas draw. Keep the source blink scheduling, eased eye attention, facial expressions, and, in the app, every accepted drag/rope/rotation/release step. A static fallback is for a real missing canvas capability or rendering failure, not the motion preference. Preserve recovery controls and report actual initialization/frame errors in development instead of silently presenting a successful-looking but inert integration.

Before reporting either integration complete, exercise the actual browser page with the currently active motion preference, as well as normal-motion regression tests. A component test that mocks the mount, canvas or matrix API cannot establish that the real spider is live. Required evidence:

- Site: visible live canvas; naturally scheduled blinks; eyes follow pointer positions near both sides of the footer; expressions/gaze continue with time; fixed legs; clicking the spider still activates the ordinary Fix the Web credit link. No string or drag handling is installed.
- App: `data-ready="true"`; naturally scheduled blinks and cursor eyes; pointer-down changes held state; dragging visibly moves the spider/string; a sustained pull stretches it while a still hold settles level; moving introduces the approved motion tilt at 0.8; release visibly retains fling/recoil. Repeat on the existing offline Page explorer route and after unmount/remount. Keep Retry and scrolling usable, and keep the legs fixed.
- Under reduced motion, both faces remain live and the app's manual interaction remains available. Validate the idle-motion reduction separately. Do not change the user's OS/browser motion setting to hide this defect.

## Two uses, one base spider

| | Vilo/Villow site | Disconnect/Vilo app |
|---|---|---|
| Placement | Replace the favicon beside the mockup footer's “Fix the Web Project” link. | Offline/disconnected or other suitable error screen, including the existing page explorer's error-page previews. |
| Body | Pinned in its UI slot; no string, falling, swing or dragging. | On a string; the approved grab, directional stretch, sling, release, cursor attention and expressions. |
| Click/touch | The ordinary link goes to `https://fixtheweb.org/`. No grab or other click interaction. | Grab the spider/string within its error illustration. Keep recovery actions separate and usable. |
| Face | Animated eyes, gradual cursor attention, blinking and emotions. | The same, with expressions responding to movement/grabs. |
| Legs | Fixed articulation. | Fixed articulation. |
| Size | One deliberate size chosen to suit the footer. | One deliberate size chosen to suit the error layout. |

Both use the base spider only: no Den, wardrobe, outfit/colour controls, unlocks/coupons, feeding, snacks, growth, customization, settings UI or saved appearance. Fix the Web itself **keeps its animated legs**. “Fixed legs” here means no independent leg gestures, not removing the legs or detaching them from the moving/stretching body.

## Authoritative source and dependency closure

Source workspace: `C:\Users\Nebula PC\Development\fixtheweb`.

Copy the final source, not a screenshot, favicon or separately redrawn approximation. Keep the raw SVG's proportions, expressions, clipping and clean outline-free squash blinks.

- Shape asset: `src/assets/spider/spider.svg` (assembled 596 × 401 drawing).
- Required core modules in `src/scripts/spider-string/`: `config.ts`, `spider.ts`, `animation.ts`, `mood.ts`, `face.ts`, `feel.ts`, `rotation.ts`, `rope.ts`, `anchor.ts`, `render.ts`, `particles.ts`, `drag.ts`, `elasticity.ts`, `ignore.ts`, `pluck.ts`, `speedlines.ts`, `zees.ts`, `dress.ts`, `wardrobe.ts`.
- `spider.ts` imports `../../assets/spider/spider.svg?raw`. Preserve Vite's raw-text import, or configure the recipient bundler to embed that SVG as a string and adjust the path. Do not turn it into a runtime network fetch. The source shape is self-contained; its design/source-part directories are not runtime dependencies.
- `dress.ts` and `wardrobe.ts` are internal renderer dependencies even for an undressed spider. Create a private `blankLook()` from `wardrobe.ts` and keep its base values. Do **not** import `look.ts`: it reads saved appearance/unlocks and installs a storage listener.
- `index.ts` and `src/components/SpiderString.astro` are references for frame ordering and hit-target CSS, not portable drop-in entry points. The existing full mount includes feeding and appearance state, has a page-wide loop, and lacks complete teardown. `figure.ts`, `food.ts`, `look.ts`, Den modules/pages, tuning modules and rig tests are not needed in the recipient runtime.
- `spider.ts` currently constructs an `Image` for `/favicon.svg` even with favicon rendering disabled. Keep `look.showFavicon = false`; remove/guard that unused request in the recipient adapter rather than accidentally showing its app favicon.

This list includes the complete dependency closure for the tethered interaction. A pinned badge can omit drag/pluck/speed-line/elasticity wiring; the renderer's transitive imports still need resolving.

## Accepted defaults

Copy final `config.ts` for all remaining defaults. These are the critical approved values; changing visual size does not authorize changing the feel:

| Config path | Value |
|---|---|
| `grabRotation.mode`, `grabRotation.amount` | `"motion"`, `0.8` |
| `anchor.offsetX`, `anchor.snapDistance` | `0.045`, `0.4` |
| `drag.axis`, `drag.follow` | `"free"`, `60` |
| `pull.style`, `pull.bodyStretch` | `"whole"`, `0.35` |
| `pull.stretch`, `pull.softness` | `0.3`, `0.35` |
| `pull.snapBack`, `pull.fling`, `pull.ease` | `0.08`, `9`, `0.16` |
| `rope.stiffness`, `rope.maxStretch` | `1`, `0.12` |
| `rope.springBack`, `rope.springDamping` | `0.09`, `14` |
| `rope.segments`, `sim.rate` | `24`, `240` |
| `pupils.attentionTime`, `blink.style` | `0.15`, `"squash"` |
| `crisp.wholePixels`, `particles.count` | `false`, `3` |
| `speedLines.opacity`, `speedLines.rate` | `0.55`, `35` |

The motion style uses sideways speed for a restrained tilt and eases back level during a still hold, wherever the spider is relative to its anchor. Whole-spider stretch follows the pull independently. The spot grabbed stays under the hand as the body turns. Release returns to ordinary movement. Retain the original solver and throw/release logic; none of the abandoned elastic-sling experiments belongs in this handoff.

## Air streaks and string-pluck particles

The reference homepage does **not** gate these effects on reduced motion. `index.ts` always calls `createSpeedLines(...).update(...)`, ages/draws the separate wind particles, and renders string-pluck particles. The existing speed threshold provides the restraint: no air streaks below **4 b/s**, increasing toward full output at **14 b/s**. A fast drag or released fling continues to leave streaks while its actual speed warrants them, including with reduced motion enabled. Do not cut them off with a fixed post-release timer or a blanket preference check. Ambient sway and breathing can remain suppressed independently.

The complete air-streak defaults from `config.speedLines` are: enabled `true`, opacity `0.55`, rate `35/s`, min/full speed `4/14 b/s`, length `0.3 b`, thickness `0.014 b`, lifetime `0.22 s`, spread `0.7`, behind `0.5`, drift `0.08`, drag `6`, shrink `0.9`. These are independent of `config.particles.count`, which stays **3 dashes per string pluck**. Throws use speed trails; brushing across a free string uses the pluck burst and rope impulse in `pluck.ts`.

Preserve the reference order: update existing pluck particles; update mood and spider pose; call `speedLines.update(dt, spider.center(), velocity, a.unit, spider.radius())`; update wind particles; draw wind before the spider and pluck particles through `renderer.draw`; finally call `pluck.update(a, now / 1000, real, drag.held === null)`. Velocity is the tail's Verlet displacement times `config.sim.rate`, divided by `a.unit` (b/s), not CSS px/frame. Keep aging/drawing existing particles until their short lifetimes end. See `speedlines.ts`, `particles.ts`, `pluck.ts`, and the independent motion-streak regression in `scripts/test-spider-feel.mjs`.

For a larger per-instance stage, scale its unit/body size deliberately and use the same coordinate origin for hit targets, rope, body and particles. A full circle needs clearance above the anchor as well as left/right/below: reserve at least the maximum tether reach plus the body margin in each direction. Adjust layout/anchor placement to supply that room; retain the approved solver, motion/0.8 rotation and whole-spider stretch. Foreground text and recovery controls must remain legible and usable when the visual spider/string layer sits behind them.

## Recipient adapter requirements

Implement a small browser-only mount that returns an idempotent `dispose()`; expose placement/size and the two agreed profiles, not a general customization API. Prefer per-instance options for leg behavior and placement. The source `config` is a shared mutable singleton: do not change its global leg settings to freeze one badge or leak profile overrides into another instance.

**Site:** implement a genuinely pinned, untethered badge. The current `data-mode="badge"` is insufficient: `createSlotAnchor` anchors at the top of the window, and the existing loop still simulates and draws a string. Pin the spider to the measured slot, with zero artificial velocity; render only the spider and keep its animations/mood updating. Do not merely hide a still-simulated string. Put the illustration inside the real footer link, give it a useful accessible link name, and let pointer events pass through the canvas to that link. Do not install drag/pluck handlers or play drop-in/body-turn animations for this profile. Eyes must still follow the cursor.

**App:** follow the frame order in `index.ts`: animation → size/anchor → fixed physics steps (drag, integration, accepted elasticity, containment) → mood → spider → rendering, then pluck handling. Use an ordinary hook/slot suited to the error illustration, not a Den stage or its controls. Keep the simulation, hit targets and drawing in the same coordinate system: the original canvas is viewport-sized and uses document coordinates. Moving it into an error card requires a matching canvas-origin transform and stage bounds, not only different CSS positioning. Constrain held targets and released movement to the illustration's usable region; the original drag bounds use the viewport. Do not let the spider block Retry, navigation, diagnostic text, or keyboard focus. Recovery remains functional without interacting with Spidey.

**Fixed legs:** `legMotion.enabled = false` alone does not freeze them. In `spider.ts`, `poseLegs` also adds cursor reactions, animation work/grip/reach/hip shifts, idle stretches and expression spread/tuck. A per-instance fixed-articulation path must bypass all those additions and the leg spring/fidget updates, while retaining the ordinary placed leg shapes. Keep attachment to the body's transform so scaling, breathing and stretching do not leave gaps. Keep eye cursor tracking enabled; disabling `cursor` would also lose the approved eyes. Keep blinking and facial emotions even when their usual leg tucks/fans are suppressed.

Use `createAnimations(..., { listen: false })` and `createMood(..., { listen: false, blink: () => animations.play("blink") })` for isolated components. Do not install page-wide `spider:play`/reset/feeding controls. Only the face/blink/idle-gaze behavior is wanted; omit feeding/growth and leg/drop-in performances. Render the existing base expressions rather than replacing them with a permanently neutral SVG.

## Lifecycle, offline behavior and review

React StrictMode, error-page navigation and repeated preview switches must not multiply loops or handlers. Keep the rAF ID and cancel it on disposal; remove drag/pluck/window/document listeners, release pointer capture and any grab cursor/selection classes, call `spider.dispose()` and `mood.dispose()`, disconnect the renderer's `ResizeObserver`, and remove its media-query listener. The current drag, pluck, animation and renderer APIs need this cleanup added by the recipient adapter; they do not all expose it yet. Mount/unmount/remount must remain safe. Pause unnecessary work while the illustration is not visible.

Respect `prefers-reduced-motion` inside the running component: keep eyes, blinking, expressions and user-initiated interaction live while suppressing ambient swings/fidgets and unnecessary effects. Do not replace the whole runtime with a static SVG for this preference. Bundle the sprite source and runtime locally. For an offline screen, ensure the error-shell dependency is already loaded or covered by the app's existing offline cache; an uncached lazy chunk cannot be fetched after disconnection. Do not add a CDN dependency or make error recovery wait on the animation. Provide a base SVG fallback if canvas initialization fails.

Expose the offline/error variant explicitly in the app's existing page explorer so the user can review and refine it without breaking connectivity. Test real offline behavior as well as that preview, the fixed legs during grabs/expressions/idle time, link behavior on the site, release after a fast fling, repeated mounts, reduced motion, and the chosen small UI sizes. The core feel checks are in `scripts/test-spider-feel.mjs`.

Playful error copy is provisional. For example: **“A little web trouble. Check your connection and try again.”** followed by **“Spidey's here while you reconnect. Give his thread a tug.”** Keep the practical connection explanation and Retry action primary; let the user refine the joke in the page explorer. Do not imply that tugging the spider repairs the connection or that Spidey diagnoses the failure.

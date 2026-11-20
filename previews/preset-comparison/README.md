# Per-page preset review

Local review URL: `http://127.0.0.1:4321/?preset=b`.

The page selector and A/B links remain visible while scrolling. Each of the five current
pages stores its own choice. Original Home, Villow and Design & access content is retained
as A, apart from the removal of submission references. New Ideas and About pages compare an
overview (A) with the full treatment (B). Den and Life
remain under Old pages, outside this comparison set.

## Editorial refinement · 14 November 2026

The original files are retained under `b-before-refinement-2026-11-14/`, with their source
paths intact. This is a local reference, not another site preset or route.

- Home B restores “The internet can be better. Let's fix it.” and a direct invitation to
  help. The opening keeps online learning, enjoyment, interests and connection; intentional
  stopping; value beyond time spent; attention, privacy and information quality. Rest and
  friendship are explicit. The following-feed comparison and useful-control examples move
  to “What we want to change”, with fuller explanation on Design & access.
- Method, wider-ideas and participation headings say what the sections offer. The build,
  evaluate, refine and advocate sequence, evaluation limits, concrete examples and all four
  contribution routes remain. The personal quotation is unchanged.
- Design & access leads with the builder's own experience. It does not claim YouTube is the
  only service with an API. It separates practical access, feature-specific permission and
  continued operation, with the finite-feed example, three access categories, consent,
  data minimisation, costs, creator interests and platform adoption retained.
- The access-page comparison is now “Let people build and use alternatives.” Its final
  call to action invites work on an access barrier instead of linking to the submission.
- About B has a direct introduction and shorter framing. All five paragraphs of Nicholas's
  message are unchanged. Ideas B has a more specific introduction; proposal mechanisms,
  status, precedents, examples and trade-offs are unchanged in `src/content/proposals.ts`.
- Removed: the Digital Duty of Care page, download, selector entry and footer/content links
  in both presets. The original document and template remain only in the local reference.
  Their design arguments are retained in the relevant pages. No other proposal was removed.
- Villow A and B page bodies are unchanged. Its shared footer/preview selector lose the
  removed submission entry along with the rest of the site.

The prior B default headline is refreshed in existing browser preferences; custom wording
and all other design preferences are preserved. Source links for the API, player, policies
and EU research-data example were checked against their official documentation.

Verification for this edit:

- Production build and development visibility checks pass, including both presets on all
  five pages, section anchors, and 404 responses for the removed submission route.
- Byte comparisons confirm unchanged Villow A/B and proposal data. The full five-paragraph
  founder message also matches the reference. Saved-headline migration preserves custom
  wording, other design preferences and preset A.
- Browser review covers Home and Design & access at desktop size, and Home, Design & access,
  Ideas and About at a 390 px viewport (375 px document area). No horizontal overflow;
  browser error log empty. Temporary viewport reset and Home B left open for review.
- Current screenshot: `home-b-refined-2026-11-14.jpg`.

### Follow-up: Villow as a project and policy example

Nicholas subsequently asked to refine Villow B itself. This supersedes the earlier request
to leave that page alone. The original remains in the reference snapshot; A is unchanged.

- The opening now gives visitors a prominent “Explore Villow” link to `https://villow.app`,
  with the website positioned as the place for the product tour, design concepts and setup.
- The practical API/player access and unresolved permissions come immediately afterwards,
  followed by the need to support ongoing alternatives as well as research studies. The
  comparison with other services stays grounded in Nicholas's experience.
- The product walkthrough becomes six compact principles: value beyond engagement;
  deliberate stopping; commitments with continued choice; information that helps people
  adjust; attractive alternatives; and connection separate from monitoring. The engagement
  principle is made explicit from the original source rather than inventing a new agenda.
- Removed duplicated product exposition: the 5–30 minute suggestion, reflection-loop graphic,
  illustrative intention dialogue, feature inventories and three-route setup walkthrough.
  The mechanisms still appear briefly where they explain a principle. The full earlier copy
  remains available in the local reference.
- Hosting, quotas, browser coverage and host database visibility remain where they explain
  adoption barriers. Research limitations and all five evaluation questions remain; the
  methodology is now expandable. Platform adoption and evidence informing future standards
  are explicit, without presenting specific features as proven interventions or legal duties.
- Existing homepage section links still resolve, with `#get-started` now landing on the
  opening website invitation. The submission page remains absent.

Follow-up verification: the build/development visibility suite passes (2/2), including all
mixed-preset anchors. The external destination returns HTTP 200. Browser checks at desktop
and narrow widths show no horizontal overflow; the primary action is visible in the first
390 × 844 screen. Evaluation disclosures open correctly and the browser error log is empty.
The viewport override was reset and Villow B remains open. Current screenshot:
`villow-b-project-policy-2026-11-14.jpg`.

The 12 November checks and original screenshots below describe the earlier revision.

### Follow-up: a full-screen Villow opening

The opening is now centred around a large linked Villow identity, one short invitation and
one prominent website button. The mark lifts gently on hover or keyboard focus; the button
arrow also responds on hover. Reduced-motion preferences disable these transitions. The
existing SVG assets and palette handling are reused without redrawing the mark.

All content from the access section onwards is unchanged. The hero fills at least the first
viewport, keeping the detailed material below the fold. A small “The ideas behind it” cue
links to the principles. The immediately preceding page is saved as
`villow-before-immersive-hero-2026-11-14.astro`.

Verification: build/visibility suite 2/2 passed; content below the hero matches the prior
copy. Browser checks at 320 × 568, 390 × 844, 1440 × 900 and 1920 × 1080 confirm the website
button stays visible, the next section begins below the opening screen, and no horizontal
overflow occurs. Light/dark palettes, keyboard focus and the scroll cue were checked. The
original colour preference and default viewport were restored. Current screenshot:
`villow-b-immersive-hero-2026-11-14.jpg`.

### Follow-up: Villow as our blueprint · 15 November 2026

Preset B now opens with “Our blueprint for better social media.” The short introduction
positions Villow as the project that puts Fix the Web's ideas into practice, starting with
YouTube. Three linked illustrations summarise worthwhile time and stopping, personal
control, and connection with privacy. “Explore the project” opens Villow's website.

The full principles now follow the opening, before the platform-access section. Their
introduction acknowledges that one project cannot address every social-media problem.
The six detailed principles, access copy, adoption discussion and evaluation are retained.
Preset A is unchanged. The prior B page is saved in
`villow-before-blueprint-2026-11-15.astro`.

The wordmark uses the exact `VarelaRound-Regular.ttf` from Villow's website, with its
400 weight, -.02em tracking and .5px text stroke. The original OFL notice is included
alongside the font in `src/assets/fonts/`; these assets are development-only.

Verification: build/development visibility suite 2/2 passed. Browser review covered
1440 × 900, 390 × 844 and 320 × 568, with no horizontal overflow. The full opening fits
the taller screens and flows naturally on short phones. Light/dark palettes, loaded
wordmark font and scroll-link destination were checked; browser error log empty. The
original dark preference and default viewport were restored. Screenshot:
`villow-b-blueprint-2026-11-15.jpg`. Changes remain local.

### Follow-up: principles people can see themselves in · 15 November 2026

Nicholas asked for a more accessible, inspiring explanation of the goal: helping people
want to reduce unwanted use, choose their own tools and keep commitments to themselves.
The earlier three-column principle list is saved in
`villow-before-visual-principles-2026-11-15.astro`.

`VillowPrinciples.astro` now gives each principle a spacious illustrated chapter: life
beyond the feed; self-chosen limits and streaks; visible habits and accessible controls;
worthwhile viewing; an appealing, organised feed; and friendship with optional usage
comparisons. Desktop alternates the copy and illustration; mobile puts the illustration
immediately below the heading, followed by the explanation. The six existing section IDs
are retained. All examples are clearly illustrative, with no real user data.

The daily-limit demonstration supports keyboard adjustment and switching the limit off.
It changes only that example in memory. A separate future section introduces corrections
reaching earlier viewers and creator-suggested activities, both labelled unbuilt proposals.
The personal to-do list is distinguished from the proposed creator actions. Positive social
connection is explicit, with friend comparisons offered as context rather than a health norm.

The hero's three themes are now life beyond the screen, control over your own goals and
support for better habits. Villow's wordmark, preset A and the public release boundary are
unchanged. The policy/access and evaluation material remain after the illustrated story.

Verification: production/development visibility suite 2/2 passed, including mixed-preset
anchors. Browser review covered 1440 × 900, 390 × 844 and 320 × 568 with no horizontal
overflow, light and dark palettes, and the limit demo's keyboard/disabled/restored states.
Browser error log empty. The original dark preference and default viewport were restored.
Review screenshot: `villow-b-visual-principles-2026-11-15.jpg`. Changes remain local.

### Follow-up: principles beyond the product tour · 15 November 2026

At Nicholas's request, consulted the Villow site chat **Set home preview preset**
(`01a1ce62-7b75-7780-b9f9-583af03814bb`) and reviewed the approved local homepage 34 at
`http://127.0.0.1:4411/` and Concepts B at `/design-concepts`. These integrated routes use
the saved preview sources; the older public site was not the design reference. The other
chat supplied a read-only handoff and made no changes.

The content boundary is now explicit: Villow demonstrates the product; Fix the Web explains
principles that should remain relevant if the interface or platform changes. The Villow
page remains the bridge, with the external project invitation first and its own wordmark.
The three hero summaries and six repeated feature scenes are removed, including the
misleading daily-limit off-switch (the actual app requires a chosen daily limit), sample
usage bars, rating card and duplicate proposal diagrams. The generic made-up-examples
notice is unnecessary now and removed too.

One original, data-free infographic shows how the design goal changes the available
outcomes: a loop of staying/returning versus worthwhile use with the option to continue,
leave or act elsewhere. Eight principles are grouped into four open editorial sections;
short Villow connections are expandable. Detailed proposal walkthroughs stay on Ideas.

Preserved aims:

- **Time & attention:** value beyond duration, enjoyment/rest/learning/friendship, reducing
  regretted use, satisfying stopping opportunities and actions beyond the service.
- **Choice & motivation:** customisable experiences, self-chosen commitments, revising
  plans, accessible encouragement, streaks that welcome absence, and pressure to evaluate.
- **Usable choices:** understandable habits, nearby accessible controls, reversible
  adjustments and appealing alternatives that do not require constant administration.
- **Connection & trust:** positive social connection, optional and understandable sharing,
  friend context without a health norm, corrections, inspectable sources, authentic
  conversation, challenges to mistakes and optional AI with human responsibility.
- Corrections, creator actions, recommendations and AI retain proposal status. No proven
  wellbeing or misinformation outcome is claimed. Access, adoption, hosting/privacy limits
  and evaluation content below the principles matches the prior page.

Snapshots: `villow-visual-principles-before-transfer-2026-11-15.astro` and
`villow-before-transferable-principles-2026-11-15.astro`. Verification: build/development
visibility suite 2/2 passed; desktop, 390px and 320px browser checks, light/dark palettes,
keyboard disclosure operation and no page/diagram overflow. Browser error log empty.
The original dark preference and normal viewport were restored. Review image:
`villow-b-transferable-principles-2026-11-15.jpg`. Local only.

### Follow-up: show the incentives · 15 November 2026

Replaced the pale, side-by-side flowchart with a single bold editorial illustration in
`src/components/IncentiveStory.astro`. The opening scene connects rage bait and unsatisfying
scrolling to an attention magnet and the payoff of more advertising opportunities. The
copy is explicitly about an ad-funded feed. “Change the incentive” replaces the scene with
a large choice dial: “Your time. Your terms.” Only one scene is visible at a time.

The second scene covers accessible choices, chosen support and leaving satisfied. Its
caption distinguishes personal controls from the wider goal of services that can succeed
with less use. This is an illustration of principles, not an actual Villow setting or a claim
that a preference toggle changes a platform's revenue model. No data is collected or saved.

The artwork uses solid shapes, Fredoka lettering and a forest/cream/coral/mint palette.
Mobile puts the illustration after the headline and before the explanation. The toggle
works with click, Enter and Space; hidden scenes are removed from the accessibility tree,
and the explanatory text updates in a polite live region. A no-JavaScript paragraph retains
the alternative direction. There is no automatic animation.

An optional evidence disclosure links the primary research on
[out-group animosity and engagement](https://pmc.ncbi.nlm.nih.gov/articles/PMC8256037/) and
[social rewards and outrage expression](https://pmc.ncbi.nlm.nih.gov/articles/PMC8363141/).
The text does not generalise these findings to every feed or claim that designers universally
intend harm. The eight principles, project invitation and remaining page sections are intact.

Previous component: `villow-principles-before-incentives-2026-11-15.astro`.

Verification: production/development visibility suite 2/2 passed. Browser checks covered
1440px, 800px, 390px and 320px, both scenes, light/dark palettes, keyboard operation and
the evidence disclosure. No horizontal overflow. The existing principle data and remaining
principle-section markup match the saved component exactly. The original dark preference
and default viewport were restored. Review image: `villow-b-incentives-2026-11-15.jpg`.
Changes remain local.

### Follow-up: good finds and reflection · 16 November 2026

Kept the approved magnet/dial artwork and palette. The attention scene now includes a mint
“Great find!” sticker and describes forgettable clips punctuated by something funny, useful
or worth sharing. It names the hope of finding another good clip as a reason someone can
keep swiping, alongside rage bait. The advertising payoff remains explicit. This is a
plain-language description of the experience, without a numerical claim about reward rates
or a claim that every feed works identically to a gambling machine.

“Your time. Your terms.” now leads with reflection. The dial asks “Worth my time?”, and
the copy connects noticing enjoyment, learning and regret with nearby choices over the
feed, time and support. The fuller principle is now “Make reflection part of the experience”;
it keeps reflection optional and connects habits, accessible controls and reversible changes.
This remains a general design ambition, with no new claim about Villow's recommendation
algorithm or proven outcomes.

Snapshot: `incentive-story-before-reflection-2026-11-16.astro`. Verification: visibility/build
suite 2/2 passed; desktop and 320px browser review of both scenes, keyboard switching and
no horizontal overflow. The new sticker and dial text were adjusted for the narrow layout.
Review images: `villow-b-good-finds-2026-11-16.jpg` and
`villow-b-reflection-2026-11-16.jpg`. Local only.

### Follow-up: Villow preset C · 16 November 2026

Added a separate comparison at `/work/villow?preset=c`. The user liked the bold artwork
but preferred the earlier, simpler magnet and wanted a more readable alternative to the
principle paragraphs. C removes the “Great find!” sticker, restores the original magnet
proportions and tightens the incentive copy. The occasional good clip remains in one short
sentence; reflection stays central to the second scene. B retains its latest content/art.

`VillowPrinciplesC.astro` presents all eight principles as short dot points across four
themes: life beyond the screen, chosen goals, reflection and usable choices, connection and
trust. Large Fredoka headings and solid numbered shapes echo the approved artwork. Project
connections stay expandable; proposal status stays explicit. No feature-demo illustrations
were added. The shared project opening, access, adoption and evaluation remain unchanged.

Preset resolution and saved preferences accept C only on Villow. The preview bar includes a
third choice on that page and uses A/B/C labels at narrow widths, with full accessible names.
B and C share theme IDs so switching retains the section. Unsupported C links on other pages
render B. First-visit B and the public coming-soon boundary remain intact.

Validation: expanded `test-site-visibility.mjs` passes 2/2, covering C rendering, B content,
unsupported-page fallback, shared anchors and production exclusion. Browser checks verified
B/C section position, per-page navigation, bare-URL restoration, keyboard disclosures and
320px layout without horizontal overflow. Review image: `villow-c-principles-2026-11-16.jpg`.
Changes remain local.

### Follow-up: illustrated and interactive principles · 16 November 2026

Added two new Villow-only comparisons while preserving B/C:

- **D — Illustrated principles:** four large editorial scenes use an open door, adjustable
  controls, a lens with an adjustment dial, and conversation with a privacy shield. Short
  statements carry the main ideas; fuller principles are available underneath.
- **E — Explore the principles:** readers choose a goal or preference within each theme.
  The illustration and explanation change together. Choices cover learning/rest/connection,
  different kinds of chosen support, reflection, and friendship/privacy/checking information.
  These are explorations of design principles, not live Villow settings. They save no data.

Both use shorter “Your time. Your terms.” copy about understanding time, shaping a feed and
choosing boundaries/support. Reflection remains in the dial and explanation without the
repeated instruction to “put reflection at the centre”. The clean two-label magnet remains.

Original SVG/HTML artwork extends the established forest, cream, mint and coral illustration
style. No bitmap assets or new dependencies are needed. D alternates the editorial composition;
E places choices next to their outcomes on desktop and immediately above them on mobile.
There is no automatic motion. Choice buttons support keyboard operation, announce their pressed
state and update a polite live region. Detail panels use native disclosures. Deep links to an
individual principle reveal the enclosing panel before positioning the page.

The eight full principles were extracted unchanged into `src/content/villow-principles.ts` so
B and the new visual layouts share the same substance. Creator actions, corrections and AI
retain proposal status. Existing access/adoption/evaluation sections remain shared. The preview
bar now supports A–E on Villow only, with letter labels at smaller widths.

Validation: expanded visibility/build tests passed 2/2, including D/E rendering, complete
principle anchors, other-page fallback and production exclusion. Browser checks covered all
four illustrations, interactive outcomes, keyboard operation, deep-link disclosures, saved
page preference, D/E section position and 320px overflow/navigation. Review images:
`villow-d-illustrated-2026-11-16.jpg` and `villow-e-explorer-2026-11-16.jpg`. Local only.

## Verification on 12 November 2026

- `node --test scripts/test-site-visibility.mjs`: 2/2 passed. Builds production, verifies
  that preview routes/assets are absent, renders both versions of all six pages, checks
  first-visit B, and verifies section links across mixed A/B destinations.
- Browser: Home A and Villow B retained independently; changing pages restores each choice.
  Browser Back and subsequent navigation preserve the restored choice.
- Homepage design text: a temporary B edit did not alter A; B recalled the edit; the original
  B headline was restored before delivery. Design storage is separate for A and B.
- Switching A/B while at the work section kept that section 150 px below the viewport top
  in both directions, clear of the header and comparison controls.
- Finite-feed demonstration reaches “All caught up.” Evaluation disclosures open.
  Mobile menu opens and Escape closes it.
- All six B pages checked at 390 px; all twelve A/B versions checked at 320 px.
  No horizontal overflow. Representative desktop layouts checked at 1280 px.
- Dark and light layouts reviewed. Browser error log was empty after the new-page checks.
- Original submission SHA-256 matches the supplied file:
  `3E9690A61D96E9596825921F660A04D9F51081D3F020639B4F11E9AA5410BC2D`.
- `git diff --check` passed (line-ending notices only).

Screenshots: `home-b-desktop.png` and `ideas-b-desktop.png`. Temporary viewport overrides
were reset; the original dark colour preference was restored. The local preview was left
running and opened on Home B. No public deployment, app/extension edit or Villow-site edit.

Editorial rationale and source mapping: `../../docs/strategy/2026-11-12-preset-b-content-map.md`.

### Follow-up: compact D/E redesign · 18 November 2026

The large principle scenes and goal-choice interactions were too busy. D and E now use the
same concise, visible summaries of all eight principles, with small original illustrated
stamps. The approved large incentive illustration and its agency scene remain unchanged.

- **D — Editorial rows:** open rows with bold theme headings, small stamps and two short
  principle statements. Mint/coral marks and solid numbered tabs add character with little
  extra visual weight.
- **E — Principle tiles:** a compact two-column collection in mint, cream, coral and forest.
  Each tile holds a theme and its two principles, stacking into a single column on mobile.

Native “Read more” disclosures retain the full shared principles and Villow connections.
Core ideas and anchor targets remain visible without JavaScript or an expansion. No goals
selector, duplicated outcome copy or large principle illustration remains. B/C content and
artwork are unchanged; access, adoption, proposal status and evaluation remain shared.

At 1280px the four-theme section measures about 1,213px in D and 950px in E, compared with
2,071px in C (41% / 54% shorter). At 320px it measures 2,160px / 2,343px against C’s 3,329px
(35% / 30% shorter). These measurements exclude the shared incentive story and next section,
with disclosures closed. Type remains readable; the savings come from layout and brevity.

The comparison switch now handles themes sharing a top edge in E. It retains a linked theme
when available and otherwise follows reading order. Shared theme links are updated when
switching B/C/D/E so moving from the second tile to a stacked preset retains that theme.

Verification: production/development visibility suite 2/2 passed; all eight anchors are
checked outside disclosures. Browser review covered 1280px, 800px and 320px, light/dark,
keyboard disclosures, C → E → D theme position and no horizontal overflow. Review images:
`villow-d-compact-2026-11-18.jpg` and `villow-e-compact-2026-11-18.jpg`.
Prior component: `villow-de-before-compact-2026-11-18.astro`. Local preview only.

### Follow-up: six direct principles across C/D/E · 18 November 2026

The user still found the four-category structure repetitive and the disclosures too heavy.
C/D/E now share six standalone principles, each with two or three short points. There is
one heading per principle, no category/subheading hierarchy and no “Read more” panels.

Content is in `src/content/villow-design-principles.ts`:

1. Make room for life: feed endings, break reminders, to-dos and offline activities.
2. Keep people in control: chosen feeds, limits and support; revisable commitments and clear trade-offs.
3. Make less scrolling appealing: enjoyable calmer experiences, optional encouragement, time away and pressure checks.
4. Make reflection useful: usage, optional value reflection and accessible, reversible controls.
5. Bring people together: shared enjoyment, separate optional usage sharing, audiences and comparison limits.
6. Make claims easy to check: sources, corrections reaching original viewers, manipulation/appeals and optional, labelled, human-checked AI.

The earlier value/quality material now has a single home: the incentive story explains what
counts as success, reflection asks about time well spent, and appealing alternatives cover
enjoyability/usability. This removes the repeated lists of learning, laughter, rest and fun.
Proposal status remains visible in a short note; access, adoption and evaluation remain intact.
B retains its earlier full copy in `villow-principles.ts`.

C uses six open blocks in two columns. D uses six compact numbered rows. E uses six small
illustrated tiles, with three/two/one columns at desktop/tablet/mobile. All variants use the
same copy so the comparison tests presentation. The large incentive artwork is retained;
C now shares the revised agency copy previously used in D/E.

At 1280px, the principle lists are approximately 709px (C), 813px (D), and 713px (E).
At 320px they are approximately 1,741px / 1,696px / 1,972px. These figures exclude the
shared incentive story and proposal note. C's previous four-theme list was 2,071px / 3,329px.

Principle IDs now identify the same idea across layouts. Old theme and principle anchors
are retained as aliases, including value and subscriptions. Comparison navigation preserves
the selected principle between C/D/E instead of relying on the new numerical order.

Verification: production/development visibility suite 2/2 passed. Browser review checked
1280px, 800px and 320px layouts, light/dark, visible content without disclosures, legacy
anchors and E → C → D position. No horizontal overflow or illustration/title collisions.
Review images: `villow-c-six-principles-2026-11-18.jpg`,
`villow-d-six-principles-2026-11-18.jpg`, `villow-e-six-principles-2026-11-18.jpg`.
Pre-edit copies are `villow-c-before-six-principles-2026-11-18.astro` and
`villow-de-before-six-principles-2026-11-18.astro`. Local preview only.

### Follow-up: customisation and useful reflection · 18 November 2026

C/D/E now lead with personal customisation. The second principle pairs manageable
recommendations (a chosen recommendation cap) with more appealing, customisable subscriptions;
neither feed type is presented as inherently healthy. Reflection comes third, then connection
that can move offline, then reminders and activities beyond the screen. “Fight misinformation”
explicitly describes a future direction, including bots, manipulated comments and corrections.
All six keep short, visible points. B and the large incentive artwork are unchanged.

C adds `VillowReflectionExample.astro` beside the reflection principle. Its two tabs are
simplified, interactive illustrations with fictional activity, using the site's bold palette:

- **When you watch:** change the watch-free start/end and whether it covers weekdays or every
  day. The chart always shows all days, so the band demonstrates partial versus full weekday
  coverage. Changing a schedule does not change the recorded viewing curve.
- **Daily use:** choose a weekday and adjust its limit. The dashed comparison and shaded
  difference move immediately; recorded usage and the earlier 60-minute limits stay fixed.
  Each weekday retains its draft while exploring. Reset restores both examples.

The user explicitly requested consultation with the disconnect/Villow web app agent. The
existing **Align Vilo sample pages** chat (`01a1cb33-c9e3-7ef2-b5f1-98e1eb68eacd`) answered a
read-only request. Its explanation was cross-checked against disconnect's `WatchTime.tsx`,
`UsageScheduleSettings.tsx`, `UsageLimitEditorPanel.tsx`, `WatchFreeTimeDemo.tsx`,
`scheduleIntervals.ts`, `DESIGN_USAGE_AND_LIMITS.md` and existing chart review images.
“Conditional” bands mean watch-free on some selected weekdays; they are not automatically
triggered by ratings or usage. The actual app supports more detailed schedules, day selection,
group constraints and save behaviour. This comparison is deliberately a small explanatory
interaction, not an embedded account editor or a complete replica. Its offered values are
curated examples, not claims about the app's full range. All changes stay in memory.

The tabs support arrows/Home/End and native controls support keyboard use. Both static examples
remain readable without JavaScript; live controls are enabled only after initialisation.
D/E retain their compact formats and share the revised principle copy and future label.

Verification: production/development visibility suite 2/2 passed (including production build).
Browser checks covered C at 1280px, 800px and 320px, both examples, light/dark, range and weekday
changes, retained draft values, reset, keyboard tabs and fixed recorded bars. D/E were reviewed
at desktop and 320px, including the future label. C → D → E preserved the reflection anchor;
the legacy value anchor still reaches it. No horizontal overflow or browser errors observed.
The mobile legend was adjusted so each key stays with its label when wrapping.

Review images: `villow-c-reflection-pattern-2026-11-18.jpg` and
`villow-c-reflection-daily-2026-11-18.jpg`. Before-edit snapshots:
`villow-principles-before-customisation-2026-11-18.ts` and
`villow-cde-before-reflection-example-2026-11-18.astro`. Local preview only.

### Follow-up: reuse Villow's guided animation · 18 November 2026

The user preferred the existing translucent animation in Villow's settings to the custom
cream chart and permanent forms. C now contains an app-styled miniature: Inter Variable,
Villow's Fern light/dark tokens, translucent chart cards, circular handles and dashed bands.
The surrounding Fix the Web principles and D/E comparisons are unchanged.

A second, explicitly requested read-only consultation with **Align Vilo sample pages**
confirmed the exact dependencies and interaction semantics. `VillowWatchFreeDemo.astro`
ports the app's `WatchFreeTimeDemo.tsx` markup; `villow-watch-free-demo.css` preserves its
10-second timing, easing, clip polygons, SVG gradients, pointer/finger and ripple artwork.
The source `monotoneSpline.ts`, default fictional hourly series and Inter Latin font were
copied locally, including the font's OFL. Changes to the CSS port are the host theme selector;
the wrapper increases the plot height slightly and adapts the available width.

Desktop demonstrates dragging 6–11pm, opening the joined drawer, adding and holding the
saved band. Phone demonstrates tapping Add, opening noon–1pm, stretching to 5pm and adding.
Weekday buttons recompute the fictional curve and handle Y positions in place. Both example
panels remain mounted; visibility and inert state switch without replacing animated nodes.
Changing days or returning to a tab therefore does not restart its CSS timeline. The slow
loop follows the source's reduced-motion behaviour; a visible Pause/Play control is available.

The companion daily animation follows the app's duration editor, neutral bars, historical
limit, dashed adjustment and diagonal comparison shading. It illustrates 60 → 55 → 50 → 45
minutes, holds and repeats. Choosing a weekday changes the target at the same phase. There
is no Save button: the app's ordinary duration adjustments autosave. Historical limits and
recorded bars stay fixed throughout. This is a new companion animation, not an existing
Villow animation asset.

“Try it yourself” is optional. Visitors can drag a range on desktop or use Add and the time
fields, then add it to the selected days. This miniature supports one replaceable, same-day
range, not the full app schedule editor. Saved bands show partial coverage when only some
of the days currently shown are included. Cancel restores the prior range. These draft and
saved example states exist only in memory and never touch an account or storage.

Browser verification covered desktop and 320px, both themes, the phone gesture animation,
keyboard tabs, Pause/Play, weekday changes, adding via fields and dragging, cancelling,
and partial-day coverage. With playback paused, weekday changes altered the curve while
preserving the pointer transform; daily changes preserved the line position and all recorded
bar heights. The existing production/development build and visibility checks passed 2/2.
Pre-edit source: `villow-reflection-before-animation-2026-11-18.astro`. Review images:
`villow-c-app-animation-2026-11-18.jpg` and `villow-c-daily-animation-2026-11-18.jpg`.

### Follow-up: a small watch-free illustration only · 18 November 2026

At the user's request, C now shows only the looping watch-free animation and weekday buttons.
The daily-use example, app frame/heading, tabs, visible explanation, manual editor and playback
controls have been removed, together with their scripts and styles. The weekday selection is
a soft filled pill with no border; keyboard focus uses an underline rather than an outline.
Reduced-motion preference now shows the static explanatory frame in this local adaptation.

The animated drawer keeps “New watch-free time” in full. A second line names the selected
weekdays in calendar order, including all six names when six are selected; no selection or
all seven reads “for every day”. The drawer has room for wrapping, and the desktop pointer
target is adjusted to keep its animated click aligned with Add. Day changes still update
paths and handle coordinates in place without restarting the CSS animation.

Reflection now occupies an ordinary column beneath its existing heading and points. The
six principles form three paired rows, rather than giving reflection a full-width feature
section. The final future-direction principle also returns to the regular grid. D/E and the
actual Villow/disconnect web app are unchanged; all edits are in the fixtheweb checkout.

Before-edit snapshots: `villow-reflection-before-simplifying-2026-11-18.astro`, `.ts`, `.css`.
Review image: `villow-c-compact-watch-free-2026-11-18.jpg`.

### Follow-up: move the example to Villow’s homepage · 18 November 2026

Removed the watch-free illustration from Fix the Web’s preset C. All six principles
now have equal visual weight again; the reflection principle still explains that
activity and relevant controls should be available together. D/E keep their layouts.

The selected Villow homepage (34 / Soft Nunito, also its index alias) now has a separate
section immediately after “Learn from what you watch”: **See the pattern. Change it
right there.** The example keeps the app’s original desktop drag / phone tap animation,
with independent weekday selection and abbreviated labels such as “for Wed”. It uses
the site’s existing typography and a compact Inter-styled app illustration.

The original animation continues under reduced motion, as explicitly requested. This
required removing the old Fix the Web static override and locally overriding the
Villow homepage’s legacy global animation reset. The app itself was not edited.

Files were prepared in `../villow-homepage-transfer/`, reviewed at desktop, 390px and
320px, then applied with approved access to the separate Villow-site repository.
The installed homepage is at `http://127.0.0.1:4411/#habits-and-controls`.
Villow’s local build and checks across 48 pages pass; Fix the Web’s production and
development visibility tests pass (2/2). No publication or deployment.

Verification: production/development visibility checks passed 2/2. Browser review covered
desktop, 800px and the narrow mobile viewport, light/dark, six-day and all-day labels, and
selection without borders/outlines. The long label fits inside the drawer, the six principles
keep equal column widths, and there is no horizontal overflow.

## Villow C2 · principles, not features · 18 November 2026

New preset C2 on `/work/villow`, for comparison against C. Same layout, intro, incentive
story, titles and section anchors as C; only the principle copy and one intro line differ.
C, D and E are unchanged. Copy lives in `src/content/villow-principles-c2.ts`.

- The intro adds: “These are the ideas, not a feature list,” linking to villow.app for
  the features.
- 01 is about optional tools, experimenting with your own data and a light nudge to keep
  to your own limits. 02 says change people choose lasts longer than change they're
  pushed into, citing Aronson (1999, self-persuasion) and Ntoumanis et al. (2021,
  self-determination theory meta-analysis). It also covers showing the evidence and
  making subscriptions good enough to be the main feed.
- 03 explains how answers add up over time into patterns and unexpected suggestions.
  Watch time alone says little.
- 04 is about normalising conversation, friends' recommendations as a way out of your
  own algorithm, and admits that social features can pull people in. 05 says success is
  getting on with your day.
- 06 drops the “Future direction” label. “Villow doesn't tackle this yet” is now its
  first point, followed by why trust underpins everything else.

Verification: visibility tests pass, with new C2 checks for shared anchors, the missing
future label and the citation link. Browser check at desktop and 375px shows six chapters
and no overflow, and the preset bar fits six buttons.

## Villow C3 and C4 · why before what · 19 November 2026

Two new takes on `/work/villow`, after feedback that C2's wording read awkwardly, still
described features and gave the what before the why. C and C2 are unchanged. Same layout,
titles, intro note and anchors. Copy: `src/content/villow-principles-c3.ts` and `-c4.ts`.

- Both drop the business-model note shown after “Change the incentive” (“Personal control
  is a start…”) and the “Why focus on incentives?” disclosure with its two research links.
  Follow-up the same day: removed from every preset (B, C, C2, D, E too), so the
  `notes` flag was dropped. The “Change what the system rewards” line stays.
- C3 (“Why before what”) uses bullets. Each principle opens with why, then what, in plain
  terms that apply to any platform, with no YouTube examples. For example, 02 says turn
  down the compulsive parts and build up the worthwhile ones. Reminders are dismissable.
- C4 (“Why first, in prose”) gives each principle one bold “why” sentence followed by a
  short paragraph, spoken to the reader. It is built with the new `pointStyle="prose"`
  and an optional `lead` on each principle.
- Both keep the Aronson (1999) and Ntoumanis et al. (2021) citations for “change sticks
  when you choose it yourself”. Neither has a “Future direction” label.
- With eight preset buttons, the bar's buttons are tightened below 420px so the page
  select still reads “Villow”.

Verification: visibility tests pass, covering C3/C4 anchors, removed notes, C2 still
having them, and prose leads. The browser check at 375px shows no overflow.

### Follow-up: refine C3 and C4 · 19 November 2026

- C3 keeps its bullets, but each one now stands alone and carries its own reason; none
  starts with “So…” or continues the bullet before it. 01 combines “people want different
  things” with “offer a wide range of tools”. The limit-reminder bullet moved from 01 to
  05 as stopping points and reminders that leave the final say with the person. 02 puts
  the research and “show people their own habits” in one bullet with its citation.
- C4 drops the “you” voice and talks about people. 01 now stresses plenty of tools because
  one setup can't suit everyone, all optional and easy to understand, so the system works
  for people, not on them. 05 adds reminders people can set and dismiss.

## Villow C3 footnote and a new C4 · 20 November 2026

C3 is now the preferred take. The old C4 (bold "why" lead, then prose) is replaced by a
new C4 that is C3 reworded bullet for bullet, so the two compare line by line. The old
C4 copy is archived as `villow-c4-prose-before-replacing-2026-11-20.ts`; the prose mode
it needed (`pointStyle="prose"` and `lead`) is gone from `VillowPrinciplesVisual.astro`.
The preset bar now calls C4 “C3, reworded”.

- C3 and C4 replace the inline “(Aronson, 1999; Ntoumanis et al., 2021)” with a [1] after
  “themselves.” It opens on hover, keyboard focus or tap and shows both sources, their
  journals and a one-line summary of each finding (`PrincipleFootnote.astro`). Findings
  come from the abstracts, checked via OpenAlex and Europe PMC. C2 keeps inline citations.
- C4's 01 is unchanged from C3.
- C4's 02 explains the trade-off: a healthier app only works if people want to use it,
  so keep what they enjoy, scale back features designed to keep people hooked (autoplay,
  endless scrolling) and make what they value easier to find.
- C4's 03 builds on time spent instead of dismissing it, and says people keep reflecting
  when it gives something back.
- C4's 04 says what solo feeds can cost (scrolling alone, less in common, a narrower view)
  and drops “Good technology”.
- C4's 05 replaces the bullet that repeated its title with one about following through
  offline, such as a recipe to cook or a plan with friends.
- C4's 06 is “Fight disinformation.” It drops “every other improvement depends on trust”
  and says Villow has ideas (corrections that reach everyone who saw the original) but
  can't act on them yet, so it builds around people someone knows in real life.

Verification: visibility tests pass, covering the footnote markup and sources in C3/C4,
no inline citation, and 06's title in each. Browser check: hover, keyboard focus and tap
open the card, it stays inside the viewport at 375px (opening upwards near the bottom)
and closes on outside tap or Escape.

### Follow-up: C5 tightens C4 · 20 November 2026

New preset C5 (“C4, tightened”), copy in `src/content/villow-principles-c5.ts`. C3 and C4
are unchanged, so all three compare line by line. Shorter bullets throughout.

- 01: the platform works for people, not on them, “with each person shaping it for
  themselves” (the person using it, not the developer).
- 02: drops the autoplay and endless-scrolling examples and cuts the bullet to two short
  sentences.
- 03: time spent is worth tracking, and a quick question makes it more meaningful (the
  “natural pause” clause is gone). The second bullet asks for tools that make reflection
  worthwhile, such as seeing how habits change and getting suggestions, instead of the
  “weeks and months” wording.
- 04: drops “However enjoyable”. People can lose hours to solo feeds that they'd have
  enjoyed more with others, and rarely notice the trade-off.
- 05: “Apps built for engagement count every extra minute as a win. Count time well spent
  instead…” replaces “A better one”.
- 06: Villow “sidesteps the problem by connecting people with friends they know and trust
  in real life”.

Verification: visibility tests pass with C5 in the C3/C4 checks (footnote, disinformation
title, its own 01 wording).

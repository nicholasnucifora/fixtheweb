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

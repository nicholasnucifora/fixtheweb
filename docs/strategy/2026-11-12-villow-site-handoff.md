# Villow site agent preview handoff

Read-only handoff requested by Nicholas through the Fix the Web chat and received from the existing Villow site chat, “Simplify hosting page in preset C,” on 12 November 2026. Preserved in full below. Its implementation and operational descriptions are source-grounded reports from that agent, with the limits stated in the handoff. The companion context review records separate external checks and direct browser observations.

**This is a read-only handoff of the current Villow preview work, checked against the files on 12 November 2026.** I made no website changes, contacted no product agents, and performed no payment, account, deployment or publishing actions.

The central intent is: **Villow is a usable example of more deliberate platform design; Fix the Web is the broader effort to develop, evaluate and advocate for better choices online.** The user wants to preserve social media’s benefits, demonstrate alternatives, and recruit people who can help. They do not want the project reduced to an anti-social-media message, a productivity tool, or a claim that Villow has already proved better outcomes.

**The current files take precedence over older notes and parts of this chat.** The most useful authorities are the latest entries in [AGENTS.md](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/AGENTS.md>), the [page registry](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/preview-pages.js>), and the saved HTML. Some older README and handoff material describes superseded layouts, labels and proposals.

---

**The preview inventory contains 32 homepage presets, eight secondary-page variants, and an index alias: 41 saved visitor pages.** There are seven page families. These are local, unpublished redesigns, separate from the Astro website.

The local server is configured for `127.0.0.1:4411` by [serve-r.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/serve-r.mjs>). My HTTP checks could not reach it during this audit; I did not start or restart it because this request was read-only. The URLs below describe the configured routes, not freshly verified running pages.

**Homepage 34 is the selected direction.** Cross-page returns and the Villow wordmark choose 34. However, `/` and `/index.html` still contain homepage B. Anyone reviewing the intended current design should open [34 directly](http://127.0.0.1:4411/34.html).

| Preset and local URL | What it represents | Saved source |
|---|---|---|
| [B — Shared switch](http://127.0.0.1:4411/b.html) | Earlier detailed homepage with shared comparison controls. | [b.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/b.html>) |
| [C — Focused story](http://127.0.0.1:4411/c.html) | Shorter narrative; reduces feature tours and comparisons. | [c.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/c.html>) |
| [D — Balanced story](http://127.0.0.1:4411/d.html) | Restores devices, social examples and four comparisons to C’s shorter structure. | [d.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/d.html>) |
| [E — Everyday balance](http://127.0.0.1:4411/e.html) | Boundary/reflection, devices and social presentation refinements. | [e.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/e.html>) |
| [F — Room for your day](http://127.0.0.1:4411/f.html) | Daily allowance, worthwhile chart and an explained suggestion. | [f.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/f.html>) |
| [G — Connected watching](http://127.0.0.1:4411/g.html) | Connects limits, optional reflection and suggested adjustments. | [g.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/g.html>) |
| [H — Viewing story](http://127.0.0.1:4411/h.html) | Clarifies viewing evidence and the duration-filter suggestion. | [h.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/h.html>) |
| [I — Calmer insight](http://127.0.0.1:4411/i.html) | Simplified insight section. | [i.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/i.html>) |
| [J — Open spread](http://127.0.0.1:4411/j.html) | Alternative chart/suggestion composition. | [j.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/j.html>) |
| [K — Rating first](http://127.0.0.1:4411/k.html) | Alternative emphasis on the worthwhile-ratings graph. | [k.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/k.html>) |
| [L — Two outcomes](http://127.0.0.1:4411/l.html) | Graph and suggestion presented as complementary outcomes. | [l.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/l.html>) |
| [M — Clearer insight](http://127.0.0.1:4411/m.html) | Tighter copy, clearer graph denominator and viewing evidence. | [m.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/m.html>) |
| [N — Compact story](http://127.0.0.1:4411/n.html) | Compact insights, social cards and device reassurance. | [n.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/n.html>) |
| [O — Shared moments](http://127.0.0.1:4411/o.html) | Reworks the social presentation, drawing on N and M. | [o.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/o.html>) |
| [P — Steady rhythm](http://127.0.0.1:4411/p.html) | Refines usage-control and shared-watching illustrations. | [p.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/p.html>) |
| [Q — Calmer details](http://127.0.0.1:4411/q.html) | Shorter copy, consistent people, clearer suggestion and closing. | [q.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/q.html>) |
| [R — Gentle motion](http://127.0.0.1:4411/r.html) | Refines motion, social comparisons and user-control storytelling. | [r.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/r.html>) |
| [S — Choose your way](http://127.0.0.1:4411/s.html) | Three manually selected illustrated examples. | [s.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/s.html>) |
| [T — Three possibilities](http://127.0.0.1:4411/t.html) | Three examples displayed together. | [t.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/t.html>) |
| [U — A day your way](http://127.0.0.1:4411/u.html) | Workday/weekend illustration without character stories. | [u.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/u.html>) |
| [V — Your kind of watching](http://127.0.0.1:4411/v.html) | One illustrated watcher story at a time. | [v.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/v.html>) |
| [W — People, refined](http://127.0.0.1:4411/w.html) | Five refined watcher stories; the accepted visual reference for subsequent work. | [w.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/w.html>) |
| [Y — Scenery that fits](http://127.0.0.1:4411/y.html) | Responsive background composition experiments. | [y.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/y.html>) |
| [Z — Layered landscape](http://127.0.0.1:4411/z.html) | Separates scenery into independently positioned layers. | [z.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/z.html>) |
| [27 — Your landscape layers](http://127.0.0.1:4411/27.html) | Uses the user-supplied updated background, hill and forest. | [27.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/27.html>) |
| [28 — A quieter mobile page](http://127.0.0.1:4411/28.html) | Keeps mobile CTA; removes mobile cinema/cloud; centres stacked marketing copy. | [28.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/28.html>) |
| [29 — A closer landscape](http://127.0.0.1:4411/29.html) | Raises wide-screen scenery and enlarges trees. | [29.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/29.html>) |
| [30 — A softer landscape](http://127.0.0.1:4411/30.html) | Rejected tree/hill regeneration; accepted shallower footer direction. | [30.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/30.html>) |
| [31 — Original landscape, refined](http://127.0.0.1:4411/31.html) | Restores original artwork with deterministic edge repairs. | [31.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/31.html>) |
| [32 — A grounded forest](http://127.0.0.1:4411/32.html) | Accepted forest silhouette, removed shrub, grounded bases and responsive tree sizing. | [32.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/32.html>) |
| [33 — Natural Varela](http://127.0.0.1:4411/33.html) | Retained navigation-study page. | [33.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/33.html>) |
| [34 — Soft Nunito](http://127.0.0.1:4411/34.html) | Selected homepage and shared navigation direction. | [34.html](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/34.html>) |

These are retained iterations, not 32 equally endorsed directions. In particular, the current saved 33 also has shared navigation variant 34 after the user asked to apply the selected navigation everywhere. Its name no longer guarantees a visible typography comparison.

The rendering chain matters if work is resumed: [render.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/render.mjs>) builds B–N from the baseline and transformation modules; subsequent renderers derive from saved earlier HTML. [render-navigation-studies.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/render-navigation-studies.mjs>) derives 33/34 from 32. Historical renderers should not be indiscriminately rerun; shared header/footer synchronization is a separate step.

| Current secondary page | Current role | Main editable source |
|---|---|---|
| [Setup B](http://127.0.0.1:4411/setup-b.html) | Compare app, extension and both; guided recommendation. | [setup-page-b.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-page-b.mjs>) |
| [Setup instructions B](http://127.0.0.1:4411/setup-instructions-b.html) | Create/join, install extension and connect it. | [setup-instructions-page-b.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-instructions-page-b.mjs>) |
| [Hosting B](http://127.0.0.1:4411/setup-hosting-b.html) | Earlier owner guide; retained comparison. | [setup-hosting-b.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-hosting-b.mjs>) |
| [Hosting C](http://127.0.0.1:4411/setup-hosting-c.html) | More structured host essentials; retained comparison. | [setup-hosting-c.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-hosting-c.mjs>) |
| [Hosting D](http://127.0.0.1:4411/setup-hosting-d.html) | Current simplified hosting direction and default hosting destination. | [setup-hosting-d.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-hosting-d.mjs>) |
| [Design concepts B](http://127.0.0.1:4411/concepts-b.html) | Five open proposal chapters, including three expandable AI ideas. | [concepts-page-b.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/concepts-page-b.mjs>) |
| [Get involved A](http://127.0.0.1:4411/help-a.html) | Try, share, contribute skills, optionally fund the work. | [help-page-a.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/help-page-a.mjs>) |
| [Contribute your skills A](http://127.0.0.1:4411/about-a.html) | Collaboration routes, contact, founder and personal message. | [about-page-a.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/about-page-a.mjs>) |

Secondary pages are generated by [render-secondary-pages.mjs](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/render-secondary-pages.mjs>), with page-specific CSS/controllers and shared navigation/footer assets.

**Retired or superseded material should not be mistaken for current options.**

- X was explicitly rejected and archived. Its old URL redirects to W. The user disliked its simplified character illustration and flat wide-screen hills.
- 35–37 were rejected navigation-hover experiments and removed. Their old URLs redirect to 34.
- Setup A and Concepts A remain as historical source/files but redirect to B and are absent from the active picker.
- Hosting D’s separate troubleshooting page is retired. Its old URL redirects to D, preserving the useful fragment.
- Older complete series under `_archive` are private historical material, not active proposals.
- The old written sample-data tour in the Astro site is not the hands-on preview the user wants eventually. The latest instruction explicitly defers that demo; the suggested future label is “Try the demo.”

---

**The intended visitor journey is calm, concrete and progressively deeper.** First show what watching differently feels like, then let people choose a practical route. Keep operational complexity out of the opening. Offer wider ideas and ways to contribute after visitors understand the product.

The current homepage tells this story:

1. **“YouTube, with a stopping point.”**  
   “Villow gives you a feed that ends, boundaries you choose, and space to reflect on what was worth watching.”

2. **“A feed you can finish.”**  
   Choose channels and a daily viewing limit. The feed combines channel uploads, saved videos and discoveries. The illustrated five-card feed supports removing/saving, touch swipes and a finite “All caught up” ending.

3. **“Your watching. Your choice.”**  
   Five illustrated people demonstrate different preferences, rather than one morally correct way to watch:
   - Shorts fan: 15 minutes of Shorts within a 45-minute YouTube allowance.
   - Curious browser: 100 recommendations seen per day, Shorts turned off.
   - Channel gardener: channel-specific duration, title and playback-speed choices.
   - Evening planner: different workday/weekend limits, time away and bedtime.
   - All-rounder: app plus extension, connected progress and a shared daily allowance.

   Those numbers and characters are illustrative examples, not prescribed defaults or testimonials. Each story labels whether it concerns the app, extension or both.

4. **“Learn from what you watch.”**  
   Optional “worth your time” reflection, a worthwhile-ratings graph and an explained channel-duration suggestion. The example asks whether to show new 5–30 minute videos because the person watches that range and skips others.

5. **“Good videos, better company.”**  
   Personal recommendations with a note, followed by watching together with a shared queue, synchronized playback and chat.

6. **“One experience, across your devices.”**  
   Saved videos, settings and viewing activity remain together in the app experience.

7. **“Designed for life beyond the screen.”**  
   Four comparisons contrast familiar patterns across different apps with Villow’s approach.

8. **“Ideas beyond Villow.”**  
   Explicitly acknowledges that some ideas require platforms themselves to build them, with a route into Design concepts.

9. **“Watch what you meant to. Then get back to your day.”**  
   Returns to the practical setup action rather than ending on a second manifesto.

**The comparison section is central to the argument, but its claims need careful framing.**

| Topic | Common-pattern example | Villow presentation | Important qualification |
|---|---|---|---|
| Streaks | Return daily to preserve a streak. | Days without raising limits, including days away. | Not simply “days under a time limit”; actual allowance/extension semantics matter. |
| Beside the video | Another recommendation invites continued watching. | An optional to-do list keeps other activities in mind. | Rest and enjoyment count; this must not become productivity pressure. |
| Usage and controls | Buried in settings or absent. | Usage and limits in the main experience. | The comparison is across apps, not a claim that YouTube has no controls. |
| Social incentives | Public likes/followers encourage status-seeking. | Opt-in sharing of usage with friends. | Whether social comparison helps is untested; do not present it as an established wellbeing intervention. |

The homepage’s graph, example chat, named friends and usage trends are demonstration material. The finite feed and carousel have real local interaction; that does not make their data real. The current suggestion example retains button presentation without making a real account adjustment. The desktop cinema has local playback/scrubbing/reflection interaction; it is removed entirely from the mobile composition.

---

**The visual direction is substantially settled, particularly the W → 32 → 34 lineage.** It should not be reopened as a generic rebrand.

The user’s recurring preferences are:

- Soft, rounded typography; warm cream, sage, muted peach and green surfaces.
- Friendly illustration with enough character and detail to feel alive.
- Solid fills rather than thin outlined boxes.
- Measured motion with reduced-motion support and manual controls.
- Clear hierarchy without overexplaining technical implementation.
- A landscape that stays compositionally connected to the headline/CTA, rather than sinking lower as the window narrows.
- Visible, appropriately sized forests, with their bases convincingly behind the foreground hill.
- A subtle footer horizon at both wide and narrow sizes.
- On mobile, keep Get started, hide the whole cinema/cloud/rating scene, and centre stacked marketing copy.
- Avoid repeated or unnecessary boxed invitations.

The user explicitly rejected newly generated replacement trees and hills in 30. Subsequent work restored original supplied art and used deterministic transparency/edge repair. The accepted 32 forest uses the user’s `trees2.png` silhouette with the unwanted trailing shrub removed.

**Do not describe the artwork as entirely human-made or free of generated content.** Earlier artwork and some background preparation remain AI-origin. The later no-generation instruction applies strongly to further landscape repair; deterministic cleanup did not erase the assets’ provenance. A possible human retouching commission was discussed, but no commission or artist vetting outcome is established.

The [32 notes](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/32-LANDSCAPE-NOTES.txt>) and [27 notes](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/27-LANDSCAPE-NOTES.txt>) explain the supplied assets, derived deliveries and grounding decisions.

**Navigation and footer now form one shared system.**

The current top row is Villow, **Get involved**, **Get started**, and Menu. Hosting was removed from this compact row but remains in the expanded menu/footer. At 500px and below, Get involved disappears from the top row; the logo, Get started and Menu remain.

Opening Menu replaces the standard navigation content with the directory. The Villow wordmark remains in exactly the same place. Closing works through the toggle, Escape, pointer departure and other appropriate dismissal paths.

Current groups are:

| Group | Entries |
|---|---|
| Villow | Get started; Design concepts; Hosting guide; About Villow |
| Help | Questions; Privacy; Terms; Contact |
| Community | Discord; Reddit; Get involved; Contribute your skills |
| Project | GitHub; Fix the Web |

Questions, Privacy, Terms, Discord, Reddit and GitHub are currently non-link placeholders in this directory. Some corresponding real destinations exist elsewhere, notably the community buttons on Get involved; do not assume the directory is fully connected.

“About Villow” leads to the page now titled “Contribute your skills.” This is an existing naming mismatch worth preserving as a known issue, not silently interpreting as a separate About page.

The selected treatment uses Nunito, visible category hierarchy and mint hover boxes for directory entries. Branding has no decorative hover effect. The Fix the Web spider follows a nearby pointer quietly; it is not a toy, looping character animation or interactive pet. On narrow menus the project-introduction block is hidden; in the narrow footer it appears below the links in a softly filled strip, with the spider vertically centred across the title and explanation.

Sources: [navigation copy](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/navigation-studies.js>), [directory markup](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/site-directory-markup.mjs>), [header](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/preview-header.mjs>) and [footer](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/preview-footer.mjs>).

---

**Setup explains three distinct products/usage modes, not three cosmetic packages.**

| Route | Promised experience in current copy | Important boundary |
|---|---|---|
| Villow app | Finite subscriptions/country-chart/friend feed; ratings, insights, suggestions, social features and synced progress. | It does not import YouTube’s personalized recommendation feed. |
| Standalone extension | Keep watching YouTube, including its recommendations, with chosen usage/exposure controls. | No Villow social features or detailed app insights; usage and limits remain local to that browser. |
| App + extension | Choose videos on YouTube and bring them into Villow; connected usage and supported limits; app insights/social features. | Adds a deliberate switching step and requires pairing. Not every signal or setting has universal coverage. |

The guided question is **“Do you want YouTube’s recommendations?”** No recommends watching in Villow; Yes presents the standalone extension and app+extension, with the combined option recommended and an optional walkthrough.

The instructions page then separates:

- **Create your own Villow:** roughly 30 minutes in the current copy; own service accounts; optionally invite friends.
- **Join a friend’s Villow:** ask them to invite your Google account, open their link and sign in.
- **Choose a trusted host:** the host can access stored viewing/usage data. Google sign-in does not disclose the Google password.

The Windows installer button is disabled: it is not a verified downloadable release in this preview. macOS/Linux say coming soon; manual setup links to the existing developer page.

Extension guidance currently provides:

- Desktop Chrome, Firefox and Edge store destinations; Safari coming soon.
- Firefox on Android.
- Orion with Chrome-extension support on iPhone/iPad.
- Explicit warning that the extension runs in the browser, not the native YouTube app.
- Pairing through Villow’s Extension page → Create connect link → paste in extension settings → **Connect** → open YouTube.

Store availability, mobile browser compatibility and exact current product behavior need release verification before these become definitive public promises.

The walkthrough uses app-derived UI with fictional video data. Its Home iframe is sandboxed; it is not the visitor’s account or a new hosted installation. Sources include [comparison](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-comparison-b.mjs>), [create/join](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-web-options-b.mjs>), [extension guide](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-extension-guide-b.mjs>) and [teaching story](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-extension-story-b.mjs>).

---

**Hosting D is intended to make ownership understandable without turning the opening into infrastructure documentation.** “Your Villow” means a self-hosted installation shared with trusted people, not a centrally supplied account or a separate product called “Villa.”

Its main messages are:

- You can start hosting **for free**.
- Sharing with friends is strongly encouraged.
- Budget for Vercel, and potentially Supabase, as usage grows.
- Eligible free plans can be used until their allowances or terms require a change.
- There is no fixed number of friends that automatically forces payment.
- The first place to look is **“Open your Villow → Admin.”**

The Admin instruction is intentionally not a universal link or an address-entry form. Each installation has its own URL. Admin is presented as the contextual place for group usage, members and System health; provider billing and outages remain provider concerns.

The three service cards are **YouTube API → Vercel → Supabase**, with solid distinct fills. They stay in a horizontal comparison row on narrow screens rather than becoming a long stack.

All 15 answers open inline in four groups:

- YouTube API: new videos, reset timing, whether paid hosting increases allowance.
- Vercel: paused/unavailable app, courtesy extension, upgrade timing, automatic charges.
- Supabase: inactivity/limit problems, upgrade timing, backups.
- Your Villow: invitations, sign-in, updates, stopping hosting, other help.

**Provider facts are documented claims, not freshly verified facts from this audit.**

- B states a normal allowance of 10,000 units for most requests plus 100 search calls. D deliberately avoids those numeric details.
- Daily YouTube allowance is described as shared by the installation and resetting at midnight Pacific.
- Paying Vercel or Supabase does not increase Google’s API allowance.
- Removing/revoking a member does not undo already counted usage or automatically remove stored data.
- Subscription updates are described as occurring when Home opens; the maintenance cron is a different mechanism.
- Vercel Hobby eligibility is personal/non-commercial; a usage-limit pause can affect everyone, including access to Admin.
- The guide allows asking Vercel for a one-time courtesy boost. One host’s recorded outcome was **3× allowance for 30 days**, not a guaranteed extra month for every host.
- Listed starting prices are Vercel US$20/month and Supabase US$25/month, before applicable extras/taxes. These require fresh verification.
- Supabase inactivity pause, exhausted allowances and failed sign-in are not treated as interchangeable problems.
- Update, full backup/restore and shutdown walkthroughs remain explicitly under verification.
- Database backups are not presented as including all uploaded storage files.
- Uninstalling the setup program does not cancel hosting services.
- Deleting Supabase is destructive; it does not delete the members’ Google accounts.

Hosting B and C remain comparisons. C includes the address-entry Admin form and more technical symptom/diagnosis/fix structure the user subsequently removed from D. Do not carry those elements back into the preferred experience by treating all versions as equally current.

---

**Design concepts B is a separate proposal space, not an expanded current-feature list.** Its opening says:

> “Ideas for a more thoughtful YouTube. Most would need YouTube itself to build and test them.”

The current five chapters are:

| Chapter | Proposal | What must not be inferred |
|---|---|---|
| Community notes | Broader notes participation and notifications to people who watched within the preceding two weeks when later context appears. | That Villow currently sends such corrections, or that their effect on beliefs has been established. |
| Turn watching into doing | Creators attach a meaningful action; viewers save it; creators learn which suggestions people choose. | A functioning creator portal, verified submission pipeline or real action measurement. |
| Recommendations from people | Limited viewer recommendations help meaningful videos find audiences across channels and ages. | An existing Villow-wide recommendation network or proven clickbait/polarization reduction. |
| Generative AI in Villow | Three optional exploratory ideas, each with benefits, concerns and a position. | Current generative-AI features or imminent release commitments. |
| Fight bots and fake comments | Preserve human conversation while acknowledging detection errors and appeals; private sharing is one limited response. | That Villow detects bots, verifies truth, or solves abuse in public conversations. |

The three current AI ideas are:

1. **Generate chapters:** viewers request them; creators are notified and can write them or choose AI assistance. Review and AI disclosure matter.
2. **Talk with AI about a video:** optional source-aware questions and discussion, with a possible route to considering a community note.
3. **AI for community notes:** help find sources, check claims and draft notes, including a proposed “Request AI fact-check” action. Human review across different perspectives remains essential.

A request for fact-checking is explicitly not proof that a video is false. AI confidence, missing context and unsupported citations are acknowledged risks.

Older files discuss six AI possibilities, including comment interpretation, topic preferences, recommendation refinement and task-side conversations. Those remain background ideas, not the current B page’s three-card content. The broader cross-platform usage vision also appears in older/production-source material but is not an extra sixth chapter on current B.

The correction dialog, note-helpfulness radios and creator “Add to your list” button are local demonstrations. They do not submit real notes, record real helpfulness votes or alter a real task list. The example video/history is fictional.

The page cites two observational X Community Notes studies. The source records distinguish reductions **after a note appeared** from smaller reductions across a post’s full lifespan or analysis window. They explicitly say the studies did not test YouTube or the proposed correction notifications. The source’s figures are 46.1% versus 11.6%, and 61.2% versus 14.9%, with an 18.1-hour median delay in the second study. I have not independently rechecked those papers in this audit. See [citation definitions](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/concepts-citations.mjs>).

YouTube notes eligibility, Hype scope, current AI-note participation on X and YouTube’s fake-engagement policy are all external, time-sensitive references requiring rechecking before publication.

---

**Get involved A offers several levels of participation without making money the only meaningful contribution.**

Its sequence is:

- **“Like what Villow stands for?”**
- **Try Villow:** real experience and the in-app feedback page help identify usefulness and friction.
- **Spread the word:** friends, communities and creators; Reddit, Discord and Contribute your skills buttons.
- **Financial support:** ongoing development, maintenance, details and the broader Fix the Web effort.
- **“A better web will take all of us.”**
- **Explore Fix the Web.**

The user particularly liked that final invitation. They rejected a separate boxed “Help shape what comes next” panel: the skills invitation belongs naturally in the flow, with the deeper collaboration page available for people who want it.

**The support integration is the exception to “this is only a mock-up.”** The ordinary local page uses the existing production Worker and live Stripe configuration. The redesign itself remains unpublished.

Current implementation/documentation describes:

- One-time support by default; monthly alternative.
- A$5/A$10/A$20 recurring tiers.
- One-time presets and custom amounts from A$5.
- Foreign-currency display estimates; actual AUD charge is explained.
- Customer Portal access for monthly management.
- Optional public display of name, note and permitted contribution amount.
- Explicit consent and moderation before public display.
- Email-verified removal with confirmation; merely opening a link does not remove anything.
- Public-details removal does not remove supporter benefits.
- Any contribution gives lasting private Discord-chat access; monthly support adds an Ongoing Supporter role.
- Discord verification/linking and role workflows, with Reddit flair deferred.
- Five supporter messages at a time, within a bounded latest-50 window, without autoplay or an endless history.

The privacy wording allows approved public details to appear on **Villow and other Fix the Web projects**. This is a real cross-project relationship to account for in any strategy.

The developer “Preview states” mode uses fictional fixtures and blocks external network/form actions. Documentation records 55 review states covering payments, Discord verification/accounts/rewards, messages and removal. Ordinary mode uses the live service; fixture mode does not send emails, charge money or change roles.

Sources: [support markup](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/help-support.mjs>), [controller](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/help-page-a.js>), [integration notes](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/SUPPORT-INTEGRATION.md>) and [backend status record](<C:/Users/Nebula PC/Development/villow-site/support/README.md>).

The status records report earlier sandbox checks and some live configuration/checkout checks, with specific remaining gaps. I did not inspect current production records, make a payment or verify a live renewal/cancellation. Those historical notes are not a fresh operational certification.

---

**Contribute your skills A is deliberately collaboration-first, followed by the person behind the work.**

Its current order is:

1. **“Bring what you’re good at.”**
2. Four contribution routes.
3. Contact.
4. The team.
5. Nicholas’s personal message.

The four routes are:

- **Build and improve Villow:** code, design, accessibility, testing and documentation.
- **Help us learn what works:** research/evaluation, including what helps, whom it helps and where it falls short.
- **Bring it to policy conversations:** senators, MPs, policy advisers, relevant organizations, introductions and legislative expertise.
- **Help the idea reach people:** YouTubers, writers, journalists and community organizers.

The page welcomes unfinished ideas and people without a particular job title. Its calls to action are ordinary topic-specific mailto links; it does not claim to operate a research program, legislative campaign team or established partnership network.

Contact is `support@villow.app`, repeated here and retained in the menu/footer.

The team is **Nicholas Nucifora, Founder · Villow & Fix the Web**, and explicitly just him currently. There is no invented biography, professional qualification, portrait or larger team.

The complete current personal message is:

> I’m concerned about what social media’s design means for our mental health, attention, relationships and trust in democracy. These questions reach well beyond the time we spend on a screen.
>
> Yet most of us use social media for good reasons: to learn, stay connected, find community and share what matters. But that usefulness is also what makes its problems so hard to escape: stepping away can mean losing things we value. That usefulness is exactly why I think improving it is so important.
>
> I want to help show what healthier social media could look like in practice. Villow is my way of turning those ideas into something people can try, question and help improve. Fix the Web is the broader effort behind that work.
>
> I’ve spent months iterating on Villow. Now I need evidence to understand which ideas help, which fall short and what needs to change. That means learning from the people using it and working with researchers to test the assumptions behind its design.
>
> I believe this is one of the most important problems we can work on, because it touches so many parts of our lives. I can keep building, but I can’t do this alone. If you can help with research, code, policy or getting these ideas in front of more people, I’d love to hear from you.

The latest explicit correction was important: **do not lose the idea that social media’s usefulness is itself part of why its problems are difficult to escape.** The user wanted both that tension and the constructive conclusion about improving it.

The rewrite deliberately changed “data to validate my thoughts” into testing assumptions and learning where ideas fall short. That is a meaningful research posture to retain.

---

**There is additional product and strategy content in the Astro source, but it is not a set of active redesign preview pages.** It should be treated as supporting context and a source of qualifications, not silently imported wholesale.

Relevant source pages include:

- [How it works/features](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/features.yaml>)
- [Extension](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/extension.yaml>)
- [Principles essay](<C:/Users/Nebula PC/Development/villow-site/src/content/prose/principles.md>)
- [Privacy overview](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/privacy-overview.yaml>)
- [Roadmap](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/roadmap.yaml>)
- [AI discussion](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/ai.yaml>)
- [Creator showcase](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/creators.yaml>)
- [YouTube could do this](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/youtube-could-do-this.yaml>)
- [Written sample-data tour](<C:/Users/Nebula PC/Development/villow-site/src/content/pages/demo.yaml>)

The source also contains download, owner guidance, hosting help, FAQ, support and draft policy pages. I did not verify the current deployed version of each route.

**These sources preserve important product boundaries that the shorter preview copy cannot fully explain.**

- “Worthwhile” is the person’s judgment. Entertainment, comfort and rest count.
- Ratings are optional; worthwhile percentages use rated videos, not invented judgments about unrated ones.
- Suggestions use transparent rules and sufficient patterns in ratings/skips/usage. They are not generative AI or imported YouTube recommendations.
- Suggestions explain themselves, can be dismissed and do not automatically change settings or suggest higher limits.
- Coverage is Villow plus supported connected YouTube browsers, not the native YouTube app, all browsers or the whole device.
- Extension reports do not provide every app measurement; the hourly chart excludes extension totals without hourly detail.
- Limits are chosen boundaries, not tamper-proof controls.
- Finish-current-video allowances, bedtime snoozes, breaks and raising limits are distinct behaviors.
- Watch together is described in source as implemented for up to 10 accounts, with invitations, acceptance, synchronized playback, queue and chat. Group decisions at a member’s limit remain unfinished.
- Task integrations are optional; real task-management permissions can include writes and deletion.
- Country charts offer a potential shared reference point. Popularity is not truth or quality, and reduced polarization is not an established result.
- Host database access is different from ordinary member-sharing permissions.
- Private viewing measurements are not automatically sent to Fix the Web.
- Optional submitted feedback is described as using Tally and a participant code; self-reported feedback has limitations.
- Villow adds no ads and sells no viewing data, but YouTube’s embedded player may still show YouTube ads.
- Google permissions are broader than a simple read-only sign-in. Policy/source details must remain accurate.
- The draft app policy still has unresolved retention/minimum-age/effective-date material.

I have not independently audited the app or extension implementation in this request. These are descriptions and cautions grounded in this repository, not fresh end-to-end product verification.

---

**For Fix the Web strategy, the material supports a clear division of responsibility.** The following is my synthesis of the user’s intent and current copy, rather than a new strategy already approved by them.

| Preserve in Fix the Web | Keep primarily on Villow’s product site |
|---|---|
| The tension between social media’s value and its harms. | Detailed app/extension/both selection. |
| A constructive vision of better design, with working examples. | Installers, browser stores, pairing and compatibility. |
| User choice, meaningful stopping points, optional reflection and understandable controls. | Exact limit semantics and feature-specific instructions. |
| Evidence-seeking research that can challenge the designs. | Hosting, API quotas, backups, billing and recovery. |
| Invitations to researchers, builders, creators, policy people and communities. | Operational troubleshooting and installation privacy details. |
| Native platform adoption as a way to reach people without requiring everyone to self-host. | Villow-specific screenshots, demos and detailed product comparisons. |
| Separation between working prototypes, hypotheses, proposals and policy asks. | Product release status and availability. |
| The founder’s motivation and honest need for collaborators. | An extended feature catalogue. |
| “A better web will take all of us.” | Repetition of the entire movement argument on every support page. |

The stronger movement story is **“Here are choices we can build and evaluate; help make them available more widely.”** Villow supplies a concrete example. It should not be positioned as proof that every proposed design works, or as the only possible implementation of the movement’s values.

The platform-native argument is present explicitly in the Astro sources: public API access enabled much of Villow, but native platforms could offer these controls directly and reduce setup, coverage and quota barriers. The same material also acknowledges YouTube’s existing tools; it does not support a blanket “platforms provide no controls” claim.

The product site should let a visitor get to a useful choice quickly. The movement site can explain the wider problem, research agenda, proposals and routes for collective action. A person should be able to care about Fix the Web without first becoming a Villow host or donor.

---

**The main due-diligence limits and unresolved issues are these.**

1. **No outcome proof:** better wellbeing, less compulsive use, improved relationships, reduced misinformation or polarization are not established Villow results.
2. **No fresh product audit:** this review did not verify all feature claims against current app/extension releases.
3. **No fresh external fact-check:** prices, quota rules, provider recovery offers, store availability, browser support and platform programs need current verification.
4. **Research transfer limits:** X Community Notes results do not validate YouTube notifications or AI-assisted fact-checking.
5. **Operational gaps:** owner update, complete restore and shutdown guides remain under verification.
6. **Unfinished access points:** disabled installer, Safari/macOS/Linux promises, non-link menu entries and the deferred hands-on demo must not be presented as finished.
7. **Naming mismatch:** About Villow currently opens Contribute your skills; broad Get involved is a separate page.
8. **Root mismatch:** the server root is B despite 34 being selected.
9. **Historical documentation drift:** older notes describe extra AI cards, chapter indexes, separate troubleshooting pages and obsolete navigation. Current generated pages and latest source take precedence.
10. **Live-support exception:** local does not mean financially inert. Only the isolated preview-state mode is explicitly simulated.
11. **Artwork provenance:** accepted visuals still include AI-origin material. No completed human commission is established.
12. **Privacy completeness:** claims about “no analytics” on the site must not be stretched into “no data processing”; hosting, support services, the app and extension have different data flows.
13. **Team and participation:** one founder is identified. There are invitations for research and policy collaboration, not evidence of established institutions, partners or a staffed movement.
14. **Deployment distinction:** the preview redesign remains local/unpublished. An older public site and support backend have separate deployment histories. This audit does not certify their present live state.

The visitor experience and the strategic argument should both preserve that honesty: **useful choices now, visible possibilities beyond them, and a serious invitation to find out what actually helps.**

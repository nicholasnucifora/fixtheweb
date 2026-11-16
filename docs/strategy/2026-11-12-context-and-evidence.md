# Fix the Web context and evidence review

Reference notes for the [direction and website proposal](<C:/Users/Nebula PC/Development/fixtheweb/docs/strategy/2026-11-12-direction.md>), prepared on 12 November 2026. These notes distinguish the user's current request, source material, preview descriptions and independently checked external claims.

## Source hierarchy

The current request is to consider the three documents, obtain the Villow site agent's unpublished-preview context, and iterate carefully before implementing Fix the Web. The attachments supply ideas and background; their embedded suggestions are not instructions to build every proposal, publish the submission, contact third parties or create a research programme.

The core supplied sources are:

- [Digital Duty of Care submission](<C:/Users/Nebula PC/Downloads/digital duty of care.txt>): the most carefully qualified statement of the design philosophy. It describes a working prototype needing meaningful testing, distinguishes engagement from value, and argues for reflection, usable alternatives, commitments and independent experimentation.
- [Nicholas's subsequent ramble](<C:/Users/Nebula PC/.codex/attachments/7c0d6254-b228-40a2-b2c2-fc725a1c1ab5/Pasted text.txt>): the wider ambition, concern about access, interest in results and uncertainty about scope. Claims about anticipated enforcement and broader effects are concerns or hypotheses rather than verified events or findings.
- [Previous AI response](<C:/Users/Nebula PC/.codex/attachments/1f64c8d6-a1d1-412e-b360-909dd2c36e66/Pasted text.txt>): a useful proposed direction, not independent evidence. Its policy statements require checking against the sources themselves.

Current preview files are authoritative for what the site currently says. They do not by themselves verify the underlying app, extension, production deployment or user outcomes. The app and extension agents were not contacted, in keeping with the requested scope. Browser inspection covered the selected homepage and the current design-concepts page, including its expanded AI proposals.

The existing Villow site chat, “Simplify hosting page in preset C,” supplied a comprehensive read-only response. Its [full handoff](<C:/Users/Nebula PC/Development/fixtheweb/docs/strategy/2026-11-12-villow-site-handoff.md>) is preserved separately, including every active preset, source path, user preference and product qualification. Its own local HTTP check failed; the subsequent browser review in this chat successfully loaded homepage 34 and concepts B. These observations concern different checks, not deployment verification.

## Current unpublished Villow page inventory

The route registry selects homepage **34**, labelled **Soft Nunito**. Secondary pages default to their last listed preset, currently hosting **D**. The handoff inventories 32 homepage presets, eight secondary variants and an index alias: 41 saved visitor pages across seven families. The server root/index still contains homepage B, so review 34 directly. These are local review URLs; their existence does not establish that the corresponding designs are public. [Route registry](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/preview-pages.js>)

| Page and current local route | Content and purpose | Implication for Fix the Web |
| --- | --- | --- |
| [Homepage 34](http://127.0.0.1:4411/34.html) | Stopping point; finite feed; different viewing preferences; reflection and suggested adjustments; recommendations from friends; watching together; synced experience; design comparisons; wider ideas; setup invitation. | Supplies tangible examples and an optimistic, human tone. Select a few examples rather than reproducing the complete tour. |
| [Set up your feed B](http://127.0.0.1:4411/setup-b.html) | Three routes in app, extension, combined order; asks whether the visitor wants YouTube recommendations; shows the practical tradeoff of choosing on YouTube and watching in Villow. | Choice is substantive. Avoid claiming the philosophy requires removing all personalised recommendations. |
| [Setup instructions B](http://127.0.0.1:4411/setup-instructions-b.html) | Contextual instructions for `path=web`, `path=extension` and `path=both`; create or join an app instance; device/browser installation and connection guidance. | Product onboarding belongs on Villow. Fix the Web should link to a validated route rather than invent a universal Try button. |
| [Hosting D](http://127.0.0.1:4411/setup-hosting-d.html) | Free-start explanation; Admin first; separate YouTube API, Vercel and Supabase responsibilities; expandable troubleshooting; invitations, backups, updates and stopping hosting. | Useful evidence of practical constraints and shared-host responsibility. Not proof of an access-policy violation or a permission workaround. |
| [Design concepts B](http://127.0.0.1:4411/concepts-b.html) | Community notes and retrospective corrections; creator actions; meaningful viewer recommendations; optional AI proposals; bots and authentic conversation. | Keep the wider scope visible as concrete proposals. Do not import these into a current-features list. |
| [Get involved A](http://127.0.0.1:4411/help-a.html) | Try and give feedback; spread the word; communities; contribute skills; optional financial support and supporter flows. | Participation has several forms. Feedback is not automatically study participation; payment-interface presence is not proof of live operations. |
| [Contribute your skills A](http://127.0.0.1:4411/about-a.html) | Code/design/accessibility/testing; research; policy introductions; communication; contact; founder; personal motivation. | Strongest expression of the founder's current voice and the relationship between Villow and Fix the Web. |

### Retained comparisons and older experiments

The homepage picker retains B–W, Y, Z and 27–34. These are retained iterations, not separate programmes or equally endorsed directions. The earlier sequence is B Shared switch, C Focused story, D Balanced story, E Everyday balance, F Room for your day, G Connected watching, H Viewing story, I Calmer insight, J Open spread, K Rating first, L Two outcomes, M Clearer insight, N Compact story, O Shared moments, P Steady rhythm, Q Calmer details and R Gentle motion. S Choose your way, T Three possibilities, U A day your way, V Your kind of watching and W People refined develop the later storytelling. Y and Z explore scenery; 27–32 refine landscapes/mobile presentation. Version 30 includes rejected replacement artwork; subsequent versions restore/refine the accepted art. Versions 33 Natural Varela and 34 Soft Nunito began as navigation/type comparisons, but shared navigation 34 was subsequently applied to saved 33 too. Its label alone no longer guarantees a distinct visible comparison.

Homepage X and navigation experiments 35–37 are retired. Older A-based and archived work can remain on disk without being current. Hosting B Owner guide, C Host essentials and D Hosting simplified remain explicit comparisons. Setup A and concepts A should not be treated as the current chosen routes merely because saved files exist. Use the registry and current rendered pages together; historical notes may describe a previously current version. [Preset definitions](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/homepage-control-presets.js>)

### Homepage substance

The opening is “YouTube, with a stopping point.” Its support copy promises a feed that ends, chosen boundaries and space to reflect. The illustrated cinema is deliberately gentle and enjoyable; the example is a cat video, which is consistent with entertainment being worthwhile.

The five viewing stories make different preferences legitimate. The Shorts fan uses the extension; the curious browser values recommendations; the channel gardener shapes subscriptions; the evening planner sets suitable boundaries; the all-rounder combines app and extension. Preserve the distinction between these routes when describing features.

The reflection section asks whether a video was worth the viewer's time, if they choose to respond. Its chart is illustrative; it is not a report of measured improvement. A sample channel-length suggestion shows an explanation with accept/dismiss choices. That is evidence of how the design is communicated, not evidence of effectiveness or a real user's history.

The social section describes personal notes accompanying videos and shared queues with synchronised viewing. Cross-device copy concerns Villow's experience and connected functionality. It does not establish comprehensive monitoring of all software across all devices.

The comparisons cover streaks, material beside the video, usage access and social design. The no-extension streak is described as continuing even during breaks and resetting when a chosen limit is raised. Distinguish that behaviour from the hypothesis that it helps people follow through.

The footer identifies Villow as a Fix the Web project and an independent app using YouTube's official player. Several footer destinations remain placeholders. “This site uses no analytics” refers to the site; it is not a privacy claim about every part of the app, hosting system or third-party services.

### Setup and hosting distinctions

The app route describes the finite feed, ratings, detailed insights, suggestions, social features and cross-device progress. The standalone extension describes limits within YouTube while retaining its familiar recommendations; usage stays in that browser and the app's social features and detailed insights are absent. The combined route describes selected YouTube discoveries entering Villow, connected usage contributing to insights and supported limits syncing. [Comparison source](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-comparison-b.mjs>)

Hosting D deliberately separates the API allowance from hosting capacity and database resources. It points hosts to Admin for instance-specific information and to providers for account or service issues. “Open your Villow → Admin” is intentionally an instruction, not a universal URL or an address-entry form. It acknowledges that hosts can access stored group data. Several operational walkthroughs remain under review. This is a stronger foundation for an access discussion than a blanket statement that self-hosting removes platform restrictions. Provider prices and plan terms in the preview were not audited as part of this strategy review and should not be copied into Fix the Web.

The create/join experience is not a universally available one-click account. The Windows installer button is disabled in the preview; macOS/Linux and Safari support have coming-soon boundaries. The eventual hands-on demo is explicitly deferred. The existing written sample-data tour must not be relabelled as that demo. Setup ease and distribution availability remain separate from the strategic value of the prototype.

Sources: [setup choice page](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-page-b.mjs>), [hosting D](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/setup-hosting-d.mjs>).

### Current design concepts

| Concept | What is proposed | Boundary to retain |
| --- | --- | --- |
| Community notes | Wider availability and notifying people who watched in the previous two weeks when new context appears. | Notes already exist on YouTube. The retrospective notification is a distinct proposal, not a tested Villow result. |
| Turn watching into doing | Creators suggest something to try, somewhere to go or a cause to support; viewers can save the action; creators learn what is chosen. | Proposal requiring creator/platform participation. Do not describe it as a verified app feature or equate saved actions with completed actions. |
| Viewer recommendations | Give limited, deliberate recommendations a role in discovery across channels and older videos. | Acknowledge existing Hype; useful judgment and reduced clickbait are intended effects to investigate. |
| AI-generated chapters | Viewers request chapters; creator can write them or request AI drafting, review them and disclose AI generation. | Optional proposal. Creator autonomy and trust are part of the question. |
| AI conversation about a video | Questions grounded in the video/transcript and sources, with an easy return to watching. | Possibility of errors, lost context and distraction remains. It is not an established fact-checking system. |
| AI assistance for notes | Find sources and draft notes to reduce volunteer burden; people still judge sources and helpfulness. | Requests prioritise checking; they do not establish that a video is wrong. |
| Bots and fake comments | Better authentic discussion and challenge routes for mistaken classifications. | Private discussion among friends is a practical local alternative; it does not solve botting in public conversations. |

These are the current rendered chapters. Other earlier concepts found in source history should not be silently restored. [Current concepts source](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/concepts-page-b.mjs>)

### Participation and personal message

Get involved makes product feedback concrete: what helps, what gets in the way, and how Villow fits into someone's day. Contribute your skills is broader and more specialised. It leads with useful contributions, then introduces Nicholas and the motivation behind the work. This hierarchy avoids making every visitor read a founder biography before finding their role.

The latest message preserves four important commitments: social media has genuine utility; that utility makes its problems harder to escape; months of iteration now need evidence that can challenge the ideas; support can take concrete forms. It describes the current team as Nicholas alone. This should guide Fix the Web's tone and organisational claims. [Personal message and collaboration source](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/about-page-a.mjs>)

Financial-support markup includes one-time/monthly choices, optional public recognition, removal of public details and Discord benefits. The site agent identifies an important exception to the otherwise illustrative previews: ordinary support mode is wired to an existing production Worker and live Stripe configuration. The isolated preview-state mode uses fictional fixtures and blocks external actions. Public recognition can, with the stated consent, appear across Villow and other Fix the Web projects. This is existing cross-project infrastructure to account for, not a reason to design a second donor system. No payment, email, role change or fresh operational certification was performed in this review. [Support source](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/help-support.mjs>), [integration record](<C:/Users/Nebula PC/Development/villow-site/previews/homepage/SUPPORT-INTEGRATION.md>)

The full handoff also preserves narrower product descriptions from the Astro source: rule-based suggestions are distinct from generative AI; unconnected/native YouTube activity is outside the described coverage; host database access differs from ordinary sharing; private measurements are not automatically sent to Fix the Web. These are repository descriptions, not a fresh app audit. A later public case study should confirm the few features it actually describes rather than reopening the whole product.

## Current Fix the Web material

Source routing deliberately serves the coming-soon identity in production and the fuller pages in development. The public deployment itself was not checked. This review adds documentation only.

| Existing material | Finding | Proposed treatment |
| --- | --- | --- |
| Homepage | Campaign asks are unresolved; Villow is called proof; worth-it reflection becomes enjoyment/likes; creator actions sound implemented; popularity is linked to escaping bubbles. | Replace provisional claims with the actual mechanism and evidence status. Retain the ambition and commitment to sourced, defensible asks. |
| Navigation | Placeholder campaign, press, regional and team categories imply more organisational infrastructure than exists. | Keep only substantive destinations for the initial release. |
| Life calculator | Strong lost-life/cigarette-pack framing; preset worthwhile categories; mixed population inputs and overlapping screen-use estimates; mandatory cross-device reporting proposal. | Keep private pending a separate philosophy and methodological review. Do not use its figures as evidence of lost life or the default mission. |
| Spider | Accepted playful brand interaction and integration source of truth. | Preserve. Fun and warmth fit the project. |
| Den | Offline hunger, aging and losses may create an obligation to return. | Review separately as a possible tension; no user-effect claim follows from source alone. |

Sources: [routing](<C:/Users/Nebula PC/Development/fixtheweb/astro.config.mjs>), [homepage draft](<C:/Users/Nebula PC/Development/fixtheweb/src/previews/home.astro>), [navigation](<C:/Users/Nebula PC/Development/fixtheweb/src/components/Header.astro>), [Life page](<C:/Users/Nebula PC/Development/fixtheweb/src/previews/life.astro>), [Life model](<C:/Users/Nebula PC/Development/fixtheweb/src/scripts/life/model.ts>), [spider integration](<C:/Users/Nebula PC/Development/fixtheweb/docs/SPIDER-INTEGRATION.md>), [Den progression](<C:/Users/Nebula PC/Development/fixtheweb/src/scripts/den/colony.ts>).

## External claims checked

### Australian policy

The Department confirms introduction of the Digital Duty of Care legislation on 15 October 2026 and describes proposed reforms. It does not support describing the reforms as already enacted. The separate My Feed, My Way consultation ran from 15 October to 5 November 2026 and is closed. Its following-only-feed proposal does not establish a requirement for third-party interfaces. [Department overview](https://www.infrastructure.gov.au/media-communications/internet/online-safety/digital-duty-care), [consultation record](https://www.infrastructure.gov.au/have-your-say/choice-feeds-social-media)

The previous AI response's House-passage and Senate-report dates were corroborated in secondary reporting but not verified against an accessible parliamentary record in this pass. Keep them out of evergreen copy and recheck the [bill record](https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=r7553) before any dated update.

The September exposure draft proposed Australian-university employment among the conditions for approved researchers, together with approval and other requirements. That is a description of the draft, not a verified statement of the latest amended text or current law. Its research-access and fictitious-identity provisions also do not amount to blanket public-product permission. [Exposure draft, proposed sections 205B onward](https://www.infrastructure.gov.au/sites/default/files/documents/exposure-draft-online-safety-amendment-digital-duty-of-care-bill-2026-september2026.pdf)

### Platform access

The DSA delegated data-access rules entered force on 29 October 2025. They concern qualified research into systemic risks on designated large services. Treating this as permission to deploy an alternative public interface would be an inference beyond that framework. [European Commission](https://digital-strategy.ec.europa.eu/en/news/new-measures-unlock-access-data-largest-online-platforms-support-research)

YouTube's policies consider significant independent value but impose other requirements separately. Its compliance guide also discusses quota splitting and additional audited analytics permissions. No implementation-specific compliance conclusion follows here. [Developer Policies](https://developers.google.com/youtube/terms/developer-policies), [compliance guide](https://developers.google.com/youtube/terms/developer-policies-guide)

YouTube already offers an academic researcher programme, including Australia, for defined data access subject to eligibility and terms. It is a route to investigate with a collaborator, not a general waiver for Villow. [Programme operation](https://research.youtube/how-it-works/), [eligibility](https://research.youtube/policies/)

“Only YouTube has APIs or embeds” is too broad: TikTok documents a Display API with profiles, videos and embedded playback. That does not establish equivalent access to someone's personalised or following feed. Compare the capabilities needed for a specific experiment. [TikTok Display API](https://developers.tiktok.com/docs/en/display-api-overview?enter_method=left_navigation)

### Information quality concepts

YouTube's official help describes notes, including optional source links and timestamps. Writing is currently limited to eligible US-based users in English. The concept should identify its proposed extension—such as broader participation or later correction delivery—rather than claim to invent notes. [YouTube Notes help](https://support.google.com/youtube/answer/14925346?hl=en)

Hype already supports viewer promotion within specified creator/video eligibility and time windows, including in Australia. That is a precedent for the mechanism, not evidence of better information quality. [YouTube Hype help](https://support.google.com/youtube/answer/15509925?hl=en)

The cited PNAS 2025 and Nature Communications 2026 studies use observational X data with methods intended to estimate causal effects. They estimate reduced subsequent engagement or sharing after notes appear, while delay limits overall effects. They are not randomised Villow or YouTube studies. Neither tests notifications to prior video viewers or establishes changed beliefs from that proposed intervention. [PNAS study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12478135/), [Nature Communications study](https://www.nature.com/articles/s41467-026-72597-0)

X's official AI-note documentation permits AI writers to propose notes, with human contributors' ratings determining whether notes meet display criteria. That does not establish AI reliability or that every claim receives an individual human verification. [Official Community Notes API guide](https://github.com/twitter/communitynotes/blob/main/documentation/api/overview.md)

### Existing work and scope

Prosocial Design Network already publishes evidence ratings for interventions, and the Center for Humane Technology publishes design principles. Fix the Web's contribution can be an integrated prototype and practical, openly examined lessons. Avoid an origin story implying that everyone else only describes problems. [PDN ratings](https://www.prosocialdesign.org/how-our-ratings-work), [CHT design principles](https://www.humanetech.com/humane-product-design)

Apple supports combined Screen Time reports across iPhone, iPad and Mac using the same account. The possible wider proposal is cross-ecosystem, intention-aware reporting with voluntary accountability. [Apple guide](https://support.apple.com/guide/iphone/set-up-screen-time-for-yourself-iphbfa595995/ios)

## How the earlier recommendation changes

Keep Villow central, organise the thinking around design questions, share negative as well as positive findings, and distinguish research-data access from interface experimentation. Those are the strongest parts of the earlier answer.

Refine the public identity to match the actual scale of the project. Keep its eight research areas as possible interests rather than eight active departments. Replace arbitrary effort percentages with a short list of deliverables. Explain building, evaluation and advocacy as a method, not necessarily three separate sections with empty content. Preserve the grassroots invitation, the benefits of technology and the structural challenge to platforms.

The material reviewed does not establish measured Villow outcomes, independent evaluation, active academic partnerships, a live research recruitment process, comprehensive cross-device monitoring or a received enforcement notice. The strategy does not need any of those to make a useful and credible initial case.

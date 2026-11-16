// Editorial proposals, grounded in Nicholas's discussion and the current Villow
// Concepts B preview. None of these entries describes a shipped Villow feature.
export const proposals = [
  {
    id: "devices", category: "Across services & devices", title: "Understand your digital day.",
    summary: "A private, useful view of activity across the devices you actually use, with optional synchronisation and separately chosen sharing.",
    body: [
      "A phone report only tells part of the story if you also use a computer, tablet or another operating system. The proposal is a cross-ecosystem view that helps you understand how your digital activity fits your intentions—not simply add up a larger number of hours.",
      "A timeline could make overlapping activity visible: listening on one device while working on another should not automatically count as two hours of attention. Useful summaries might distinguish foreground activity, background media and the context you choose to add.",
      "Privacy belongs at the start of this design. Explore local processing, limited summaries and optional synchronisation. Keep a private view separate from anything deliberately shared with friends; make that sharing specific, revocable and understandable.",
    ],
    existing: "Cross-device reporting already exists within some ecosystems. Apple’s Screen Time, for example, can combine activity across signed-in Apple devices. This proposal asks about broader coverage and useful interpretation across ecosystems.",
    source: { label: "Apple’s Screen Time guide", url: "https://support.apple.com/guide/iphone/set-up-screen-time-for-yourself-iphbfa595995/ios" },
    questions: "How much data is actually necessary? What can remain on each device? How should overlapping use be represented? Can someone share a chosen summary without exposing private activities or feeling monitored? Device permissions and comparable measurements remain practical barriers.",
  },
  {
    id: "corrections", category: "Information quality", title: "Let corrections catch up.",
    summary: "Expand access to community notes, and notify people who watched a video in the preceding two weeks when useful new context appears.",
    body: [
      "A correction beneath a video helps someone who sees it. It may never reach someone who already watched, remembered or shared the original claim. The proposed notification reconnects that person with new context.",
      "The two-week window is a concrete starting point to test, not an established optimum. Viewers would need useful notification choices; the context and its supporting sources should be easy to inspect.",
    ],
    existing: "YouTube already has notes on videos. Its help currently limits writing to eligible users in the United States in English, with review across different perspectives. The proposals here are broader participation and delivery of later context to earlier viewers.",
    source: { label: "YouTube’s notes guidance", url: "https://support.google.com/youtube/answer/14925346?hl=en" },
    questions: "Reaching earlier viewers involves watch history, consent and platform cooperation. Which notes warrant a notification, and how should revised or withdrawn notes be handled? Accuracy, delayed delivery and notification overload need evaluation. This has not been shown to reduce misinformation in Villow or on YouTube.",
  },
  {
    id: "creator-actions", category: "From watching to doing", title: "Make room for a meaningful next step.",
    summary: "Let creators suggest something to try, somewhere to go or a cause to support. Let viewers save it and return when it suits them.",
    body: [
      "A video can inspire something beyond another video: try a recipe, explore a place, learn a skill or help a cause. A creator could attach a clear next step alongside their video, and a viewer could add it to a personal list.",
      "With appropriate consent and aggregation, creators could learn which suggestions people choose. That would offer a different kind of feedback from watch time alone.",
    ],
    existing: "This is an unbuilt design concept from the Villow previews. It is distinct from the app’s optional personal to-do list beside a video.",
    questions: "A saved action is not a completed action. Avoid turning every video into an obligation or another advertising surface. Creator participation, trustworthy destinations, sponsorship disclosure and appropriate feedback all need work.",
  },
  {
    id: "recommendations", category: "Discovery", title: "Give considered recommendations more room.",
    summary: "Give viewers a small number of deliberate recommendations each week, helping videos they value reach others across channels and beyond new uploads.",
    body: [
      "What if a video that stayed with you counted differently from one that simply kept you watching? A limited recommendation could give your considered judgment a more deliberate role in discovery.",
      "The current concept extends that opportunity across channels and older videos. It aims to help meaningful work find an audience, without requiring everyone to choose the same kind of content.",
    ],
    existing: "YouTube Hype already lets viewers endorse recent eligible videos from smaller creators. Its leaderboard covers defined creator eligibility and uploads from the previous seven days. This proposal would explore a wider scope.",
    source: { label: "YouTube’s Hype explanation", url: "https://support.google.com/youtube/answer/15334500?hl=en" },
    questions: "Recommendations can be coordinated or manipulated. How should limited endorsements be allocated, ranked and protected from gaming? Popularity does not establish accuracy, and reduced clickbait is an intended possibility to investigate, not a demonstrated result.",
  },
];

export const aiProposals = [
  { id: "ai-chapters", title: "Chapters requested by viewers, reviewed by creators.", body: "Viewers could request chapters for a video that has none. The creator would see the demand and could write them, or optionally ask AI to draft them from the video. The creator would review the result; AI-generated chapters would carry a clear disclosure.", question: "Will the chapters be accurate and useful? Even a small tool can change a creator’s workflow and their audience’s trust. The creator needs a meaningful choice about using it." },
  { id: "ai-conversation", title: "Questions about a video, grounded in the video.", body: "An optional conversation could help someone unpack an argument or explore sources using the video and transcript. Answers should point back to the relevant material, with an easy return to watching. A concern about a claim could lead to checking evidence before proposing a note.", question: "AI can sound confident while missing context or inventing support. A chat can also draw attention away from the video and other people. Grounding, source access and a useful stopping point need deliberate design." },
  { id: "ai-notes", title: "Assistance with the work behind a community note.", body: "Finding sources, checking claims and writing a clear note takes voluntary effort. AI could help find material and draft sourced notes. A viewer could request a check on a particular video; people would still examine the sources and review helpfulness across different perspectives.", question: "A request prioritises checking; it does not establish that a video is wrong. AI can misread a claim or cite a source that does not support it. Assistance should reduce the research burden without replacing human judgment or disguising uncertainty." },
];

// Preset C4: C3's bullets, reworded after feedback on 20 November 2026 so the two compare
// line by line. 01 is unchanged; 02 names what gets scaled back and why; 03 builds on time
// spent rather than dismissing it; 04 says what solo feeds can cost; 05 no longer repeats
// its title; 06 is about disinformation and how Villow sidesteps it today. Ids match C.
// The C4 it replaces (bold "why" lead, then prose) is archived in previews/preset-comparison.
import type { DesignPrinciple } from './villow-design-principles';
import { autonomySources } from './villow-principle-sources';

export const villowPrinciplesC4: DesignPrinciple[] = [
  {
    id: 'intentions', aliases: ['principle-theme-1'], art: 1,
    title: 'Put the person in control.',
    points: [
      'A platform should work for the people using it, not on them.',
      'People want different things from the same app, so offer a wide range of tools and let each person choose the ones that help.',
      'Every tool is optional and easy to understand. People can try one, see what difference it makes, and drop it if it doesn’t help.',
    ],
  },
  {
    id: 'motivation', aliases: ['subscriptions'], art: 4,
    title: 'Meet people where they are.',
    points: [
      { text: 'Change tends to last when people choose it themselves.', sources: autonomySources, after: 'Show people a clear picture of their own habits, and let them decide what to do about it.' },
      'A healthier app only works if people want to use it, so don’t take away what they enjoy. Instead, scale back the features designed to keep people hooked, like autoplay and endless scrolling, and make the parts they value easier to find.',
    ],
  },
  {
    id: 'reflection', aliases: ['value', 'principle-theme-2'], art: 2,
    title: 'Make reflection useful.',
    points: [
      'Time spent is a useful measure. Pairing it with a quick, optional question about whether that time felt worthwhile adds depth, and each answer doubles as a natural pause.',
      'People keep reflecting when it gives something back. Over weeks and months, the answers reveal patterns and suggest changes people might not have thought of.',
    ],
  },
  {
    id: 'connection', aliases: ['principle-theme-3'], art: 3,
    title: 'Bring people together.',
    points: [
      'Personalised feeds are built for one person at a time. However enjoyable, they can leave people scrolling alone, with less in common and a narrower view of the world.',
      'Social features can bring people back together, as long as they lead to real conversation and not just more time on screen.',
      'Talking about how we use these apps should feel normal, not like something to hide.',
    ],
  },
  {
    id: 'finite-feeds', aliases: ['principle-theme-0'], art: 0,
    title: 'Make room for life.',
    points: [
      'An app built for engagement counts every extra minute as a win. A better one counts time well spent, and treats leaving as a good outcome.',
      'Natural stopping points and gentle reminders help people stop when they mean to, while leaving the final say with them.',
      'The best things people find online often lead somewhere offline, like a recipe to cook or a plan with friends. The app should help them follow through.',
    ],
  },
  {
    id: 'information', aliases: [], art: 5,
    title: 'Fight disinformation.',
    points: [
      'People need to know what they can trust. Feeds should reward what’s accurate, not just what spreads.',
      'Villow has ideas here, like corrections that reach everyone who saw the original, but can’t put them into practice yet. Instead, it’s built around the people someone knows in real life, people they already know they can trust.',
      'Any online platform will need to make this a major focus.',
    ],
  },
];

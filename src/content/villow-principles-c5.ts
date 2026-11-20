// Preset C5: C4 tightened after feedback on 20 November 2026. Shorter bullets throughout;
// 01 says each person shapes the platform; 02 drops the feature examples; 03 asks for tools
// that make reflection worthwhile; 04 names the trade-off solo feeds hide; 05 and 06 reworded.
// Ids match C.
import type { DesignPrinciple } from './villow-design-principles';
import { autonomySources } from './villow-principle-sources';

export const villowPrinciplesC5: DesignPrinciple[] = [
  {
    id: 'intentions', aliases: ['principle-theme-1'], art: 1,
    title: 'Put the person in control.',
    points: [
      'A platform should work for the people using it, not on them, with each person shaping it for themselves.',
      'People want different things from the same app, so offer a wide range of tools and let each person choose the ones that help.',
      'Every tool is optional and easy to understand. People can try one, see what difference it makes, and drop it if it doesn’t help.',
    ],
  },
  {
    id: 'motivation', aliases: ['subscriptions'], art: 4,
    title: 'Meet people where they are.',
    points: [
      { text: 'Change tends to last when people choose it themselves.', sources: autonomySources, after: 'Show people a clear picture of their own habits, and let them decide what to do about it.' },
      'A healthier app only works if people want to use it. Keep what they enjoy, and scale back the features built to hook them.',
    ],
  },
  {
    id: 'reflection', aliases: ['value', 'principle-theme-2'], art: 2,
    title: 'Make reflection useful.',
    points: [
      'Time spent is worth tracking. A quick, optional question about whether it felt worthwhile makes it far more meaningful.',
      'Reflection needs tools that make it worthwhile, like seeing how habits change over time and getting suggestions on what to try next.',
    ],
  },
  {
    id: 'connection', aliases: ['principle-theme-3'], art: 3,
    title: 'Bring people together.',
    points: [
      'Personalised feeds are built for one person at a time. People can lose hours to them that they’d have enjoyed more with others, and rarely notice the trade-off.',
      'Social features can bring people back together, as long as they lead to real conversation and not just more time on screen.',
      'Talking about how we use these apps should feel normal, not like something to hide.',
    ],
  },
  {
    id: 'finite-feeds', aliases: ['principle-theme-0'], art: 0,
    title: 'Make room for life.',
    points: [
      'Apps built for engagement count every extra minute as a win. Count time well spent instead, and treat leaving as a good outcome.',
      'Natural stopping points and gentle reminders help people stop when they mean to, while leaving the final say with them.',
      'The best things people find online often lead somewhere offline, like a recipe to cook or a plan with friends. The app should help them follow through.',
    ],
  },
  {
    id: 'information', aliases: [], art: 5,
    title: 'Fight disinformation.',
    points: [
      'People need to know what they can trust. Feeds should reward what’s accurate, not just what spreads.',
      'Villow has ideas, like corrections that reach everyone who saw the original, but can’t act on them yet. For now, it sidesteps the problem by connecting people with friends they know and trust in real life.',
      'Any online platform will need to make this a major focus.',
    ],
  },
];

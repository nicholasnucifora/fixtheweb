// Preset C3: bullets, each one standing on its own and carrying its own "why".
// No bullet continues the one before it. No feature examples; the wording should
// apply to any platform, not just YouTube. Ids match C.
import type { DesignPrinciple } from './villow-design-principles';
import { autonomySources } from './villow-principle-sources';

export const villowPrinciplesC3: DesignPrinciple[] = [
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
      'Don’t take away what people enjoy. Turn down the compulsive parts, and build up the worthwhile ones.',
    ],
  },
  {
    id: 'reflection', aliases: ['value', 'principle-theme-2'], art: 2,
    title: 'Make reflection useful.',
    points: [
      'Time spent shows how long someone stayed, not whether it was worth it. A quick, optional question can capture that, and doubles as a natural pause.',
      'Over weeks and months, a record of what felt worthwhile reveals patterns that time alone never could, and suggests changes people might not have thought of.',
    ],
  },
  {
    id: 'connection', aliases: ['principle-theme-3'], art: 3,
    title: 'Bring people together.',
    points: [
      'Personalised feeds give everyone their own separate stream. Good technology should also bring people closer to each other.',
      'Talking about how we use these apps should feel normal, not like something to hide.',
      'Social features can be compelling too, so they should lead to real conversation, not just more time on screen.',
    ],
  },
  {
    id: 'finite-feeds', aliases: ['principle-theme-0'], art: 0,
    title: 'Make room for life.',
    points: [
      'An app built for engagement counts every extra minute as a win. A better one counts time well spent, and treats leaving as a good outcome.',
      'Natural stopping points and gentle reminders help people stop when they mean to, while leaving the final say with them.',
      'Life happens away from the screen, and a good app makes it easy to get back to it.',
    ],
  },
  {
    id: 'information', aliases: [], art: 5,
    title: 'Fight misinformation.',
    points: [
      'Every other improvement depends on trust. If people can’t rely on what they see, misinformation undermines the rest.',
      'Feeds should reward what’s accurate, not just what spreads.',
      'Villow doesn’t tackle this yet, but any better platform will have to.',
    ],
  },
];

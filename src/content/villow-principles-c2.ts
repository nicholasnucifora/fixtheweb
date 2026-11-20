// Preset C2: C's six principles, rewritten as ideas rather than features.
// Feature detail lives on villow.app. Ids and aliases match C so anchors still resolve.
import type { DesignPrinciple } from './villow-design-principles';

export const villowPrinciplesC2: DesignPrinciple[] = [
  {
    id: 'intentions', aliases: ['principle-theme-1'], art: 1,
    title: 'Put the person in control.',
    points: [
      'Offer plenty of tools, and let people use all of them, some or none. How engaging the app is should be their choice.',
      'Let people experiment and see what each change did to their own viewing. Then they decide.',
      'Add a light nudge: hold people to the limits they set, so they stay consistent with themselves. They can always change them.',
    ],
  },
  {
    id: 'motivation', aliases: ['subscriptions'], art: 4,
    title: 'Meet people where they are.',
    points: [
      {
        text: 'Skip the lectures and forced settings. Change people choose for themselves tends to last longer than change they’re pushed into.',
        sources: [
          { label: 'Aronson, 1999', href: 'https://doi.org/10.1037/h0088188' },
          { label: 'Ntoumanis et al., 2021', href: 'https://doi.org/10.1080/17437199.2020.1718529' },
        ],
      },
      'Show the evidence instead—time creeping up month by month, or how it compares with friends—and let people reach their own conclusion.',
      'Make the better parts more appealing: subscriptions good enough to be the main feed, and recommendations people can turn down or off.',
    ],
  },
  {
    id: 'reflection', aliases: ['value', 'principle-theme-2'], art: 2,
    title: 'Make reflection useful.',
    points: [
      'A quick, optional “was that worth it?” after a video makes a natural pause.',
      'Over time, the answers reveal patterns: a channel you keep clicking but rarely enjoy, a habit that doesn’t feel good, a creator you’re glad you found.',
      'Watch time alone says little. Add whether it was worth it, and the data can suggest changes people wouldn’t have spotted.',
    ],
  },
  {
    id: 'connection', aliases: ['principle-theme-3'], art: 3,
    title: 'Bring people together.',
    points: [
      'Make it normal to talk with friends about what you watch, and how much.',
      'A friend’s recommendation comes from someone who knows you, not from whatever kept you watching. It’s a way out of your own algorithm, and something to talk about.',
      'Social features can pull people in, too. Keep them optional, and aimed at conversation rather than more scrolling.',
    ],
  },
  {
    id: 'finite-feeds', aliases: ['principle-theme-0'], art: 0,
    title: 'Make room for life.',
    points: [
      'The goal isn’t more time in the app. It’s time well spent, then getting on with your day.',
      'Offer plenty of places to stop, reminders when people want them, and easy ways to leave.',
      'Point people toward something worth doing next, away from the screen.',
    ],
  },
  {
    id: 'information', aliases: [], art: 5,
    title: 'Fight misinformation.',
    points: [
      'Villow doesn’t tackle this yet, but every platform has to reckon with it.',
      'If people can’t trust what they see, misinformation poisons everything else a platform does well.',
      'Reclaiming truth in feeds and algorithms starts with sources people can check, and corrections that reach everyone who saw the original.',
    ],
  },
];

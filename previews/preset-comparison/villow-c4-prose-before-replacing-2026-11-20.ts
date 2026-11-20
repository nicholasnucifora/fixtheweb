// Preset C4: each principle opens with one bold "why" sentence, then a short
// paragraph of "what". Written about people, not to "you". Ids match C.
import type { DesignPrinciple } from './villow-design-principles';

export const autonomySources = [
  { label: 'Aronson, 1999', href: 'https://doi.org/10.1037/h0088188' },
  { label: 'Ntoumanis et al., 2021', href: 'https://doi.org/10.1080/17437199.2020.1718529' },
];

export const villowPrinciplesC4: DesignPrinciple[] = [
  {
    id: 'intentions', aliases: ['principle-theme-1'], art: 1,
    title: 'Put the person in control.',
    lead: 'People want different things from the same app. One setup can’t suit everyone.',
    points: ['So offer plenty of tools, all optional and easy to understand. Each person can pick what helps, ignore the rest and see the difference for themselves. Giving people real power to shape the system means it works for them, not on them.'],
  },
  {
    id: 'motivation', aliases: ['subscriptions'], art: 4,
    title: 'Meet people where they are.',
    lead: { text: 'Change tends to last longer when people decide on it themselves.', sources: autonomySources },
    points: ['So instead of telling people what to do, show them a clear picture of their own habits and leave the conclusion to them. Nothing they enjoy is taken away. The compulsive parts are turned down, and the worthwhile parts get better.'],
  },
  {
    id: 'reflection', aliases: ['value', 'principle-theme-2'], art: 2,
    title: 'Make reflection useful.',
    lead: 'Time spent shows how long someone stayed, not whether it was worth it.',
    points: ['A quick question, asked only when people want it, fills that gap. Each answer is a natural pause. Over time, the answers show what’s genuinely worth someone’s time, including things they might never have noticed.'],
  },
  {
    id: 'connection', aliases: ['principle-theme-3'], art: 3,
    title: 'Bring people together.',
    lead: 'Personalised feeds are built for one person at a time.',
    points: ['Good technology should also bring people closer, with things to share and talk about. Talking openly about how much we use these apps should feel normal, not like something to hide. Social features should lead to real conversation, not just more screen time.'],
  },
  {
    id: 'finite-feeds', aliases: ['principle-theme-0'], art: 0,
    title: 'Make room for life.',
    lead: 'Success isn’t how long people stay. It’s how they feel when they leave.',
    points: ['Build in natural places to stop, with gentle reminders people can set and dismiss. Leaving counts as a good outcome, not a failure. The aim is time well spent, then getting on with the day.'],
  },
  {
    id: 'information', aliases: [], art: 5,
    title: 'Fight misinformation.',
    lead: 'None of this works if people can’t trust what they see.',
    points: ['Misinformation erodes trust in everything else a platform does, so feeds should reward what’s accurate, not just what spreads. Villow doesn’t tackle this yet, but any better platform will have to.'],
  },
];

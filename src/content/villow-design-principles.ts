// Transferable design goals for C/D/E. B retains its earlier long-form grouping.
// Legacy anchors continue to identify the same ideas after reordering.
// A source with a `finding` renders as a numbered footnote that opens on hover or tap;
// without one it renders as an inline citation (C2). `after` continues the point past the marker.
export type PrincipleSource = { label: string; href: string; journal?: string; finding?: string };
export type PrinciplePoint = string | { text: string; sources: PrincipleSource[]; after?: string };
export type DesignPrinciple = { id: string; aliases: string[]; art: number; title: string; points: PrinciplePoint[]; future?: boolean };
export const villowDesignPrinciples: DesignPrinciple[] = [
  {
    id: 'intentions', aliases: ['principle-theme-1'], art: 1,
    title: 'Put the person in control.',
    points: [
      'Tailor feeds, limits and reminders to each person’s interests and goals.',
      'Let people adjust how strongly tools nudge them, and what healthy use means for them.',
    ],
  },
  {
    id: 'motivation', aliases: ['subscriptions'], art: 4,
    title: 'Meet people where they are.',
    points: [
      'Make recommendations manageable with a chosen cap on how many videos appear.',
      'Make subscriptions more appealing through organisation and customisation.',
      'Either can take more time than intended. Support the mix that suits the person.',
    ],
  },
  {
    id: 'reflection', aliases: ['value', 'principle-theme-2'], art: 2,
    title: 'Make reflection useful.',
    points: [
      'Build quick, optional reflection into watching: was that time worthwhile?',
      'Show viewing patterns and let people adjust the relevant limits in the same view.',
    ],
  },
  {
    id: 'connection', aliases: ['principle-theme-3'], art: 3,
    title: 'Bring people together.',
    points: [
      'Watch together, talk about it, or choose an accountability buddy.',
      'Help people take that connection into plans and time together offline.',
      'Keep usage sharing optional and its audience clear. Friends offer perspective, not a health benchmark.',
    ],
  },
  {
    id: 'finite-feeds', aliases: ['principle-theme-0'], art: 0,
    title: 'Make room for life.',
    points: [
      'Offer break reminders and a satisfying place to stop.',
      'Turn ideas into a to-do list or an activity to try offline.',
      'Reward time away with encouragement people choose, without guilt or pressure.',
    ],
  },
  {
    id: 'information', aliases: [], art: 5, future: true,
    title: 'Fight misinformation.',
    points: [
      'Make sources easy to check and corrections reach the original audience.',
      'Address bots and manipulated comments, with ways to challenge mistakes.',
      'Keep AI optional, labelled and checked by people.',
    ],
  },
];

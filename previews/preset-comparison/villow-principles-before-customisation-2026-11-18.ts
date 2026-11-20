// A flat set of design goals for C/D/E. B retains its earlier long-form grouping.
// Aliases preserve links from that earlier layout while the comparisons share
// meaningful principle IDs, rather than depending on their order on the page.
export const villowDesignPrinciples = [
  {
    id: 'finite-feeds', aliases: ['principle-theme-0'], art: 0,
    title: 'Make room for life.',
    points: [
      'Give feeds an ending and offer break reminders.',
      'Turn ideas into a to-do list or an activity to try offline.',
    ],
  },
  {
    id: 'intentions', aliases: ['principle-theme-1'], art: 1,
    title: 'Keep people in control.',
    points: [
      'Let people choose their feed, limits and support.',
      'Back the limits they set, with room to rethink them.',
      'Explain trade-offs. Never shame a change of plan.',
    ],
  },
  {
    id: 'motivation', aliases: ['subscriptions'], art: 4,
    title: 'Make less scrolling appealing.',
    points: [
      'Keep calmer feeds enjoyable and easy to use.',
      'Offer optional streaks and encouragement that count time away as progress.',
      'Check for guilt, pressure or another reason to reopen.',
    ],
  },
  {
    id: 'reflection', aliases: ['value', 'principle-theme-2'], art: 2,
    title: 'Make reflection useful.',
    points: [
      'Show time spent. Offer an optional “Was it worth it?” check-in.',
      'Put feed, time and privacy controls right there—easy to find, change and undo.',
    ],
  },
  {
    id: 'connection', aliases: ['principle-theme-3'], art: 3,
    title: 'Bring people together.',
    points: [
      'Share, watch and talk together.',
      'Keep usage sharing separate and optional, with clear audiences.',
      'Friends’ habits offer perspective, not a health benchmark.',
    ],
  },
  {
    id: 'information', aliases: [], art: 5,
    title: 'Make claims easy to check.',
    points: [
      'Show sources. Get corrections to people who saw the original claim.',
      'Protect conversation from manipulation, with ways to challenge mistakes.',
      'Keep AI optional, labelled and checked by people.',
    ],
  },
];

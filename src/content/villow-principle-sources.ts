// Evidence for "change lasts when people choose it themselves", shown as footnote [1] in C3–C5.
// Findings paraphrase each abstract (checked via OpenAlex and Europe PMC, 20 November 2026).
import type { PrincipleSource } from './villow-design-principles';

export const autonomySources: PrincipleSource[] = [
  {
    label: 'Aronson (1999)', journal: 'American Psychologist', href: 'https://doi.org/10.1037/h0088188',
    finding: 'Reviews experiments on condom use, water conservation and prejudice. Change that people argue themselves into tends to last longer than change they’re talked into.',
  },
  {
    label: 'Ntoumanis et al. (2021)', journal: 'Health Psychology Review', href: 'https://doi.org/10.1080/17437199.2020.1718529',
    finding: 'A meta-analysis of 73 health studies. Approaches that supported people’s own sense of choice improved health behaviour, with small-to-medium effects that held at follow-up. Gains tracked people wanting the change for themselves, not feeling pressured into it.',
  },
];

/** A link with no href isn't built yet: it shows greyed out and goes nowhere. Give it an href once its page exists. */
export interface Link {
  label: string;
  href?: string;
}
/** A built link goes to its page; one that isn't yet still takes focus (so the menu opens from the keyboard) but is marked disabled. */
export const linkAttrs = (link: Link) =>
  link.href ? { href: link.href } : { "aria-disabled": "true", tabindex: 0, title: "Coming soon" };

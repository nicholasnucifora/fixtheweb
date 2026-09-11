# fixtheweb

Astro site for Fix the Web.

## Develop

```bash
npm install
npm run dev
```

## Deploy (Cloudflare Workers)

Static assets only for now; config is in `wrangler.jsonc`.

- Workers & Pages → Create → Import a repository
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node version comes from `.nvmrc` (Astro needs 22.12+)

## Brand assets

- `src/assets/brand/fixtheweb-logo.svg` — main logo. Navy paths use `currentColor` so the page text colour drives light/dark mode; "the" stays teal.
- `public/favicon.svg` — favicon. Light mode: the navy spider filling the square. Dark mode: adds a ½px white outline so it stays visible on dark tab bars, with bigger pupils so the eyes read at 16px.
- `public/favicon.ico` — 16/32/48px fallback for browsers without SVG favicons (the dark-mode design, since it reads on light and dark UI).
- `public/apple-touch-icon.png` — 180px iOS home-screen icon: the light-mode spider on the site's background.
- Both PNG-based files are rendered from `favicon.svg`; regenerate them if the favicon changes.

import { defineConfig } from "astro/config";

let isDevelopment = false;

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [{
    name: "development-previews",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        isDevelopment = command === "dev";
        if (command !== "dev") return;
        const pages = [
          ["/work/villow", "villow"],
          ["/notes/design-and-access", "design-access"],
          ["/ideas", "ideas"],
          ["/about", "about"],
          ["/old-pages", "old-pages"],
          ["/old-pages/den", "den"],
          ["/old-pages/life", "life"],
          // Keep earlier bookmarks working while the experiments live in Old pages.
          ["/den", "den"],
          ["/life", "life"],
          ["/design", "design"],
        ];
        for (const [pattern, page] of pages) {
          injectRoute({ pattern, entrypoint: new URL(`./src/previews/${page}.astro`, import.meta.url) });
        }
      },
      // Query-selected presets need the request URL in development. Production
      // still prerenders only the coming-soon page, without an SSR adapter.
      "astro:route:setup": ({ route }) => {
        if (isDevelopment) route.prerender = false;
      },
    },
  }],
});

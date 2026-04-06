import { defineConfig, memoryCache } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://braille-wiki.pages.dev",
  output: "server",
  server: {
    host: true,
  },
  adapter: cloudflare(),
  integrations: [
    starlight({
      title: "Braille Documentation Platform",
      description:
        "Accessible braille reference works rendered directly from published content in Postgres.",
      tagline: "Published braille codebooks, manuals, and standards.",
      prerender: false,
      pagefind: false,
      lastUpdated: true,
      pagination: true,
      sidebar: [],
      customCss: ["/src/styles/site.css"],
      components: {
        Search: "./src/components/SearchModal.astro",
        Sidebar: "./src/components/Sidebar.astro",
      },
    }),
  ],
  experimental: {
    cache: {
      provider: memoryCache(),
    },
  },
});

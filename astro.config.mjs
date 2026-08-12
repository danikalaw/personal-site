import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://danikalaw.com",
  output: "static",
  integrations: [
    sitemap({
      filter: (page) => page !== "https://danikalaw.com/baby-february-2021/",
    }),
  ],
  build: {
    format: "directory",
  },
});

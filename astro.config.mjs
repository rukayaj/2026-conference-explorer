import { defineConfig } from "astro/config";

// The Pages workflow sets these from the repository's Pages settings.
export default defineConfig({
  site: process.env.SITE_URL || "https://tdwg.github.io",
  base: process.env.SITE_BASE || "/",
  output: "static",
});

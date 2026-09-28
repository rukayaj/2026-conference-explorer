import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL || 'https://tdwg2026.svc.gbif.no',
  base: process.env.SITE_BASE || '/',
  output: 'static',
});

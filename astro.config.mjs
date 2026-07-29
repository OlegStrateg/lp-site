// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://layerporter.com',
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
});

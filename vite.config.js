import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages (https://artearc.github.io/Sulphur/) and locally.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 4000 },
});

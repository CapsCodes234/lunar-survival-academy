import { defineConfig } from "vite";

// Phaser is a large library. Raising the warning limit keeps the student-facing
// build output focused on real errors. The game still bundles Phaser locally.
export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
});

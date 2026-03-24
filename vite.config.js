import { defineConfig } from "vite";

export default defineConfig({
  base: "/DDC-Statistics/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    port: 3000,
  },
});

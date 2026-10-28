import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  output: "static",
  site: "https://yansyah.my.id",
  trailingSlash: "never",
  compressHTML: true,
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        $lib: fileURLToPath(new URL("../../packages/ui/src/lib", import.meta.url)),
      },
    },
  },
  server: {
    allowedHosts: true,
  },
});

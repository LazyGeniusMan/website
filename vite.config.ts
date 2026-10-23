import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      ".config/ai-rulez/**",
      ".config/mise/locks/**",
      ".config/turutan/**",
      ".config/updatecli/**",
      ".github/workflows/**",
      ".vscode/**",
      ".uncomment.toml",
    ],
  },
  lint: {
    ignorePatterns: ["packages/ui/src/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});

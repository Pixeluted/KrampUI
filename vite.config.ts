import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig(async () => ({
  plugins: [svelte(), monacoEditorPlugin.default({})],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));

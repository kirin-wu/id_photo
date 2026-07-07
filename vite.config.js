import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  cacheDir: ".vite-cache",
  plugins: [vue()],
});

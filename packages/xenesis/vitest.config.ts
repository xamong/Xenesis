import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "../../node_modules/.vite/xenesis",
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "scripts/**/*.test.mjs"],
    restoreMocks: true,
    testTimeout: 30000
  }
});

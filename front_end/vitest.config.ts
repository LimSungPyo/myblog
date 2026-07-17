import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // 실제 E2E는 Playwright가 담당 — vitest는 단위/컴포넌트만
    exclude: ["e2e/**", "node_modules/**"],
    env: {
      // adminApi가 읽는 브라우저용 API 주소 (login/signup fetch 대상)
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000",
      // API_BASE_URL(서버용)은 비워둠 → lib/api.ts는 mock 모드로 동작
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

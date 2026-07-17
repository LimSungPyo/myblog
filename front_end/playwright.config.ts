import { defineConfig, devices } from "@playwright/test";

/**
 * E2E는 전체 스택(백엔드+DB)이 떠 있어야 한다.
 * - 로컬: `./start.command`로 스택 기동 후 `npm run test:e2e`
 * - 프론트는 아래 webServer가 자동 빌드·기동 (이미 떠 있으면 재사용)
 * - 관리자 계정은 E2E_ADMIN_USER/PASS 환경변수로 지정 (기본 admin/admin1234)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

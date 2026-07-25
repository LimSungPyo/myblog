import { test, expect } from "@playwright/test";

const ADMIN_USER = process.env.E2E_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || "admin1234";

test("관리자 로그인 → 관리자 페이지로 자동 이동", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("아이디").fill(ADMIN_USER);
  await page.getByPlaceholder("비밀번호").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/posts/);
});

test("비로그인 상태로 /admin 접근 시 로그인 페이지로 차단", async ({
  page,
}) => {
  await page.goto("/admin/posts");
  await expect(page).toHaveURL(/\/login/);
});

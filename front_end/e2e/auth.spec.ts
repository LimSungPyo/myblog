import { test, expect } from "@playwright/test";

const ADMIN_USER = process.env.E2E_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || "admin1234";

async function signup(page: import("@playwright/test").Page, username: string) {
  await page.goto("/signup");
  await page.getByPlaceholder("아이디 (3자 이상)").fill(username);
  await page.getByPlaceholder("비밀번호 (4자 이상)").fill("test1234");
  await page.getByPlaceholder("비밀번호 확인").fill("test1234");
  await page.getByRole("button", { name: "회원가입" }).click();
}

test("회원가입 → 홈으로 이동하고 헤더에 로그아웃 노출", async ({ page }) => {
  await signup(page, `e2e_${Date.now()}`);
  await expect(page).toHaveURL("/");
  await expect(page.getByText("로그아웃")).toBeVisible();
});

test("관리자 로그인 → 관리자 페이지로 자동 이동", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("아이디").fill(ADMIN_USER);
  await page.getByPlaceholder("비밀번호").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/posts/);
});

test("일반 회원이 /admin 접근 시 홈으로 차단", async ({ page }) => {
  await signup(page, `e2e_${Date.now()}`);
  await expect(page).toHaveURL("/");
  await page.goto("/admin/posts");
  await expect(page).toHaveURL("/");
});

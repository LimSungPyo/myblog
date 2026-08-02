import { test, expect } from "@playwright/test";

const ADMIN_USER = process.env.E2E_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || "admin1234";

test("관리자 로그인 → 관리자 페이지로 자동 이동", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("아이디 또는 이메일").fill(ADMIN_USER);
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

test("회원가입 → 인증 메일 안내 화면 표시", async ({ page }) => {
  // 메일 인증이 도입되어 가입 즉시 로그인되지 않는다.
  // 실제 메일 수신은 e2e로 검증할 수 없으므로 안내 화면까지만 확인한다.
  // 반복 실행해도 충돌하지 않도록 매번 새 이메일 사용
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByPlaceholder("닉네임").fill("E2E회원");
  await page.getByPlaceholder("이메일").fill(email);
  await page.getByPlaceholder("비밀번호 (8자 이상)").fill("pass12345");
  await page.getByRole("button", { name: "회원가입" }).click();

  await expect(page.getByText("메일을 확인해주세요")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

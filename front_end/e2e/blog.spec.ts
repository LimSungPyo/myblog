import { test, expect } from "@playwright/test";

const ADMIN_USER = process.env.E2E_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || "admin1234";

test("관리자가 글을 작성하면 공개 상세 페이지에 노출된다", async ({ page }) => {
  const suffix = Date.now();
  const title = `E2E 테스트 글 ${suffix}`;
  const slug = `e2e-post-${suffix}`;

  // 관리자 로그인
  await page.goto("/login");
  await page.getByPlaceholder("아이디").fill(ADMIN_USER);
  await page.getByPlaceholder("비밀번호").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);

  // 새 글 작성
  await page.goto("/admin/posts/new");
  await page.getByPlaceholder("제목").fill(title);
  await page.getByPlaceholder("my-first-post").fill(slug);
  await page.getByPlaceholder("목록에 표시될 한두 줄 요약").fill("E2E 요약");
  await page.locator(".w-md-editor-text-input").fill("# 본문 내용");
  await page.getByRole("button", { name: /발행/ }).click();

  await expect(page).toHaveURL(/\/admin\/posts$/);

  // 공개 상세 페이지에서 제목 확인 (SSR)
  await page.goto(`/posts/${slug}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

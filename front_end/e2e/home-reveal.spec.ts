import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("홈 첫 화면 글줄은 열자마자 떠올라 다 보인다", async ({ page }) => {
  await page.goto("/");
  const lines = page.locator("h1 .reveal-load");
  await expect(lines).toHaveCount(2);
  // 애니메이션(700ms + 순서 지연)이 끝나면 또렷하게 제자리에 있다
  await expect(lines.last()).toHaveCSS("opacity", "1", { timeout: 3000 });
  await expect(lines.last()).toHaveCSS("filter", "none");
});

test("아래 구역은 스크롤해서 보일 때 드러나고, 다시 올려도 숨지 않는다", async ({
  page,
}) => {
  await page.goto("/");
  const recent = page.locator("section[data-reveal]", {
    has: page.getByRole("heading", { name: "최근 기록" }),
  });
  const firstCard = recent.locator(".reveal").nth(1);

  // 아직 화면 아래: 숨어 있다
  await expect(recent).not.toHaveAttribute("data-shown", "");
  await expect(firstCard).toHaveCSS("opacity", "0");

  await recent.scrollIntoViewIfNeeded();
  await expect(recent).toHaveAttribute("data-shown", "");
  await expect(firstCard).toHaveCSS("opacity", "1", { timeout: 3000 });
  await expect(firstCard).toHaveCSS("translate", "none");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(recent).toHaveAttribute("data-shown", "");
});

test("동작 줄이기를 켜면 떠오르지 않고 옅게만 나타난다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const recent = page.locator("section[data-reveal]", {
    has: page.getByRole("heading", { name: "최근 기록" }),
  });
  const firstCard = recent.locator(".reveal").nth(1);
  // 숨어 있는 동안에도 위치와 흐림은 그대로(투명도만 0)
  await expect(firstCard).toHaveCSS("translate", "none");
  await expect(firstCard).toHaveCSS("filter", "none");
});

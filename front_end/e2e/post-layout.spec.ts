import { test, expect, type Page } from "@playwright/test";

/** 요소의 왼쪽·오른쪽 끝(px) */
async function edges(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right) };
    });
}

// 글 상세의 칸(목차·본문·도면 정보)이 헤더의 좌우 끝(로고 ~ 아이콘)을 넘거나 한쪽으로 밀리지 않는지 본다
for (const width of [1024, 1280, 1440, 1920]) {
  test(`글 상세 좌우 끝이 헤더와 맞는다 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/posts");
    const href = await page
      .locator("article h2 a")
      .first()
      .getAttribute("href");
    await page.goto(href!);

    const header = await edges(page, "header > div");
    // 화면에 보이는 칸(목차·본문·도면 정보)을 모두 합친 좌우 끝
    const grid = await page.locator("main > div").evaluate((el) => {
      const boxes = [...el.children]
        .map((c) => c.getBoundingClientRect())
        .filter((r) => r.width > 0);
      return {
        left: Math.round(Math.min(...boxes.map((r) => r.left))),
        right: Math.round(Math.max(...boxes.map((r) => r.right))),
      };
    });
    // 헤더 안쪽 여백(px-4)만큼 들어간 곳이 로고·아이콘의 끝이다
    expect(grid.left).toBe(header.left + 16);
    expect(grid.right).toBe(header.right - 16);

    // 칸은 그 안에서만: 본문 칸은 읽기 편한 폭(최대 680px)을 넘지 않는다
    const body = await edges(page, "main > div > article");
    expect(body.right - body.left).toBeLessThanOrEqual(680);
    expect(body.left).toBeGreaterThan(grid.left);
  });
}

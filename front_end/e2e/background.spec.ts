import { test, expect } from "@playwright/test";

// 바탕은 무늬(모눈) 없이 한 가지 색만 칠한다. 라이트·다크 모두
for (const [scheme, color] of [
  ["light", "rgb(246, 247, 249)"],
  ["dark", "rgb(11, 19, 34)"],
] as const) {
  test(`바탕에 모눈 무늬 없이 색만 칠한다 (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const bg = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { image: s.backgroundImage, color: s.backgroundColor };
    });
    expect(bg.image).toBe("none");
    expect(bg.color).toBe(color);
  });
}

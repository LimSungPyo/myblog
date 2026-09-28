import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "@/components/ThemeToggle";
import { THEME_COLOR } from "@/lib/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("클릭하면 <html>.dark 클래스와 localStorage가 토글된다", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "다크모드 전환" });

    await userEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    await userEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("고른 테마에 맞춰 상태 표시줄 색(theme-color)을 모두 바꾼다", async () => {
    // layout이 만드는 것처럼 기기 설정별 메타 태그 두 개를 둔다
    const metas = ["light", "dark"].map((scheme) => {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.media = `(prefers-color-scheme: ${scheme})`;
      document.head.appendChild(meta);
      return meta;
    });

    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "다크모드 전환" });

    await userEvent.click(btn);
    for (const meta of metas) expect(meta.content).toBe(THEME_COLOR.dark);

    await userEvent.click(btn);
    for (const meta of metas) expect(meta.content).toBe(THEME_COLOR.light);

    for (const meta of metas) meta.remove();
  });
});

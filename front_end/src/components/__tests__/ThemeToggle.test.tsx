import { describe, it, expect, beforeEach, vi } from "vitest";
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

  it("전환하는 동안만 <html>에 data-theme-switching을 달아 천천히 바뀌는 속도를 쓴다", async () => {
    let finish!: () => void;
    const finished = new Promise<void>((r) => (finish = r));
    const doc = document as Document & { startViewTransition?: unknown };
    doc.startViewTransition = vi.fn((cb: () => void) => {
      // 브라우저처럼 옛 화면을 찍을 때 표시가 이미 달려 있어야 한다
      expect(document.documentElement.dataset.themeSwitching).toBe("");
      cb();
      return { finished };
    });

    render(<ThemeToggle />);
    await userEvent.click(
      screen.getByRole("button", { name: "다크모드 전환" }),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement).toHaveAttribute("data-theme-switching");

    finish();
    await finished;
    await Promise.resolve();
    expect(document.documentElement).not.toHaveAttribute(
      "data-theme-switching",
    );

    delete doc.startViewTransition;
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUsePathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import SiteNav from "@/components/SiteNav";

describe("SiteNav", () => {
  beforeEach(() => {
    // 중괄호로 감싸 반환값을 없앤다. mock을 반환하면 vitest가 teardown으로 호출한다 (TroubleShoot 005)
    mockUsePathname.mockReturnValue("/");
  });

  it("모든 메뉴를 렌더한다", () => {
    render(<SiteNav />);
    for (const label of [
      "소개",
      "개발",
      "공부 기록",
      "일상",
      "미니게임",
      "방명록",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("현재 경로 메뉴에 aria-current='page'가 붙는다", () => {
    mockUsePathname.mockReturnValue("/categories/dev");
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "개발" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "소개" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("세로 목록(menu)에서도 현재 메뉴 표시와 누름 콜백이 동작한다", () => {
    mockUsePathname.mockReturnValue("/guestbook");
    const onNavigate = vi.fn();
    render(<SiteNav variant="menu" onNavigate={onNavigate} />);
    const link = screen.getByRole("link", { name: "방명록" });
    expect(link).toHaveAttribute("aria-current", "page");
    link.click();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("하위 경로(startsWith)도 활성 처리된다", () => {
    mockUsePathname.mockReturnValue("/about/team");
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "소개" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

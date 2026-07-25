import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUsePathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import SiteNav from "@/components/SiteNav";

describe("SiteNav", () => {
  beforeEach(() => mockUsePathname.mockReturnValue("/"));

  it("모든 메뉴를 렌더한다", () => {
    render(<SiteNav />);
    for (const label of ["소개", "개발", "일상", "방명록"]) {
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

  it("하위 경로(startsWith)도 활성 처리된다", () => {
    mockUsePathname.mockReturnValue("/about/team");
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "소개" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

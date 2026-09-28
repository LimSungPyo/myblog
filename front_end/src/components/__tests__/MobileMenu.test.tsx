import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUsePathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import MobileMenu from "@/components/MobileMenu";

function panel() {
  return document.getElementById("mobile-menu") as HTMLElement;
}

describe("MobileMenu", () => {
  beforeEach(() => {
    // 중괄호로 감싸 반환값을 없앤다. mock을 반환하면 vitest가 teardown으로 호출한다 (TroubleShoot 005)
    mockUsePathname.mockReturnValue("/");
    document.documentElement.style.overflow = "";
  });

  it("처음엔 닫혀 있고, 닫힌 메뉴는 탭 이동·낭독기에서 빠진다(inert)", () => {
    render(<MobileMenu />);
    const button = screen.getByRole("button", { name: "메뉴 열기" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panel()).toHaveAttribute("inert");
  });

  it("누르면 검색창과 메뉴가 펼쳐지고 뒤 페이지 스크롤을 막는다", async () => {
    render(<MobileMenu />);
    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(panel()).not.toHaveAttribute("inert");
    expect(
      within(panel()).getByRole("searchbox", { name: "글 검색" }),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByRole("link", { name: "방명록" }),
    ).toHaveAttribute("href", "/guestbook");
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("Esc로 닫히고 ☰ 버튼으로 초점이 돌아오며 스크롤이 풀린다", async () => {
    render(<MobileMenu />);
    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    await userEvent.keyboard("{Escape}");

    const button = screen.getByRole("button", { name: "메뉴 열기" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("메뉴를 누르면 지금 페이지여도 닫힌다", async () => {
    render(<MobileMenu />);
    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    await userEvent.click(within(panel()).getByRole("link", { name: "소개" }));

    expect(screen.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("다른 페이지로 옮겨 가면 닫힌다", async () => {
    const { rerender } = render(<MobileMenu />);
    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    mockUsePathname.mockReturnValue("/guestbook");
    rerender(<MobileMenu />);

    expect(screen.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("뒤를 덮은 어두운 막을 누르면 닫힌다", async () => {
    const { container } = render(<MobileMenu />);
    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    fireEvent.click(container.querySelector(".mobile-menu-scrim") as Element);

    expect(screen.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

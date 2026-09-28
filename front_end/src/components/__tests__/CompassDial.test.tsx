import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CompassDial from "@/components/CompassDial";

function stubReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function needleAngle() {
  const g = screen.getByTestId("dial-needle");
  return Number(g.getAttribute("transform")!.match(/rotate\(([-\d.]+)/)![1]);
}

describe("어디로 갈까요? 다이얼", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("처음엔 개발을 가리키고, 설명과 바로 가기가 함께 나온다", () => {
    stubReducedMotion(true);
    render(<CompassDial />);
    expect(screen.getByText("어디로 갈까요? · 방위 000°")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /개발 바로 가기/ }),
    ).toHaveAttribute("href", "/categories/dev");
    expect(needleAngle()).toBe(0);
  });

  it("메뉴를 가리키거나 키보드로 초점을 옮기면 바늘이 그쪽으로 돈다", () => {
    stubReducedMotion(true);
    render(<CompassDial />);

    fireEvent.pointerEnter(screen.getAllByRole("link", { name: "일상" })[0]);
    expect(needleAngle()).toBe(120);
    expect(
      screen.getByText("개발 말고 그냥 사는 이야기.", { selector: "p" }),
    ).toBeInTheDocument();

    fireEvent.focus(screen.getAllByRole("link", { name: "방명록" })[0]);
    expect(needleAngle()).toBe(240);
    expect(
      screen.getByRole("link", { name: /방명록 바로 가기/ }),
    ).toHaveAttribute("href", "/guestbook");
  });

  it("가장 가까운 방향으로 돈다: 소개(300°)는 뒤로 300°가 아니라 앞으로 -60°", () => {
    stubReducedMotion(true);
    render(<CompassDial />);
    fireEvent.pointerEnter(screen.getAllByRole("link", { name: "소개" })[0]);
    expect(needleAngle()).toBe(-60);
  });

  it("움직임이 켜져 있으면 바로 옮기지 않고 스프링 프레임을 예약한다", () => {
    stubReducedMotion(false);
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(3);
    render(<CompassDial />);
    fireEvent.pointerEnter(screen.getAllByRole("link", { name: "일상" })[0]);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(needleAngle()).toBe(0);
  });

  it("휴대폰 목록에도 메뉴 6개가 설명과 함께 있다", () => {
    stubReducedMotion(true);
    render(<CompassDial />);
    const list = screen.getAllByRole("list").at(-1)!;
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(links[0]).toHaveTextContent("개발");
    expect(links[5]).toHaveTextContent("소개");
  });
});

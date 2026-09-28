import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import ReadingCompass, { POST_BODY_ID } from "@/components/ReadingCompass";

// 본문 영역의 화면 위치를 흉내 낸다(높이, 위쪽 끝)
let box = { top: 0, height: 2800 };
let body: HTMLElement;
let scrollY = 0;

function scrollBody(top: number) {
  box = { ...box, top };
  // 본문이 위로 올라간 만큼 페이지를 내린 것이다
  scrollY = Math.max(0, -top);
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("읽기 진행 컴퍼스", () => {
  beforeEach(() => {
    box = { top: 0, height: 2800 };
    scrollY = 0;
    body = document.createElement("div");
    body.id = POST_BODY_ID;
    body.getBoundingClientRect = () =>
      ({
        top: box.top,
        height: box.height,
        bottom: box.top + box.height,
      }) as DOMRect;
    document.body.appendChild(body);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  });

  afterEach(() => {
    body.remove();
    vi.restoreAllMocks();
  });

  it("본문 위가 화면 위에 닿으면 0%, 본문 아래가 화면 아래에 닿으면 100%다", () => {
    render(<ReadingCompass variant="rail" />);
    const bar = screen.getByRole("progressbar", { name: "읽은 거리" });
    expect(bar).toHaveAttribute("aria-valuenow", "0");

    // 읽을 거리는 2800 - 800 = 2000px. 1000px 내려오면 절반
    scrollBody(-1000);
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.queryByText("끝까지 읽어 주셔서 고마워요.")).toBeNull();

    scrollBody(-2000);
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.getByText("끝까지 읽어 주셔서 고마워요."),
    ).toBeInTheDocument();
  });

  it("본문이 화면보다 짧으면 다 보이는 순간 100%다", () => {
    box = { top: 100, height: 500 };
    render(<ReadingCompass variant="rail" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("짧은 글은 열자마자 100%지만, 스크롤해서 읽기 전에는 끝까지 읽었다는 인사를 하지 않는다", () => {
    box = { top: 100, height: 500 };
    render(<ReadingCompass variant="rail" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.queryByText("끝까지 읽어 주셔서 고마워요.")).toBeNull();

    // 아래 댓글까지 조금 내려 보면 그때 인사한다
    box = { top: -50, height: 500 };
    scrollY = 150;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(
      screen.getByText("끝까지 읽어 주셔서 고마워요."),
    ).toBeInTheDocument();
  });

  it("휴대폰 알약은 읽기 시작하면 나타나고, 끝까지 읽으면 '완독'이 된다", () => {
    render(<ReadingCompass variant="float" />);
    const pill = screen.getByRole("progressbar", { name: "읽은 거리" });
    expect(pill).toHaveAttribute("data-shown", "false");

    scrollBody(-400);
    expect(pill).toHaveAttribute("data-shown", "true");
    expect(pill).toHaveTextContent("20%");

    scrollBody(-2000);
    expect(pill).toHaveTextContent("완독");
  });

  it("화면을 떠나면 스크롤 리스너를 뗀다", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<ReadingCompass variant="rail" />);
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});

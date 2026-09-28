import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import StepsRuler from "@/components/StepsRuler";
import { buildWeeks } from "@/lib/steps";

const weeks = buildWeeks(
  [
    {
      slug: "nextjs",
      title: "블로그에 Next.js를 쓰는 이유",
      at: "2026-07-10T09:00:00Z",
    },
    {
      slug: "fastapi",
      title: "FastAPI로 백엔드 붙이기",
      at: "2026-07-13T09:00:00Z",
    },
    { slug: "retro", title: "첫 배포 회고", at: "2026-07-15T09:00:00Z" },
  ],
  new Date("2026-09-28T03:00:00Z"),
);

describe("지난 1년의 걸음", () => {
  it("52칸을 그리고, 글을 쓴 주만 누를 수 있다", () => {
    render(<StepsRuler weeks={weeks} />);
    expect(
      screen.getByRole("list", { name: "주별 글 기록" }).children,
    ).toHaveLength(52);
    expect(screen.getByText("한 칸 = 한 주 · 기록 3개")).toBeInTheDocument();
    // 글이 있는 주는 7월 6일 주, 7월 13일 주 둘뿐이다
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "7월 13일부터 한 주, 글 2개" }),
    ).toBeInTheDocument();
  });

  it("눈금을 누르면 그 주의 글로 가는 창이 뜨고, Esc로 닫힌다", () => {
    render(<StepsRuler weeks={weeks} />);
    const tick = screen.getByRole("button", {
      name: "7월 13일부터 한 주, 글 2개",
    });
    fireEvent.click(tick);

    const pop = screen.getByRole("dialog", { name: "7월 13일부터 한 주의 글" });
    expect(tick).toHaveAttribute("aria-expanded", "true");
    expect(
      within(pop).getByRole("link", { name: "첫 배포 회고" }),
    ).toHaveAttribute("href", "/posts/retro");
    expect(
      within(pop).getByRole("link", { name: "FastAPI로 백엔드 붙이기" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("창 바깥을 누르거나 스크롤하면 닫힌다", () => {
    render(<StepsRuler weeks={weeks} />);
    const tick = screen.getByRole("button", {
      name: "7월 6일부터 한 주, 글 1개",
    });

    fireEvent.click(tick);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(tick);
    fireEvent.scroll(window);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("같은 눈금을 다시 누르면 닫힌다", () => {
    render(<StepsRuler weeks={weeks} />);
    const tick = screen.getByRole("button", {
      name: "7월 6일부터 한 주, 글 1개",
    });
    fireEvent.click(tick);
    fireEvent.click(tick);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("눈금자가 화면보다 넓으면 처음에 맨 오른쪽(최근 주)으로 밀어 둔다", () => {
    const width = vi
      .spyOn(HTMLElement.prototype, "scrollWidth", "get")
      .mockReturnValue(900);
    const { container } = render(<StepsRuler weeks={weeks} />);
    const scroller = container.querySelector("ol")!.parentElement!;
    expect(scroller.scrollLeft).toBe(900);
    width.mockRestore();
  });
});

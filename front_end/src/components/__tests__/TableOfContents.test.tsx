import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import TableOfContents from "@/components/TableOfContents";
import type { TocItem } from "@/lib/toc";

const ITEMS: TocItem[] = [
  { id: "설치", text: "설치", depth: 2 },
  { id: "예제", text: "예제", depth: 3 },
  { id: "마무리", text: "마무리", depth: 2 },
];

// 본문 제목들의 화면 위치(위쪽 끝, px). 스크롤을 흉내 내려고 바꿔 가며 쓴다.
let tops: Record<string, number> = {};
let scrollY = 0;
let pageHeight = 5000;

function mountHeadings() {
  for (const { id } of ITEMS) {
    const h = document.createElement("h2");
    h.id = id;
    h.getBoundingClientRect = () => ({ top: tops[id] ?? 9999 }) as DOMRect;
    document.body.appendChild(h);
  }
}

function scrollTo(next: Record<string, number>, y = 100) {
  tops = next;
  scrollY = y;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

function activeLink(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("link")
    .find((a) => a.getAttribute("aria-current") === "location");
}

describe("글 목차", () => {
  beforeEach(() => {
    tops = { 설치: 500, 예제: 1200, 마무리: 2000 };
    scrollY = 0;
    pageHeight = 5000;
    mountHeadings();
    // 한 프레임 뒤에 계산하는 걸 테스트에서는 바로 돌린다
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
    vi.spyOn(
      document.documentElement,
      "scrollHeight",
      "get",
    ).mockImplementation(() => pageHeight);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("제목마다 #id 링크를 달고, ### 제목은 들여 쓴다", () => {
    render(<TableOfContents items={ITEMS} variant="sidebar" />);
    const nav = screen.getByRole("navigation", { name: "목차" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "#설치",
      "#예제",
      "#마무리",
    ]);
    expect(links[1].closest("li")).toHaveClass("pl-3");
  });

  it("스크롤하면 지금 읽는 절을 강조한다", () => {
    render(<TableOfContents items={ITEMS} variant="sidebar" />);
    const nav = screen.getByRole("navigation", { name: "목차" });
    // 아직 첫 제목에 닿기 전
    expect(activeLink(nav)).toBeUndefined();

    scrollTo({ 설치: 40, 예제: 700, 마무리: 1500 });
    expect(activeLink(nav)).toHaveTextContent("설치");

    scrollTo({ 설치: -600, 예제: 90, 마무리: 800 });
    expect(activeLink(nav)).toHaveTextContent("예제");
  });

  it("맨 아래까지 내리면 짧은 마지막 절도 강조한다", () => {
    render(<TableOfContents items={ITEMS} variant="sidebar" />);
    const nav = screen.getByRole("navigation", { name: "목차" });
    // 마지막 제목이 선(96px)에 못 닿았지만 더 내릴 곳이 없다
    scrollTo({ 설치: -2000, 예제: -1200, 마무리: 400 }, 4200);
    expect(activeLink(nav)).toHaveTextContent("마무리");
  });

  it("휴대폰용은 본문 위에 접힌 상태로 나온다", () => {
    const { container } = render(
      <TableOfContents items={ITEMS} variant="inline" />,
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(within(details!).getByText("목차")).toBeInTheDocument();
    expect(
      within(details!).getAllByRole("link", { hidden: true }),
    ).toHaveLength(3);
  });

  it("목차가 사라지면 스크롤을 더 듣지 않는다", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <TableOfContents items={ITEMS} variant="sidebar" />,
    );
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

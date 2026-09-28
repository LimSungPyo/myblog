import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useRevealOnce } from "@/hooks/useRevealOnce";
import Reveal from "@/components/Reveal";

// 관찰을 시작한 요소와 콜백을 붙잡아 두고, 테스트가 "보였다"를 직접 알린다
type Callback = (entries: { isIntersecting: boolean }[]) => void;
let observed: { cb: Callback; options?: IntersectionObserverInit }[] = [];
const disconnect = vi.fn();

function installObserver() {
  observed = [];
  // 앞 테스트가 정리되며 부른 disconnect까지 세지 않게 새로 센다
  disconnect.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: Callback, options?: IntersectionObserverInit) {
        observed.push({ cb, options });
      }
      observe() {}
      disconnect = disconnect;
    },
  );
}

function Probe() {
  const [ref, shown] = useRevealOnce<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="probe" data-shown={shown ? "" : undefined} />
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRevealOnce", () => {
  it("화면 아래 15% 위로 올라와야 보인 것으로 보고, 그 전에는 숨겨 둔다", () => {
    installObserver();
    render(<Probe />);
    expect(observed[0].options?.rootMargin).toBe("0px 0px -15% 0px");
    act(() => observed[0].cb([{ isIntersecting: false }]));
    expect(screen.getByTestId("probe")).not.toHaveAttribute("data-shown");
  });

  it("한 번 보이면 드러나고, 관찰을 끊어 다시 숨지 않는다", () => {
    installObserver();
    render(<Probe />);
    act(() => observed[0].cb([{ isIntersecting: true }]));
    expect(screen.getByTestId("probe")).toHaveAttribute("data-shown");
    expect(disconnect).toHaveBeenCalled();
  });

  it("IntersectionObserver가 없는 브라우저에서는 다음 프레임에 바로 드러난다", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    let frame: FrameRequestCallback = () => {};
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frame = cb;
      return 1;
    });
    render(<Probe />);
    expect(screen.getByTestId("probe")).not.toHaveAttribute("data-shown");
    act(() => frame(0));
    expect(screen.getByTestId("probe")).toHaveAttribute("data-shown");
  });
});

describe("Reveal", () => {
  it("구역에 data-reveal을 달고, 보이면 data-shown을 더한다", () => {
    installObserver();
    render(
      <Reveal className="x">
        <h2>최근 기록</h2>
      </Reveal>,
    );
    const section = screen.getByRole("heading").parentElement!;
    expect(section).toHaveAttribute("data-reveal", "");
    expect(section).not.toHaveAttribute("data-shown");
    act(() => observed[0].cb([{ isIntersecting: true }]));
    expect(section).toHaveAttribute("data-shown", "");
  });
});

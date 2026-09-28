import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import CompassHero from "@/components/CompassHero";
import { COMPASS } from "@/lib/compass";

/** 기기의 "동작 줄이기" 설정을 흉내 낸다 */
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

/** SVG가 화면에 600×600으로 놓인 것처럼 만든다(viewBox와 1:1) */
function placeSvg(container: HTMLElement) {
  // 버튼 화살표 아이콘도 svg라서, 컴퍼스 그림(viewBox 600×600)을 콕 집는다
  const svg = container.querySelector(
    'svg[viewBox="0 0 600 600"]',
  ) as SVGSVGElement;
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 600, height: 600 }) as DOMRect;
  return svg;
}

/** 그림 중심에서 angle(도) 방향, 반지름 거리의 화면 좌표 */
function at(angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    clientX: COMPASS.cx + COMPASS.r * Math.cos(rad),
    clientY: COMPASS.cy + COMPASS.r * Math.sin(rad),
  };
}

function sweepText() {
  return screen.getByText(/그린 거리/).textContent;
}

describe("첫 화면 컴퍼스", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("동작 줄이기: 첫 그리기(240°)를 움직임 없이 그려진 상태로 보여준다", () => {
    stubReducedMotion(true);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<CompassHero />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(sweepText()).toBe("그린 거리 240° / 360°");
    expect(raf).not.toHaveBeenCalled();
  });

  it("마우스로 나머지를 돌려 한 바퀴를 채우면 인사가 뜨고, 다시 그리기로 처음부터 그린다", () => {
    stubReducedMotion(true);
    const { container } = render(<CompassHero />);
    placeSvg(container);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    const section = container.querySelector("section") as HTMLElement;
    // 150°까지 그려진 상태에서 시계 방향으로 30°씩 270°까지 돌린다(-180/180 경계도 지난다)
    for (let a = 180; a <= 270; a += 30) {
      fireEvent.pointerMove(section, { pointerType: "mouse", ...at(a) });
    }

    expect(sweepText()).toBe("그린 거리 360° / 360°");
    expect(
      screen.getByText("한 바퀴 다 그렸어요. 꾸준함은 이렇게 쌓여요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "↺ 다시 그리기" }));
    expect(sweepText()).toBe("그린 거리 0° / 360°");
    expect(screen.queryByText(/한 바퀴 다 그렸어요/)).toBeNull();
  });

  it("손가락은 누른 채 끌 때만 그린다(그냥 지나가는 터치는 무시)", () => {
    stubReducedMotion(true);
    const { container } = render(<CompassHero />);
    const svg = placeSvg(container);
    const pad = svg.parentElement as HTMLElement;
    act(() => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.pointerMove(pad, { pointerType: "touch", ...at(200) });
    expect(sweepText()).toBe("그린 거리 240° / 360°");

    fireEvent.pointerDown(pad, {
      pointerType: "touch",
      pointerId: 1,
      ...at(180),
    });
    fireEvent.pointerMove(pad, {
      pointerType: "touch",
      pointerId: 1,
      ...at(210),
    });
    expect(sweepText()).toBe("그린 거리 300° / 360°");

    fireEvent.pointerUp(pad, { pointerType: "touch", pointerId: 1 });
    fireEvent.pointerMove(pad, { pointerType: "touch", ...at(250) });
    expect(sweepText()).toBe("그린 거리 300° / 360°");
  });

  it("그리는 도중 두 번째 손가락이 닿아도 처음 손가락만 따라간다", () => {
    stubReducedMotion(true);
    const { container } = render(<CompassHero />);
    const pad = placeSvg(container).parentElement as HTMLElement;
    act(() => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.pointerDown(pad, {
      pointerType: "touch",
      pointerId: 1,
      ...at(180),
    });
    // 두 번째 손가락이 아직 안 그린 쪽(240°→260°)을 눌러 끌어도 무시한다.
    // 따라갔다면 그린 거리가 350°까지 늘어난다
    fireEvent.pointerDown(pad, {
      pointerType: "touch",
      pointerId: 2,
      ...at(240),
    });
    fireEvent.pointerMove(pad, {
      pointerType: "touch",
      pointerId: 2,
      ...at(260),
    });
    expect(sweepText()).toBe("그린 거리 270° / 360°");
  });

  it("움직임이 켜져 있으면 스프링으로 따라가고, 화면을 떠나면 예약한 프레임을 취소한다", () => {
    stubReducedMotion(false);
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(<CompassHero />);

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(raf).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(raf).toHaveBeenCalledTimes(1);

    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
  });
});

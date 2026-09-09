import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { deadlineFrom, useCountdown } from "@/hooks/useCountdown";

// Date까지 가짜로 바꿔야 한다. 훅이 남은 시간을 타이머 횟수가 아니라
// Date.now()와 만료 시각의 차이로 계산하기 때문이다.
function useFrozenClock() {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("남은 시간이 1초씩 줄어든다", () => {
    useFrozenClock();
    // 만료 시각은 렌더 밖에서 한 번만 정한다. 렌더 안에서 Date.now()를 부르면
    // 리렌더마다 만료 시각이 뒤로 밀려서 카운트다운이 제자리걸음을 한다.
    const deadline = Date.now() + 3000;
    const { result } = renderHook(() => useCountdown(deadline));
    expect(result.current).toBe(3);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);
  });

  it("0에서 멈춘다 — 음수로 내려가면 버튼이 영영 안 열린다", () => {
    useFrozenClock();
    const deadline = Date.now() + 1000;
    const { result } = renderHook(() => useCountdown(deadline));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it("null이면 0", () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toBe(0);
  });

  it("같은 대기 시간으로 다시 거절당해도 카운트다운이 새로 시작된다", () => {
    useFrozenClock();
    const { result, rerender } = renderHook(
      ({ deadline }: { deadline: number | null }) => useCountdown(deadline),
      { initialProps: { deadline: Date.now() + 5000 } },
    );
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current).toBe(1);
    // 두 번째 429도 5초 대기 — 만료 시각으로 받으므로 값이 달라져 다시 시작된다
    rerender({ deadline: Date.now() + 5000 });
    expect(result.current).toBe(5);
  });
});

describe("deadlineFrom", () => {
  it("대기 초를 만료 시각으로 바꾼다", () => {
    const now = Date.now();
    const deadline = deadlineFrom(10);
    expect(deadline).not.toBeNull();
    expect(deadline! - now).toBeGreaterThanOrEqual(10000);
  });

  it("값이 없으면 null — 헤더를 못 읽었을 때 카운트다운을 켜지 않는다", () => {
    expect(deadlineFrom(undefined)).toBeNull();
  });
});

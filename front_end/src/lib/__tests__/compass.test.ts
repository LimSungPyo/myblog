import { describe, expect, it } from "vitest";
import {
  COMPASS,
  arcPoints,
  isFullCircle,
  legs,
  pointerAngle,
  shortestDelta,
  springStep,
  sweepOf,
  unwrapAngle,
} from "@/lib/compass";

describe("각도 이어 붙이기", () => {
  it("차이는 가장 가까운 방향으로 -180~180 사이다", () => {
    expect(shortestDelta(170, -170)).toBe(20);
    expect(shortestDelta(-170, 170)).toBe(-20);
    expect(shortestDelta(0, 90)).toBe(90);
  });

  it("180°를 넘어가도 목표 각도가 끊기지 않고 계속 커진다", () => {
    // 170° 근처에서 포인터가 -170°(=190°)로 넘어가면 목표는 190°가 돼야 한다
    expect(unwrapAngle(170, -170)).toBe(190);
    // 한 바퀴 넘게 돈 상태에서도 같은 규칙으로 이어진다
    expect(unwrapAngle(530, -170)).toBe(550);
  });
});

describe("포인터 방향", () => {
  it("그림 중심에서 본 방향을 도로 돌려준다", () => {
    expect(pointerAngle(COMPASS.cx + 100, COMPASS.cy)).toBe(0);
    expect(pointerAngle(COMPASS.cx, COMPASS.cy - 100)).toBe(-90);
  });

  it("중심에 너무 가까우면 방향이 흔들리니 무시한다", () => {
    expect(pointerAngle(COMPASS.cx + 10, COMPASS.cy + 10)).toBeNull();
  });
});

describe("그린 거리", () => {
  it("가장 작은 각도와 가장 큰 각도의 차이이고, 한 바퀴에서 멈춘다", () => {
    expect(sweepOf(-90, 150)).toBe(240);
    expect(sweepOf(-90, 400)).toBe(360);
  });

  it("거의 한 바퀴면 완성으로 본다", () => {
    expect(isFullCircle(-90, 269.8)).toBe(true);
    expect(isFullCircle(-90, 200)).toBe(false);
  });

  it("호는 3°마다 한 점을 찍고, 시작점은 연필이 처음 있던 위쪽이다", () => {
    const points = arcPoints(-90, 150).split(" ");
    expect(points).toHaveLength(81); // 240° / 3° = 80칸, 점은 81개
    expect(points[0]).toBe(
      `${COMPASS.cx.toFixed(1)},${(COMPASS.cy - COMPASS.r).toFixed(1)}`,
    );
  });
});

describe("컴퍼스 다리", () => {
  it("연필 끝은 반지름 위에 있고, 경첩은 두 다리 가운데 위로 떠 있다", () => {
    const { px, py, hx, hy } = legs(0);
    expect(px).toBeCloseTo(COMPASS.cx + COMPASS.r);
    expect(py).toBeCloseTo(COMPASS.cy);
    expect(hx).toBeCloseTo((COMPASS.cx + px) / 2);
    expect(hy).toBeCloseTo(COMPASS.cy - COMPASS.hinge);
  });
});

describe("스프링", () => {
  it("목표로 끌려가다 멈춘다", () => {
    let value = 0;
    let velocity = 0;
    let settled = false;
    let frames = 0;
    let overshoot = 0;
    while (!settled && frames < 500) {
      ({ value, velocity, settled } = springStep(value, velocity, 100));
      overshoot = Math.max(overshoot, value);
      frames++;
    }
    expect(settled).toBe(true);
    expect(value).toBe(100);
    // 살짝 지나쳤다가 돌아온다(통통 튀는 정도는 작다)
    expect(overshoot).toBeGreaterThan(100);
    expect(overshoot).toBeLessThan(115);
  });
});

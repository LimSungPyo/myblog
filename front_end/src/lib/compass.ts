/**
 * 첫 화면 컴퍼스 그림의 계산.
 *
 * 각도는 SVG 기준 도(degree)다. 0°가 오른쪽, -90°가 위쪽, 시계 방향으로 커진다.
 * 각도는 한 바퀴를 넘어도 끊기지 않게 계속 쌓는다(-90 → 270 → 630 …).
 * 그래야 "지금까지 그린 범위"를 가장 작은 각도 ~ 가장 큰 각도로 셀 수 있다.
 */

/** 그림 한 장의 치수. viewBox 0 0 600 600 기준 */
export const COMPASS = {
  cx: 300,
  cy: 350,
  /** 바늘 다리에서 연필 다리 끝까지의 거리 = 그리는 원의 반지름 */
  r: 185,
  /** 두 다리 가운데 점에서 손잡이 경첩까지의 높이 */
  hinge: 205,
  /** 경첩 위로 솟은 손잡이 길이 */
  knob: 42,
} as const;

/** 처음 연필 다리가 있는 곳(위쪽) */
export const START_ANGLE = -90;

/** 한 바퀴로 치는 그린 거리. 부동소수점 오차로 360에 조금 못 미쳐도 완성으로 본다 */
const FULL = 359.5;

/** 두 각도의 차이를 -180 ~ 180 사이로 접는다. 가장 가까운 방향으로 도는 양이다 */
export function shortestDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * 포인터가 있는 방향(rawDeg, -180~180)을 끊기지 않는 목표 각도로 바꾼다.
 * atan2는 -180~180만 돌려주므로 그대로 쓰면 180°를 넘는 순간 다리가 반대로 한 바퀴 돈다.
 */
export function unwrapAngle(current: number, rawDeg: number): number {
  return current + shortestDelta(current, rawDeg);
}

/** 그림 중심에서 본 점(x, y)의 방향. 중심에 너무 가까우면 방향이 흔들려서 null */
export function pointerAngle(
  x: number,
  y: number,
  deadZone = 40,
): number | null {
  const dx = x - COMPASS.cx;
  const dy = y - COMPASS.cy;
  if (dx * dx + dy * dy < deadZone * deadZone) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** 지금까지 그린 거리(도). 한 바퀴에서 멈춘다 */
export function sweepOf(min: number, max: number): number {
  return Math.min(360, Math.max(0, max - min));
}

export function isFullCircle(min: number, max: number): boolean {
  return sweepOf(min, max) >= FULL;
}

/** 연필 끝, 경첩, 손잡이 끝의 좌표 */
export function legs(angle: number) {
  const rad = (angle * Math.PI) / 180;
  const px = COMPASS.cx + COMPASS.r * Math.cos(rad);
  const py = COMPASS.cy + COMPASS.r * Math.sin(rad);
  // 경첩은 두 다리 끝의 가운데에서 늘 화면 위쪽으로 같은 높이만큼 떠 있다.
  // 실제 컴퍼스를 비스듬히 내려다본 모습처럼 보이고, 어느 방향에서도 뒤집히지 않는다
  const hx = (COMPASS.cx + px) / 2;
  const hy = (COMPASS.cy + py) / 2 - COMPASS.hinge;
  return { px, py, hx, hy, ky: hy - COMPASS.knob };
}

/** 그린 호를 SVG polyline 점 목록으로. 3°마다 한 점 */
export function arcPoints(min: number, max: number): string {
  const sweep = sweepOf(min, max);
  const steps = Math.max(2, Math.ceil(sweep / 3));
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const rad = ((min + (sweep * i) / steps) * Math.PI) / 180;
    const x = COMPASS.cx + COMPASS.r * Math.cos(rad);
    const y = COMPASS.cy + COMPASS.r * Math.sin(rad);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

/**
 * 스프링 한 걸음. 목표 쪽으로 속도를 붙였다가(강성) 조금씩 줄인다(감쇠).
 * 감쇠가 1보다 작아서 목표를 살짝(약 12%) 지나쳤다가 돌아와, 60fps 기준 0.75초쯤에 멈춘다.
 * (강성 0.08·감쇠 0.8은 24%나 넘쳐서 장식이라도 요란했다)
 */
export function springStep(
  current: number,
  velocity: number,
  target: number,
  stiffness = 0.1,
  damping = 0.72,
) {
  const v = (velocity + (target - current) * stiffness) * damping;
  const next = current + v;
  const settled = Math.abs(target - next) < 0.05 && Math.abs(v) < 0.05;
  return settled
    ? { value: target, velocity: 0, settled }
    : { value: next, velocity: v, settled };
}

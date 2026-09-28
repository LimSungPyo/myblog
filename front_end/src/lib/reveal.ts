import type { CSSProperties } from "react";

/**
 * 스크롤 등장에서 몇 번째로 나타날지. 0부터 세고, 하나마다 globals.css의 간격만큼 늦게 나타난다.
 * `<div className="reveal" style={revealOrder(2)}>`
 */
export function revealOrder(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

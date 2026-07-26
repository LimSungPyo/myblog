import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatShortDate,
  formatRelativeTime,
  readingMinutes,
} from "@/lib/format";

describe("formatDate", () => {
  it("null이면 빈 문자열", () => {
    expect(formatDate(null)).toBe("");
  });
  it("ISO 날짜를 한국어 연도로 포맷", () => {
    const out = formatDate("2026-07-10T09:00:00Z");
    expect(out).toContain("2026");
    expect(out).toContain("월");
  });
});

describe("formatShortDate", () => {
  it("null이면 빈 문자열", () => {
    expect(formatShortDate(null)).toBe("");
  });
  it("YYYY.MM.DD 형태로 0 패딩", () => {
    expect(formatShortDate("2026-07-08T00:00:00")).toBe("2026.07.08");
  });
});

describe("formatRelativeTime", () => {
  it("방금 전", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("방금 전");
  });
  it("N시간 전", () => {
    const iso = new Date(Date.now() - 5 * 3600_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("5시간 전");
  });
  it("N일 전", () => {
    const iso = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("3일 전");
  });
});

describe("readingMinutes", () => {
  it("짧은 글도 최소 1분", () => {
    expect(readingMinutes("짧은 글")).toBe(1);
  });
  it("길이에 따라 분이 늘어난다 (~500자/분)", () => {
    expect(readingMinutes("가".repeat(1500))).toBe(3);
  });
});

import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/format";

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

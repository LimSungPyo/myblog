import { describe, expect, it } from "vitest";
import { buildWeeks, formatKoreanDay } from "@/lib/steps";

// 2026-09-28은 월요일이다
const TODAY = new Date("2026-09-28T03:00:00Z");

const post = (slug: string, at: string) => ({ slug, title: slug, at });

describe("지난 1년의 걸음", () => {
  it("오늘이 속한 주가 마지막 칸이고, 한 칸은 월요일부터 한 주다", () => {
    const weeks = buildWeeks([], TODAY);
    expect(weeks).toHaveLength(52);
    expect(weeks[51].start).toBe("2026-09-28");
    expect(weeks[50].start).toBe("2026-09-21");
    expect(weeks[0].start).toBe("2025-10-06");
  });

  it("주 중간(수요일)에 봐도 그 주 월요일이 마지막 칸이다", () => {
    const weeks = buildWeeks([], new Date("2026-10-01T12:00:00Z"));
    expect(weeks[51].start).toBe("2026-09-28");
  });

  it("글은 발행한 주에 들어가고, 같은 주의 글은 최신 글이 앞이다", () => {
    const weeks = buildWeeks(
      [
        post("nextjs", "2026-07-10T09:00:00Z"),
        post("fastapi", "2026-07-13T09:00:00Z"),
        post("retro", "2026-07-15T09:00:00Z"),
      ],
      TODAY,
    );
    const week = (start: string) => weeks.find((w) => w.start === start)!;
    expect(week("2026-07-06").posts.map((p) => p.slug)).toEqual(["nextjs"]);
    expect(week("2026-07-13").posts.map((p) => p.slug)).toEqual([
      "retro",
      "fastapi",
    ]);
  });

  it("한국 시간으로 센다: 월요일 새벽(UTC로는 일요일)에 쓴 글은 그 월요일 주에 들어간다", () => {
    // 2026-07-13 01:00 KST = 2026-07-12 16:00 UTC(일요일)
    const weeks = buildWeeks([post("dawn", "2026-07-12T16:00:00Z")], TODAY);
    expect(weeks.find((w) => w.start === "2026-07-13")!.posts).toHaveLength(1);
    expect(weeks.find((w) => w.start === "2026-07-06")!.posts).toHaveLength(0);
  });

  it("1년보다 오래된 글과 앞으로 발행될 글은 빠진다", () => {
    const weeks = buildWeeks(
      [
        post("old", "2025-01-01T00:00:00Z"),
        post("future", "2026-12-01T00:00:00Z"),
      ],
      TODAY,
    );
    expect(weeks.flatMap((w) => w.posts)).toHaveLength(0);
  });

  it("달이 바뀌는 첫 칸에만 달 이름을 단다", () => {
    const weeks = buildWeeks([], TODAY);
    expect(weeks[0].month).toBe("10월");
    expect(weeks[1].month).toBeNull();
    expect(weeks.filter((w) => w.month).map((w) => w.month)).toEqual([
      "10월",
      "11월",
      "12월",
      "1월",
      "2월",
      "3월",
      "4월",
      "5월",
      "6월",
      "7월",
      "8월",
      "9월",
    ]);
  });

  it("날짜를 한국어로 짧게 쓴다", () => {
    expect(formatKoreanDay("2026-07-06")).toBe("7월 6일");
  });
});

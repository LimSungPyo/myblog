/**
 * 홈 "지난 1년의 걸음" 눈금자 계산. 한 칸이 한 주(월요일 시작)다.
 *
 * 날짜는 한국 시간으로 센다. 서버는 UTC로 돌아서, 그대로 세면 월요일 새벽 0~9시에 쓴 글이
 * 전 주로 들어간다.
 */

const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

export interface StepPost {
  slug: string;
  title: string;
  /** 발행 시각(ISO) */
  at: string;
}

export interface StepWeek {
  /** 그 주 월요일(한국 날짜) "YYYY-MM-DD" */
  start: string;
  /** 그 주의 첫 칸이 새 달이면 "N월", 아니면 null */
  month: string | null;
  /** 그 주에 쓴 글. 최신 글이 앞 */
  posts: StepPost[];
}

/** 한국 날짜 기준 1970-01-01부터 며칠째인지 */
function kstDay(time: number): number {
  return Math.floor((time + KST_MS) / DAY_MS);
}

/** 그 날이 속한 주의 월요일(같은 기준의 날 번호). 1970-01-01은 목요일이다 */
function mondayOf(day: number): number {
  return day - ((day + 3) % 7);
}

function isoOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * 오늘이 속한 주까지 거꾸로 count주를 만들고, 글을 발행한 주에 넣는다.
 * 범위 밖의 글은 버린다.
 */
export function buildWeeks(
  posts: StepPost[],
  today: Date,
  count = 52,
): StepWeek[] {
  const lastMonday = mondayOf(kstDay(today.getTime()));
  const firstMonday = lastMonday - (count - 1) * 7;

  const weeks: StepWeek[] = [];
  let prevMonth = -1;
  for (let i = 0; i < count; i++) {
    const monday = firstMonday + i * 7;
    const month = new Date(monday * DAY_MS).getUTCMonth();
    weeks.push({
      start: isoOf(monday),
      month: month !== prevMonth ? `${month + 1}월` : null,
      posts: [],
    });
    prevMonth = month;
  }

  const sorted = [...posts].sort((a, b) => b.at.localeCompare(a.at));
  for (const post of sorted) {
    const index = (mondayOf(kstDay(Date.parse(post.at))) - firstMonday) / 7;
    if (index >= 0 && index < count) weeks[index].posts.push(post);
  }
  return weeks;
}

/** "2026-07-06" → "7월 6일" */
export function formatKoreanDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
}

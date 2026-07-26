export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/** YYYY.MM.DD 형태의 짧은 날짜 (카드용) */
export function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** ISO 시각을 "방금 전 / N분 전 / N시간 전 / N일 전 …" 상대 표현으로 */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(Math.max(0, diffMs) / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}개월 전`;
  return `${Math.floor(mon / 12)}년 전`;
}

/**
 * 본문 기준 대략적인 읽기 시간(분).
 * 마크다운 기호를 대충 걷어내고 한글 ~500자/분 기준으로 추정, 최소 1분.
 */
export function readingMinutes(content: string): number {
  const text = content.replace(/[#>*`_~\-\[\]()!]/g, "").trim();
  return Math.max(1, Math.round(text.length / 500));
}

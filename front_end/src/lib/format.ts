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

/**
 * 본문 기준 대략적인 읽기 시간(분).
 * 마크다운 기호를 대충 걷어내고 한글 ~500자/분 기준으로 추정, 최소 1분.
 */
export function readingMinutes(content: string): number {
  const text = content.replace(/[#>*`_~\-\[\]()!]/g, "").trim();
  return Math.max(1, Math.round(text.length / 500));
}

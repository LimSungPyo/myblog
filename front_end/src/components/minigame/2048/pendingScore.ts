/**
 * 비로그인 상태로 게임이 끝났을 때의 점수 보관소.
 * 로그인하러 갔다가 돌아와도 방금 기록을 순위에 등록할 수 있도록
 * sessionStorage(탭 단위, 탭을 닫으면 소멸)에 잠시 저장해 둔다.
 */
const KEY = "minigame:2048:pending-score";

export function savePendingScore(score: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, String(score));
  } catch {
    // 저장이 막힌 환경(프라이빗 모드 등)에서는 조용히 건너뛴다
  }
}

export function loadPendingScore(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const score = Number(raw);
    return Number.isInteger(score) && score > 0 ? score : null;
  } catch {
    return null;
  }
}

export function clearPendingScore() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}

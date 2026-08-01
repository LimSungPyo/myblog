import type { GameScore } from "@/types";
import { getToken } from "@/lib/authApi";

/**
 * 미니게임 순위 클라이언트 API.
 * 브라우저에서 직접 호출하므로 NEXT_PUBLIC_API_BASE_URL 사용
 * (방명록 폼과 동일한 방식). 미설정 시 no-op으로 동작해 백엔드 없이도 화면이 뜬다.
 */
const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export async function fetchTopScores(
  gameKey: string,
  limit = 10,
): Promise<GameScore[]> {
  if (!PUBLIC_API) return [];
  const res = await fetch(
    `${PUBLIC_API}/games/${gameKey}/scores?limit=${limit}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("순위를 불러오지 못했습니다.");
  return res.json() as Promise<GameScore[]>;
}

/** 점수 등록 — 로그인 필수. 플레이어 이름은 서버가 로그인 사용자의 닉네임으로 기록한다. */
export async function submitScore(
  gameKey: string,
  score: number,
): Promise<GameScore | null> {
  if (!PUBLIC_API) return null; // 백엔드 미연결 환경에서는 등록을 건너뜀
  const res = await fetch(`${PUBLIC_API}/games/${gameKey}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ score }),
  });
  if (res.status === 401) throw new Error("로그인이 필요합니다.");
  if (!res.ok) throw new Error("점수 등록에 실패했습니다.");
  return res.json() as Promise<GameScore>;
}

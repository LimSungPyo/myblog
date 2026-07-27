"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { GameScore } from "@/types";
import { formatDate } from "@/lib/format";

// game_key → 표시 이름. 게임을 추가하면 여기에 매핑을 넣는다.
const GAME_LABEL: Record<string, string> = {
  "2048": "2048",
};

export default function AdminGamesPage() {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setScores(await adminApi.listGameScores());
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function remove(id: number) {
    if (!confirm("이 점수 기록을 삭제할까요?")) return;
    await adminApi.deleteGameScore(id);
    setScores((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">미니게임 순위 관리</h1>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-neutral-500">불러오는 중…</p>
      ) : scores.length === 0 ? (
        <p className="text-neutral-500">등록된 점수가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {scores.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                  {GAME_LABEL[s.gameKey] ?? s.gameKey}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="truncate font-medium">{s.playerName}</span>
                    <span className="font-bold tabular-nums text-[#10213a] dark:text-white">
                      {s.score.toLocaleString()}점
                    </span>
                  </div>
                  <time className="text-xs text-neutral-500">
                    {formatDate(s.createdAt)}
                  </time>
                </div>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="shrink-0 text-sm text-red-500 hover:underline"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

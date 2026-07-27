import type { GameScore } from "@/types";

const MEDAL = ["🥇", "🥈", "🥉"];

/** 오른쪽 순위 대시보드. 점수 내림차순 상위 기록을 보여준다. */
export default function Leaderboard({
  scores,
  highlightId,
}: {
  scores: GameScore[];
  highlightId?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-neutral-900 dark:shadow-none">
      <h2 className="flex items-center gap-2 text-lg font-bold">🏆 순위</h2>

      {scores.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">
          아직 등록된 점수가 없어요.
          <br />첫 기록의 주인공이 되어보세요!
        </p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {scores.map((s, i) => {
            const isMe = highlightId != null && s.id === highlightId;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  isMe
                    ? "bg-[#10213a] text-white dark:bg-white dark:text-slate-900"
                    : "bg-neutral-50 dark:bg-white/5"
                }`}
              >
                <span className="w-6 shrink-0 text-center font-bold">
                  {MEDAL[i] ?? i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {s.playerName}
                </span>
                <span className="shrink-0 font-bold tabular-nums">
                  {s.score.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

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
    <div className="rounded-[4px] bg-surface p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-bold">🏆 순위</h2>

      {scores.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
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
                  isMe ? "bg-foreground text-background" : "bg-chip"
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

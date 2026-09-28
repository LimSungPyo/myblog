"use client";

/**
 * 로그인 전에 끝난 게임의 점수가 남아 있을 때 뜨는 팝업.
 * 로그인하고 돌아온 사용자에게 그 기록을 순위에 등록할지 묻는다.
 */
export default function PendingScoreDialog({
  score,
  playerName,
  submitting,
  error,
  onRegister,
  onDismiss,
}: {
  score: number;
  playerName: string;
  submitting: boolean;
  error: string | null;
  onRegister: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-[4px] bg-surface p-6 text-center shadow-card-hover">
        <h2 className="text-xl font-bold">로그인 전 기록이 있어요</h2>
        <p className="mt-2 text-sm text-muted">
          {playerName}님, 방금 끝난 게임의 점수를 순위에 등록할까요?
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-foreground">
          {score.toLocaleString()}
        </p>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onRegister}
            disabled={submitting}
            className="press w-full rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            {submitting ? "등록 중…" : "순위에 등록"}
          </button>
          <button
            onClick={onDismiss}
            disabled={submitting}
            className="press w-full rounded-xl bg-surface px-6 py-2.5 text-sm font-semibold text-muted shadow-card hover:text-foreground disabled:opacity-50"
          >
            등록하지 않기
          </button>
        </div>
      </div>
    </div>
  );
}

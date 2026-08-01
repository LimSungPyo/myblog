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
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-neutral-900">
        <h2 className="text-xl font-bold">로그인 전 기록이 있어요</h2>
        <p className="mt-2 text-sm text-neutral-500">
          {playerName}님, 방금 끝난 게임의 점수를 순위에 등록할까요?
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-[#10213a] dark:text-white">
          {score.toLocaleString()}
        </p>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onRegister}
            disabled={submitting}
            className="w-full rounded-xl bg-[#10213a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3157] disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200"
          >
            {submitting ? "등록 중…" : "순위에 등록"}
          </button>
          <button
            onClick={onDismiss}
            disabled={submitting}
            className="w-full rounded-xl border border-black/10 px-6 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/10"
          >
            등록하지 않기
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * 게임 종료 시 뜨는 팝업.
 * 최종 점수를 보여주고 "순위에 등록"할지 여부를 선택하게 한다.
 */
export default function GameOverDialog({
  score,
  playerName,
  submitting,
  registered,
  error,
  onRegister,
  onSkip,
  onRestart,
}: {
  score: number;
  playerName: string;
  submitting: boolean;
  registered: boolean;
  error: string | null;
  onRegister: () => void;
  onSkip: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-neutral-900">
        <h2 className="text-xl font-bold">게임 오버!</h2>
        <p className="mt-2 text-sm text-neutral-500">
          {playerName}님의 최종 점수
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-[#10213a] dark:text-white">
          {score.toLocaleString()}
        </p>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {registered ? (
          <>
            <p className="mt-4 text-sm font-medium text-green-600 dark:text-green-400">
              순위에 등록되었습니다! 🎉
            </p>
            <button
              onClick={onRestart}
              className="mt-3 w-full rounded-xl bg-[#10213a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3157] dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200"
            >
              다시 하기
            </button>
          </>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={onRegister}
              disabled={submitting}
              className="w-full rounded-xl bg-[#10213a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3157] disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200"
            >
              {submitting ? "등록 중…" : "순위에 등록"}
            </button>
            <button
              onClick={onSkip}
              disabled={submitting}
              className="w-full rounded-xl border border-black/10 px-6 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/10"
            >
              등록 안 하고 다시 하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

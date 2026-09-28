"use client";

import Link from "next/link";

/**
 * 게임 종료 시 뜨는 팝업.
 * 최종 점수를 보여주고, 로그인 상태면 "순위에 등록"을, 아니면 로그인을 안내한다.
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
  playerName: string | null; // null이면 비로그인
  submitting: boolean;
  registered: boolean;
  error: string | null;
  onRegister: () => void;
  onSkip: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-[4px] bg-surface p-6 text-center shadow-card-hover">
        <h2 className="text-xl font-bold">게임 오버!</h2>
        <p className="mt-2 text-sm text-muted">
          {playerName ? `${playerName}님의 최종 점수` : "최종 점수"}
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-foreground">
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
              className="mt-3 press w-full rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background"
            >
              다시 하기
            </button>
          </>
        ) : playerName ? (
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={onRegister}
              disabled={submitting}
              className="press w-full rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              {submitting ? "등록 중…" : "순위에 등록"}
            </button>
            <button
              onClick={onSkip}
              disabled={submitting}
              className="press w-full rounded-xl bg-surface px-6 py-2.5 text-sm font-semibold text-muted shadow-card hover:text-foreground disabled:opacity-50"
            >
              등록 안 하고 다시 하기
            </button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            <p className="text-sm text-muted">
              <Link
                href="/login?from=/minigame/2048"
                className="font-medium text-accent hover:underline"
              >
                로그인
              </Link>
              하면 방금 기록을 순위에 등록할 수 있어요.
            </p>
            <button
              onClick={onRestart}
              className="press w-full rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background"
            >
              다시 하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameScore } from "@/types";
import { fetchTopScores, submitScore } from "@/lib/minigameApi";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  emptyBoard,
  initBoard,
  isGameOver,
  move,
  spawnTile,
  type Board as BoardType,
  type Direction,
} from "./board";
import BoardView from "./BoardView";
import GameOverDialog from "./GameOverDialog";
import PendingScoreDialog from "./PendingScoreDialog";
import Leaderboard from "./Leaderboard";
import {
  clearPendingScore,
  loadPendingScore,
  savePendingScore,
} from "./pendingScore";

const GAME_KEY = "2048";
const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

type Phase = "playing" | "over";

export default function Game2048({
  initialScores,
}: {
  initialScores: GameScore[];
}) {
  // 게임은 로그인 없이 바로 시작. 로그인 상태는 점수 등록에만 쓰인다.
  const { user } = useAuthUser();
  const [phase, setPhase] = useState<Phase>("playing");
  // 처음 그림은 서버와 똑같아야 한다. 무작위로 만든 판을 첫 그림에 쓰면 서버와 브라우저의 판이 달라
  // 하이드레이션이 깨지고, React가 페이지 전체를 다시 그리면서 다크 모드 표시까지 지워졌다.
  // 그래서 빈 판으로 시작하고, 화면이 뜬 직후(다음 프레임) 첫 타일 두 개를 놓는다.
  const [board, setBoard] = useState<BoardType>(emptyBoard);
  const [score, setScore] = useState(0);

  const [scores, setScores] = useState<GameScore[]>(initialScores);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 비로그인 상태로 끝난 게임의 점수. 로그인하러 갔다 돌아오면 이 페이지가
  // 다시 마운트되므로, 그때 보관소에서 꺼내 등록 여부를 물어본다.
  // 보관 점수도 브라우저 저장소(sessionStorage)에만 있어서 서버와 다를 수 있다. 판과 같이 화면이 뜬 뒤에 읽는다.
  const [pendingScore, setPendingScore] = useState<number | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setBoard((prev) =>
        prev.every((row) => row.every((v) => v === 0)) ? initBoard() : prev,
      );
      setPendingScore(loadPendingScore());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // 비로그인 게임 오버 → 점수를 보관해 둔다
  useEffect(() => {
    if (phase === "over" && !user && score > 0) savePendingScore(score);
  }, [phase, user, score]);

  const askPending = !!user && pendingScore !== null && phase === "playing";

  const restart = useCallback(() => {
    setBoard(initBoard());
    setScore(0);
    setRegistered(false);
    setHighlightId(null);
    setError(null);
    setPhase("playing");
  }, []);

  const applyMove = useCallback((dir: Direction) => {
    setBoard((prev) => {
      const res = move(prev, dir);
      if (!res.moved) return prev;
      const next = spawnTile(res.board);
      setScore((s) => s + res.gained);
      if (isGameOver(next)) setPhase("over");
      return next;
    });
  }, []);

  // 키보드 입력 (방향키 + WASD). 플레이 중에만 동작 (등록 팝업이 떠 있으면 잠시 멈춤).
  useEffect(() => {
    if (phase !== "playing" || askPending) return;
    function onKey(e: KeyboardEvent) {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      applyMove(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, askPending, applyMove]);

  // 모바일 스와이프
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (phase !== "playing" || askPending || !touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    const THRESHOLD = 24;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? "right" : "left");
    else applyMove(dy > 0 ? "down" : "up");
  }

  async function submitAndRefresh(value: number): Promise<boolean> {
    setSubmitting(true);
    setError(null);
    try {
      const created = await submitScore(GAME_KEY, value);
      const fresh = await fetchTopScores(GAME_KEY);
      if (fresh.length > 0) setScores(fresh);
      setHighlightId(created?.id ?? null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function register() {
    if (await submitAndRefresh(score)) setRegistered(true);
  }

  function dismissPending() {
    clearPendingScore();
    setPendingScore(null);
    setError(null);
  }

  async function registerPending() {
    if (pendingScore === null) return;
    if (await submitAndRefresh(pendingScore)) dismissPending();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              {user ? `${user.displayName}님` : "플레이어"}
            </p>
            <p className="text-xs text-muted">
              방향키 또는 스와이프로 같은 숫자를 합쳐 2048을 만드세요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#bbada0] px-4 py-2 text-center text-white">
              <div className="text-[10px] font-bold tracking-widest text-white/80">
                SCORE
              </div>
              <div className="text-xl font-extrabold tabular-nums">
                {score.toLocaleString()}
              </div>
            </div>
            <button
              onClick={restart}
              className="press rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
            >
              새 게임
            </button>
          </div>
        </div>

        {/* 보드 + 게임 오버 오버레이 */}
        <div
          className="relative mx-auto max-w-md touch-none select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <BoardView board={board} />
          {user && pendingScore !== null && phase === "playing" && (
            <PendingScoreDialog
              score={pendingScore}
              playerName={user.displayName}
              submitting={submitting}
              error={error}
              onRegister={registerPending}
              onDismiss={dismissPending}
            />
          )}
          {phase === "over" && (
            <GameOverDialog
              score={score}
              playerName={user?.displayName ?? null}
              submitting={submitting}
              registered={registered}
              error={error}
              onRegister={register}
              onSkip={restart}
              onRestart={restart}
            />
          )}
        </div>
      </div>

      <Leaderboard scores={scores} highlightId={highlightId} />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameScore } from "@/types";
import { fetchTopScores, submitScore } from "@/lib/minigameApi";
import {
  initBoard,
  isGameOver,
  move,
  spawnTile,
  type Board as BoardType,
  type Direction,
} from "./board";
import BoardView from "./BoardView";
import GameOverDialog from "./GameOverDialog";
import Leaderboard from "./Leaderboard";
import NameModal from "./NameModal";

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

type Phase = "name" | "playing" | "over";

export default function Game2048({
  initialScores,
}: {
  initialScores: GameScore[];
}) {
  const [phase, setPhase] = useState<Phase>("name");
  const [playerName, setPlayerName] = useState("");
  const [board, setBoard] = useState<BoardType>(() => initBoard());
  const [score, setScore] = useState(0);

  const [scores, setScores] = useState<GameScore[]>(initialScores);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback((name: string) => {
    setPlayerName(name);
    setBoard(initBoard());
    setScore(0);
    setPhase("playing");
  }, []);

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

  // 키보드 입력 (방향키 + WASD). 플레이 중에만 동작.
  useEffect(() => {
    if (phase !== "playing") return;
    function onKey(e: KeyboardEvent) {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      applyMove(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, applyMove]);

  // 모바일 스와이프
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (phase !== "playing" || !touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    const THRESHOLD = 24;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? "right" : "left");
    else applyMove(dy > 0 ? "down" : "up");
  }

  async function register() {
    setSubmitting(true);
    setError(null);
    try {
      const created = await submitScore(GAME_KEY, playerName, score);
      const fresh = await fetchTopScores(GAME_KEY);
      if (fresh.length > 0) setScores(fresh);
      setHighlightId(created?.id ?? null);
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">
              {playerName ? `${playerName}님` : "플레이어"}
            </p>
            <p className="text-xs text-neutral-400">
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
            {phase !== "name" && (
              <button
                onClick={restart}
                className="rounded-xl bg-[#10213a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3157] dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200"
              >
                새 게임
              </button>
            )}
          </div>
        </div>

        {/* 보드 + 오버레이(이름 입력 / 게임 오버) */}
        <div
          className="relative mx-auto max-w-md touch-none select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <BoardView board={board} />
          {phase === "name" && <NameModal onStart={startGame} />}
          {phase === "over" && (
            <GameOverDialog
              score={score}
              playerName={playerName}
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

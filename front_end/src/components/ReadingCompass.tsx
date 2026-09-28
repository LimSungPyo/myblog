"use client";

import { useEffect, useState } from "react";
import { onCircle, round2 } from "@/lib/compass";

/** 글 본문을 감싼 요소의 id. 이 요소를 얼마나 읽었는지 잰다 */
export const POST_BODY_ID = "post-body";

/** 끝까지 읽은 것으로 치는 비율(부동소수점 오차 여유) */
const DONE = 0.995;

/**
 * 본문을 얼마나 읽었는지(0~1).
 * 본문 맨 위가 화면 맨 위에 닿으면 0, 본문 맨 아래가 화면 맨 아래에 닿으면 1이다.
 * 본문이 화면보다 짧으면 다 보이는 순간 1이다.
 * 스크롤은 아주 자주 와서, 한 화면 그릴 때(프레임) 한 번만 계산한다.
 */
export function useReadingProgress(targetId = POST_BODY_ID): {
  progress: number;
  /** 한 번이라도 스크롤했는지. 짧은 글은 열자마자 100%라, 인사는 실제로 읽은 뒤에만 띄우려고 쓴다 */
  scrolled: boolean;
} {
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = document.getElementById(targetId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const next =
        range > 0
          ? Math.min(1, Math.max(0, -rect.top / range))
          : rect.bottom <= window.innerHeight
            ? 1
            : 0;
      // 천분의 일 단위로 끊어, 눈에 안 보이는 차이로 다시 그리는 일을 줄인다
      setProgress(Math.round(next * 1000) / 1000);
      if (window.scrollY > 0) setScrolled(true);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [targetId]);

  return { progress, scrolled };
}

/** 작은 컴퍼스 그림의 치수(viewBox 0 0 140 140) */
const MINI = { cx: 70, cy: 84, r: 48, hinge: 52, knob: 16 };

function MiniCompass({ progress }: { progress: number }) {
  const sweep = 360 * progress;
  const steps = Math.max(2, Math.ceil(sweep / 6));
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const p = onCircle(MINI.cx, MINI.cy, MINI.r, -90 + (sweep * i) / steps);
    return `${p.x},${p.y}`;
  }).join(" ");
  const pencil = onCircle(MINI.cx, MINI.cy, MINI.r, -90 + sweep);
  const hx = round2((MINI.cx + pencil.x) / 2);
  const hy = round2((MINI.cy + pencil.y) / 2 - MINI.hinge);

  return (
    <svg
      viewBox="0 0 140 140"
      aria-hidden
      className="h-full w-full overflow-visible text-foreground"
    >
      <circle
        cx={MINI.cx}
        cy={MINI.cy}
        r={MINI.r}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="2 5"
        className="stroke-construct"
      />
      {progress > 0 && (
        <polyline
          points={points}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-accent"
        />
      )}
      <line
        x1={hx}
        y1={hy}
        x2={MINI.cx}
        y2={MINI.cy}
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={hx}
        y1={hy}
        x2={pencil.x}
        y2={pencil.y}
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={hx}
        y1={hy}
        x2={hx}
        y2={round2(hy - MINI.knob)}
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <circle
        cx={hx}
        cy={hy}
        r={7}
        strokeWidth={3}
        stroke="currentColor"
        className="fill-background"
      />
      <circle cx={pencil.x} cy={pencil.y} r={4.5} className="fill-accent" />
    </svg>
  );
}

/**
 * 읽기 진행 표시. 본문을 읽은 만큼 작은 컴퍼스가 원을 그린다. 끝까지 읽으면 원이 닫히고 인사가 뜬다.
 * 스크롤 위치를 그대로 그리는 것이라 따로 움직임(transition)을 넣지 않는다.
 *
 * - rail: 넓은 화면 왼쪽 칸(목차 위)
 * - float: 휴대폰 오른쪽 아래에 떠 있는 작은 알약. 읽기 시작하면 나타난다
 */
export default function ReadingCompass({
  variant,
}: {
  variant: "rail" | "float";
}) {
  const { progress, scrolled } = useReadingProgress();
  const percent = Math.round(progress * 100);
  // 짧은 글은 본문이 한 화면에 다 들어가 열자마자 100%다. 끝까지 읽었다는 인사는 스크롤해서 읽은 뒤에만 한다
  const done = progress >= DONE && scrolled;

  if (variant === "float") {
    return (
      <div
        role="progressbar"
        aria-label="읽은 거리"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        data-shown={progress > 0.02}
        className="reading-float fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-30 flex items-center gap-1.5 rounded-full bg-surface py-1.5 pr-3 pl-1.5 shadow-card-hover lg:hidden"
      >
        <span className="h-8 w-8">
          <MiniCompass progress={progress} />
        </span>
        <span className="font-mono text-xs text-muted">
          {done ? "완독" : `${percent}%`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="progressbar"
        aria-label="읽은 거리"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="flex items-center gap-3"
      >
        <span className="h-24 w-24 shrink-0">
          <MiniCompass progress={progress} />
        </span>
        <span className="flex flex-col">
          <span className="font-mono text-[22px] font-semibold tabular-nums">
            {percent}%
          </span>
          <span className="font-mono text-xs text-muted">읽은 거리</span>
        </span>
      </div>
      <p aria-live="polite" className="font-serif text-[15px] text-accent">
        {done && (
          <span className="compass-hello block">
            끝까지 읽어 주셔서 고마워요.
          </span>
        )}
      </p>
    </div>
  );
}

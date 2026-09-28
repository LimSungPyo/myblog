"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { hero } from "@/config/site";
import { ArrowRightIcon } from "@/components/ui/icons";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  COMPASS,
  START_ANGLE,
  arcPoints,
  isFullCircle,
  legs,
  pointerAngle,
  springStep,
  sweepOf,
  unwrapAngle,
} from "@/lib/compass";

/** 첫 방문 때 컴퍼스가 스스로 그려 보이는 양(도)과 시작까지 기다리는 시간 */
const INTRO_SWEEP = 240;
const INTRO_DELAY_MS = 500;
/** SVG viewBox 한 변 */
const BOX = 600;

type View = { angle: number; min: number; max: number };

/**
 * 첫 화면. 로고인 제도용 컴퍼스가 원을 그린다.
 *
 * - 넓은 화면: 마우스를 컴퍼스 주위로 움직이면 연필 다리가 그 방향으로 돌며 원을 그린다.
 * - 휴대폰: 컴퍼스 위를 손가락으로 끌어 그린다. 그 영역만 touch-action: none이라 나머지는 평소처럼 스크롤된다.
 * - 처음 들어오면 스스로 원의 3분의 2를 그려 무엇을 하는 그림인지 보여준다.
 * - 한 바퀴를 다 그리면 인사가 뜬다. 드물게 보는 장면이라 즐거움을 줘도 되는 자리다.
 * - 다리는 스프링으로 따라온다(목표가 계속 바뀌어도 속도를 이어받아 끊기지 않는다).
 *   "동작 줄이기"를 켠 사람에게는 스프링 없이 바로 그 자리로 가고, 첫 그리기도 그려진 상태로 보여준다.
 */
export default function CompassHero() {
  const reduce = usePrefersReducedMotion();
  const [view, setView] = useState<View>({
    angle: START_ANGLE,
    min: START_ANGLE,
    max: START_ANGLE,
  });

  // 매 프레임 바뀌는 값은 ref에 두고, 화면에 필요한 것만 state로 내보낸다
  const sim = useRef({
    angle: START_ANGLE,
    velocity: 0,
    target: START_ANGLE,
    min: START_ANGLE,
    max: START_ANGLE,
    frame: 0,
    touched: false,
  });
  const svgRef = useRef<SVGSVGElement>(null);
  // 그리고 있는 손가락. 도중에 두 번째 손가락이 닿아도 그쪽으로 튀지 않게 처음 손가락만 따라간다
  const dragPointer = useRef<number | null>(null);
  const reduceRef = useRef(reduce);
  const move = useRef<(() => void) | null>(null);

  useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  useEffect(() => {
    const s = sim.current;
    const publish = () => setView({ angle: s.angle, min: s.min, max: s.max });
    const record = () => {
      if (s.angle < s.min) s.min = s.angle;
      if (s.angle > s.max) s.max = s.angle;
    };
    const tick = () => {
      s.frame = 0;
      const next = springStep(s.angle, s.velocity, s.target);
      s.angle = next.value;
      s.velocity = next.velocity;
      record();
      publish();
      if (!next.settled) s.frame = window.requestAnimationFrame(tick);
    };
    move.current = () => {
      if (reduceRef.current) {
        s.angle = s.target;
        s.velocity = 0;
        record();
        publish();
        return;
      }
      if (!s.frame) s.frame = window.requestAnimationFrame(tick);
    };

    const intro = window.setTimeout(
      () => {
        // 그 사이 사용자가 먼저 그리기 시작했으면 끼어들지 않는다
        if (s.touched) return;
        s.target = START_ANGLE + INTRO_SWEEP;
        move.current?.();
      },
      reduceRef.current ? 0 : INTRO_DELAY_MS,
    );

    return () => {
      window.clearTimeout(intro);
      if (s.frame) window.cancelAnimationFrame(s.frame);
      s.frame = 0;
      move.current = null;
    };
  }, []);

  /** 화면 좌표(clientX, clientY)를 향해 연필 다리를 돌린다 */
  function aim(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const scale = rect.width / BOX;
    const raw = pointerAngle(
      (clientX - rect.left) / scale,
      (clientY - rect.top) / scale,
    );
    if (raw === null) return;
    const s = sim.current;
    s.touched = true;
    s.target = unwrapAngle(s.target, raw);
    move.current?.();
  }

  function redraw() {
    const s = sim.current;
    s.min = s.angle;
    s.max = s.angle;
    setView({ angle: s.angle, min: s.angle, max: s.angle });
  }

  const { angle, min, max } = view;
  const done = isFullCircle(min, max);
  const sweep = Math.round(sweepOf(min, max));
  const theta = Math.round((((angle - START_ANGLE) % 360) + 360) % 360);
  const { px, py, hx, hy, ky } = legs(angle);

  return (
    <section
      // 넓은 화면: 첫 화면 어디서 마우스를 움직여도 컴퍼스가 따라온다
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") aim(e.clientX, e.clientY);
      }}
      className="grid items-center gap-2 pt-6 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-10 lg:pt-8 lg:pb-14"
    >
      <div className="relative z-10 flex flex-col gap-4 lg:gap-6">
        <p className="font-mono text-xs tracking-[0.04em] text-muted lg:text-[13px]">
          {hero.eyebrow}
        </p>
        <h1 className="text-[44px] leading-[1.15] font-extrabold tracking-[-0.03em] lg:text-[76px] lg:leading-[1.12]">
          {hero.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="text-base leading-relaxed text-muted lg:text-lg">
          {hero.subline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <Link
            href="/posts"
            className="press flex h-12 items-center gap-2 rounded-xl bg-foreground px-5 text-[15px] font-semibold text-background"
          >
            최근 글 읽기
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          {done ? (
            <button
              type="button"
              onClick={redraw}
              className="press h-11 rounded-lg px-3 font-mono text-[13px] text-muted hover:bg-hover hover:text-foreground"
            >
              ↺ 다시 그리기
            </button>
          ) : (
            <p className="font-mono text-xs text-faint">
              <span className="hidden pointer-fine:inline">
                ↻ 마우스를 컴퍼스 주위로 돌려 원을 완성해 보세요
              </span>
              <span className="pointer-fine:hidden">
                ↻ 컴퍼스 위를 손가락으로 돌려 원을 그려 보세요
              </span>
            </p>
          )}
        </div>

        {/* 한 바퀴를 다 그린 순간 알린다. 화면 낭독기에도 전한다 */}
        <p
          aria-live="polite"
          className="min-h-[1.5em] text-lg font-semibold text-accent lg:text-[22px]"
        >
          {done && (
            <span className="compass-hello block">
              한 바퀴 다 그렸어요. 꾸준함은 이렇게 쌓여요.
            </span>
          )}
        </p>
      </div>

      {/* 휴대폰에서는 이 영역에서만 손가락이 그리기에 쓰인다(스크롤 대신) */}
      <div
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" || dragPointer.current !== null) return;
          dragPointer.current = e.pointerId;
          // 손가락이 그림 밖으로 나가도 계속 그리도록 이 영역이 포인터를 붙잡는다
          e.currentTarget.setPointerCapture?.(e.pointerId);
          aim(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" && e.pointerId === dragPointer.current)
            aim(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.pointerId === dragPointer.current) dragPointer.current = null;
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === dragPointer.current) dragPointer.current = null;
        }}
        className="mx-auto w-full max-w-[340px] touch-none select-none lg:max-w-[500px]"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOX} ${BOX}`}
          aria-hidden
          className="h-auto w-full overflow-visible text-foreground"
        >
          <circle
            cx={COMPASS.cx}
            cy={COMPASS.cy}
            r={COMPASS.r}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="3 8"
            className="stroke-construct"
          />
          <path
            d={`M${COMPASS.cx - 14} ${COMPASS.cy}h28M${COMPASS.cx} ${COMPASS.cy - 14}v28`}
            strokeWidth={1.5}
            className="stroke-faint"
          />
          <polyline
            data-testid="compass-arc"
            points={arcPoints(min, max)}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-accent"
          />
          <line
            x1={COMPASS.cx}
            y1={COMPASS.cy}
            x2={px}
            y2={py}
            strokeWidth={1.5}
            strokeDasharray="5 6"
            className="stroke-faint"
          />
          <line
            x1={hx}
            y1={hy}
            x2={COMPASS.cx}
            y2={COMPASS.cy}
            stroke="currentColor"
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={hx}
            y1={hy}
            x2={px}
            y2={py}
            stroke="currentColor"
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={hx}
            y1={hy}
            x2={hx}
            y2={ky}
            stroke="currentColor"
            strokeWidth={9}
            strokeLinecap="round"
          />
          <circle cx={hx} cy={ky} r={8} fill="currentColor" />
          <circle
            cx={hx}
            cy={hy}
            r={16}
            strokeWidth={4}
            stroke="currentColor"
            className="fill-background"
          />
          <circle cx={hx} cy={hy} r={5.5} fill="currentColor" />
          <circle cx={COMPASS.cx} cy={COMPASS.cy} r={4} fill="currentColor" />
          <circle cx={px} cy={py} r={7} className="fill-accent" />
          <text x={8} y={40} className="fill-muted font-mono text-[15px]">
            θ {theta}°
          </text>
          <text x={8} y={64} className="fill-muted font-mono text-[15px]">
            그린 거리 {sweep}° / 360°
          </text>
        </svg>
      </div>
    </section>
  );
}

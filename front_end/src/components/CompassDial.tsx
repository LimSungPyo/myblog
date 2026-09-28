"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRevealOnce } from "@/hooks/useRevealOnce";
import { revealOrder } from "@/lib/reveal";
import { nav } from "@/config/site";
import { ArrowRightIcon } from "@/components/ui/icons";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { onCircle, shortestDelta, springStep } from "@/lib/compass";

/** 메뉴 사이 각도. 메뉴 6개를 한 바퀴에 고르게 놓는다 */
const STEP = 360 / nav.length;
/** 다이얼 그림 한 변과 중심 */
const SIZE = 460;
const C = SIZE / 2;

/** 위쪽(0°)부터 시계 방향으로 메뉴를 놓는다. 개발이 맨 위에 오도록 소개를 맨 뒤로 돌린다 */
/** 처음 보일 때 바늘이 몇 도 떨어진 곳에서 돌아오는지(반대쪽 조금 앞) */
const SWING_FROM = 160;

const items = [...nav.slice(1), nav[0]].map((item, i) => ({
  ...item,
  bearing: i * STEP,
}));

const bearingLabel = (deg: number) => String(Math.round(deg)).padStart(3, "0");

/**
 * "어디로 갈까요?" 메뉴 다이얼.
 *
 * 넓은 화면: 둥근 다이얼 둘레에 메뉴를 놓고, 메뉴에 마우스를 올리거나 키보드로 초점을 옮기면
 * 가운데 바늘이 그쪽으로 스프링처럼 돌아간다. 옆 칸에 그 메뉴의 설명과 바로 가기가 나온다.
 * 휴대폰: 다이얼 대신 목록으로 보여주고, 줄마다 작은 바늘이 그 메뉴의 방위를 가리킨다.
 */
export default function CompassDial() {
  const reduce = usePrefersReducedMotion();
  const [selected, setSelected] = useState(0);
  const [needle, setNeedle] = useState(0);
  const sim = useRef({ angle: 0, velocity: 0, target: 0, frame: 0 });
  const reduceRef = useRef(reduce);
  // 스크롤해서 이 구역이 처음 보이면 다이얼 → 설명 순서로 떠오른다
  const [sectionRef, shown] = useRevealOnce<HTMLElement>();

  useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  useEffect(() => {
    const s = sim.current;
    return () => {
      if (s.frame) window.cancelAnimationFrame(s.frame);
      s.frame = 0;
    };
  }, []);

  function point(index: number) {
    const s = sim.current;
    // 가장 가까운 방향으로 돈다(300° → 0°는 뒤로 300°가 아니라 앞으로 60°)
    s.target += shortestDelta(s.target, items[index].bearing);
    setSelected(index);
    if (reduceRef.current) {
      s.angle = s.target;
      s.velocity = 0;
      setNeedle(s.angle);
      return;
    }
    spin();
  }

  /** 바늘을 목표(sim.target)까지 스프링으로 돌린다. 이미 돌고 있으면 목표만 바뀐 채 이어서 돈다 */
  function spin() {
    const s = sim.current;
    const tick = () => {
      s.frame = 0;
      const next = springStep(s.angle, s.velocity, s.target);
      s.angle = next.value;
      s.velocity = next.velocity;
      setNeedle(s.angle);
      if (!next.settled) s.frame = window.requestAnimationFrame(tick);
    };
    if (!s.frame) s.frame = window.requestAnimationFrame(tick);
  }

  // 다이얼이 처음 보이면 바늘이 반대쪽에서 휙 돌아와 지금 방향(처음엔 북쪽 = 개발)에 스프링처럼 멈춘다.
  // 나침반을 꺼내 들었을 때 바늘이 자리를 찾는 모습이다. 동작 줄이기면 돌지 않는다
  useEffect(() => {
    if (!shown || reduceRef.current) return;
    const s = sim.current;
    s.angle = s.target - SWING_FROM;
    s.velocity = 0;
    spin();
  }, [shown]);

  const current = items[selected];

  return (
    <section
      ref={sectionRef}
      data-reveal=""
      data-shown={shown ? "" : undefined}
      className="flex flex-col gap-5"
    >
      <h2
        className="reveal text-[26px] font-bold tracking-[-0.02em] lg:hidden"
        style={revealOrder(0)}
      >
        어디로 갈까요?
      </h2>

      {/* 넓은 화면: 다이얼 */}
      <div className="hidden grid-cols-[460px_minmax(0,1fr)] items-center gap-16 lg:grid">
        <div
          className="reveal relative h-[460px] w-[460px]"
          style={revealOrder(0)}
        >
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden
            className="absolute inset-0 h-full w-full"
          >
            <circle
              cx={C}
              cy={C}
              r={150}
              strokeWidth={1}
              className="fill-surface stroke-line"
            />
            {Array.from({ length: 72 }, (_, i) => {
              const long = i % 6 === 0;
              const from = onCircle(C, C, long ? 130 : 138, i * 5 - 90);
              const to = onCircle(C, C, 146, i * 5 - 90);
              return (
                <line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  strokeWidth={1}
                  className={long ? "stroke-foreground" : "stroke-faint"}
                />
              );
            })}
            <circle
              cx={C}
              cy={C}
              r={98}
              fill="none"
              strokeWidth={1}
              strokeDasharray="2 6"
              className="stroke-construct"
            />
            <g
              data-testid="dial-needle"
              transform={`rotate(${needle.toFixed(2)} ${C} ${C})`}
            >
              <path
                d={`M${C} ${C - 126} L${C + 8} ${C - 4} L${C} ${C + 16} L${C - 8} ${C - 4} Z`}
                className="fill-accent"
              />
              <path
                d={`M${C} ${C + 16} L${C + 6} ${C + 32} L${C} ${C + 70} L${C - 6} ${C + 32} Z`}
                className="fill-faint"
              />
            </g>
            <circle
              cx={C}
              cy={C}
              r={11}
              strokeWidth={3}
              className="fill-background stroke-foreground"
            />
          </svg>

          {items.map((item, i) => {
            const at = onCircle(C, C, 196, item.bearing - 90);
            const active = i === selected;
            return (
              <Link
                key={item.href}
                href={item.href}
                onPointerEnter={() => point(i)}
                onFocus={() => point(i)}
                aria-current={active ? "true" : undefined}
                style={{ left: at.x, top: at.y }}
                className={`press absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <p
            className="reveal font-mono text-[13px] text-muted"
            style={revealOrder(1)}
          >
            어디로 갈까요? · 방위 {bearingLabel(current.bearing)}°
          </p>
          <p
            className="reveal text-[52px] leading-tight font-extrabold tracking-[-0.03em]"
            style={revealOrder(2)}
          >
            {current.label}
          </p>
          <p
            className="reveal max-w-md text-lg leading-relaxed text-muted"
            style={revealOrder(3)}
          >
            {current.desc}
          </p>
          {/* 바로 가기 버튼은 누름 반응(scale 전환)이 있어, 떠오르기는 감싸는 칸이 맡는다 */}
          <div className="reveal mt-2 self-start" style={revealOrder(4)}>
            <Link
              href={current.href}
              className="press flex h-12 items-center gap-2 rounded-xl bg-surface px-5 text-[15px] font-semibold shadow-card hover:shadow-card-hover"
            >
              {current.label} 바로 가기
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 휴대폰: 목록. 줄마다 작은 바늘이 그 메뉴의 방위를 가리킨다 */}
      <ul className="flex flex-col gap-2.5 lg:hidden">
        {items.map((item, i) => (
          <li key={item.href} className="reveal" style={revealOrder(1 + i)}>
            <Link
              href={item.href}
              className="press grid min-h-[60px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[4px] bg-surface px-3.5 py-2.5 shadow-card"
            >
              <svg viewBox="0 0 36 36" aria-hidden className="h-9 w-9">
                <circle
                  cx={18}
                  cy={18}
                  r={16}
                  fill="none"
                  strokeWidth={1}
                  className="stroke-line"
                />
                <g transform={`rotate(${item.bearing} 18 18)`}>
                  <path
                    d="M18 5 L21 18 L18 21 L15 18 Z"
                    className="fill-accent"
                  />
                  <path
                    d="M18 21 L20 23 L18 30 L16 23 Z"
                    className="fill-faint"
                  />
                </g>
              </svg>
              <span className="flex min-w-0 flex-col">
                <span className="font-bold">{item.label}</span>
                <span className="text-[13px] text-muted">{item.desc}</span>
              </span>
              <span className="font-mono text-[11px] text-faint">
                {bearingLabel(item.bearing)}°
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

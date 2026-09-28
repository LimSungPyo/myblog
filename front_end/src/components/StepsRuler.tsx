"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatKoreanDay, type StepWeek } from "@/lib/steps";

type Open = { index: number; x: number; y: number };

/**
 * "지난 1년의 걸음". 한 칸이 한 주인 눈금자로, 글을 쓴 주는 진한 파란 눈금과 점으로 표시한다.
 * 그 눈금을 누르면 위로 작은 창이 떠서 그 주에 쓴 글로 갈 수 있다.
 *
 * 휴대폰에서는 눈금자가 화면보다 넓어서 가로로 밀어 본다. 가로 스크롤 상자는 넘치는 것을
 * 위아래로도 잘라 버려서, 창은 상자 밖에 화면 기준(fixed)으로 띄우고 스크롤하면 닫는다.
 * 창은 누른 눈금 쪽(아래 가운데)에서 커지며 나타난다. 가끔 여는 작은 창이라 0.15초.
 */
export default function StepsRuler({ weeks }: { weeks: StepWeek[] }) {
  const [open, setOpen] = useState<Open | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const total = weeks.reduce((n, w) => n + w.posts.length, 0);

  // 휴대폰처럼 눈금자가 화면보다 넓으면, 최근 주와 "오늘"이 보이도록 처음에 맨 오른쪽으로 밀어 둔다
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // 창 바깥을 누르면 닫는다(눈금 버튼과 창은 이 구역 안이라 제외)
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    // 창은 화면에 고정돼 있어서, 페이지나 눈금자가 스크롤되면 눈금과 떨어진다
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const openWeek = open ? weeks[open.index] : null;

  return (
    <section ref={rootRef} className="flex flex-col gap-4 lg:gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-[26px] font-bold tracking-[-0.02em] lg:text-[34px]">
          지난 1년의 걸음
        </h2>
        <p className="font-mono text-xs text-muted">
          한 칸 = 한 주 · 기록 {total}개
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-4 overflow-x-auto overscroll-x-contain px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-1 [&::-webkit-scrollbar]:hidden"
      >
        <ol
          aria-label="주별 글 기록"
          className="flex h-[128px] min-w-[720px] rounded-[4px] bg-surface px-3 pt-6 shadow-card"
        >
          {weeks.map((week, i) => {
            const count = week.posts.length;
            const isLast = i === weeks.length - 1;
            return (
              <li key={week.start} className="relative flex-1">
                {/* 눈금: 달이 바뀌는 칸은 조금 길고, 글이 있는 칸은 길고 파랗다 */}
                <div className="relative flex h-[68px] items-end justify-center border-b border-line">
                  {count > 0 && (
                    <span
                      aria-hidden
                      className={`absolute top-1 rounded-full bg-accent ${count > 1 ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}`}
                    />
                  )}
                  <span
                    aria-hidden
                    className={
                      count > 0
                        ? "h-12 w-[2.5px] rounded-full bg-accent"
                        : week.month
                          ? "h-6 w-px bg-muted"
                          : "h-3 w-px bg-faint"
                    }
                  />
                  {count > 0 && (
                    <button
                      type="button"
                      aria-label={`${formatKoreanDay(week.start)}부터 한 주, 글 ${count}개`}
                      aria-expanded={open?.index === i}
                      onClick={(e) => {
                        if (open?.index === i) return setOpen(null);
                        const r = e.currentTarget.getBoundingClientRect();
                        setOpen({
                          index: i,
                          x: r.left + r.width / 2,
                          y: r.top,
                        });
                      }}
                      className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 rounded-md focus-visible:outline-2 focus-visible:outline-accent"
                    />
                  )}
                  {isLast && (
                    <span className="absolute -top-5 font-mono text-[11px] whitespace-nowrap text-muted">
                      오늘
                    </span>
                  )}
                </div>
                {week.month && (
                  <span className="absolute top-[76px] left-1/2 font-mono text-[11px] whitespace-nowrap text-faint">
                    {week.month}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {open && openWeek && (
        <div
          role="dialog"
          aria-label={`${formatKoreanDay(openWeek.start)}부터 한 주의 글`}
          style={{ left: open.x, top: open.y - 8 }}
          className="steps-pop fixed z-50 flex w-60 -translate-x-1/2 -translate-y-full flex-col gap-1 rounded-xl bg-foreground p-3 text-background shadow-card-hover"
        >
          <p className="px-1 font-mono text-[11px] opacity-70">
            {formatKoreanDay(openWeek.start)}부터 한 주
          </p>
          {openWeek.posts.map((post) => (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className="rounded-lg px-1 py-1.5 text-sm font-semibold hover:bg-background/10"
            >
              {post.title}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

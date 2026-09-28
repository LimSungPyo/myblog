"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/toc";
import { ChevronRightIcon } from "@/components/ui/icons";

/** 제목이 화면 위에서 이만큼 안쪽으로 들어오면 "지금 읽는 절"로 본다(px) */
const ACTIVE_OFFSET = 96;

/**
 * 지금 읽고 있는 절의 제목 id.
 *
 * 화면 위쪽 선(ACTIVE_OFFSET)을 이미 지나간 제목 중 마지막 것이 지금 읽는 절이다.
 * 스크롤할 때마다 계산하되, 한 화면 그릴 때(프레임) 한 번만 한다.
 * 맨 아래까지 내리면 마지막 절이 짧아서 제목이 선에 못 닿아도 마지막 절로 친다.
 */
export function useActiveHeading(
  ids: string[],
  /**
   * 본문을 감싼 요소의 id. 주면 "본문 끝이 화면 안에 들어온 순간"도 맨 아래로 친다.
   * 글 아래에 댓글이 길게 이어지면 페이지 맨 아래까지 한참 남아서, 짧은 마지막 절이
   * 끝까지 강조되지 않던 것을 막는다.
   */
  endId?: string,
): string | null {
  const [active, setActive] = useState<string | null>(null);
  // 배열은 그릴 때마다 새로 만들어질 수 있어서, 내용이 바뀔 때만 다시 등록한다
  const key = ids.join("\n");

  useEffect(() => {
    const list = key ? key.split("\n") : [];
    if (list.length === 0) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const end = endId ? document.getElementById(endId) : null;
      const atBottom =
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 2 ||
        (!!end && end.getBoundingClientRect().bottom <= window.innerHeight);
      let current: string | null = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top > ACTIVE_OFFSET) break;
        current = id;
      }
      if (atBottom && window.scrollY > 0) current = list[list.length - 1];
      setActive(current);
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
  }, [key, endId]);

  return active;
}

function TocList({
  items,
  active,
  rail,
}: {
  items: TocItem[];
  active: string | null;
  /**
   * 넓은 화면 목차: 줄마다 점을 찍어 도면의 측점처럼 보여준다.
   * 지금 읽는 절은 파란 점, 이미 지나온 절은 채운 점, 아직 안 읽은 절은 빈 점이다.
   */
  rail: boolean;
}) {
  const activeIndex = items.findIndex((item) => item.id === active);
  return (
    <ol className={`leading-normal ${rail ? "text-sm" : "text-[15px]"}`}>
      {items.map((item, i) => {
        const isActive = i === activeIndex;
        const isRead = activeIndex >= 0 && i < activeIndex;
        return (
          <li key={item.id} className={item.depth === 3 ? "pl-3" : undefined}>
            <a
              href={`#${item.id}`}
              aria-current={isActive ? "location" : undefined}
              data-read={rail && isRead ? "" : undefined}
              className={`transition-colors duration-150 ${
                rail
                  ? "grid grid-cols-[14px_minmax(0,1fr)] items-baseline gap-2 py-1.5"
                  : "flex min-h-10 items-center"
              } ${
                isActive
                  ? "font-semibold text-foreground"
                  : isRead && rail
                    ? "text-muted hover:text-foreground"
                    : `${rail ? "text-faint" : "text-muted"} hover:text-foreground`
              }`}
            >
              {rail && (
                <span
                  aria-hidden
                  className={`h-[7px] w-[7px] -translate-y-px rounded-full transition-[background-color,box-shadow] duration-150 ${
                    isActive
                      ? "bg-accent shadow-[0_0_0_3px_var(--accent-soft)]"
                      : isRead
                        ? "bg-faint"
                        : "shadow-[inset_0_0_0_1px_var(--faint)]"
                  }`}
                />
              )}
              <span>{item.text}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * 글 목차. 넓은 화면은 본문 왼쪽 칸에 따라다니고, 좁은 화면은 본문 위에 접혀 있다.
 * 두 모양을 한 페이지에 함께 두고 화면 폭에 따라 하나만 보이게 한다.
 */
export default function TableOfContents({
  items,
  variant,
  endId,
}: {
  items: TocItem[];
  variant: "sidebar" | "inline";
  /** 본문을 감싼 요소의 id(useActiveHeading 참고) */
  endId?: string;
}) {
  const active = useActiveHeading(
    items.map((i) => i.id),
    endId,
  );

  if (variant === "inline") {
    // 휴대폰에서는 본문을 가리지 않게 접어 둔다. <details>라서 스크립트 없이도 열리고 닫힌다.
    // 열고 닫을 때 오른쪽 화살표가 아래로 돌아 상태를 알려준다.
    return (
      <details className="group mb-7 rounded-xl bg-chip lg:hidden">
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold select-none [&::-webkit-details-marker]:hidden">
          목차
          <ChevronRightIcon className="h-4 w-4 text-muted transition-transform duration-200 ease-out-strong group-open:rotate-90 motion-reduce:transition-none" />
        </summary>
        <nav aria-label="목차" className="px-4 pb-3">
          <TocList items={items} active={active} rail={false} />
        </nav>
      </details>
    );
  }

  // 넓은 화면: 왼쪽 칸에서 읽기 진행 컴퍼스와 도면 정보 사이에 놓인다.
  // 따라 내려오는 것과 높이 제한은 그 칸이 맡고, 목차는 남는 높이만큼 줄어들어 안에서 스크롤된다
  return (
    <nav aria-label="목차" className="min-h-0 overflow-y-auto">
      <p className="mb-2 font-mono text-xs text-muted">목차</p>
      <TocList items={items} active={active} rail />
    </nav>
  );
}

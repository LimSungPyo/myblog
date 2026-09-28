"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/toc";

/** 제목이 화면 위에서 이만큼 안쪽으로 들어오면 "지금 읽는 절"로 본다(px) */
const ACTIVE_OFFSET = 96;

/**
 * 지금 읽고 있는 절의 제목 id.
 *
 * 화면 위쪽 선(ACTIVE_OFFSET)을 이미 지나간 제목 중 마지막 것이 지금 읽는 절이다.
 * 스크롤할 때마다 계산하되, 한 화면 그릴 때(프레임) 한 번만 한다.
 * 맨 아래까지 내리면 마지막 절이 짧아서 제목이 선에 못 닿아도 마지막 절로 친다.
 */
export function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  // 배열은 그릴 때마다 새로 만들어질 수 있어서, 내용이 바뀔 때만 다시 등록한다
  const key = ids.join("\n");

  useEffect(() => {
    const list = key ? key.split("\n") : [];
    if (list.length === 0) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
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
  }, [key]);

  return active;
}

function TocList({
  items,
  active,
}: {
  items: TocItem[];
  active: string | null;
}) {
  return (
    <ol className="space-y-1.5 text-sm">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <li key={item.id} className={item.depth === 3 ? "pl-3" : undefined}>
            <a
              href={`#${item.id}`}
              aria-current={isActive ? "location" : undefined}
              className={`block border-l-2 py-0.5 pl-3 transition ${
                isActive
                  ? "border-blue-500 font-medium text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * 글 목차. 넓은 화면은 본문 오른쪽에 따라다니고, 좁은 화면은 본문 위에 접혀 있다.
 * 두 모양을 한 페이지에 함께 두고 화면 폭에 따라 하나만 보이게 한다.
 */
export default function TableOfContents({
  items,
  variant,
}: {
  items: TocItem[];
  variant: "sidebar" | "inline";
}) {
  const active = useActiveHeading(items.map((i) => i.id));

  if (variant === "inline") {
    // 휴대폰에서는 본문을 가리지 않게 접어 둔다. <details>라서 스크립트 없이도 열리고 닫힌다.
    return (
      <details className="mb-8 rounded-lg border border-black/10 px-4 py-2 lg:hidden dark:border-white/15">
        <summary className="cursor-pointer text-sm font-medium">목차</summary>
        <nav aria-label="목차" className="mt-3 pb-1">
          <TocList items={items} active={active} />
        </nav>
      </details>
    );
  }

  return (
    <nav
      aria-label="목차"
      className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        목차
      </p>
      <TocList items={items} active={active} />
    </nav>
  );
}

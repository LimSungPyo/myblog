"use client";

import type { ReactNode } from "react";
import { useRevealOnce } from "@/hooks/useRevealOnce";

/**
 * 화면에 처음 들어올 때 안의 .reveal 요소들을 차례로 드러내는 구역(서버 컴포넌트에서 쓰는 용도).
 * 클라이언트 컴포넌트는 useRevealOnce를 직접 쓰고 같은 data-reveal·data-shown을 단다.
 */
export default function Reveal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>();
  return (
    <section
      ref={ref}
      data-reveal=""
      data-shown={shown ? "" : undefined}
      className={className}
    >
      {children}
    </section>
  );
}

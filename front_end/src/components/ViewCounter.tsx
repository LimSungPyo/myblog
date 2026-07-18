"use client";

import { useEffect } from "react";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

/**
 * 상세 페이지 진입 시 조회수를 1회 올린다(백그라운드).
 * 화면에 표시되는 숫자는 SSR 값(initial)을 그대로 유지 → 깜빡임/점프 없음.
 * 실제 증가분은 SSR 캐시가 갱신되는 시점(다음 방문)에 반영된다.
 */
export default function ViewCounter({
  slug,
  initial,
}: {
  slug: string;
  initial: number;
}) {
  useEffect(() => {
    if (!PUBLIC_API) return;
    // 카운트만 올리고 응답은 화면에 반영하지 않음(안정적인 표시 유지)
    fetch(`${PUBLIC_API}/posts/${slug}/view`, { method: "POST" }).catch(
      () => {},
    );
  }, [slug]);

  return <span>조회 {initial}</span>;
}

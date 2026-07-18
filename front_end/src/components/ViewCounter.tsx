"use client";

import { useEffect, useState } from "react";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

/**
 * 상세 페이지 진입 시 조회수를 1회 올리고, 갱신된 값을 표시한다.
 * (SSR fetch는 캐시되므로 조회 카운트는 클라이언트에서 분리 처리)
 */
export default function ViewCounter({
  slug,
  initial,
}: {
  slug: string;
  initial: number;
}) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    if (!PUBLIC_API) return;
    fetch(`${PUBLIC_API}/posts/${slug}/view`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.viewCount === "number") setCount(data.viewCount);
      })
      .catch(() => {});
  }, [slug]);

  return <span>조회 {count}</span>;
}

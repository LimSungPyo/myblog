"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminStats } from "@/lib/adminApi";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!stats) return <p className="text-neutral-500">불러오는 중…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">대시보드</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="글"
          value={stats.postCount}
          hint={`발행 ${stats.publishedCount} · 초안 ${stats.draftCount}`}
        />
        <StatCard
          label="댓글"
          value={stats.commentCount}
          hint={
            stats.pendingCommentCount > 0
              ? `숨김 ${stats.pendingCommentCount}`
              : "전체 공개"
          }
        />
        <StatCard label="총 조회수" value={stats.totalViews.toLocaleString()} />
        <StatCard label="초안" value={stats.draftCount} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">인기글 Top 5</h2>
        {stats.topPosts.length === 0 ? (
          <p className="text-sm text-neutral-500">글이 없습니다.</p>
        ) : (
          <ol className="divide-y divide-black/10 dark:divide-white/10">
            {stats.topPosts.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-4 text-neutral-400">{i + 1}</span>
                  <Link
                    href={`/posts/${p.slug}`}
                    className="truncate hover:underline"
                  >
                    {p.title}
                  </Link>
                </span>
                <span className="shrink-0 text-neutral-500">
                  {p.viewCount.toLocaleString()} 조회
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

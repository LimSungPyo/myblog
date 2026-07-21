"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/adminApi";
import type { Post } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setPosts(await adminApi.listPosts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 인증 토큰이 클라이언트 쿠키에 있어 서버 프리페치 불가 → 마운트 시 클라에서 로드
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function onDelete(id: number) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await adminApi.deletePost(id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">글 관리</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        >
          새 글
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-neutral-500">불러오는 중…</p>
      ) : posts.length === 0 ? (
        <p className="text-neutral-500">작성된 글이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      p.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {formatDate(p.updatedAt)} · /{p.slug}
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <Link
                  href={`/admin/posts/${p.id}/edit`}
                  className="text-blue-600 hover:underline"
                >
                  수정
                </Link>
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

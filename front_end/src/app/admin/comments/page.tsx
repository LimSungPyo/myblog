"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminComment } from "@/lib/adminApi";
import { formatDate } from "@/lib/format";

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setComments(await adminApi.listComments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function toggle(c: AdminComment) {
    const updated = await adminApi.moderateComment(c.id, !c.approved);
    setComments((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  }

  async function remove(id: number) {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    await adminApi.deleteComment(id);
    setComments((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">댓글 관리</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/posts" className="hover:underline">
            글 관리
          </Link>
        </nav>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-neutral-500">불러오는 중…</p>
      ) : comments.length === 0 ? (
        <p className="text-neutral-500">댓글이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {comments.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{c.authorName}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        c.approved
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {c.approved ? "공개" : "숨김"}
                    </span>
                    <time className="text-neutral-500">
                      {formatDate(c.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {c.content}
                  </p>
                  <Link
                    href={`/posts/${c.postSlug}`}
                    className="mt-1 inline-block text-xs text-neutral-500 hover:underline"
                  >
                    ↳ {c.postTitle}
                  </Link>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button
                    onClick={() => toggle(c)}
                    className="rounded-md border border-black/10 dark:border-white/20 px-2 py-1"
                  >
                    {c.approved ? "숨기기" : "공개"}
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

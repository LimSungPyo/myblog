"use client";

import { useState } from "react";
import type { Comment } from "@/lib/types";
import { formatDate } from "@/lib/format";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export default function CommentSection({
  slug,
  initial,
}: {
  slug: string;
  initial: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      if (PUBLIC_API) {
        const res = await fetch(`${PUBLIC_API}/posts/${slug}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName, content }),
        });
        if (!res.ok) throw new Error("댓글 등록에 실패했습니다.");
        const created: Comment = await res.json();
        setComments((prev) => [...prev, created]);
      } else {
        // 백엔드 미연결(mock) 상태: 화면에만 임시로 추가
        setComments((prev) => [
          ...prev,
          {
            id: Date.now(),
            postId: 0,
            authorName,
            content,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      setAuthorName("");
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16">
      <h2 className="text-lg font-semibold">댓글 {comments.length}</h2>

      <ul className="mt-4 space-y-4">
        {comments.length === 0 && (
          <li className="text-sm text-neutral-500">첫 댓글을 남겨보세요.</li>
        )}
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-black/10 dark:border-white/15 p-4"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{c.authorName}</span>
              <time className="text-neutral-500" dateTime={c.createdAt}>
                {formatDate(c.createdAt)}
              </time>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{c.content}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="이름"
          className="w-full max-w-xs rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          rows={3}
          className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "등록 중…" : "댓글 등록"}
        </button>
      </form>
    </section>
  );
}

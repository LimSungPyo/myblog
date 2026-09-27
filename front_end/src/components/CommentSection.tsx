"use client";

import { useState } from "react";
import Link from "next/link";
import type { Comment } from "@/types";
import { formatDate } from "@/lib/format";
import { getToken } from "@/lib/authApi";
import { ApiError, ensureOk } from "@/lib/apiError";
import { deadlineFrom, useCountdown } from "@/hooks/useCountdown";
import { useAuthUser } from "@/hooks/useAuthUser";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export default function CommentSection({
  slug,
  initial,
}: {
  slug: string;
  initial: Comment[];
}) {
  const { user, loading } = useAuthUser();
  const [comments, setComments] = useState<Comment[]>(initial);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 429를 받으면 언제 다시 되는지까지 알려주고, 그때까지 버튼을 잠근다
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const cooldown = useCountdown(retryAt);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      if (PUBLIC_API) {
        const res = await fetch(`${PUBLIC_API}/posts/${slug}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ content }),
        });
        if (res.status === 401) throw new Error("로그인이 필요합니다.");
        await ensureOk(res, "댓글 등록에 실패했습니다.");
        const created: Comment = await res.json();
        setComments((prev) => [...prev, created]);
      } else {
        // 백엔드 미연결(mock) 상태: 화면에만 임시로 추가
        setComments((prev) => [
          ...prev,
          {
            id: Date.now(),
            postId: 0,
            authorName: user?.isAdmin ? "관리자" : (user?.displayName ?? "나"),
            content,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      if (err instanceof ApiError && err.status === 429) {
        setRetryAt(deadlineFrom(err.retryAfter));
      }
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

      {user ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <p className="text-sm text-neutral-500">
            {/* 서버가 관리자 글은 "관리자"로 저장하므로 안내도 같게 맞춘다 */}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {user.isAdmin ? "관리자" : user.displayName}
            </span>
            {user.isAdmin ? "로 작성" : "님으로 작성"}
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 입력하세요"
            rows={3}
            className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
          />
          {error && (
            <p className="text-sm text-red-500">
              {cooldown > 0
                ? `너무 잦은 요청입니다. ${cooldown}초 후에 다시 시도해주세요.`
                : error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || cooldown > 0}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting
              ? "등록 중…"
              : cooldown > 0
                ? `${cooldown}초 후 가능`
                : "댓글 등록"}
          </button>
        </form>
      ) : (
        !loading && (
          <p className="mt-6 rounded-lg border border-black/10 p-4 text-sm text-neutral-500 dark:border-white/15">
            댓글은 로그인 후 작성할 수 있습니다.{" "}
            <Link
              href={`/login?from=/posts/${slug}`}
              className="font-medium text-blue-500 hover:underline"
            >
              로그인
            </Link>
          </p>
        )
      )}
    </section>
  );
}

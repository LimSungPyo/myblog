"use client";

import { useState } from "react";
import Link from "next/link";
import type { Comment } from "@/types";
import { formatDate } from "@/lib/format";
import { endSession, getToken } from "@/lib/authApi";
import { ApiError, ensureOk } from "@/lib/apiError";
import { deadlineFrom, useCountdown } from "@/hooks/useCountdown";
import { useAuthUser } from "@/hooks/useAuthUser";
import { UserIcon } from "@/components/ui/icons";

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
        if (res.status === 401)
          throw new Error(endSession(res, "로그인이 필요합니다."));
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
    <section className="mt-14 flex flex-col gap-4 border-t border-line pt-7 lg:mt-[72px] lg:pt-9">
      <h2 className="font-serif text-[22px] font-bold lg:text-[26px]">
        댓글{" "}
        <span className="font-mono text-base font-medium text-muted">
          {comments.length}
        </span>
      </h2>

      <ul className="flex flex-col gap-3">
        {comments.length === 0 && (
          <li className="text-sm text-muted">첫 댓글을 남겨보세요.</li>
        )}
        {comments.map((c) => (
          <li
            key={c.id}
            className="flex gap-3 rounded-[14px] bg-surface p-4 shadow-card lg:px-5 lg:py-[18px]"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-chip text-muted"
            >
              <UserIcon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-semibold">{c.authorName}</span>
                <time className="text-muted" dateTime={c.createdAt}>
                  {formatDate(c.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">
                {c.content}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {user ? (
        <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-3">
          <p className="text-sm text-muted">
            {/* 서버가 관리자 글은 "관리자"로 저장하므로 안내도 같게 맞춘다 */}
            <span className="font-semibold text-foreground">
              {user.isAdmin ? "관리자" : user.displayName}
            </span>
            {user.isAdmin ? "로 작성" : "님으로 작성"}
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 입력하세요"
            rows={3}
            className="w-full rounded-xl bg-chip px-4 py-3 text-[15px] leading-relaxed outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
            required
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {cooldown > 0
                ? `너무 잦은 요청입니다. ${cooldown}초 후에 다시 시도해주세요.`
                : error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || cooldown > 0}
            className="press h-11 self-end rounded-[10px] bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50"
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
          <div className="flex flex-col gap-3 rounded-[14px] bg-chip p-4 sm:flex-row sm:items-center sm:justify-between sm:py-3.5 sm:pr-4 sm:pl-5">
            <p className="text-sm text-muted">
              댓글은 로그인 후 작성할 수 있습니다.
            </p>
            <Link
              href={`/login?from=/posts/${slug}`}
              className="press grid h-11 place-items-center rounded-[10px] bg-foreground px-4 text-[15px] font-semibold text-background sm:h-9 sm:text-sm"
            >
              로그인
            </Link>
          </div>
        )
      )}
    </section>
  );
}

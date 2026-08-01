"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SmileIcon } from "@/components/ui/icons";
import { getToken } from "@/lib/authApi";
import { useAuthUser } from "@/hooks/useAuthUser";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const EMOJIS = [
  "😊",
  "😄",
  "👍",
  "🙌",
  "🎉",
  "❤️",
  "🔥",
  "✨",
  "🙏",
  "😍",
  "👏",
  "💪",
];

export default function GuestbookForm({
  cardClass = "",
}: {
  cardClass?: string;
}) {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError("메시지를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (PUBLIC_API) {
        const res = await fetch(`${PUBLIC_API}/guestbook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ content }),
        });
        if (res.status === 401) throw new Error("로그인이 필요합니다.");
        if (!res.ok) throw new Error("등록에 실패했습니다.");
      }
      setContent("");
      router.refresh(); // 서버 렌더 목록 갱신 (새 글은 1페이지 최상단)
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className={`${cardClass} p-5 text-sm text-neutral-500`}>
        방명록은 로그인 후 남길 수 있습니다.{" "}
        <Link
          href="/login?from=/guestbook"
          className="font-medium text-blue-500 hover:underline"
        >
          로그인
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} p-5`}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`${user.displayName}님, 메시지를 입력해주세요.`}
        rows={3}
        maxLength={1000}
        aria-label="메시지"
        className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-white/15 dark:bg-white/5"
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="이모지"
            className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 text-neutral-500 transition hover:bg-neutral-100 dark:border-white/15 dark:hover:bg-white/10"
          >
            <SmileIcon className="h-5 w-5" />
          </button>
          {emojiOpen && (
            <div className="absolute bottom-full left-0 z-10 mb-2 grid w-[228px] grid-cols-6 gap-1 rounded-xl border border-black/10 bg-white p-2 shadow-md dark:border-white/15 dark:bg-neutral-800">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setContent((c) => c + em);
                    setEmojiOpen(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-neutral-100 dark:hover:bg-white/10"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#10213a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3157] disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200"
        >
          {submitting ? "등록 중…" : "등록하기"}
        </button>
      </div>
    </form>
  );
}

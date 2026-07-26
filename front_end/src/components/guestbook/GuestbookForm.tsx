"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserIcon, SmileIcon } from "@/components/ui/icons";

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
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) {
      setError("이름과 메시지를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (PUBLIC_API) {
        const res = await fetch(`${PUBLIC_API}/guestbook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName, content }),
        });
        if (!res.ok) throw new Error("등록에 실패했습니다.");
      }
      setAuthorName("");
      setContent("");
      router.refresh(); // 서버 렌더 목록 갱신 (새 글은 1페이지 최상단)
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative sm:w-1/3">
          <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="이름"
            maxLength={80}
            aria-label="이름"
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 dark:border-white/15 dark:bg-white/5"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메시지를 입력해주세요."
          rows={3}
          maxLength={1000}
          aria-label="메시지"
          className="flex-1 resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-white/15 dark:bg-white/5"
        />
      </div>

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

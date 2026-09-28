"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, SmileIcon } from "@/components/ui/icons";
import { endSession, getToken } from "@/lib/authApi";
import { ApiError, ensureOk } from "@/lib/apiError";
import { deadlineFrom, useCountdown } from "@/hooks/useCountdown";
import { useAuthUser } from "@/hooks/useAuthUser";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
// 서버와 같은 기준. 먼저 여기서 걸러서, 받지도 않을 파일을 몇 MB씩 보내지 않게 한다.
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
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
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // 미리보기 주소는 브라우저 메모리를 잡고 있어서 다 쓰면 풀어줘야 한다.
  // 화면을 떠날 때도 풀 수 있게 지금 주소를 ref에 들고 있는다.
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function pickImage(file: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setImage(null);
    setPreview(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("JPG, PNG, WebP 사진만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("사진은 10MB 이하만 올릴 수 있어요.");
      return;
    }
    setError(null);
    previewRef.current = URL.createObjectURL(file);
    setImage(file);
    setPreview(previewRef.current);
  }
  // 429를 받으면 언제 다시 되는지까지 알려주고, 그때까지 버튼을 잠근다
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const cooldown = useCountdown(retryAt);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !image) {
      setError("메시지나 사진 중 하나는 남겨주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (PUBLIC_API) {
        // 글과 사진을 한 번에 보낸다. Content-Type은 적지 않는다. 파일 전송은 본문을
        // 나누는 경계값이 헤더에 같이 적혀야 해서, 그 값은 브라우저가 채운다.
        const form = new FormData();
        form.append("content", content);
        if (image) form.append("image", image);
        const res = await fetch(`${PUBLIC_API}/guestbook`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form,
        });
        if (res.status === 401)
          throw new Error(endSession(res, "로그인이 필요합니다."));
        await ensureOk(res, "등록에 실패했습니다.");
      }
      setContent("");
      pickImage(null);
      router.refresh(); // 서버 렌더 목록 갱신 (새 글은 1페이지 최상단)
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      if (err instanceof ApiError && err.status === 429) {
        setRetryAt(deadlineFrom(err.retryAfter));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex flex-col gap-3 rounded-[14px] bg-chip p-4 sm:flex-row sm:items-center sm:justify-between sm:py-3.5 sm:pr-4 sm:pl-5">
        <p className="text-sm text-muted">
          방명록은 로그인 후 남길 수 있습니다.
        </p>
        <Link
          href="/login?from=/guestbook"
          className="press grid h-11 place-items-center rounded-[10px] bg-foreground px-4 text-[15px] font-semibold text-background sm:h-9 sm:text-sm"
        >
          로그인
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} p-4 sm:p-5`}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          user.isAdmin
            ? "관리자로 남길 메시지를 입력해주세요."
            : `${user.displayName}님, 메시지를 입력해주세요.`
        }
        rows={3}
        maxLength={1000}
        aria-label="메시지"
        className="w-full resize-y rounded-xl bg-chip px-4 py-3 text-[15px] leading-relaxed outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
      />

      {preview && (
        <div className="relative mt-3 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 메모리의 미리보기라 최적화 대상이 아니다 */}
          <img
            src={preview}
            alt="올릴 사진 미리보기"
            className="max-h-40 rounded-xl shadow-card"
          />
          <button
            type="button"
            onClick={() => pickImage(null)}
            aria-label="사진 빼기"
            className="press absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {cooldown > 0
            ? `너무 잦은 요청입니다. ${cooldown}초 후에 다시 시도해주세요.`
            : error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="relative flex gap-1">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label="사진 넣기"
            title="사진 넣기 (하루 5장까지)"
            className="press grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-hover hover:text-foreground"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            aria-label="사진 파일"
            className="hidden"
            onChange={(e) => {
              pickImage(e.target.files?.[0] ?? null);
              e.target.value = ""; // 같은 파일을 다시 골라도 change가 일어나게
            }}
          />
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="이모지"
            className="press grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-hover hover:text-foreground"
          >
            <SmileIcon className="h-5 w-5" />
          </button>
          {emojiOpen && (
            // 이모지 버튼 위로 뜨는 작은 창. 버튼 쪽(왼쪽 아래)에서 커지며 나타난다(.emoji-pop)
            <div className="emoji-pop absolute bottom-full left-0 z-10 mb-2 grid w-[228px] grid-cols-6 gap-1 rounded-xl bg-surface p-2 shadow-card-hover">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setContent((c) => c + em);
                    setEmojiOpen(false);
                  }}
                  className="press grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-hover"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || cooldown > 0}
          className="press h-11 rounded-[10px] bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {submitting
            ? "등록 중…"
            : cooldown > 0
              ? `${cooldown}초 후 가능`
              : "등록하기"}
        </button>
      </div>
    </form>
  );
}

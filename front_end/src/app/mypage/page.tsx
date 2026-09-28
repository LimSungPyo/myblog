"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";
import { clearToken } from "@/lib/authApi";
import { formatDate } from "@/lib/format";
import { meApi, WITHDRAW_CONFIRMATION, type MyActivity } from "@/lib/meApi";
import { useAuthUser } from "@/hooks/useAuthUser";

const card = "rounded-[4px] bg-surface p-5 shadow-card";
const input =
  "w-full rounded-lg bg-background px-3 py-2.5 text-sm shadow-card outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]";
const smallButton =
  "press shrink-0 rounded-md px-3 py-1.5 text-xs text-muted shadow-card hover:text-foreground disabled:opacity-50";

const GAME_NAMES: Record<string, string> = { "2048": "2048" };

export default function MyPage() {
  const { user, loading } = useAuthUser();

  if (loading) return null;
  if (!user) {
    // 보통은 proxy가 로그인 화면으로 먼저 보내지만, 토큰이 만료된 채로 들어오면 여기까지 온다
    return (
      <p className="text-sm text-muted">
        로그인이 필요해요.{" "}
        <Link
          href="/login?from=/mypage"
          className="font-medium text-accent hover:underline"
        >
          로그인
        </Link>
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <h1 className="text-[28px] font-bold">마이페이지</h1>
      <ProfileSection user={user} />
      <ActivitySection userId={user.id} />
      <WithdrawSection user={user} />
    </div>
  );
}

function ProfileSection({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const unchanged = trimmed === user.displayName;

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await meApi.rename(trimmed);
      setMessage("닉네임을 바꿨어요. 예전에 쓴 글에도 새 닉네임이 보여요.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "닉네임을 바꾸지 못했어요.",
      );
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearToken();
    router.push("/");
    router.refresh();
  }

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{user.displayName}</h2>
          <p className="text-sm text-muted">
            {user.email ?? `관리자 계정 (${user.username})`}
          </p>
        </div>
        <button type="button" onClick={logout} className={smallButton}>
          로그아웃
        </button>
      </div>

      <form onSubmit={onRename} className="mt-4 space-y-2">
        <label htmlFor="display-name" className="text-sm text-muted">
          닉네임
        </label>
        <div className="flex gap-2">
          <input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={input}
          />
          <button
            type="submit"
            disabled={saving || unchanged || trimmed === ""}
            className="press shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            {saving ? "바꾸는 중…" : "바꾸기"}
          </button>
        </div>
        {message && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {message}
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </section>
  );
}

function ActivitySection({ userId }: { userId: string }) {
  const [activity, setActivity] = useState<MyActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    meApi
      .activity()
      .then((a) => alive && setActivity(a))
      .catch((err) => {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : "활동 내역을 불러오지 못했어요.",
          );
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  async function removeComment(id: number) {
    if (!window.confirm("이 댓글을 지울까요? 되돌릴 수 없어요.")) return;
    try {
      await meApi.deleteComment(id);
      setActivity(
        (a) => a && { ...a, comments: a.comments.filter((c) => c.id !== id) },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글을 지우지 못했어요.");
    }
  }

  async function removeGuestbook(id: number) {
    if (!window.confirm("이 방명록을 지울까요? 되돌릴 수 없어요.")) return;
    try {
      await meApi.deleteGuestbook(id);
      setActivity(
        (a) => a && { ...a, guestbook: a.guestbook.filter((g) => g.id !== id) },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "방명록을 지우지 못했어요.",
      );
    }
  }

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!activity)
    return <p className="text-sm text-muted">불러오는 중이에요…</p>;

  return (
    <>
      <section className={card}>
        <h2 className="font-semibold">내 댓글 {activity.comments.length}</h2>
        {activity.comments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 남긴 댓글이 없어요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {activity.comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Link
                      href={`/posts/${c.postSlug}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {c.postTitle}
                    </Link>
                    <time dateTime={c.createdAt}>
                      {formatDate(c.createdAt)}
                    </time>
                    {!c.approved && (
                      // 공개 목록에는 안 보이는 상태라, 사라진 게 아니라고 알려준다
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        승인 대기
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {c.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeComment(c.id)}
                  aria-label={`댓글 삭제: ${c.content.slice(0, 20)}`}
                  className={smallButton}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">내 방명록 {activity.guestbook.length}</h2>
        {activity.guestbook.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 남긴 방명록이 없어요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {activity.guestbook.map((g) => (
              <li key={g.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <time dateTime={g.createdAt} className="text-xs text-muted">
                    {formatDate(g.createdAt)}
                  </time>
                  {g.content && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {g.content}
                    </p>
                  )}
                  {g.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- 내가 올린 사진 썸네일
                    <img
                      src={g.imageUrl}
                      alt="내가 올린 사진"
                      loading="lazy"
                      className="mt-2 h-20 w-auto rounded-lg shadow-card"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeGuestbook(g.id)}
                  aria-label={`방명록 삭제: ${g.content.slice(0, 20) || "사진"}`}
                  className={smallButton}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">내 게임 기록 {activity.scores.length}</h2>
        {activity.scores.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            아직 등록한 기록이 없어요.{" "}
            <Link href="/minigame" className="text-accent hover:underline">
              게임하러 가기
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {activity.scores.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span>{GAME_NAMES[s.gameKey] ?? s.gameKey}</span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">
                    {s.score.toLocaleString("ko-KR")}점
                  </span>
                  <time dateTime={s.createdAt} className="text-xs text-muted">
                    {formatDate(s.createdAt)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function WithdrawSection({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user.isAdmin) {
    return (
      <section className={card}>
        <h2 className="font-semibold">회원 탈퇴</h2>
        <p className="mt-2 text-sm text-muted">
          관리자 계정은 탈퇴할 수 없어요. 관리자가 사라지면 관리자 페이지에
          들어갈 방법이 없어져서요.
        </p>
      </section>
    );
  }

  const ready = confirmation.trim() === WITHDRAW_CONFIRMATION;

  async function onWithdraw() {
    setSubmitting(true);
    setError(null);
    try {
      await meApi.withdraw(confirmation.trim());
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "탈퇴하지 못했어요.");
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-red-200 p-5 dark:border-red-500/30">
      <h2 className="font-semibold text-red-600 dark:text-red-400">
        회원 탈퇴
      </h2>
      <div className="mt-2 space-y-1 text-sm text-muted">
        <p>탈퇴하면 계정과 로그인 정보가 바로 지워지고 되돌릴 수 없어요.</p>
        <p>남긴 방명록은 함께 지워져요.</p>
        <p>
          댓글과 게임 기록은 지워지지 않고, 작성자가 &lsquo;탈퇴한
          사용자&rsquo;로 바뀌어요. 지우고 싶은 댓글이 있다면 탈퇴 전에 위에서
          직접 지워주세요.
        </p>
      </div>
      <label htmlFor="withdraw-confirm" className="mt-4 block text-sm">
        계속하려면 <strong>{WITHDRAW_CONFIRMATION}</strong>를 입력해주세요
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="withdraw-confirm"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={WITHDRAW_CONFIRMATION}
          autoComplete="off"
          className={input}
        />
        <button
          type="button"
          onClick={onWithdraw}
          disabled={!ready || submitting}
          className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {submitting ? "탈퇴하는 중…" : "탈퇴하기"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}

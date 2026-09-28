"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ApiError,
  googleLoginUrl,
  login,
  resendVerification,
  safeNext,
} from "@/lib/authApi";
import { deadlineFrom, useCountdown } from "@/hooks/useCountdown";
import { GoogleIcon } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 미인증 계정(403)이면 인증 메일 재발송 버튼을 보여준다
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  // 429(요청 제한)면 남은 대기 시간을 세어 보여주고 그때까지 제출을 막는다
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const cooldown = useCountdown(retryAt);

  const from = safeNext(params.get("from"));
  const googleUrl = googleLoginUrl(from ?? "/");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    setResent(false);
    try {
      const { isAdmin } = await login(username, password);
      // 관리자는 관리자 페이지로, 일반 회원은 원래 가려던 곳(없으면 홈)으로
      router.push(isAdmin ? (from ?? "/admin/posts") : (from ?? "/"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
      if (err instanceof ApiError && err.status === 403) {
        setNeedsVerification(true);
      }
      if (err instanceof ApiError && err.status === 429) {
        setRetryAt(deadlineFrom(err.retryAfter));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    try {
      await resendVerification(username);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "재발송 실패");
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-6 font-serif text-[28px] font-bold">로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="이메일"
          autoComplete="username"
          className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm shadow-card outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm shadow-card outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
          required
        />
        {error && (
          <p className="text-sm text-red-500">
            {cooldown > 0
              ? `로그인 시도가 너무 많습니다. ${cooldown}초 후에 다시 시도해주세요.`
              : error}
          </p>
        )}
        {needsVerification &&
          (resent ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.
            </p>
          ) : (
            <button
              type="button"
              onClick={onResend}
              className="text-sm text-accent hover:underline"
            >
              인증 메일 다시 받기
            </button>
          ))}
        <button
          type="submit"
          disabled={loading || cooldown > 0}
          className="press w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {loading
            ? "로그인 중…"
            : cooldown > 0
              ? `${cooldown}초 후 가능`
              : "로그인"}
        </button>
        <p className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-muted hover:text-accent hover:underline"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </p>
      </form>

      {googleUrl && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            또는
            <span className="h-px flex-1 bg-line" />
          </div>
          <a
            href={googleUrl}
            className="press flex w-full items-center justify-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm shadow-card hover:shadow-card-hover"
          >
            <GoogleIcon className="h-4 w-4" />
            Google로 계속하기
          </a>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}

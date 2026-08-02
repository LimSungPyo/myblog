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
      <h1 className="mb-6 text-2xl font-bold">로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디 또는 이메일"
          autoComplete="username"
          className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {needsVerification &&
          (resent ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.
            </p>
          ) : (
            <button
              type="button"
              onClick={onResend}
              className="text-sm text-blue-500 hover:underline"
            >
              인증 메일 다시 받기
            </button>
          ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>
        <p className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-neutral-500 hover:text-blue-500 hover:underline"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </p>
      </form>

      {googleUrl && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
            또는
            <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
          </div>
          <a
            href={googleUrl}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-white/20 dark:hover:bg-white/10"
          >
            <GoogleIcon className="h-4 w-4" />
            Google로 계속하기
          </a>
        </>
      )}

      <p className="mt-6 text-center text-sm text-neutral-500">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="text-blue-500 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}

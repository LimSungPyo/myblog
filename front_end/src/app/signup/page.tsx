"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ApiError,
  googleLoginUrl,
  resendVerification,
  signup,
} from "@/lib/authApi";
import { GoogleIcon } from "@/components/ui/icons";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 이미 쓰이는 이메일(409)이면 가입 대신 갈 곳을 안내한다
  const [taken, setTaken] = useState(false);
  // 가입 신청이 접수된 이메일 — 값이 있으면 "메일을 확인해주세요" 화면을 보여준다
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const googleUrl = googleLoginUrl("/");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTaken(false);
    try {
      await signup(email, password, displayName);
      setSentTo(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
      if (err instanceof ApiError && err.status === 409) setTaken(true);
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!sentTo) return;
    setError(null);
    try {
      await resendVerification(sentTo);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "재발송 실패");
    }
  }

  if (sentTo) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="mb-4 text-2xl font-bold">메일을 확인해주세요</h1>
        <p className="text-sm text-neutral-500">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {sentTo}
          </span>
          로 인증 메일을 보냈습니다.
          <br />
          메일의 링크를 열면 가입이 완료되고 바로 로그인됩니다.
        </p>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        {resent ? (
          <p className="mt-6 text-sm text-green-600 dark:text-green-400">
            인증 메일을 다시 보냈습니다.
          </p>
        ) : (
          <button
            onClick={onResend}
            className="mt-6 text-sm text-blue-500 hover:underline"
          >
            메일이 안 왔나요? 다시 보내기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">회원가입</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="닉네임"
          autoComplete="nickname"
          maxLength={80}
          className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="email"
          className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (8자 이상)"
          autoComplete="new-password"
          minLength={8}
          className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {taken && (
          <p className="text-sm text-neutral-500">
            <Link
              href={`/login?from=/`}
              className="text-blue-500 hover:underline"
            >
              로그인
            </Link>
            하거나{" "}
            <Link
              href="/forgot-password"
              className="text-blue-500 hover:underline"
            >
              비밀번호 설정
            </Link>
            으로 진행할 수 있습니다.
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "가입 중…" : "회원가입"}
        </button>
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
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-blue-500 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

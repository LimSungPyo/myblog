"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/apiError";
import { forgotPassword } from "@/lib/authApi";
import { deadlineFrom, useCountdown } from "@/hooks/useCountdown";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  // 메일 발송은 한도가 빡빡해서(수신 주소당 시간당 3회) 대기 안내가 특히 중요하다
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const cooldown = useCountdown(retryAt);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
      if (err instanceof ApiError && err.status === 429) {
        setRetryAt(deadlineFrom(err.retryAfter));
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="mb-4 text-[28px] font-bold">메일을 확인해주세요</h1>
        <p className="text-sm text-muted">
          가입된 이메일이라면{" "}
          <span className="font-medium text-foreground">{email}</span>
          로 재설정 메일을 보냈습니다.
          <br />
          링크는 30분 동안 유효합니다.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-accent hover:underline"
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-2 text-[28px] font-bold">비밀번호 찾기</h1>
      <p className="mb-6 text-sm text-muted">
        가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="email"
          className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm shadow-card outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
          required
        />
        {error && (
          <p className="text-sm text-red-500">
            {cooldown > 0
              ? `요청이 너무 잦습니다. ${cooldown}초 후에 다시 시도해주세요.`
              : error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || cooldown > 0}
          className="press w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {loading
            ? "전송 중…"
            : cooldown > 0
              ? `${cooldown}초 후 가능`
              : "재설정 메일 보내기"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        비밀번호가 기억났나요?{" "}
        <Link href="/login" className="text-accent hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

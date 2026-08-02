"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="mb-4 text-2xl font-bold">메일을 확인해주세요</h1>
        <p className="text-sm text-neutral-500">
          가입된 이메일이라면{" "}
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {email}
          </span>
          로 재설정 메일을 보냈습니다.
          <br />
          링크는 30분 동안 유효합니다.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-blue-500 hover:underline"
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">비밀번호 찾기</h1>
      <p className="mb-6 text-sm text-neutral-500">
        가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="email"
          className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "전송 중…" : "재설정 메일 보내기"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        비밀번호가 기억났나요?{" "}
        <Link href="/login" className="text-blue-500 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

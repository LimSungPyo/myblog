"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { googleLoginUrl, signup } from "@/lib/authApi";
import { GoogleIcon } from "@/components/ui/icons";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleUrl = googleLoginUrl("/");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 가입 성공 시 토큰이 발급되어 바로 로그인 상태가 된다
      await signup(email, password, displayName);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
    } finally {
      setLoading(false);
    }
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

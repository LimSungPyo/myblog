"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/authApi";

/** 재설정 메일의 링크가 도착하는 페이지 — 새 비밀번호를 받아 바로 로그인시킨다. */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, password);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "재설정 실패");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="mb-4 text-2xl font-bold">잘못된 접근</h1>
        <p className="mb-6 text-sm text-neutral-500">
          재설정 링크가 올바르지 않습니다.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-blue-500 hover:underline"
        >
          재설정 메일 다시 받기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">새 비밀번호 설정</h1>
      <p className="mb-6 text-sm text-neutral-500">
        새로 사용할 비밀번호를 입력해주세요. 설정이 끝나면 바로 로그인됩니다.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호 (8자 이상)"
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
          {loading ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
      {error && (
        <p className="mt-4 text-center text-sm text-neutral-500">
          링크가 만료되었다면{" "}
          <Link
            href="/forgot-password"
            className="text-blue-500 hover:underline"
          >
            재설정 메일을 다시 받아주세요
          </Link>
          .
        </p>
      )}
    </div>
  );
}

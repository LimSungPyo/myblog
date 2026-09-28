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
        <h1 className="mb-4 font-serif text-[28px] font-bold">잘못된 접근</h1>
        <p className="mb-6 text-sm text-muted">
          재설정 링크가 올바르지 않습니다.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-accent hover:underline"
        >
          재설정 메일 다시 받기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-2 font-serif text-[28px] font-bold">
        새 비밀번호 설정
      </h1>
      <p className="mb-6 text-sm text-muted">
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
          className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm shadow-card outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="press w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {loading ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
      {error && (
        <p className="mt-4 text-center text-sm text-muted">
          링크가 만료되었다면{" "}
          <Link href="/forgot-password" className="text-accent hover:underline">
            재설정 메일을 다시 받아주세요
          </Link>
          .
        </p>
      )}
    </div>
  );
}

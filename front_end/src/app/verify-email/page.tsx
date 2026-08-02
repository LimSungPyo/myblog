"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/authApi";

/** 인증 메일의 링크가 도착하는 페이지 — 토큰을 검증하고 바로 로그인시킨다. */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}

function VerifyEmail() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  // 개발 모드 StrictMode의 effect 2회 실행으로 인증 요청이 중복되지 않게 가드
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    verifyEmail(token)
      .then(() => {
        router.replace("/");
        router.refresh();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
      });
  }, [token, router]);

  if (!token || error) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="mb-4 text-2xl font-bold">이메일 인증 실패</h1>
        <p className="mb-6 text-sm text-neutral-500">
          {error ?? "인증 링크가 올바르지 않습니다."}
        </p>
        <p className="text-sm text-neutral-500">
          링크가 만료되었다면{" "}
          <Link href="/login" className="text-blue-500 hover:underline">
            로그인 페이지
          </Link>
          에서 로그인을 시도하면 인증 메일을 다시 받을 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <p className="py-16 text-center text-sm text-neutral-500">
      이메일 인증 중…
    </p>
  );
}

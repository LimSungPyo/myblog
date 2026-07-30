"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeNext, setSession } from "@/lib/authApi";

/** 소셜 로그인 콜백 — 백엔드가 URL fragment로 전달한 토큰을 쿠키에 저장한다. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 토큰은 query가 아닌 fragment(#)에 실려 오므로 서버로 전송되지 않는다.
    // fragment는 하이드레이션 이후에만 읽을 수 있어 effect에서 상태를 세팅한다.
    const params = new URLSearchParams(window.location.hash.slice(1));

    const token = params.get("token");
    if (params.get("error") || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(params.get("error") ?? "missing_token");
      return;
    }

    setSession({ accessToken: token, isAdmin: params.get("isAdmin") === "1" });
    // 브라우저 히스토리에 토큰이 남지 않도록 fragment 제거
    window.history.replaceState(null, "", window.location.pathname);
    router.replace(safeNext(params.get("next")) ?? "/");
    router.refresh();
  }, [router]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="mb-4 text-2xl font-bold">로그인 실패</h1>
        <p className="mb-6 text-sm text-neutral-500">
          소셜 로그인이 취소되었거나 오류가 발생했습니다. ({error})
        </p>
        <Link href="/login" className="text-sm text-blue-500 hover:underline">
          로그인 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <p className="py-16 text-center text-sm text-neutral-500">로그인 중…</p>
  );
}

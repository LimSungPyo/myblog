"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken, isAdmin, isLoggedIn } from "@/lib/adminApi";

// 쿠키는 클라이언트에서만 읽힘. useSyncExternalStore로 SSR/hydration 안전하게 반영.
const noopSubscribe = () => () => {};

export default function HeaderAuth() {
  const router = useRouter();
  const loggedIn = useSyncExternalStore(
    noopSubscribe,
    () => isLoggedIn(),
    () => false,
  );
  const admin = useSyncExternalStore(
    noopSubscribe,
    () => isAdmin(),
    () => false,
  );

  function logout() {
    clearToken();
    router.push("/");
    router.refresh();
  }

  if (!loggedIn) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="hover:underline">
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-neutral-900 px-3 py-1 text-white dark:bg-white dark:text-black"
        >
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {admin && (
        <Link href="/admin/posts" className="hover:underline">
          관리자
        </Link>
      )}
      <button onClick={logout} className="text-neutral-500 hover:underline">
        로그아웃
      </button>
    </div>
  );
}

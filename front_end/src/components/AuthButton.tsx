"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";
import { AUTH_CHANGED_EVENT, clearToken, fetchMe } from "@/lib/authApi";
import { LogoutIcon, UserIcon } from "@/components/ui/icons";

/** 헤더의 로그인 상태 버튼 — 비로그인: /login 링크, 로그인: 로그아웃 버튼. */
export default function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // 소셜 콜백 페이지가 헤더 마운트 이후에 쿠키를 쓰므로, 마운트 1회 확인만으로는
    // 로그인 직후 상태를 놓친다. 세션 변경 이벤트를 구독해 그때마다 다시 확인한다.
    let alive = true;
    let seq = 0;
    const sync = () => {
      const id = ++seq;
      fetchMe().then((me) => {
        // 늦게 도착한 이전 응답이 최신 상태를 덮어쓰지 않게 마지막 요청만 반영
        if (alive && id === seq) setUser(me);
      });
    };
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
    };
  }, []);

  function logout() {
    clearToken();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const buttonStyle =
    "inline-flex items-center rounded-lg border border-black/10 p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white";

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="로그인"
        title="로그인"
        className={buttonStyle}
      >
        <UserIcon className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      aria-label="로그아웃"
      title={`로그아웃 (${user.displayName})`}
      className={buttonStyle}
    >
      <LogoutIcon className="h-5 w-5" />
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "@/types";
import { AUTH_CHANGED_EVENT, fetchMe } from "@/lib/authApi";
import { UserIcon } from "@/components/ui/icons";

/**
 * 헤더의 계정 버튼 — 비로그인: /login, 로그인: /mypage.
 *
 * 로그아웃은 마이페이지 안으로 옮겼다. 예전엔 로그인 상태에서 이 자리가 곧 로그아웃
 * 버튼이라, 상태를 확인하려고 눌렀다가 로그아웃되는 일을 막으려 확인 창까지 띄웠다.
 * 이제는 눌러도 페이지로 이동할 뿐이라 그런 사고가 구조적으로 없다.
 */
export default function AuthButton() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // 소셜 콜백 페이지가 헤더 마운트 이후에 쿠키를 쓰므로, 마운트 1회 확인만으로는
    // 로그인 직후 상태를 놓친다. 세션 변경 이벤트를 구독해 그때마다 다시 확인한다.
    // (닉네임 변경·탈퇴도 같은 이벤트를 쏘므로 헤더가 바로 따라온다)
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

  const buttonStyle =
    "inline-flex items-center rounded-lg border p-2 transition hover:bg-neutral-100 dark:hover:bg-white/10";

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="로그인"
        title="로그인"
        className={`${buttonStyle} border-black/10 text-neutral-600 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:text-white`}
      >
        <UserIcon className="h-5 w-5" />
      </Link>
    );
  }

  // 같은 사람 아이콘이라 로그인 여부가 한눈에 안 보이므로, 로그인 상태는 색으로 구분한다
  return (
    <Link
      href="/mypage"
      aria-label="마이페이지"
      title={`${user.displayName}님의 마이페이지`}
      className={`${buttonStyle} border-blue-500/40 text-blue-600 dark:border-blue-400/40 dark:text-blue-400`}
    >
      <UserIcon className="h-5 w-5" />
    </Link>
  );
}

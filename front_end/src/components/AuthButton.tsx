"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "@/types";
import { AUTH_CHANGED_EVENT, fetchMe } from "@/lib/authApi";
import { UserIcon } from "@/components/ui/icons";

// 탭을 바꾸면 visibilitychange와 focus가 거의 동시에 온다. 이 간격 안의 두 번째는 건너뛴다.
const RETURN_CHECK_GAP_MS = 2000;

/**
 * 헤더의 계정 버튼 — 비로그인: /login, 로그인: /mypage, 관리자: /admin.
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
    // 다른 곳에서 로그인해서 밀려났는지는 서버에 물어봐야 알 수 있는데, 가만히 있는
    // 탭은 아무것도 묻지 않는다. 그래서 사용자가 이 탭으로 돌아오는 순간 한 번 확인한다.
    // 밀려났으면 fetchMe가 알림창을 띄우고 로그아웃 상태로 바꾼다.
    // 탭 전환은 visibilitychange, 다른 창이나 앱에서 돌아오는 건 focus로 잡는다.
    let lastReturnCheck = 0;
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastReturnCheck < RETURN_CHECK_GAP_MS) return;
      lastReturnCheck = now;
      sync();
    };
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, []);

  const buttonStyle =
    "press grid h-11 w-11 place-items-center rounded-xl lg:h-[38px] lg:w-[38px] lg:rounded-[10px]";

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="로그인"
        title="로그인"
        className={`${buttonStyle} text-muted hover:bg-hover hover:text-foreground`}
      >
        <UserIcon className="h-5 w-5" />
      </Link>
    );
  }

  // 관리자는 관리자 대시보드로 보낸다. 관리자가 헤더에서 찾는 건 글·댓글 관리지
  // 자기 댓글 목록이 아니고, 관리자 화면에 로그아웃 버튼도 따로 있다.
  // (관리자의 마이페이지는 /mypage로 직접 들어가면 여전히 볼 수 있다)
  const target = user.isAdmin
    ? { href: "/admin", label: "관리자 페이지", title: "관리자 페이지" }
    : {
        href: "/mypage",
        label: "마이페이지",
        title: `${user.displayName}님의 마이페이지`,
      };

  // 같은 사람 아이콘이라 로그인 여부가 한눈에 안 보이므로, 로그인 상태는 색으로 구분한다
  return (
    <Link
      href={target.href}
      aria-label={target.label}
      title={target.title}
      className={`${buttonStyle} bg-accent-soft text-accent`}
    >
      <UserIcon className="h-5 w-5" />
    </Link>
  );
}

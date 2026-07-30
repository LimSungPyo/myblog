"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";
import { clearToken, fetchMe } from "@/lib/authApi";
import { LogoutIcon, UserIcon } from "@/components/ui/icons";

/** 헤더의 로그인 상태 버튼 — 비로그인: /login 링크, 로그인: 로그아웃 버튼. */
export default function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchMe().then(setUser);
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

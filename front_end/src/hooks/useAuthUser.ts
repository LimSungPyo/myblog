"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/types";
import { AUTH_CHANGED_EVENT, fetchMe } from "@/lib/authApi";

/** 로그인 사용자 상태. 세션 변경 이벤트를 구독해 로그인/로그아웃을 즉시 반영한다. */
export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let seq = 0;
    const sync = () => {
      const id = ++seq;
      fetchMe().then((me) => {
        // 늦게 도착한 이전 응답이 최신 상태를 덮어쓰지 않게 마지막 요청만 반영
        if (alive && id === seq) {
          setUser(me);
          setLoading(false);
        }
      });
    };
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
    };
  }, []);

  return { user, loading };
}

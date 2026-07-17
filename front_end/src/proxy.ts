import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * /admin/* 접근 제어 (UX 게이팅 — 실제 검증은 백엔드 JWT가 담당).
 * - 로그인 안 됨 → /login 으로
 * - 로그인했지만 관리자 아님 → 홈으로
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has("auth_token");
  const isAdmin = request.cookies.get("is_admin")?.value === "1";

  if (!hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (!isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

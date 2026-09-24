import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 로그인이 필요한 화면의 접근 제어 (UX 게이팅 — 실제 검증은 백엔드 JWT가 담당).
 * - 로그인 안 됨 → /login 으로 (돌아올 자리를 from에 실어서)
 * - /admin/* 인데 관리자 아님 → 홈으로
 * - /mypage 는 로그인만 돼 있으면 된다
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
  if (pathname.startsWith("/admin") && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // 값이 빌드 때 정적으로 읽히므로 변수 없이 상수로 적는다 (Next.js proxy 문서)
  matcher: ["/admin/:path*", "/mypage"],
};

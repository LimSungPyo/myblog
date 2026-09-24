// @vitest-environment node
// proxy는 브라우저가 아니라 서버(엣지)에서 돈다. jsdom 대신 node 환경에서 Next의 요청 객체를 그대로 만든다.
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

function request(path: string, cookie = "") {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

function redirectedTo(res: Response) {
  const location = res.headers.get("location");
  return location ? new URL(location) : null;
}

describe("proxy 접근 제어", () => {
  it("마이페이지는 로그인 안 했으면 로그인 화면으로, 돌아올 자리를 실어서 보낸다", () => {
    const to = redirectedTo(proxy(request("/mypage")));
    expect(to?.pathname).toBe("/login");
    expect(to?.searchParams.get("from")).toBe("/mypage");
  });

  it("마이페이지는 일반 회원이면 통과한다", () => {
    const res = proxy(request("/mypage", "auth_token=t; is_admin=0"));
    expect(redirectedTo(res)).toBeNull();
  });

  it("관리자 화면은 일반 회원이면 홈으로 보낸다", () => {
    const to = redirectedTo(
      proxy(request("/admin/posts", "auth_token=t; is_admin=0")),
    );
    expect(to?.pathname).toBe("/");
  });

  it("관리자 화면은 관리자면 통과한다", () => {
    const res = proxy(request("/admin/posts", "auth_token=t; is_admin=1"));
    expect(redirectedTo(res)).toBeNull();
  });

  it("마이페이지가 보호 대상에 들어 있다", () => {
    expect(config.matcher).toContain("/mypage");
  });
});

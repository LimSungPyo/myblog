import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AUTH_CHANGED_EVENT,
  SESSION_REPLACED_MESSAGE,
  endSession,
  fetchMe,
  getToken,
  setSession,
  takeLogoutNotice,
} from "@/lib/authApi";

function replacedResponse() {
  return new Response(JSON.stringify({ detail: "서버 문구" }), {
    status: 401,
    headers: { "X-Auth-Reason": "session_replaced" },
  });
}

describe("다른 곳에서 로그인해서 튕겼을 때", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    document.cookie = "auth_token=tok; path=/";
  });

  it("표시가 붙은 401이면 토큰을 버리고 안내 문구를 돌려준다", () => {
    const heard = vi.fn();
    window.addEventListener(AUTH_CHANGED_EVENT, heard);

    expect(endSession(replacedResponse(), "기본 문구")).toBe(
      SESSION_REPLACED_MESSAGE,
    );
    expect(getToken()).toBeNull();
    // 헤더 아이콘이 로그아웃 상태로 바뀌도록 알린다
    expect(heard).toHaveBeenCalled();
    window.removeEventListener(AUTH_CHANGED_EVENT, heard);
  });

  it("표시 없는 401은 그냥 만료로 보고 로그인 화면 안내도 남기지 않는다", () => {
    const res = new Response("", { status: 401 });
    expect(endSession(res, "기본 문구")).toBe("기본 문구");
    expect(getToken()).toBeNull();
    expect(takeLogoutNotice()).toBeNull();
  });

  it("로그인 화면 안내는 한 번 꺼내면 사라진다", () => {
    endSession(replacedResponse(), "기본 문구");
    expect(takeLogoutNotice()).toBe(SESSION_REPLACED_MESSAGE);
    expect(takeLogoutNotice()).toBeNull();
  });

  it("다시 로그인하면 남아 있던 안내를 지운다", () => {
    endSession(replacedResponse(), "기본 문구");
    setSession({ accessToken: "new", isAdmin: false });
    expect(takeLogoutNotice()).toBeNull();
  });

  it("헤더가 로그인 상태를 확인하다 튕긴 걸 알게 되면 안내를 남긴다", async () => {
    // 페이지를 새로 열면 헤더가 /auth/me로 확인한다. 가장 먼저 튕김을 알아채는 곳이다.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => replacedResponse()),
    );
    expect(await fetchMe()).toBeNull();
    expect(getToken()).toBeNull();
    expect(takeLogoutNotice()).toBe(SESSION_REPLACED_MESSAGE);
  });
});

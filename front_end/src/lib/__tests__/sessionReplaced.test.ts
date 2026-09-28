import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AUTH_CHANGED_EVENT,
  SESSION_REPLACED_MESSAGE,
  endSession,
  fetchMe,
  getToken,
} from "@/lib/authApi";

function replacedResponse() {
  return new Response(JSON.stringify({ detail: "서버 문구" }), {
    status: 401,
    headers: { "X-Auth-Reason": "session_replaced" },
  });
}

describe("다른 곳에서 로그인해서 튕겼을 때", () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "auth_token=tok; path=/";
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("표시가 붙은 401이면 토큰을 버리고 그 자리에서 알림창을 띄운다", () => {
    const heard = vi.fn();
    window.addEventListener(AUTH_CHANGED_EVENT, heard);

    expect(endSession(replacedResponse(), "기본 문구")).toBe(
      SESSION_REPLACED_MESSAGE,
    );
    expect(getToken()).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith(SESSION_REPLACED_MESSAGE);
    // 헤더 아이콘이 로그아웃 상태로 바뀌도록 알린다
    expect(heard).toHaveBeenCalled();
    window.removeEventListener(AUTH_CHANGED_EVENT, heard);
  });

  it("알림창이 뜰 때는 이미 로그아웃 상태다", () => {
    // 알림창이 떠 있는 동안 뒤의 화면이 아직 로그인 상태로 보이면 어색하다
    alertSpy.mockImplementation(() => {
      expect(getToken()).toBeNull();
    });
    endSession(replacedResponse(), "기본 문구");
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it("표시 없는 401은 그냥 만료로 보고 알림창을 띄우지 않는다", () => {
    const res = new Response("", { status: 401 });
    expect(endSession(res, "기본 문구")).toBe("기본 문구");
    expect(getToken()).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("동시에 돌아온 401이 여러 개여도 알림창은 한 번만 뜬다", () => {
    // 페이지를 열면 헤더와 본문이 함께 요청을 보내 401이 여러 개 올 수 있다
    endSession(replacedResponse(), "기본 문구");
    expect(endSession(replacedResponse(), "기본 문구")).toBe(
      SESSION_REPLACED_MESSAGE,
    );
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it("헤더가 로그인 상태를 확인하다 튕긴 걸 알게 되면 바로 알린다", async () => {
    // 페이지를 새로 열면 헤더가 /auth/me로 확인한다. 가장 먼저 튕김을 알아채는 곳이다.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => replacedResponse()),
    );
    expect(await fetchMe()).toBeNull();
    expect(getToken()).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith(SESSION_REPLACED_MESSAGE);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AUTH_CHANGED_EVENT, getToken } from "@/lib/authApi";
import { meApi } from "@/lib/meApi";

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("meApi", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "auth_token=tok; path=/";
  });

  it("닉네임 변경은 PATCH로 보내고, 헤더가 다시 읽도록 알린다", async () => {
    const fetchMock = stubFetch(json({ displayName: "새이름" }));
    const heard = vi.fn();
    window.addEventListener(AUTH_CHANGED_EVENT, heard);

    await meApi.rename("새이름");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/me$/);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ displayName: "새이름" });
    expect(init?.headers).toHaveProperty("Authorization", "Bearer tok");
    expect(heard).toHaveBeenCalled();
    window.removeEventListener(AUTH_CHANGED_EVENT, heard);
  });

  it("탈퇴는 확인 문구를 담아 POST로 보내고, 성공하면 토큰을 버린다", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    await meApi.withdraw("탈퇴합니다");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/me\/withdraw$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      confirmation: "탈퇴합니다",
    });
    expect(getToken()).toBeNull();
  });

  it("탈퇴가 거절되면 토큰은 그대로 두고 서버가 준 이유를 던진다", async () => {
    stubFetch(
      json({ detail: "확인 문구 '탈퇴합니다'를 정확히 입력해주세요." }, 400),
    );
    await expect(meApi.withdraw("탈퇴")).rejects.toThrow("정확히 입력해주세요");
    expect(getToken()).toBe("tok");
  });

  it("401이면 토큰을 지우고 다시 로그인하라고 알린다", async () => {
    stubFetch(new Response("", { status: 401 }));
    await expect(meApi.activity()).rejects.toThrow("다시 로그인");
    expect(getToken()).toBeNull();
  });

  it("본문 없는 요청에는 Content-Type을 붙이지 않는다", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    await meApi.deleteComment(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/me\/comments\/3$/);
    expect(init?.method).toBe("DELETE");
    expect(init?.headers).not.toHaveProperty("Content-Type");
  });
});

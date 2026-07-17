import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getToken,
  isAdmin,
  isLoggedIn,
  clearToken,
  login,
  signup,
} from "@/lib/adminApi";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  });
}

function mockFetch(res: { ok: boolean; status: number; body?: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: res.ok,
      status: res.status,
      json: async () => res.body,
    })),
  );
}

describe("adminApi 세션(쿠키)", () => {
  beforeEach(() => {
    clearCookies();
    vi.unstubAllGlobals();
  });

  it("초기 상태는 미로그인", () => {
    expect(isLoggedIn()).toBe(false);
    expect(getToken()).toBeNull();
    expect(isAdmin()).toBe(false);
  });

  it("login 성공 시 토큰·isAdmin 쿠키 저장", async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: { accessToken: "tok", isAdmin: true },
    });
    const res = await login("admin", "pw");
    expect(res.isAdmin).toBe(true);
    expect(getToken()).toBe("tok");
    expect(isAdmin()).toBe(true);
    expect(isLoggedIn()).toBe(true);
  });

  it("login 실패 시 예외", async () => {
    mockFetch({ ok: false, status: 401 });
    await expect(login("x", "y")).rejects.toThrow();
  });

  it("signup 중복(409) 시 안내 메시지", async () => {
    mockFetch({ ok: false, status: 409 });
    await expect(signup("a", "bbbb")).rejects.toThrow("이미 사용");
  });

  it("clearToken 후 미로그인 상태", async () => {
    mockFetch({
      ok: true,
      status: 201,
      body: { accessToken: "t", isAdmin: false },
    });
    await signup("newbie", "pass");
    expect(isLoggedIn()).toBe(true);
    clearToken();
    expect(isLoggedIn()).toBe(false);
    expect(isAdmin()).toBe(false);
  });
});

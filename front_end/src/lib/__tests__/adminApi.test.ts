import { describe, it, expect, beforeEach, vi } from "vitest";
import { getToken, clearToken, login } from "@/lib/adminApi";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  });
}

function hasCookie(kv: string) {
  return document.cookie.split("; ").includes(kv);
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

  it("초기 상태는 토큰 없음", () => {
    expect(getToken()).toBeNull();
  });

  it("login 성공 시 토큰·is_admin 쿠키 저장", async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: { accessToken: "tok", isAdmin: true },
    });
    const res = await login("admin", "pw");
    expect(res.isAdmin).toBe(true);
    expect(getToken()).toBe("tok");
    // 프록시(/admin 게이팅)가 읽는 쿠키
    expect(hasCookie("is_admin=1")).toBe(true);
  });

  it("login 실패 시 예외", async () => {
    mockFetch({ ok: false, status: 401 });
    await expect(login("x", "y")).rejects.toThrow();
  });

  it("clearToken 후 토큰·쿠키 제거", async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: { accessToken: "t", isAdmin: true },
    });
    await login("admin", "pw");
    expect(getToken()).toBe("t");
    clearToken();
    expect(getToken()).toBeNull();
    expect(hasCookie("is_admin=1")).toBe(false);
  });
});

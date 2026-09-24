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

describe("adminApi.uploadImage", () => {
  beforeEach(() => {
    clearCookies();
    vi.unstubAllGlobals();
  });

  function stubFetch(response: Response) {
    const fetchMock = vi.fn<typeof fetch>(async () => response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("파일을 FormData로 보내고 Content-Type은 브라우저에 맡긴다", async () => {
    document.cookie = "auth_token=tok; path=/";
    const fetchMock = stubFetch(
      new Response(
        JSON.stringify({ url: "https://cdn/1.webp", width: 10, height: 5 }),
        {
          status: 201,
        },
      ),
    );
    const { adminApi } = await import("@/lib/adminApi");
    const file = new File(["x"], "a.png", { type: "image/png" });

    const out = await adminApi.uploadImage(file);

    expect(out.url).toBe("https://cdn/1.webp");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/uploads\/images$/);
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBe(file);
    // 직접 넣으면 경계값(boundary)이 빠져 서버가 본문을 못 나눈다
    expect(init.headers).not.toHaveProperty("Content-Type");
    expect(init.headers).toHaveProperty("Authorization", "Bearer tok");
  });

  it("서버가 알려준 거절 사유를 그대로 던진다", async () => {
    stubFetch(
      new Response(
        JSON.stringify({ detail: "JPG, PNG, WebP만 올릴 수 있어요." }),
        {
          status: 415,
        },
      ),
    );
    const { adminApi } = await import("@/lib/adminApi");
    await expect(
      adminApi.uploadImage(new File(["x"], "a.gif", { type: "image/gif" })),
    ).rejects.toThrow("JPG, PNG, WebP만 올릴 수 있어요.");
  });

  it("401이면 토큰을 지우고 다시 로그인하라고 알린다", async () => {
    document.cookie = "auth_token=old; path=/";
    stubFetch(new Response("", { status: 401 }));
    const { adminApi } = await import("@/lib/adminApi");
    await expect(
      adminApi.uploadImage(new File(["x"], "a.png", { type: "image/png" })),
    ).rejects.toThrow("다시 로그인");
    expect(getToken()).toBeNull();
  });
});

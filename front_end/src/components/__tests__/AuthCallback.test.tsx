import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

const setSession = vi.fn();
vi.mock("@/lib/authApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/authApi")>();
  return { ...mod, setSession: (...args: unknown[]) => setSession(...args) };
});

import AuthCallbackPage from "@/app/auth/callback/page";

describe("소셜 로그인 콜백 페이지", () => {
  beforeEach(() => {
    replace.mockClear();
    setSession.mockClear();
    window.location.hash = "";
  });

  it("fragment의 토큰을 세션에 저장하고 next로 이동", async () => {
    window.location.hash = "#token=tok&isAdmin=1&next=%2Fposts";
    render(<AuthCallbackPage />);

    await waitFor(() =>
      expect(setSession).toHaveBeenCalledWith({
        accessToken: "tok",
        isAdmin: true,
      }),
    );
    expect(replace).toHaveBeenCalledWith("/posts");
    // 토큰이 히스토리에 남지 않도록 fragment 제거
    expect(window.location.hash).toBe("");
  });

  it("외부 URL next는 무시하고 홈으로", async () => {
    window.location.hash = "#token=tok&isAdmin=0&next=https%3A%2F%2Fevil.com";
    render(<AuthCallbackPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("error fragment → 에러 안내 표시", async () => {
    window.location.hash = "#error=access_denied";
    render(<AuthCallbackPage />);
    expect(await screen.findByText("로그인 실패")).toBeInTheDocument();
    expect(setSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

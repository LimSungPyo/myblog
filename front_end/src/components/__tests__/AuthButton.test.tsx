import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "@/types";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const fetchMe = vi.fn();
const clearToken = vi.fn();
vi.mock("@/lib/authApi", () => ({
  AUTH_CHANGED_EVENT: "auth:changed",
  fetchMe: () => fetchMe(),
  clearToken: () => clearToken(),
}));

import AuthButton from "@/components/AuthButton";

const user: AuthUser = {
  id: "uuid-1",
  username: null,
  email: "user@example.com",
  displayName: "테스터",
  avatarUrl: null,
  isAdmin: false,
};

describe("AuthButton", () => {
  beforeEach(() => {
    push.mockClear();
    clearToken.mockClear();
    fetchMe.mockReset();
  });

  it("비로그인 → 로그인 링크 표시", async () => {
    fetchMe.mockResolvedValue(null);
    render(<AuthButton />);
    expect(
      await screen.findByRole("link", { name: "로그인" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });

  it("로그인 → 로그아웃 버튼으로 교체", async () => {
    fetchMe.mockResolvedValue(user);
    render(<AuthButton />);
    expect(
      await screen.findByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인" })).toBeNull();
  });

  it("로그아웃 클릭 → 세션 제거 후 다시 로그인 링크", async () => {
    fetchMe.mockResolvedValue(user);
    render(<AuthButton />);
    await userEvent.click(
      await screen.findByRole("button", { name: "로그아웃" }),
    );

    expect(clearToken).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
    expect(
      await screen.findByRole("link", { name: "로그인" }),
    ).toBeInTheDocument();
  });

  it("세션 변경 이벤트 → 로그인 상태 재확인", async () => {
    // 소셜 콜백처럼 마운트 시점엔 토큰이 없다가 이후에 세션이 생기는 경우
    fetchMe.mockResolvedValueOnce(null);
    render(<AuthButton />);
    await screen.findByRole("link", { name: "로그인" });

    fetchMe.mockResolvedValueOnce(user);
    act(() => {
      window.dispatchEvent(new Event("auth:changed"));
    });
    expect(
      await screen.findByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
  });
});

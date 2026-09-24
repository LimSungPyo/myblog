import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { AuthUser } from "@/types";

const fetchMe = vi.fn();
vi.mock("@/lib/authApi", () => ({
  AUTH_CHANGED_EVENT: "auth:changed",
  fetchMe: () => fetchMe(),
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
    fetchMe.mockReset();
  });

  it("비로그인 → 로그인 링크", async () => {
    fetchMe.mockResolvedValue(null);
    render(<AuthButton />);
    expect(await screen.findByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByRole("link", { name: "마이페이지" })).toBeNull();
  });

  it("로그인 → 마이페이지 링크, 이름은 툴팁으로", async () => {
    fetchMe.mockResolvedValue(user);
    render(<AuthButton />);
    const link = await screen.findByRole("link", { name: "마이페이지" });
    expect(link).toHaveAttribute("href", "/mypage");
    expect(link).toHaveAttribute("title", "테스터님의 마이페이지");
    expect(screen.queryByRole("link", { name: "로그인" })).toBeNull();
  });

  it("헤더에서 바로 로그아웃되지 않는다 (로그아웃은 마이페이지 안에 있다)", async () => {
    fetchMe.mockResolvedValue(user);
    render(<AuthButton />);
    await screen.findByRole("link", { name: "마이페이지" });
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
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
      await screen.findByRole("link", { name: "마이페이지" }),
    ).toBeInTheDocument();
  });

  it("닉네임을 바꾸면 이벤트로 새 이름을 다시 읽는다", async () => {
    fetchMe.mockResolvedValueOnce(user);
    render(<AuthButton />);
    await screen.findByRole("link", { name: "마이페이지" });

    fetchMe.mockResolvedValueOnce({ ...user, displayName: "새이름" });
    act(() => {
      window.dispatchEvent(new Event("auth:changed"));
    });
    expect(
      await screen.findByTitle("새이름님의 마이페이지"),
    ).toBeInTheDocument();
  });
});

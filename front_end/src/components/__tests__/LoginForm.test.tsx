import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const login = vi.fn();
vi.mock("@/lib/authApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/authApi")>();
  return { ...mod, login: (...args: unknown[]) => login(...args) };
});

import LoginPage from "@/app/login/page";

describe("로그인 페이지", () => {
  beforeEach(() => {
    push.mockClear();
    login.mockReset();
  });

  it("관리자 로그인 성공 → /admin/posts 이동", async () => {
    login.mockResolvedValue({ accessToken: "t", isAdmin: true });
    render(<LoginPage />);
    await userEvent.type(
      screen.getByPlaceholderText("아이디 또는 이메일"),
      "admin",
    );
    await userEvent.type(screen.getByPlaceholderText("비밀번호"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(login).toHaveBeenCalledWith("admin", "pw");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/posts"));
  });

  it("일반 회원 로그인 성공 → 홈 이동", async () => {
    login.mockResolvedValue({ accessToken: "t", isAdmin: false });
    render(<LoginPage />);
    await userEvent.type(
      screen.getByPlaceholderText("아이디 또는 이메일"),
      "user@example.com",
    );
    await userEvent.type(screen.getByPlaceholderText("비밀번호"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("로그인 실패 시 에러 메시지 표시", async () => {
    login.mockRejectedValue(
      new Error("아이디 또는 비밀번호가 올바르지 않습니다."),
    );
    render(<LoginPage />);
    await userEvent.type(
      screen.getByPlaceholderText("아이디 또는 이메일"),
      "x",
    );
    await userEvent.type(screen.getByPlaceholderText("비밀번호"), "y");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("아이디 또는 비밀번호가 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("Google 로그인 버튼이 백엔드 OAuth 시작 주소로 연결", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /Google로 계속하기/ });
    expect(link.getAttribute("href")).toContain("/auth/google/login");
  });
});

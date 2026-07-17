import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const state = { loggedIn: false, admin: false };
vi.mock("@/lib/adminApi", () => ({
  isLoggedIn: () => state.loggedIn,
  isAdmin: () => state.admin,
  clearToken: vi.fn(),
}));

import HeaderAuth from "@/components/HeaderAuth";

describe("HeaderAuth", () => {
  beforeEach(() => {
    state.loggedIn = false;
    state.admin = false;
  });

  it("미로그인: 로그인·회원가입 링크 표시", async () => {
    render(<HeaderAuth />);
    expect(await screen.findByText("로그인")).toBeInTheDocument();
    expect(screen.getByText("회원가입")).toBeInTheDocument();
  });

  it("관리자 로그인: '관리자'·로그아웃 표시", async () => {
    state.loggedIn = true;
    state.admin = true;
    render(<HeaderAuth />);
    expect(await screen.findByText("관리자")).toBeInTheDocument();
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("일반 회원 로그인: 로그아웃만(관리자 링크 없음)", async () => {
    state.loggedIn = true;
    state.admin = false;
    render(<HeaderAuth />);
    expect(await screen.findByText("로그아웃")).toBeInTheDocument();
    expect(screen.queryByText("관리자")).not.toBeInTheDocument();
  });
});

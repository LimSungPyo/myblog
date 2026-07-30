import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const signup = vi.fn();
vi.mock("@/lib/authApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/authApi")>();
  return { ...mod, signup: (...args: unknown[]) => signup(...args) };
});

import SignupPage from "@/app/signup/page";

async function fillForm() {
  await userEvent.type(screen.getByPlaceholderText("닉네임"), "새회원");
  await userEvent.type(
    screen.getByPlaceholderText("이메일"),
    "new@example.com",
  );
  await userEvent.type(
    screen.getByPlaceholderText("비밀번호 (8자 이상)"),
    "pass12345",
  );
}

describe("회원가입 페이지", () => {
  beforeEach(() => {
    push.mockClear();
    signup.mockReset();
  });

  it("가입 성공 → 자동 로그인 후 홈 이동", async () => {
    signup.mockResolvedValue({ accessToken: "t", isAdmin: false });
    render(<SignupPage />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "회원가입" }));

    expect(signup).toHaveBeenCalledWith(
      "new@example.com",
      "pass12345",
      "새회원",
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("중복 이메일 등 서버 에러 메시지 표시", async () => {
    signup.mockRejectedValue(new Error("이미 가입된 이메일입니다."));
    render(<SignupPage />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "회원가입" }));

    expect(
      await screen.findByText("이미 가입된 이메일입니다."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

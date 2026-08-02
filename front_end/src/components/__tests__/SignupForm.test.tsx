import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signup = vi.fn();
const resendVerification = vi.fn();
vi.mock("@/lib/authApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/authApi")>();
  return {
    ...mod,
    signup: (...args: unknown[]) => signup(...args),
    resendVerification: (...args: unknown[]) => resendVerification(...args),
  };
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
    signup.mockReset();
    resendVerification.mockReset();
  });

  it("가입 신청 성공 → 인증 메일 안내 화면 표시", async () => {
    signup.mockResolvedValue({ message: "인증 메일을 보냈습니다." });
    render(<SignupPage />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "회원가입" }));

    expect(signup).toHaveBeenCalledWith(
      "new@example.com",
      "pass12345",
      "새회원",
    );
    expect(await screen.findByText("메일을 확인해주세요")).toBeInTheDocument();
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
  });

  it("안내 화면에서 인증 메일 재발송", async () => {
    signup.mockResolvedValue({ message: "ok" });
    resendVerification.mockResolvedValue({ message: "ok" });
    render(<SignupPage />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "회원가입" }));

    await userEvent.click(
      await screen.findByRole("button", { name: /다시 보내기/ }),
    );
    expect(resendVerification).toHaveBeenCalledWith("new@example.com");
    expect(
      await screen.findByText(/인증 메일을 다시 보냈습니다/),
    ).toBeInTheDocument();
  });

  it("중복 이메일 등 서버 에러 메시지 표시", async () => {
    signup.mockRejectedValue(new Error("이미 가입된 이메일입니다."));
    render(<SignupPage />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "회원가입" }));

    expect(
      await screen.findByText("이미 가입된 이메일입니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText("메일을 확인해주세요")).toBeNull();
  });
});

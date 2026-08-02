import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const forgotPassword = vi.fn();
vi.mock("@/lib/authApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/authApi")>();
  return {
    ...mod,
    forgotPassword: (...args: unknown[]) => forgotPassword(...args),
  };
});

import ForgotPasswordPage from "@/app/forgot-password/page";

describe("비밀번호 찾기 페이지", () => {
  beforeEach(() => {
    // 중괄호 없는 화살표면 mock(함수)이 반환돼 vitest가 teardown으로 호출해버린다
    forgotPassword.mockReset();
  });

  it("이메일 제출 → 재설정 메일 안내 화면", async () => {
    forgotPassword.mockResolvedValue({ message: "ok" });
    render(<ForgotPasswordPage />);
    await userEvent.type(
      screen.getByPlaceholderText("이메일"),
      "me@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "재설정 메일 보내기" }),
    );

    expect(forgotPassword).toHaveBeenCalledWith("me@example.com");
    expect(await screen.findByText("메일을 확인해주세요")).toBeInTheDocument();
    expect(screen.getByText("me@example.com")).toBeInTheDocument();
  });

  it("실패 시 에러 메시지 표시", async () => {
    forgotPassword.mockRejectedValue(
      new Error("메일 발송이 설정되지 않았습니다."),
    );
    render(<ForgotPasswordPage />);
    await userEvent.type(screen.getByPlaceholderText("이메일"), "a@b.com");
    await userEvent.click(
      screen.getByRole("button", { name: "재설정 메일 보내기" }),
    );

    expect(
      await screen.findByText("메일 발송이 설정되지 않았습니다."),
    ).toBeInTheDocument();
  });
});

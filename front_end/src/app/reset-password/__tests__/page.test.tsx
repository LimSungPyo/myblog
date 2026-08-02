import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

const resetPassword = vi.fn();
vi.mock("@/lib/authApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/authApi")>();
  return {
    ...mod,
    resetPassword: (...args: unknown[]) => resetPassword(...args),
  };
});

import ResetPasswordPage from "@/app/reset-password/page";

describe("비밀번호 재설정 페이지", () => {
  beforeEach(() => {
    replace.mockClear();
    resetPassword.mockReset();
    search = "token=reset-token";
  });

  it("새 비밀번호 제출 → 재설정 후 홈으로 이동(자동 로그인)", async () => {
    resetPassword.mockResolvedValue({ accessToken: "t", isAdmin: false });
    render(<ResetPasswordPage />);
    await userEvent.type(
      screen.getByPlaceholderText("새 비밀번호 (8자 이상)"),
      "newpass123",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "비밀번호 변경" }),
    );

    expect(resetPassword).toHaveBeenCalledWith("reset-token", "newpass123");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("사용된 링크 → 에러와 재발송 안내 표시", async () => {
    resetPassword.mockRejectedValue(
      new Error("재설정 링크가 유효하지 않거나 이미 사용되었습니다."),
    );
    render(<ResetPasswordPage />);
    await userEvent.type(
      screen.getByPlaceholderText("새 비밀번호 (8자 이상)"),
      "newpass123",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "비밀번호 변경" }),
    );

    expect(
      await screen.findByText(
        "재설정 링크가 유효하지 않거나 이미 사용되었습니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /재설정 메일을 다시 받아주세요/ }),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("토큰 없이 접근 → 잘못된 접근 안내", () => {
    search = "";
    render(<ResetPasswordPage />);
    expect(screen.getByText("잘못된 접근")).toBeInTheDocument();
  });
});

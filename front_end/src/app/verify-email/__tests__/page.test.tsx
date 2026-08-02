import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

const verifyEmail = vi.fn();
vi.mock("@/lib/authApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/authApi")>();
  return { ...mod, verifyEmail: (...args: unknown[]) => verifyEmail(...args) };
});

import VerifyEmailPage from "@/app/verify-email/page";

describe("이메일 인증 페이지", () => {
  beforeEach(() => {
    replace.mockClear();
    verifyEmail.mockReset();
    search = "";
  });

  it("토큰 인증 성공 → 홈으로 이동(자동 로그인)", async () => {
    search = "token=valid-token";
    verifyEmail.mockResolvedValue({ accessToken: "t", isAdmin: false });
    render(<VerifyEmailPage />);

    await waitFor(() =>
      expect(verifyEmail).toHaveBeenCalledWith("valid-token"),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("만료·불량 토큰 → 실패 안내와 재발송 경로 표시", async () => {
    search = "token=expired";
    verifyEmail.mockRejectedValue(
      new Error("인증 링크가 유효하지 않거나 만료되었습니다."),
    );
    render(<VerifyEmailPage />);

    expect(await screen.findByText("이메일 인증 실패")).toBeInTheDocument();
    expect(
      screen.getByText("인증 링크가 유효하지 않거나 만료되었습니다."),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("토큰 없이 접근 → 에러 표시", async () => {
    render(<VerifyEmailPage />);
    expect(await screen.findByText("이메일 인증 실패")).toBeInTheDocument();
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});

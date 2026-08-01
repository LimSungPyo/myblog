import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "@/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const authState: { user: AuthUser | null; loading: boolean } = {
  user: null,
  loading: false,
};
vi.mock("@/hooks/useAuthUser", () => ({
  useAuthUser: () => authState,
}));
vi.mock("@/lib/authApi", () => ({
  getToken: () => "test-token",
}));

import GuestbookForm from "@/components/guestbook/GuestbookForm";

const user: AuthUser = {
  id: "uuid-1",
  username: null,
  email: "user@example.com",
  displayName: "홍길동",
  avatarUrl: null,
  isAdmin: false,
};

describe("GuestbookForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    authState.user = user;
    authState.loading = false;
    // 실제 서버 대신 성공 응답을 반환하도록 fetch를 목킹 (서버 실행 여부와 무관하게)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("비로그인 → 폼 대신 로그인 안내 표시", () => {
    authState.user = null;
    render(<GuestbookForm />);
    expect(
      screen.getByText(/방명록은 로그인 후 남길 수 있습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?from=/guestbook",
    );
    expect(screen.queryByLabelText("메시지")).toBeNull();
  });

  it("이름 입력칸 없이 닉네임이 플레이스홀더에 표시", () => {
    render(<GuestbookForm />);
    expect(
      screen.getByPlaceholderText("홍길동님, 메시지를 입력해주세요."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("이름")).toBeNull();
  });

  it("메시지가 비면 에러 표시", async () => {
    render(<GuestbookForm />);
    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));
    expect(screen.getByText("메시지를 입력해주세요.")).toBeInTheDocument();
  });

  it("입력 후 등록하면 폼이 비워지고 목록을 새로고침", async () => {
    render(<GuestbookForm />);
    await userEvent.type(screen.getByLabelText("메시지"), "안녕하세요");
    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByLabelText("메시지")).toHaveValue("");
  });

  it("이모지 버튼으로 메시지에 이모지 삽입", async () => {
    render(<GuestbookForm />);
    await userEvent.click(screen.getByRole("button", { name: "이모지" }));
    await userEvent.click(screen.getByRole("button", { name: "😊" }));
    expect(screen.getByLabelText("메시지")).toHaveValue("😊");
  });
});

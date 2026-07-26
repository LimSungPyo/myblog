import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import GuestbookForm from "@/components/guestbook/GuestbookForm";

describe("GuestbookForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    // 실제 서버 대신 성공 응답을 반환하도록 fetch를 목킹 (서버 실행 여부와 무관하게)
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, status: 201, json: async () => ({}) }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("이름/메시지가 비면 에러 표시", async () => {
    render(<GuestbookForm />);
    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));
    expect(
      screen.getByText("이름과 메시지를 입력해주세요."),
    ).toBeInTheDocument();
  });

  it("입력 후 등록하면 폼이 비워지고 목록을 새로고침", async () => {
    render(<GuestbookForm />);
    await userEvent.type(screen.getByLabelText("이름"), "홍길동");
    await userEvent.type(screen.getByLabelText("메시지"), "안녕하세요");
    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByLabelText("이름")).toHaveValue("");
    expect(screen.getByLabelText("메시지")).toHaveValue("");
  });

  it("이모지 버튼으로 메시지에 이모지 삽입", async () => {
    render(<GuestbookForm />);
    await userEvent.click(screen.getByRole("button", { name: "이모지" }));
    await userEvent.click(screen.getByRole("button", { name: "😊" }));
    expect(screen.getByLabelText("메시지")).toHaveValue("😊");
  });
});

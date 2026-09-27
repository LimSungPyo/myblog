import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    // jsdom에는 미리보기 주소를 만드는 함수가 없어서 흉내 낸다
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());

  function photo(name = "photo.png", type = "image/png") {
    return new File(["x"], name, { type });
  }

  function pick(file: File) {
    // accept 속성으로 걸러지지 않게 change 이벤트를 직접 보낸다 (거르는 건 컴포넌트가 해야 한다)
    fireEvent.change(screen.getByLabelText("사진 파일"), {
      target: { files: [file] },
    });
  }

  function sentBody(): FormData {
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    return init.body as FormData;
  }

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

  it("메시지도 사진도 없으면 에러 표시", async () => {
    render(<GuestbookForm />);
    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));
    expect(
      screen.getByText("메시지나 사진 중 하나는 남겨주세요."),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("사진을 고르면 미리보기가 뜨고, 사진만으로도 등록된다", async () => {
    render(<GuestbookForm />);
    const file = photo();
    pick(file);
    expect(screen.getByAltText("올릴 사진 미리보기")).toHaveAttribute(
      "src",
      "blob:preview",
    );

    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(sentBody().get("image")).toBe(file);
    // 등록이 끝나면 미리보기도 비운다
    expect(screen.queryByAltText("올릴 사진 미리보기")).toBeNull();
  });

  it("글과 사진을 한 요청으로 보내고, Content-Type은 브라우저에 맡긴다", async () => {
    render(<GuestbookForm />);
    await userEvent.type(screen.getByLabelText("메시지"), "사진과 인사");
    pick(photo());
    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = sentBody();
    expect(body.get("content")).toBe("사진과 인사");
    expect(body.get("image")).toBeInstanceOf(File);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("사진이 아닌 파일은 미리 거른다", () => {
    render(<GuestbookForm />);
    pick(photo("문서.pdf", "application/pdf"));
    expect(
      screen.getByText("JPG, PNG, WebP 사진만 올릴 수 있어요."),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("올릴 사진 미리보기")).toBeNull();
  });

  it("10MB가 넘는 사진은 보내기 전에 거른다", () => {
    render(<GuestbookForm />);
    const big = photo();
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    pick(big);
    expect(
      screen.getByText("사진은 10MB 이하만 올릴 수 있어요."),
    ).toBeInTheDocument();
  });

  it("사진 빼기를 누르면 미리보기를 지우고 메모리를 풀어준다", async () => {
    render(<GuestbookForm />);
    pick(photo());
    await userEvent.click(screen.getByRole("button", { name: "사진 빼기" }));
    expect(screen.queryByAltText("올릴 사진 미리보기")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("서버가 사진을 거절하면 이유를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ detail: "움직이는 이미지는 올릴 수 없어요." }),
            { status: 415 },
          ),
      ),
    );
    render(<GuestbookForm />);
    pick(photo("a.webp", "image/webp"));
    await userEvent.click(screen.getByRole("button", { name: "등록하기" }));
    expect(
      await screen.findByText("움직이는 이미지는 올릴 수 없어요."),
    ).toBeInTheDocument();
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

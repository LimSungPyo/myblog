import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "@/types";
import type { MyActivity } from "@/lib/meApi";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const authState: { user: AuthUser | null; loading: boolean } = {
  user: null,
  loading: false,
};
vi.mock("@/hooks/useAuthUser", () => ({ useAuthUser: () => authState }));

const clearToken = vi.fn();
vi.mock("@/lib/authApi", () => ({ clearToken: () => clearToken() }));

const meApi = {
  activity: vi.fn(),
  rename: vi.fn(),
  deleteComment: vi.fn(),
  deleteGuestbook: vi.fn(),
  withdraw: vi.fn(),
};
vi.mock("@/lib/meApi", () => ({
  WITHDRAW_CONFIRMATION: "탈퇴합니다",
  meApi: {
    activity: () => meApi.activity(),
    rename: (n: string) => meApi.rename(n),
    deleteComment: (id: number) => meApi.deleteComment(id),
    deleteGuestbook: (id: number) => meApi.deleteGuestbook(id),
    withdraw: (c: string) => meApi.withdraw(c),
  },
}));

import MyPage from "@/app/mypage/page";

const member: AuthUser = {
  id: "u-1",
  username: null,
  email: "me@example.com",
  displayName: "홍길동",
  avatarUrl: null,
  isAdmin: false,
};

const activity: MyActivity = {
  comments: [
    {
      id: 1,
      postSlug: "hello",
      postTitle: "안녕 글",
      content: "좋은 글이에요",
      approved: true,
      createdAt: "2026-09-01T00:00:00Z",
    },
    {
      id: 2,
      postSlug: "hello",
      postTitle: "안녕 글",
      content: "아직 안 보이는 댓글",
      approved: false,
      createdAt: "2026-09-02T00:00:00Z",
    },
  ],
  guestbook: [
    { id: 7, content: "방명록 인사", createdAt: "2026-09-03T00:00:00Z" },
  ],
  scores: [
    { id: 9, gameKey: "2048", score: 4096, createdAt: "2026-09-04T00:00:00Z" },
  ],
};

describe("마이페이지", () => {
  beforeEach(() => {
    authState.user = member;
    authState.loading = false;
    Object.values(meApi).forEach((fn) => fn.mockReset());
    push.mockClear();
    clearToken.mockClear();
    meApi.activity.mockResolvedValue(activity);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("로그인 안 됐으면 로그인 링크를 보여준다", () => {
    authState.user = null;
    render(<MyPage />);
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?from=/mypage",
    );
  });

  it("내 댓글·방명록·게임 기록을 보여준다", async () => {
    render(<MyPage />);
    expect(await screen.findByText("좋은 글이에요")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "안녕 글" })[0]).toHaveAttribute(
      "href",
      "/posts/hello",
    );
    expect(screen.getByText("방명록 인사")).toBeInTheDocument();
    expect(screen.getByText("4,096점")).toBeInTheDocument();
  });

  it("승인 전 댓글에는 '승인 대기'를 붙인다 (사라진 줄 오해하지 않게)", async () => {
    render(<MyPage />);
    const pending = (await screen.findByText("아직 안 보이는 댓글")).closest(
      "li",
    )!;
    expect(within(pending).getByText("승인 대기")).toBeInTheDocument();
    const approved = screen.getByText("좋은 글이에요").closest("li")!;
    expect(within(approved).queryByText("승인 대기")).toBeNull();
  });

  it("확인하면 댓글을 지우고 목록에서 뺀다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    meApi.deleteComment.mockResolvedValue(undefined);
    render(<MyPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: /댓글 삭제: 좋은 글이에요/ }),
    );

    expect(meApi.deleteComment).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.queryByText("좋은 글이에요")).toBeNull());
  });

  it("확인 창에서 취소하면 지우지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MyPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: /방명록 삭제: 방명록 인사/ }),
    );
    expect(meApi.deleteGuestbook).not.toHaveBeenCalled();
    expect(screen.getByText("방명록 인사")).toBeInTheDocument();
  });

  it("닉네임을 앞뒤 공백 없이 바꾼다", async () => {
    meApi.rename.mockResolvedValue({ ...member, displayName: "새이름" });
    render(<MyPage />);
    const input = screen.getByLabelText("닉네임");

    await userEvent.clear(input);
    await userEvent.type(input, "  새이름  ");
    await userEvent.click(screen.getByRole("button", { name: "바꾸기" }));

    expect(meApi.rename).toHaveBeenCalledWith("새이름");
    expect(await screen.findByText(/닉네임을 바꿨어요/)).toBeInTheDocument();
  });

  it("닉네임이 그대로거나 비어 있으면 바꾸기 버튼을 잠근다", async () => {
    render(<MyPage />);
    const button = screen.getByRole("button", { name: "바꾸기" });
    expect(button).toBeDisabled();
    await userEvent.clear(screen.getByLabelText("닉네임"));
    expect(button).toBeDisabled();
  });

  it("로그아웃하면 세션을 지우고 홈으로 간다", async () => {
    render(<MyPage />);
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(clearToken).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });

  it("확인 문구를 정확히 입력해야 탈퇴 버튼이 열린다", async () => {
    render(<MyPage />);
    const button = screen.getByRole("button", { name: "탈퇴하기" });
    const input = screen.getByLabelText(/를 입력해주세요/);

    expect(button).toBeDisabled();
    await userEvent.type(input, "탈퇴");
    expect(button).toBeDisabled();
    await userEvent.type(input, "합니다");
    expect(button).toBeEnabled();
  });

  it("탈퇴하면 홈으로 보낸다", async () => {
    meApi.withdraw.mockResolvedValue(undefined);
    render(<MyPage />);
    await userEvent.type(
      screen.getByLabelText(/를 입력해주세요/),
      "탈퇴합니다",
    );
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));

    expect(meApi.withdraw).toHaveBeenCalledWith("탈퇴합니다");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("탈퇴가 실패하면 이유를 보여주고 페이지에 남는다", async () => {
    meApi.withdraw.mockRejectedValue(new Error("탈퇴하지 못했어요."));
    render(<MyPage />);
    await userEvent.type(
      screen.getByLabelText(/를 입력해주세요/),
      "탈퇴합니다",
    );
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));

    expect(await screen.findByText("탈퇴하지 못했어요.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("관리자에게는 탈퇴 입력칸 대신 안내만 보여준다", () => {
    authState.user = {
      ...member,
      email: null,
      username: "admin",
      isAdmin: true,
    };
    render(<MyPage />);
    expect(
      screen.getByText(/관리자 계정은 탈퇴할 수 없어요/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "탈퇴하기" })).toBeNull();
  });
});

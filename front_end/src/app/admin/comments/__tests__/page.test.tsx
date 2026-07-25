import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listComments = vi.fn();
const moderateComment = vi.fn();
const deleteComment = vi.fn();
vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listComments: () => listComments(),
    moderateComment: (id: number, approved: boolean) =>
      moderateComment(id, approved),
    deleteComment: (id: number) => deleteComment(id),
  },
}));

import AdminCommentsPage from "@/app/admin/comments/page";

const sample = [
  {
    id: 1,
    postId: 1,
    postTitle: "글A",
    postSlug: "a",
    authorName: "홍길동",
    content: "안녕하세요",
    approved: true,
    createdAt: "2026-07-10T00:00:00Z",
  },
  {
    id: 2,
    postId: 1,
    postTitle: "글A",
    postSlug: "a",
    authorName: "스팸",
    content: "광고입니다",
    approved: false,
    createdAt: "2026-07-10T00:00:00Z",
  },
];

describe("관리자 댓글 페이지", () => {
  beforeEach(() => {
    listComments.mockReset();
    moderateComment.mockReset();
    deleteComment.mockReset();
  });

  it("댓글 목록과 공개/숨김 상태를 표시한다", async () => {
    listComments.mockResolvedValue(sample);
    render(<AdminCommentsPage />);
    expect(await screen.findByText("안녕하세요")).toBeInTheDocument();
    expect(screen.getByText("광고입니다")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("숨김")).toBeInTheDocument(); // 미승인 배지
  });

  it("'숨기기' 클릭 시 moderateComment(id, false) 호출", async () => {
    listComments.mockResolvedValue(sample);
    moderateComment.mockResolvedValue({ ...sample[0], approved: false });
    render(<AdminCommentsPage />);
    await screen.findByText("안녕하세요");

    await userEvent.click(screen.getByRole("button", { name: "숨기기" }));
    expect(moderateComment).toHaveBeenCalledWith(1, false);
  });

  it("'삭제' 클릭(확인 시) deleteComment 호출", async () => {
    listComments.mockResolvedValue(sample);
    deleteComment.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminCommentsPage />);
    await screen.findByText("안녕하세요");

    const delButtons = screen.getAllByRole("button", { name: "삭제" });
    await userEvent.click(delButtons[0]);
    expect(deleteComment).toHaveBeenCalledWith(1);
  });
});

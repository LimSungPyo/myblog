import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AuthUser } from "@/types";

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

import CommentSection from "@/components/CommentSection";

const user: AuthUser = {
  id: "uuid-1",
  username: null,
  email: "user@example.com",
  displayName: "홍길동",
  avatarUrl: null,
  isAdmin: false,
};

describe("CommentSection", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it("비로그인 → 입력폼 대신 로그인 안내 표시", () => {
    render(<CommentSection slug="hello" initial={[]} />);
    expect(
      screen.getByText(/댓글은 로그인 후 작성할 수 있습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?from=/posts/hello",
    );
    expect(screen.queryByPlaceholderText("댓글을 입력하세요")).toBeNull();
  });

  it("로그인 상태 확인 중에는 안내도 폼도 띄우지 않음", () => {
    authState.loading = true;
    render(<CommentSection slug="hello" initial={[]} />);
    expect(screen.queryByText(/로그인 후 작성/)).toBeNull();
    expect(screen.queryByPlaceholderText("댓글을 입력하세요")).toBeNull();
  });

  it("로그인 → 이름 입력칸 없이 닉네임으로 작성 표시", () => {
    authState.user = user;
    render(<CommentSection slug="hello" initial={[]} />);
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("댓글을 입력하세요"),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("이름")).toBeNull();
  });

  it("기존 댓글 목록은 로그인과 무관하게 표시", () => {
    render(
      <CommentSection
        slug="hello"
        initial={[
          {
            id: 1,
            postId: 1,
            authorName: "이전작성자",
            content: "좋은 글이네요",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("이전작성자")).toBeInTheDocument();
    expect(screen.getByText("좋은 글이네요")).toBeInTheDocument();
  });
});

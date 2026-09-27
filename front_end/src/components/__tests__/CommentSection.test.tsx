import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("관리자로 로그인하면 '관리자로 작성'으로 안내한다", () => {
    authState.user = { ...user, username: "admin", isAdmin: true };
    render(<CommentSection slug="hello" initial={[]} />);
    expect(screen.getByText("관리자")).toBeInTheDocument();
    expect(screen.getByText(/로 작성/)).toBeInTheDocument();
    expect(screen.queryByText("홍길동")).toBeNull();
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

  describe("도배 제한(429)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function stubTooManyRequests(retryAfter: string | null) {
      const headers = new Headers();
      if (retryAfter !== null) headers.set("Retry-After", retryAfter);
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(JSON.stringify({ detail: "요청이 너무 잦습니다." }), {
              status: 429,
              headers,
            }),
        ),
      );
    }

    async function submitComment() {
      const input = screen.getByPlaceholderText("댓글을 입력하세요");
      await userEvent.type(input, "도배");
      await userEvent.click(screen.getByRole("button", { name: /댓글 등록/ }));
    }

    it("429면 남은 대기 시간을 안내하고 등록 버튼을 잠근다", async () => {
      authState.user = user;
      stubTooManyRequests("30");
      render(<CommentSection slug="hello" initial={[]} />);
      await submitComment();

      await waitFor(() => {
        expect(
          screen.getByText(/30초 후에 다시 시도해주세요/),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: /30초 후 가능/ }),
      ).toBeDisabled();
    });

    it("Retry-After를 못 읽으면 서버가 준 메시지를 그대로 보여준다", async () => {
      // CORS에서 헤더가 노출되지 않는 환경에서도 사용자가 이유는 알 수 있어야 한다
      authState.user = user;
      stubTooManyRequests(null);
      render(<CommentSection slug="hello" initial={[]} />);
      await submitComment();

      await waitFor(() => {
        expect(screen.getByText("요청이 너무 잦습니다.")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: "댓글 등록" })).toBeEnabled();
    });
  });
});

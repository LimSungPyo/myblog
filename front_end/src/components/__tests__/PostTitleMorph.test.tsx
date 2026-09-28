import { describe, it, expect, vi, afterEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import PostTitleMorph, {
  postTitleTransitionName,
} from "@/components/PostTitleMorph";
import PostCard from "@/components/PostCard";
import type { Post } from "@/types";

// 테스트의 안정판 React에는 ViewTransition이 없다. 있는 경우(Next의 canary React)를 흉내 내려고
// 받은 속성을 data-*로 드러내는 가짜를 필요할 때만 끼운다
const vt = vi.hoisted(() => ({
  current: undefined as
    | undefined
    | ((p: {
        name: string;
        share: string;
        default: string;
        children: ReactNode;
      }) => ReactNode),
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    get ViewTransition() {
      return vt.current;
    },
  };
});

function FakeViewTransition(p: {
  name: string;
  share: string;
  default: string;
  children: ReactNode;
}) {
  return (
    <div
      data-vt-name={p.name}
      data-vt-share={p.share}
      data-vt-default={p.default}
    >
      {p.children}
    </div>
  );
}

const post: Post = {
  id: 7,
  slug: "hello-world",
  title: "안녕 세계",
  excerpt: "요약문입니다.",
  content: "본문",
  coverImage: null,
  category: null,
  tags: [],
  status: "published",
  viewCount: 0,
  createdAt: "2026-07-08T00:00:00",
  updatedAt: "2026-07-08T00:00:00",
  publishedAt: "2026-07-08T00:00:00",
};

afterEach(() => {
  vt.current = undefined;
});

describe("PostTitleMorph", () => {
  it("ViewTransition이 없는 React에서는 자식만 그대로 그린다", () => {
    const { container } = render(
      <PostTitleMorph postId={7}>
        <h1>제목</h1>
      </PostTitleMorph>,
    );
    expect(container.innerHTML).toBe("<h1>제목</h1>");
  });

  it("글 id로 이름을 짓고, 양쪽 페이지에 짝이 있을 때만 움직이게 한다", () => {
    vt.current = FakeViewTransition;
    render(
      <PostTitleMorph postId={7}>
        <h1>제목</h1>
      </PostTitleMorph>,
    );
    const box = screen.getByRole("heading", { name: "제목" }).parentElement!;
    expect(box).toHaveAttribute("data-vt-name", "post-title-7");
    expect(box).toHaveAttribute("data-vt-share", "post-title");
    expect(box).toHaveAttribute("data-vt-default", "none");
  });

  it("글 카드 제목이 글 상세 제목과 같은 이름으로 감싸진다", () => {
    vt.current = FakeViewTransition;
    render(<PostCard post={post} />);
    const heading = screen.getByRole("heading", { name: "안녕 세계" });
    expect(heading.parentElement).toHaveAttribute(
      "data-vt-name",
      postTitleTransitionName(post.id),
    );
  });
});

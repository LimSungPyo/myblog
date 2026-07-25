import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PostCard from "@/components/PostCard";
import type { Post } from "@/types";

const post: Post = {
  id: 1,
  slug: "hello-world",
  title: "안녕 세계",
  excerpt: "요약문입니다.",
  content: "본문 ".repeat(300),
  coverImage: null,
  category: { id: 1, name: "개발", slug: "dev" },
  tags: [{ id: 1, name: "Next.js", slug: "nextjs" }],
  status: "published",
  viewCount: 0,
  createdAt: "2026-07-08T00:00:00",
  updatedAt: "2026-07-08T00:00:00",
  publishedAt: "2026-07-08T00:00:00",
};

describe("PostCard", () => {
  it("제목·카테고리·태그를 링크로 렌더", () => {
    render(<PostCard post={post} />);
    expect(screen.getByRole("link", { name: "안녕 세계" })).toHaveAttribute(
      "href",
      "/posts/hello-world",
    );
    expect(screen.getByRole("link", { name: /개발/ })).toHaveAttribute(
      "href",
      "/categories/dev",
    );
    expect(screen.getByRole("link", { name: "#Next.js" })).toHaveAttribute(
      "href",
      "/tags/nextjs",
    );
  });

  it("날짜와 읽기 시간을 함께 표시", () => {
    render(<PostCard post={post} />);
    expect(screen.getByText(/2026\.07\.08/)).toBeInTheDocument();
    expect(screen.getByText(/min read/)).toBeInTheDocument();
  });
});

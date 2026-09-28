import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PostNav from "@/components/PostNav";

describe("이전·다음 기록", () => {
  it("이전(더 오래된 글)과 다음(더 최근 글)으로 가는 링크를 둔다", () => {
    render(
      <PostNav
        prev={{ slug: "nextjs", title: "블로그에 Next.js를 쓰는 이유" }}
        next={{ slug: "retro", title: "첫 배포 회고" }}
      />,
    );
    const prev = screen.getByRole("link", { name: /이전 기록/ });
    expect(prev).toHaveAttribute("href", "/posts/nextjs");
    expect(prev).toHaveAttribute("rel", "prev");
    expect(prev).toHaveTextContent("블로그에 Next.js를 쓰는 이유");

    const next = screen.getByRole("link", { name: /다음 기록/ });
    expect(next).toHaveAttribute("href", "/posts/retro");
    expect(next).toHaveAttribute("rel", "next");
  });

  it("첫 글·가장 최근 글이면 그쪽은 링크 없이 안내만 둔다", () => {
    render(<PostNav prev={null} next={null} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("첫 기록입니다")).toBeInTheDocument();
    expect(screen.getByText("가장 최근 기록입니다")).toBeInTheDocument();
  });
});

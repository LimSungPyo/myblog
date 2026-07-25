import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const getStats = vi.fn();
vi.mock("@/lib/adminApi", () => ({
  adminApi: { getStats: () => getStats() },
}));

import AdminDashboard from "@/app/admin/page";

const stats = {
  postCount: 12,
  publishedCount: 9,
  draftCount: 3,
  commentCount: 45,
  pendingCommentCount: 2,
  totalViews: 1234,
  topPosts: [
    { id: 1, title: "인기글1", slug: "p1", viewCount: 500 },
    { id: 2, title: "인기글2", slug: "p2", viewCount: 300 },
  ],
};

describe("관리자 대시보드", () => {
  beforeEach(() => getStats.mockReset());

  it("통계 값과 인기글을 렌더한다", async () => {
    getStats.mockResolvedValue(stats);
    render(<AdminDashboard />);

    expect(await screen.findByText("12")).toBeInTheDocument(); // 글 수
    expect(screen.getByText("45")).toBeInTheDocument(); // 댓글 수
    expect(screen.getByText("인기글1")).toBeInTheDocument();
    expect(screen.getByText("인기글2")).toBeInTheDocument();
  });

  it("초안·숨김 댓글 수를 카드 힌트로 보여준다", async () => {
    getStats.mockResolvedValue(stats);
    render(<AdminDashboard />);
    // "발행 9 · 초안 3" 힌트 + 숨김 댓글 힌트
    expect(await screen.findByText(/발행 9 · 초안 3/)).toBeInTheDocument();
    expect(screen.getByText(/숨김 2/)).toBeInTheDocument();
  });
});

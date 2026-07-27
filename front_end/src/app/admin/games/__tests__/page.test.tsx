import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listGameScores = vi.fn();
const deleteGameScore = vi.fn();
vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listGameScores: () => listGameScores(),
    deleteGameScore: (id: number) => deleteGameScore(id),
  },
}));

import AdminGamesPage from "@/app/admin/games/page";

const sample = [
  {
    id: 1,
    gameKey: "2048",
    playerName: "김민수",
    score: 12480,
    createdAt: "2026-07-26T00:00:00Z",
  },
  {
    id: 2,
    gameKey: "2048",
    playerName: "이지은",
    score: 8360,
    createdAt: "2026-07-25T00:00:00Z",
  },
];

describe("관리자 미니게임 순위 페이지", () => {
  beforeEach(() => {
    listGameScores.mockReset();
    deleteGameScore.mockReset();
  });

  it("점수 목록(플레이어·점수·게임)을 표시한다", async () => {
    listGameScores.mockResolvedValue(sample);
    render(<AdminGamesPage />);
    expect(await screen.findByText("김민수")).toBeInTheDocument();
    expect(screen.getByText("이지은")).toBeInTheDocument();
    expect(screen.getByText("12,480점")).toBeInTheDocument();
    expect(screen.getAllByText("2048").length).toBeGreaterThan(0);
  });

  it("점수가 없으면 안내 문구를 표시한다", async () => {
    listGameScores.mockResolvedValue([]);
    render(<AdminGamesPage />);
    expect(
      await screen.findByText("등록된 점수가 없습니다."),
    ).toBeInTheDocument();
  });

  it("'삭제' 클릭(확인 시) deleteGameScore 호출 후 목록에서 제거", async () => {
    listGameScores.mockResolvedValue(sample);
    deleteGameScore.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminGamesPage />);
    await screen.findByText("김민수");

    const delButtons = screen.getAllByRole("button", { name: "삭제" });
    await userEvent.click(delButtons[0]);
    expect(deleteGameScore).toHaveBeenCalledWith(1);
    // 낙관적 제거: 김민수 행이 사라짐
    expect(screen.queryByText("김민수")).not.toBeInTheDocument();
  });
});

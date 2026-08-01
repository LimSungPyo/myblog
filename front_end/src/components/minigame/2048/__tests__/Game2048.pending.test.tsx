import { describe, it, expect, vi, beforeEach } from "vitest";
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

const api = {
  submitScore: vi.fn(),
  fetchTopScores: vi.fn(),
};
vi.mock("@/lib/minigameApi", () => ({
  submitScore: (...args: unknown[]) =>
    (api.submitScore as (...a: unknown[]) => unknown)(...args),
  fetchTopScores: (...args: unknown[]) =>
    (api.fetchTopScores as (...a: unknown[]) => unknown)(...args),
}));

import Game2048 from "../Game2048";
import { loadPendingScore, savePendingScore } from "../pendingScore";

const user: AuthUser = {
  id: "uuid-1",
  username: null,
  email: "user@example.com",
  displayName: "홍길동",
  avatarUrl: null,
  isAdmin: false,
};

describe("Game2048 — 로그인 전 기록 등록 제안", () => {
  beforeEach(() => {
    sessionStorage.clear();
    authState.user = null;
    authState.loading = false;
    api.submitScore.mockReset().mockResolvedValue({
      id: 7,
      gameKey: "2048",
      playerName: "홍길동",
      score: 1234,
      createdAt: "2026-08-01T00:00:00Z",
    });
    api.fetchTopScores.mockReset().mockResolvedValue([]);
  });

  it("비로그인이면 보관된 점수가 있어도 제안 팝업이 뜨지 않음", () => {
    savePendingScore(1234);
    render(<Game2048 initialScores={[]} />);
    expect(screen.queryByText(/로그인 전 기록이 있어요/)).toBeNull();
  });

  it("로그인 상태로 돌아오면 보관된 점수의 등록 여부를 물어봄", () => {
    savePendingScore(1234);
    authState.user = user;
    render(<Game2048 initialScores={[]} />);
    expect(screen.getByText(/로그인 전 기록이 있어요/)).toBeInTheDocument();
    expect(
      screen.getByText(/홍길동님, 방금 끝난 게임의 점수를 순위에 등록할까요/),
    ).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("동의하면 보관 점수를 등록하고 팝업과 보관소를 비움", async () => {
    savePendingScore(1234);
    authState.user = user;
    render(<Game2048 initialScores={[]} />);

    await userEvent.click(screen.getByRole("button", { name: "순위에 등록" }));

    await waitFor(() =>
      expect(api.submitScore).toHaveBeenCalledWith("2048", 1234),
    );
    await waitFor(() =>
      expect(screen.queryByText(/로그인 전 기록이 있어요/)).toBeNull(),
    );
    expect(loadPendingScore()).toBeNull();
  });

  it("등록하지 않기를 누르면 등록 없이 보관소만 비움", async () => {
    savePendingScore(1234);
    authState.user = user;
    render(<Game2048 initialScores={[]} />);

    await userEvent.click(
      screen.getByRole("button", { name: "등록하지 않기" }),
    );

    expect(api.submitScore).not.toHaveBeenCalled();
    expect(screen.queryByText(/로그인 전 기록이 있어요/)).toBeNull();
    expect(loadPendingScore()).toBeNull();
  });

  it("보관된 점수가 없으면 로그인 상태여도 팝업이 뜨지 않음", () => {
    authState.user = user;
    render(<Game2048 initialScores={[]} />);
    expect(screen.queryByText(/로그인 전 기록이 있어요/)).toBeNull();
  });
});

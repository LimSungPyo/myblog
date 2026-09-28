import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { AuthUser } from "@/types";

const fetchMe = vi.fn();
vi.mock("@/lib/authApi", () => ({
  AUTH_CHANGED_EVENT: "auth:changed",
  fetchMe: () => fetchMe(),
}));

import AuthButton from "@/components/AuthButton";

const user: AuthUser = {
  id: "uuid-1",
  username: null,
  email: "user@example.com",
  displayName: "테스터",
  avatarUrl: null,
  isAdmin: false,
};

describe("AuthButton", () => {
  beforeEach(() => {
    fetchMe.mockReset();
  });

  it("비로그인 → 로그인 링크", async () => {
    fetchMe.mockResolvedValue(null);
    render(<AuthButton />);
    expect(await screen.findByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByRole("link", { name: "마이페이지" })).toBeNull();
  });

  it("로그인 → 마이페이지 링크, 이름은 툴팁으로", async () => {
    fetchMe.mockResolvedValue(user);
    render(<AuthButton />);
    const link = await screen.findByRole("link", { name: "마이페이지" });
    expect(link).toHaveAttribute("href", "/mypage");
    expect(link).toHaveAttribute("title", "테스터님의 마이페이지");
    expect(screen.queryByRole("link", { name: "로그인" })).toBeNull();
  });

  it("관리자 → 관리자 대시보드로 간다", async () => {
    fetchMe.mockResolvedValue({ ...user, username: "admin", isAdmin: true });
    render(<AuthButton />);
    const link = await screen.findByRole("link", { name: "관리자 페이지" });
    expect(link).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("link", { name: "마이페이지" })).toBeNull();
  });

  it("헤더에서 바로 로그아웃되지 않는다 (로그아웃은 마이페이지 안에 있다)", async () => {
    fetchMe.mockResolvedValue(user);
    render(<AuthButton />);
    await screen.findByRole("link", { name: "마이페이지" });
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });

  it("세션 변경 이벤트 → 로그인 상태 재확인", async () => {
    // 소셜 콜백처럼 마운트 시점엔 토큰이 없다가 이후에 세션이 생기는 경우
    fetchMe.mockResolvedValueOnce(null);
    render(<AuthButton />);
    await screen.findByRole("link", { name: "로그인" });

    fetchMe.mockResolvedValueOnce(user);
    act(() => {
      window.dispatchEvent(new Event("auth:changed"));
    });
    expect(
      await screen.findByRole("link", { name: "마이페이지" }),
    ).toBeInTheDocument();
  });

  it("닉네임을 바꾸면 이벤트로 새 이름을 다시 읽는다", async () => {
    fetchMe.mockResolvedValueOnce(user);
    render(<AuthButton />);
    await screen.findByRole("link", { name: "마이페이지" });

    fetchMe.mockResolvedValueOnce({ ...user, displayName: "새이름" });
    act(() => {
      window.dispatchEvent(new Event("auth:changed"));
    });
    expect(
      await screen.findByTitle("새이름님의 마이페이지"),
    ).toBeInTheDocument();
  });

  describe("탭으로 돌아오면 로그인이 살아 있는지 다시 확인한다", () => {
    let visibility: DocumentVisibilityState = "visible";
    let now = 1_000_000;

    beforeEach(() => {
      visibility = "visible";
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => visibility,
      });
      vi.spyOn(Date, "now").mockImplementation(() => now);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function renderLoggedIn() {
      fetchMe.mockResolvedValue(user);
      const view = render(<AuthButton />);
      await screen.findByRole("link", { name: "마이페이지" });
      fetchMe.mockClear();
      return view;
    }

    it("다른 탭에 갔다가 돌아오면 확인하고, 밀려났으면 로그아웃 상태가 된다", async () => {
      await renderLoggedIn();
      // 밀려났으면 fetchMe가 알림창을 띄우고 null을 돌려준다
      fetchMe.mockResolvedValue(null);
      now += 60_000;
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(fetchMe).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByRole("link", { name: "로그인" }),
      ).toBeInTheDocument();
    });

    it("다른 창이나 앱에서 돌아와도(focus) 확인한다", async () => {
      await renderLoggedIn();
      now += 60_000;
      act(() => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(fetchMe).toHaveBeenCalledTimes(1);
    });

    it("탭이 가려질 때는 확인하지 않는다", async () => {
      await renderLoggedIn();
      visibility = "hidden";
      now += 60_000;
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(fetchMe).not.toHaveBeenCalled();
    });

    it("탭 전환으로 두 신호가 한꺼번에 와도 한 번만 확인한다", async () => {
      await renderLoggedIn();
      now += 60_000;
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
      });
      expect(fetchMe).toHaveBeenCalledTimes(1);

      // 잠시 뒤 다시 돌아오면 또 확인한다
      now += 60_000;
      act(() => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(fetchMe).toHaveBeenCalledTimes(2);
    });

    it("헤더가 사라지면 더 이상 확인하지 않는다", async () => {
      const { unmount } = await renderLoggedIn();
      unmount();
      now += 60_000;
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
      expect(fetchMe).not.toHaveBeenCalled();
    });
  });
});

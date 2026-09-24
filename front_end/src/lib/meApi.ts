"use client";

import type { AuthUser } from "@/types";
import { ensureOk } from "./apiError";
import { clearToken, getToken, notifyAuthChanged } from "./authApi";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export interface MyComment {
  id: number;
  postSlug: string;
  postTitle: string;
  content: string;
  approved: boolean;
  createdAt: string;
}

export interface MyGuestbookEntry {
  id: number;
  content: string;
  createdAt: string;
}

export interface MyScore {
  id: number;
  gameKey: string;
  score: number;
  createdAt: string;
}

export interface MyActivity {
  comments: MyComment[];
  guestbook: MyGuestbookEntry[];
  scores: MyScore[];
}

/** 서버(`app/api/me.py`)와 같은 문구여야 한다. 화면은 이 값이 입력될 때만 버튼을 연다. */
export const WITHDRAW_CONFIRMATION = "탈퇴합니다";

/**
 * 로그인한 사용자 요청. 관리자용 `authed`와 따로 둔 이유는 실패했을 때의 메시지다.
 * 관리자 쪽은 "요청 실패: 400"처럼 상태 코드만 보여주는데, 여기서는 서버가 보낸
 * 이유("확인 문구를 정확히 입력해주세요")를 그대로 보여줘야 사용자가 뭘 고칠지 안다.
 */
async function request(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<Response> {
  if (!PUBLIC_API) throw new Error("백엔드가 연결되지 않았어요.");
  const token = getToken();
  const res = await fetch(`${PUBLIC_API}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("로그인이 만료됐어요. 다시 로그인해주세요.");
  }
  await ensureOk(res, fallback);
  return res;
}

export const meApi = {
  async activity(): Promise<MyActivity> {
    const res = await request(
      "/me/activity",
      {},
      "활동 내역을 불러오지 못했어요.",
    );
    return res.json();
  },

  async rename(displayName: string): Promise<AuthUser> {
    const res = await request(
      "/me",
      { method: "PATCH", body: JSON.stringify({ displayName }) },
      "닉네임을 바꾸지 못했어요.",
    );
    const user = (await res.json()) as AuthUser;
    // 헤더처럼 로그인 정보를 들고 있는 곳들이 새 이름을 다시 읽어가게 알린다
    notifyAuthChanged();
    return user;
  },

  async deleteComment(id: number): Promise<void> {
    await request(
      `/me/comments/${id}`,
      { method: "DELETE" },
      "댓글을 지우지 못했어요.",
    );
  },

  async deleteGuestbook(id: number): Promise<void> {
    await request(
      `/me/guestbook/${id}`,
      { method: "DELETE" },
      "방명록을 지우지 못했어요.",
    );
  },

  async withdraw(confirmation: string): Promise<void> {
    await request(
      "/me/withdraw",
      { method: "POST", body: JSON.stringify({ confirmation }) },
      "탈퇴하지 못했어요.",
    );
    // 계정이 사라졌으니 들고 있던 토큰도 버린다. 이것도 헤더에 로그아웃을 알린다.
    clearToken();
  },
};

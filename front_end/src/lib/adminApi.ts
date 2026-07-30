"use client";

import type { GameScore, GuestbookEntry, Post } from "@/types";
import { clearToken, getToken } from "@/lib/authApi";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

// 세션/로그인 로직은 authApi로 이동 — 기존 import 경로 호환을 위해 re-export
export { clearToken, getToken, login } from "@/lib/authApi";

/* ---------------- requests ---------------- */

function ensureConfigured() {
  if (!PUBLIC_API)
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL 이 설정되지 않았습니다. 백엔드를 연결하세요.",
    );
}

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  ensureConfigured();
  const token = getToken();
  const res = await fetch(`${PUBLIC_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("인증이 만료되었습니다. 다시 로그인하세요.");
  }
  if (!res.ok) throw new Error(`요청 실패: ${res.status}`);
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

export interface PostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  categoryId?: number | null;
  tagIds?: number[];
  status: "draft" | "published";
}

export interface AdminComment {
  id: number;
  postId: number;
  postTitle: string;
  postSlug: string;
  authorName: string;
  content: string;
  approved: boolean;
  createdAt: string;
}

export interface TopPost {
  id: number;
  title: string;
  slug: string;
  viewCount: number;
}

export interface AdminStats {
  postCount: number;
  publishedCount: number;
  draftCount: number;
  commentCount: number;
  pendingCommentCount: number;
  totalViews: number;
  topPosts: TopPost[];
}

export const adminApi = {
  listPosts: () => authed<Post[]>("/admin/posts"),
  getPost: (id: number) => authed<Post>(`/admin/posts/${id}`),
  createPost: (input: PostInput) =>
    authed<Post>("/admin/posts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePost: (id: number, input: PostInput) =>
    authed<Post>(`/admin/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  deletePost: (id: number) =>
    authed<void>(`/admin/posts/${id}`, { method: "DELETE" }),

  getStats: () => authed<AdminStats>("/admin/stats"),

  listComments: () => authed<AdminComment[]>("/admin/comments"),
  moderateComment: (id: number, approved: boolean) =>
    authed<AdminComment>(`/admin/comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ approved }),
    }),
  deleteComment: (id: number) =>
    authed<void>(`/admin/comments/${id}`, { method: "DELETE" }),

  listGuestbook: () => authed<GuestbookEntry[]>("/admin/guestbook"),
  deleteGuestbook: (id: number) =>
    authed<void>(`/admin/guestbook/${id}`, { method: "DELETE" }),

  listGameScores: () => authed<GameScore[]>("/admin/games/scores"),
  deleteGameScore: (id: number) =>
    authed<void>(`/admin/games/scores/${id}`, { method: "DELETE" }),
};

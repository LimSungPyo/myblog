"use client";

import type { GameScore, GuestbookEntry, Post } from "@/types";
import { clearToken, getToken } from "@/lib/authApi";
import { ensureOk } from "@/lib/apiError";

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

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

/**
 * 이미지 업로드. JSON이 아니라 파일을 보내므로 공통 `authed`를 쓰지 않는다.
 *
 * Content-Type을 직접 넣지 않는 게 핵심이다. 파일 전송(multipart)은 본문을 나누는
 * 경계값(boundary)이 헤더에 같이 적혀야 하는데, 그 값은 브라우저가 FormData를 보고
 * 만들어 붙인다. 손으로 `multipart/form-data`만 적으면 경계값이 빠져 서버가 못 읽는다.
 */
async function uploadImage(file: File): Promise<UploadedImage> {
  ensureConfigured();
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const res = await fetch(`${PUBLIC_API}/admin/uploads/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("인증이 만료되었습니다. 다시 로그인하세요.");
  }
  // 서버가 "10MB 이하만", "JPG, PNG, WebP만" 같은 이유를 보내주므로 그대로 보여준다
  await ensureOk(res, "이미지를 올리지 못했어요.");
  return res.json() as Promise<UploadedImage>;
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

  uploadImage,

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

"use client";

import type { Post } from "./types";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const TOKEN_COOKIE = "auth_token";
const ADMIN_COOKIE = "is_admin"; // 프록시의 UX 게이팅용(실검증은 백엔드 JWT)

interface AuthResult {
  accessToken: string;
  isAdmin: boolean;
}

/* ---------------- session (cookie) ---------------- */

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

export function isAdmin(): boolean {
  return readCookie(ADMIN_COOKIE) === "1";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

function setSession({ accessToken, isAdmin }: AuthResult) {
  const maxAge = 60 * 60 * 24 * 7; // 7일
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${ADMIN_COOKIE}=${isAdmin ? "1" : "0"}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearToken() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ADMIN_COOKIE}=; path=/; max-age=0`;
}

/* ---------------- requests ---------------- */

function ensureConfigured() {
  if (!PUBLIC_API)
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL 이 설정되지 않았습니다. 백엔드를 연결하세요.",
    );
}

export async function login(
  username: string,
  password: string,
): Promise<AuthResult> {
  ensureConfigured();
  const res = await fetch(`${PUBLIC_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  const data: AuthResult = await res.json();
  setSession(data);
  return data;
}

export async function signup(
  username: string,
  password: string,
): Promise<AuthResult> {
  ensureConfigured();
  const res = await fetch(`${PUBLIC_API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 409) throw new Error("이미 사용 중인 아이디입니다.");
  if (!res.ok) throw new Error("회원가입에 실패했습니다.");
  const data: AuthResult = await res.json();
  setSession(data);
  return data;
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

  listComments: () => authed<AdminComment[]>("/admin/comments"),
  moderateComment: (id: number, approved: boolean) =>
    authed<AdminComment>(`/admin/comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ approved }),
    }),
  deleteComment: (id: number) =>
    authed<void>(`/admin/comments/${id}`, { method: "DELETE" }),
};

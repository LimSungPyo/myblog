"use client";

import type { AuthUser } from "@/types";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const TOKEN_COOKIE = "auth_token";
const ADMIN_COOKIE = "is_admin"; // 프록시의 UX 게이팅용(실검증은 백엔드 JWT)

export interface AuthResult {
  accessToken: string;
  isAdmin: boolean;
}

/* ---------------- session (cookie) ---------------- */

/** 세션 쿠키가 바뀔 때 발행되는 이벤트 — 헤더 등이 구독해 로그인 상태를 다시 확인한다. */
export const AUTH_CHANGED_EVENT = "auth:changed";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

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

export function setSession({ accessToken, isAdmin }: AuthResult) {
  const maxAge = 60 * 60 * 24 * 7; // 7일
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${ADMIN_COOKIE}=${isAdmin ? "1" : "0"}; path=/; max-age=${maxAge}; SameSite=Lax`;
  notifyAuthChanged();
}

export function clearToken() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ADMIN_COOKIE}=; path=/; max-age=0`;
  notifyAuthChanged();
}

/* ---------------- helpers ---------------- */

/** 내부 경로만 허용 (open redirect 방지). //host 형태도 외부 이동이라 차단. */
export function safeNext(path: string | null | undefined): string | null {
  if (path && path.startsWith("/") && !path.startsWith("//")) return path;
  return null;
}

function ensureConfigured() {
  if (!PUBLIC_API)
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL 이 설정되지 않았습니다. 백엔드를 연결하세요.",
    );
}

/** HTTP 상태를 품은 에러 — 호출부가 상태별 UI(예: 403 → 인증 재발송)를 분기할 수 있게. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function post<T>(
  path: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  ensureConfigured();
  const res = await fetch(`${PUBLIC_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = fallback;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      // 응답이 JSON이 아니면 기본 메시지 사용
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

/* ---------------- auth API ---------------- */

export async function login(
  username: string,
  password: string,
): Promise<AuthResult> {
  const data = await post<AuthResult>(
    "/auth/login",
    { username, password },
    "아이디 또는 비밀번호가 올바르지 않습니다.",
  );
  setSession(data);
  return data;
}

/** 가입 신청 — 인증 메일이 발송되고, 메일 링크를 열어야 로그인이 완료된다. */
export async function signup(
  email: string,
  password: string,
  displayName: string,
): Promise<{ message: string }> {
  return post<{ message: string }>(
    "/auth/signup",
    { email, password, displayName },
    "회원가입에 실패했습니다.",
  );
}

/** 메일 링크의 토큰으로 이메일 인증 — 성공 시 바로 로그인된다. */
export async function verifyEmail(token: string): Promise<AuthResult> {
  const data = await post<AuthResult>(
    "/auth/verify-email",
    { token },
    "인증 링크가 유효하지 않거나 만료되었습니다.",
  );
  setSession(data);
  return data;
}

export async function resendVerification(
  email: string,
): Promise<{ message: string }> {
  return post<{ message: string }>(
    "/auth/resend-verification",
    { email },
    "인증 메일 발송에 실패했습니다.",
  );
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  return post<{ message: string }>(
    "/auth/forgot-password",
    { email },
    "재설정 메일 발송에 실패했습니다.",
  );
}

/** 메일 링크의 토큰으로 새 비밀번호 설정 — 성공 시 바로 로그인된다. */
export async function resetPassword(
  token: string,
  password: string,
): Promise<AuthResult> {
  const data = await post<AuthResult>(
    "/auth/reset-password",
    { token, password },
    "재설정 링크가 유효하지 않거나 이미 사용되었습니다.",
  );
  setSession(data);
  return data;
}

/** 현재 로그인한 사용자. 토큰이 없거나 만료면 null (만료 토큰은 정리). */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token || !PUBLIC_API) return null;
  const res = await fetch(`${PUBLIC_API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) clearToken();
    return null;
  }
  return res.json() as Promise<AuthUser>;
}

/** Google 로그인 시작 URL (백엔드가 OAuth 흐름 전체를 처리). 백엔드 미연결 시 null. */
export function googleLoginUrl(next: string): string | null {
  if (!PUBLIC_API) return null;
  return `${PUBLIC_API}/auth/google/login?next=${encodeURIComponent(next)}`;
}

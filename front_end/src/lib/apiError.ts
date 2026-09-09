"use client";

/**
 * API 오류를 상태 코드와 함께 던지기 위한 공통 레이어.
 *
 * 429(요청 제한)를 다루려면 상태 코드만으로는 부족하다. "언제 다시 되는지"를
 * 같이 알아야 사용자에게 보여줄 수 있고, 그 값은 본문이 아니라 Retry-After 헤더에 있다.
 */

export class ApiError extends Error {
  status: number;
  /** 429·503에 붙는 재시도 대기 시간(초). 없으면 undefined. */
  retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * Retry-After 헤더를 초로 읽는다.
 *
 * 값이 안 잡히는 흔한 원인은 서버가 CORS에서 이 헤더를 노출하지 않은 것이다.
 * 브라우저는 몇 개의 표준 헤더 외에는 자바스크립트에서 읽지 못하게 막기 때문에,
 * 백엔드가 Access-Control-Expose-Headers에 명시해줘야 한다.
 */
export function parseRetryAfter(res: Response): number | undefined {
  const raw = res.headers.get("Retry-After");
  if (!raw) return undefined;
  const seconds = Number(raw);
  // 표준은 날짜 형태도 허용하지만 이 API는 초만 보낸다
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.ceil(seconds);
}

/** 응답이 실패면 ApiError를 던진다. 본문에 detail이 있으면 그걸 메시지로 쓴다. */
export async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  let detail = fallback;
  try {
    const data = await res.json();
    if (typeof data.detail === "string") detail = data.detail;
  } catch {
    // 응답이 JSON이 아니면 기본 메시지 사용
  }
  throw new ApiError(detail, res.status, parseRetryAfter(res));
}

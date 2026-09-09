import { describe, it, expect } from "vitest";
import { ApiError, ensureOk, parseRetryAfter } from "@/lib/apiError";

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("parseRetryAfter", () => {
  it("초 단위 값을 숫자로 읽는다", () => {
    expect(parseRetryAfter(response(429, {}, { "Retry-After": "37" }))).toBe(
      37,
    );
  });

  it("헤더가 없으면 undefined — CORS에서 노출 안 된 경우가 대부분이다", () => {
    expect(parseRetryAfter(response(429, {}))).toBeUndefined();
  });

  it("숫자가 아니면 undefined", () => {
    expect(
      parseRetryAfter(
        response(429, {}, { "Retry-After": "Wed, 10 Sep 2026 12:00:00 GMT" }),
      ),
    ).toBeUndefined();
  });
});

describe("ensureOk", () => {
  it("성공 응답은 통과시킨다", async () => {
    await expect(ensureOk(response(200, {}), "실패")).resolves.toBeUndefined();
  });

  it("429는 상태와 대기 시간을 함께 담아 던진다", async () => {
    const res = response(
      429,
      { detail: "요청이 너무 잦습니다. 37초 후에 다시 시도해주세요." },
      { "Retry-After": "37" },
    );
    await expect(ensureOk(res, "실패")).rejects.toMatchObject({
      status: 429,
      retryAfter: 37,
      message: "요청이 너무 잦습니다. 37초 후에 다시 시도해주세요.",
    });
  });

  it("본문에 detail이 없으면 기본 메시지를 쓴다", async () => {
    await expect(
      ensureOk(response(500, {}), "등록에 실패했습니다."),
    ).rejects.toThrow("등록에 실패했습니다.");
  });

  it("본문이 JSON이 아니어도 던진다", async () => {
    const res = new Response("<html>502</html>", { status: 502 });
    await expect(ensureOk(res, "실패")).rejects.toBeInstanceOf(ApiError);
  });
});

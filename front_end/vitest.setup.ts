import "@testing-library/jest-dom/vitest";

// jsdom에는 IntersectionObserver가 없다. 실제 브라우저처럼 "있지만 아직 아무것도 안 보인" 상태로 둔다.
// 보이는 순간을 확인하려는 테스트는 이 자리를 자기 흉내로 바꿔 끼운다
class IdleIntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver =
    IdleIntersectionObserver as unknown as typeof IntersectionObserver;
}

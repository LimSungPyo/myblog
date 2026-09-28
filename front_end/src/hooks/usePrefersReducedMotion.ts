import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia(QUERY).matches
  );
}

/**
 * 기기에서 "동작 줄이기"를 켰는지. 켜져 있으면 위치가 바뀌는 움직임을 빼고 결과만 바로 보여준다.
 * 설정을 바꾸면 페이지를 새로 열지 않아도 바로 따라간다. 서버에서 그릴 때는 꺼진 것으로 본다.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

"use client";

import { MoonIcon, SunIcon } from "@/components/ui/icons";

/**
 * 다크모드 토글. `.dark` 클래스를 <html>에 토글하고 선택을 localStorage에 저장.
 * 표시 아이콘은 CSS(.dark)로 전환 → 초기 렌더 하이드레이션 불일치/깜빡임 없음.
 * (FOUC 방지 초기화는 layout의 인라인 스크립트가 담당)
 */
export default function ThemeToggle() {
  function toggle() {
    const apply = () => {
      const isDark = document.documentElement.classList.toggle("dark");
      try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
      } catch {
        // localStorage 접근 불가 시 무시 (그래도 이번 세션 전환은 동작)
      }
    };
    // 지원 브라우저는 페이지 전체를 한 번에 크로스페이드(물흐르듯), 미지원은 즉시 전환
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (doc.startViewTransition) doc.startViewTransition(apply);
    else apply();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="다크모드 전환"
      title="다크모드 전환"
      className="inline-flex items-center rounded-lg border border-black/10 p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <MoonIcon className="h-5 w-5 dark:hidden" />
      <SunIcon className="hidden h-5 w-5 dark:block" />
    </button>
  );
}

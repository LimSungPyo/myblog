import { MoonIcon } from "@/components/ui/icons";

/**
 * 다크모드 토글 버튼 — 현재는 시각(아이콘)만.
 * 실제 전환 로직(class 전략 + localStorage 저장)은 다음 작업에서 연결 예정.
 */
export default function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="다크모드 전환"
      title="다크모드 (준비 중)"
      className="inline-flex items-center rounded-lg border border-black/10 p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <MoonIcon className="h-5 w-5" />
    </button>
  );
}

import Link from "next/link";
import { KeyIcon } from "@/components/ui/icons";

/** 헤더의 관리자 로그인 진입 버튼 — 기존 로그인 페이지(/login)로 이동. */
export default function AdminLoginButton() {
  return (
    <Link
      href="/login"
      aria-label="관리자 로그인"
      title="관리자 로그인"
      className="inline-flex items-center rounded-lg border border-black/10 p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <KeyIcon className="h-5 w-5" />
    </Link>
  );
}

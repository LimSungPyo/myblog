import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-mono text-xs text-muted">N°404 · 없는 도면</p>
      <h1 className="font-serif text-[64px] leading-none font-bold">404</h1>
      <p className="text-muted">페이지를 찾을 수 없습니다.</p>
      <Link
        href="/"
        className="press mt-2 flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        홈으로
      </Link>
    </div>
  );
}

import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

const boxBase =
  "grid h-11 w-11 place-items-center rounded-xl text-sm transition";
const boxIdle =
  "bg-white text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_6px_rgba(0,0,0,0.04)] hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:shadow-none dark:ring-1 dark:ring-white/10 dark:hover:bg-neutral-800";
const boxActive =
  "bg-[#10213a] font-semibold text-white shadow-[0_4px_12px_rgba(16,33,58,0.35)] dark:bg-white dark:text-slate-900";

function pageHref(p: number) {
  return p <= 1 ? "/guestbook" : `/guestbook?page=${p}`;
}

export default function GuestbookPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-2"
      aria-label="방명록 페이지네이션"
    >
      <Link
        href={pageHref(page - 1)}
        aria-label="이전"
        aria-disabled={atStart}
        className={`${boxBase} ${boxIdle} ${atStart ? "pointer-events-none opacity-40" : ""}`}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          href={pageHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={`${boxBase} ${p === page ? boxActive : boxIdle}`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={pageHref(page + 1)}
        aria-label="다음"
        aria-disabled={atEnd}
        className={`${boxBase} ${boxIdle} ${atEnd ? "pointer-events-none opacity-40" : ""}`}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </nav>
  );
}

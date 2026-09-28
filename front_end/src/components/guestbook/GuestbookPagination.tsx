import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

const boxBase = "press grid h-11 w-11 place-items-center rounded-xl text-sm";
const boxIdle = "bg-surface text-foreground shadow-card hover:bg-hover";
const boxActive = "bg-foreground font-semibold text-background";

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

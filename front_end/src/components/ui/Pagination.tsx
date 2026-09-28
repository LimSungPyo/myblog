import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  /** 쿼리스트링을 유지하기 위한 basePath (예: "/", "/categories/dev") */
  basePath: string;
  /** page 외에 유지할 추가 쿼리 (예: { q: "next" }) */
  extraQuery?: Record<string, string>;
}

function href(basePath: string, page: number, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function Pagination({
  page,
  totalPages,
  basePath,
  extraQuery,
}: Props) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="페이지네이션"
    >
      {page > 1 && (
        <Link
          href={href(basePath, page - 1, extraQuery)}
          className="press grid h-11 place-items-center rounded-xl px-3.5 text-sm text-muted hover:bg-hover hover:text-foreground lg:h-9"
        >
          이전
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(basePath, p, extraQuery)}
          aria-current={p === page ? "page" : undefined}
          className={`press grid h-11 min-w-11 place-items-center rounded-xl px-3 text-sm lg:h-9 lg:min-w-9 ${
            p === page
              ? "bg-foreground font-semibold text-background"
              : "text-muted hover:bg-hover hover:text-foreground"
          }`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={href(basePath, page + 1, extraQuery)}
          className="press grid h-11 place-items-center rounded-xl px-3.5 text-sm text-muted hover:bg-hover hover:text-foreground lg:h-9"
        >
          다음
        </Link>
      )}
    </nav>
  );
}
